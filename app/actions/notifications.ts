"use server"

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"

// =====================================================================
// ADMIN NOTIFICATIONS
//
// Global (not per-admin-user) notifications surfaced in the Topbar bell
// and on /dashboard/notifications. Producers are server actions across
// the app: member-portal requests create a row here so admins see a live
// feed of what needs attention, with a `link` so a click jumps straight
// to the relevant approval queue.
//
// `createAdminNotification` is deliberately non-throwing — a notification
// is best-effort and must never break the member action that triggered it
// (same philosophy as lib/tasks/spawn.ts).
// =====================================================================

export interface CreateAdminNotificationInput {
  type?: string // e.g. "MEMBER_REQUEST", "PROFILE_REQUEST", "LOAN_REQUEST", "SYSTEM"
  title: string
  message: string
  link?: string // dashboard path to open when clicked
}

/**
 * Create a global admin notification. Never throws — failures are logged
 * and swallowed so the caller's business logic is unaffected.
 */
export async function createAdminNotification(
  input: CreateAdminNotificationInput
): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        type: input.type ?? "SYSTEM",
        title: input.title,
        message: input.message,
        link: input.link ?? null,
      },
    })
    // Revalidate so the Topbar bell reflects the new item on next render.
    revalidatePath("/dashboard")
  } catch (e) {
    console.error("[notifications] createAdminNotification failed:", input.title, e)
  }
}

/**
 * Mark a single notification as read. Called when an admin clicks a row.
 */
export async function markNotificationRead(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    })
    revalidatePath("/dashboard")
    revalidatePath("/dashboard/notifications")
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

/**
 * Mark every notification as read. Called from the notifications page
 * "Mark all as read" button.
 */
export async function markAllNotificationsRead(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  try {
    await prisma.notification.updateMany({
      where: { isRead: false },
      data: { isRead: true },
    })
    revalidatePath("/dashboard")
    revalidatePath("/dashboard/notifications")
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}
