import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

// Permission keys stored on the UserPermission table.
export const PERMISSIONS = {
  MEETING_ATTENDANCE_MARK: "MEETING_ATTENDANCE_MARK",
  MEETING_MINUTES_UPLOAD: "MEETING_MINUTES_UPLOAD",
} as const

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

export const ROLE = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  MEMBER: "MEMBER",
} as const

// A light shape returned by getCurrentUser — enough to authorize against.
export interface CurrentUser {
  id: string
  email: string
  role: string
}

/**
 * Resolve the authenticated dashboard user from the next-auth session, then
 * fetch the persisted User row so the real role (SUPER_ADMIN | ADMIN | ...) is
 * used instead of the JWT-time value. Returns null when unauthenticated.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email
  if (!email) return null

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, role: true },
  })
  return user ?? null
}

export function isSuperAdmin(user: { role: string } | null | undefined): boolean {
  return !!user && user.role === ROLE.SUPER_ADMIN
}

/** True if the user holds the given permission grant. SUPER_ADMIN always true. */
export async function hasPermission(userId: string, key: PermissionKey, user?: { role: string } | null): Promise<boolean> {
  if (isSuperAdmin(user)) return true
  const row = await prisma.userPermission.findUnique({
    where: { userId_permission: { userId, permission: key } },
    select: { id: true },
  })
  return !!row
}

/** SUPER_ADMIN only — throws if the caller is not a super admin. */
export function requireSuperAdmin(user: CurrentUser | null): void {
  if (!isSuperAdmin(user)) {
    throw new Error("Only the Super Admin can perform this action.")
  }
}

// ── Meeting-specific authorization helpers (rules 5 & 6) ──────────────────────

/**
 * Attendance may be edited when it has not been submitted yet, OR by the
 * Super Admin at any time (rule 5).
 */
export function canEditAttendance(meeting: { attendanceLocked: boolean }, user: { role: string } | null | undefined): boolean {
  if (isSuperAdmin(user)) return true
  return !meeting.attendanceLocked
}

/**
 * Minutes may be uploaded when not yet locked, OR replaced by the Super Admin
 * at any time (rule 6).
 */
export function canUploadMinutes(meeting: { minutesLocked: boolean }, user: { role: string } | null | undefined): boolean {
  if (isSuperAdmin(user)) return true
  return !meeting.minutesLocked
}
