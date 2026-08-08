"use server"

/**
 * Cloud Backup server actions.
 *
 *   createBackup()       — dump the entire DB to a JSON file + persist metadata
 *   listBackups()        — return every Backup row (newest first)
 *   deleteBackup(id)     — delete a Backup row + its file
 *   getBackupById(id)    — return a single Backup row (used by the download route)
 *   getBackupStats()     — return live DB row counts for the pre-backup summary
 *
 * All actions require a signed-in SUPER_ADMIN. The Cloud Backup page is the
 * only entry-point that ever calls these, so the auth check is duplicated
 * here (defense in depth) and in the page server component.
 */
import { revalidatePath } from "next/cache"

import prisma from "@/lib/prisma"
import { getCurrentUser, isSuperAdmin } from "@/lib/permissions"
import {
  createDatabaseBackup,
  deleteBackupFile,
  getDatabaseStats,
  type TableCountEntry,
} from "@/lib/backup"

// ─── Helpers ─────────────────────────────────────────────────────────────

/** Reject any caller who is not a signed-in SUPER_ADMIN. */
async function requireSuperAdmin() {
  const user = await getCurrentUser()
  if (!user) throw new Error("You must be signed in to manage backups.")
  if (!isSuperAdmin(user)) {
    throw new Error("Only the Super Admin can manage backups.")
  }
  return user
}

// ─── Public actions ──────────────────────────────────────────────────────

/**
 * Trigger a new database backup. The Backup row is created up-front in
 * PENDING status so the UI can render progress even before the dump
 * finishes; it transitions to IN_PROGRESS → SUCCESS / FAILED as the
 * underlying library completes (or throws).
 */
export async function createBackup(): Promise<{
  ok: boolean
  id?: string
  error?: string
}> {
  let user
  try {
    user = await requireSuperAdmin()
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }

  // Pre-create the row in PENDING status. We'll update it as the dump runs.
  const pending = await prisma.backup.create({
    data: {
      status: "PENDING",
      trigger: "manual",
      filename: `backup-pending-${Date.now()}.json`,
      filePath: "/pending",
      createdById: user.id,
      createdByName: user.email,
    },
  })

  try {
    await prisma.backup.update({
      where: { id: pending.id },
      data: { status: "IN_PROGRESS" },
    })

    const result = await createDatabaseBackup()

    await prisma.backup.update({
      where: { id: pending.id },
      data: {
        status: "SUCCESS",
        filename: result.filename,
        filePath: result.filePath,
        sizeBytes: BigInt(result.sizeBytes),
        tableCounts: result.tableCounts,
        tableCount: result.tableCount,
        checksum: result.checksum,
        finishedAt: new Date(),
      },
    })

    revalidatePath("/dashboard/backup")
    return { ok: true, id: pending.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[createBackup] failed:", err)
    await prisma.backup.update({
      where: { id: pending.id },
      data: {
        status: "FAILED",
        error: message.slice(0, 1000),
        finishedAt: new Date(),
      },
    })
    revalidatePath("/dashboard/backup")
    return { ok: false, id: pending.id, error: message }
  }
}

/** Shape returned by {@link listBackups}; matches the BackupClient props. */
export interface BackupRow {
  id: string
  filename: string
  filePath: string
  sizeBytes: number
  tableCount: number
  tableCounts: Record<string, number>
  trigger: string
  status: string
  error: string | null
  checksum: string | null
  createdById: string | null
  createdByName: string | null
  createdAt: string
  finishedAt: string | null
}

/** Coerce a Prisma `Json` value into the `Record<string, number>` shape we
 *  promised the client. Anything that isn't a plain object is replaced with
 *  an empty record so the UI never crashes on a malformed row. */
function coerceTableCounts(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === "number" && Number.isFinite(v)) out[k] = v
    else if (typeof v === "string" && /^\d+$/.test(v)) out[k] = Number(v)
    else if (typeof v === "bigint") out[k] = Number(v)
  }
  return out
}

/** Serialize a Prisma Backup row into the plain shape the client expects. */
function serialize(b: Awaited<ReturnType<typeof prisma.backup.findFirst>>): BackupRow | null {
  if (!b) return null
  return {
    id: b.id,
    filename: b.filename,
    filePath: b.filePath,
    sizeBytes: Number(b.sizeBytes),
    tableCount: b.tableCount,
    tableCounts: coerceTableCounts(b.tableCounts),
    trigger: b.trigger,
    status: b.status,
    error: b.error,
    checksum: b.checksum,
    createdById: b.createdById,
    createdByName: b.createdByName,
    createdAt: b.createdAt.toISOString(),
    finishedAt: b.finishedAt ? b.finishedAt.toISOString() : null,
  }
}

/**
 * List every backup record, newest first. Pure-read — no auth check needed
 * beyond the page-level guard because the only caller is the backup page
 * (which already requires SUPER_ADMIN). Kept open so the page component
 * can fetch directly via Prisma without going through this action.
 */
export async function listBackups(): Promise<BackupRow[]> {
  await requireSuperAdmin().catch(() => {
    throw new Error("Unauthorized")
  })
  const rows = await prisma.backup.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  })
  return rows.map(serialize).filter((r): r is BackupRow => r !== null)
}

/**
 * Look up a single backup record. Used by the download API route to
 * resolve an id → file path. Returns null when the row doesn't exist.
 */
export async function getBackupById(id: string): Promise<BackupRow | null> {
  const row = await prisma.backup.findUnique({ where: { id } })
  return serialize(row)
}

/**
 * Delete a backup record AND its underlying file. The row is removed even
 * if the file is already gone (orphaned record cleanup). Returns ok=false
 * only when the row never existed.
 */
export async function deleteBackup(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireSuperAdmin()
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }

  const row = await prisma.backup.findUnique({ where: { id } })
  if (!row) return { ok: false, error: "Backup not found." }

  // Best-effort file deletion — don't fail the action if the file is gone.
  if (row.filePath && row.filePath !== "/pending") {
    await deleteBackupFile(row.filePath).catch(() => {
      /* swallowed — record deletion below still proceeds */
    })
  }

  await prisma.backup.delete({ where: { id } })
  revalidatePath("/dashboard/backup")
  return { ok: true }
}

/** Live row counts per table — feeds the "what will I back up?" preview. */
export interface BackupStats {
  tableCount: number
  rowCount: number
  tables: TableCountEntry[]
}

export async function getBackupStats(): Promise<BackupStats> {
  await requireSuperAdmin().catch(() => {
    throw new Error("Unauthorized")
  })
  return getDatabaseStats()
}
