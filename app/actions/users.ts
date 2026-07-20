"use server"

import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { revalidatePath } from "next/cache"
import {
  getCurrentUser,
  isSuperAdmin,
  requireSuperAdmin,
  PERMISSIONS,
  ROLE,
  ALL_PERMISSION_KEYS,
  type PermissionKey,
} from "@/lib/permissions"

export type ActionResult = { ok: true } | { ok: false; error: string }

const USERS_PATH = "/dashboard/users"

// Full permission catalogue shown in the matrix — grouped by module so the
// UI can render labelled sections.
export const PERMISSION_GROUPS: { group: string; keys: PermissionKey[] }[] = [
  {
    group: "Meetings",
    keys: [PERMISSIONS.MEETING_ATTENDANCE_MARK, PERMISSIONS.MEETING_MINUTES_UPLOAD],
  },
  {
    group: "Transactions",
    keys: [
      PERMISSIONS.TRANSACTION_CREATE,
      PERMISSIONS.TRANSACTION_SUBMIT,
      PERMISSIONS.TRANSACTION_APPROVE,
      PERMISSIONS.TRANSACTION_REVERSE,
    ],
  },
  {
    group: "User Management",
    keys: [PERMISSIONS.USER_MANAGE],
  },
]

/** Read-only list of all permission keys for clients (e.g. import into forms). */
export const ALL_PERMISSIONS = ALL_PERMISSION_KEYS

// ---------------------------------------------------------------------------
// CREATE
// ---------------------------------------------------------------------------
export async function createUser(formData: FormData): Promise<ActionResult> {
  try {
    const user = await getCurrentUser()
    requireSuperAdmin(user)

    const name = ((formData.get("name") as string) || "").trim()
    const email = ((formData.get("email") as string) || "").trim().toLowerCase()
    const phone = ((formData.get("phone") as string) || "").trim()
    const role = (formData.get("role") as string) || ROLE.ADMIN
    const password = (formData.get("password") as string) || ""

    if (!email) return { ok: false, error: "Email is required." }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
      return { ok: false, error: "Please enter a valid email address." }
    if (password.length < 6)
      return { ok: false, error: "Password must be at least 6 characters." }
    if (!([ROLE.SUPER_ADMIN, ROLE.ADMIN] as string[]).includes(role))
      return { ok: false, error: "Invalid role." }
    const roleValue = role as "SUPER_ADMIN" | "ADMIN"

    const clash = await prisma.user.findUnique({ where: { email } })
    if (clash) return { ok: false, error: "A user with this email already exists." }

    const hashed = await bcrypt.hash(password, 10)
    await prisma.user.create({
      data: {
        email,
        password: hashed,
        role: roleValue,
        name: name || null,
        phone: phone || null,
        isActive: true,
        createdBy: user.email,
      },
    })
    revalidatePath(USERS_PATH)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

// ---------------------------------------------------------------------------
// UPDATE profile (name/phone/email/role)
// ---------------------------------------------------------------------------
export async function updateUser(id: string, formData: FormData): Promise<ActionResult> {
  try {
    const user = await getCurrentUser()
    requireSuperAdmin(user)

    const target = await prisma.user.findUnique({ where: { id } })
    if (!target) return { ok: false, error: "User not found." }

    const name = ((formData.get("name") as string) || "").trim()
    const email = ((formData.get("email") as string) || "").trim().toLowerCase()
    const phone = ((formData.get("phone") as string) || "").trim()
    const role = (formData.get("role") as string) || target.role

    if (!email) return { ok: false, error: "Email is required." }
    if (!([ROLE.SUPER_ADMIN, ROLE.ADMIN] as string[]).includes(role))
      return { ok: false, error: "Invalid role." }
    const roleValue = role as "SUPER_ADMIN" | "ADMIN"

    // Demotion guardrail — cannot demote the last remaining SUPER_ADMIN.
    if (target.role === ROLE.SUPER_ADMIN && roleValue !== ROLE.SUPER_ADMIN) {
      await guardLastSuperAdmin(id)
    }
    // Prevent demoting yourself out of super-admin (lockout protection).
    if (target.id === user.id && target.role === ROLE.SUPER_ADMIN && roleValue !== ROLE.SUPER_ADMIN) {
      return {
        ok: false,
        error: "You cannot demote yourself. Ask another Super Admin to do it.",
      }
    }

    if (email !== target.email) {
      const clash = await prisma.user.findUnique({ where: { email } })
      if (clash) return { ok: false, error: "Email already in use." }
    }

    await prisma.user.update({
      where: { id },
      data: {
        name: name || null,
        email,
        phone: phone || null,
        role: roleValue,
      },
    })
    revalidatePath(USERS_PATH)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

// ---------------------------------------------------------------------------
// ACTIVATE / DEACTIVATE
// ---------------------------------------------------------------------------
export async function setUserActive(id: string, isActive: boolean): Promise<ActionResult> {
  try {
    const user = await getCurrentUser()
    requireSuperAdmin(user)

    const target = await prisma.user.findUnique({ where: { id } })
    if (!target) return { ok: false, error: "User not found." }

    if (!isActive) {
      // Never lock yourself out.
      if (target.id === user.id) {
        return { ok: false, error: "You cannot disable your own account." }
      }
      // Never remove the last Super Admin.
      if (target.role === ROLE.SUPER_ADMIN) {
        await guardLastSuperAdmin(id)
      }
    }

    await prisma.user.update({ where: { id }, data: { isActive } })
    revalidatePath(USERS_PATH)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

// ---------------------------------------------------------------------------
// ADMIN RESET PASSWORD
// ---------------------------------------------------------------------------
export async function resetUserPassword(id: string, newPassword: string): Promise<ActionResult> {
  try {
    const user = await getCurrentUser()
    requireSuperAdmin(user)

    if (!newPassword || newPassword.length < 6) {
      return { ok: false, error: "Password must be at least 6 characters." }
    }
    const target = await prisma.user.findUnique({ where: { id } })
    if (!target) return { ok: false, error: "User not found." }

    const hashed = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({ where: { id }, data: { password: hashed } })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

// ---------------------------------------------------------------------------
// DELETE — guarded
// ---------------------------------------------------------------------------
export async function deleteUser(id: string): Promise<ActionResult> {
  try {
    const user = await getCurrentUser()
    requireSuperAdmin(user)

    if (id === user.id) {
      return { ok: false, error: "You cannot delete your own account." }
    }
    const target = await prisma.user.findUnique({ where: { id } })
    if (!target) return { ok: false, error: "User not found." }
    if (target.role === ROLE.SUPER_ADMIN) {
      await guardLastSuperAdmin(id)
    }
    await prisma.user.delete({ where: { id } })
    revalidatePath(USERS_PATH)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

// ---------------------------------------------------------------------------
// PERMISSION GRANT / REVOKE (generalised; replaces meeting-only helpers)
// ---------------------------------------------------------------------------
export async function grantPermission(userId: string, key: PermissionKey): Promise<ActionResult> {
  try {
    const user = await getCurrentUser()
    requireSuperAdmin(user)
    if (!ALL_PERMISSION_KEYS.includes(key)) {
      return { ok: false, error: "Unknown permission key." }
    }
    await prisma.userPermission.upsert({
      where: { userId_permission: { userId, permission: key } },
      update: {},
      create: { userId, permission: key },
    })
    revalidatePath(USERS_PATH)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

export async function revokePermission(userId: string, key: PermissionKey): Promise<ActionResult> {
  try {
    const user = await getCurrentUser()
    requireSuperAdmin(user)
    await prisma.userPermission
      .delete({ where: { userId_permission: { userId, permission: key } } })
      .catch(() => {}) // idempotent
    revalidatePath(USERS_PATH)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

// ---------------------------------------------------------------------------
// Guardrail: refuse to remove the last Super Admin.
// ---------------------------------------------------------------------------
async function guardLastSuperAdmin(keepId: string): Promise<void> {
  const superAdmins = await prisma.user.count({
    where: { role: ROLE.SUPER_ADMIN, isActive: true },
  })
  if (superAdmins <= 1) {
    throw new Error(
      "This action would leave the system without any active Super Admin. " +
        "Promote another user first."
    )
  }
  // extra paranoia: confirm the kept user is actually a super admin
  const target = await prisma.user.findUnique({ where: { id: keepId } })
  if (target?.role !== ROLE.SUPER_ADMIN) return
}

// Re-exported for the meeting module so existing imports keep working.
export { isSuperAdmin }
