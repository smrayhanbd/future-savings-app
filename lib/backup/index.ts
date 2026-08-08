/**
 * Cloud Backup core library.
 *
 * Produces a single JSON snapshot of the entire PostgreSQL database (every
 * table in the `public` schema) and writes it to disk under
 * `BACKUP_STORAGE_DIR` (defaults to `<projectRoot>/backups`). The snapshot
 * is a self-describing JSON file:
 *
 *   {
 *     "_meta": {
 *       "version": 1,
 *       "createdAt": "2026-08-06T12:34:56.789Z",
 *       "databaseUrlHash": "…",        // first 8 chars of SHA-256 of the URL
 *       "tableCount": 47,
 *       "rowCount": 12345
 *     },
 *     "tables": {
 *       "User":   [ {…}, {…}, … ],
 *       "Member": [ {…}, {…}, … ],
 *       …
 *     }
 *   }
 *
 * Each row is JSON-safe: BigInt → string, Decimal → string, Date → ISO
 * string, bytea → base64. Anything else is passed through unchanged.
 *
 * The function returns a {@link BackupResult} describing the file path,
 * size, per-table counts, and SHA-256 checksum. The caller (typically a
 * server action) persists this metadata as a `Backup` row.
 */
import { promises as fs } from "node:fs"
import path from "node:path"
import crypto from "node:crypto"
import { Prisma } from "@prisma/client"

import prisma from "@/lib/prisma"

/** Default storage directory when `process.env.BACKUP_STORAGE_DIR` is unset. */
const DEFAULT_BACKUP_DIR = path.join(process.cwd(), "backups")

/** Tables that exist in the public schema but are NOT application data. */
const EXCLUDED_TABLES = new Set(["_prisma_migrations"])

/** Resolved location where backup files are written. */
export function getBackupStorageDir(): string {
  const env = process.env.BACKUP_STORAGE_DIR
  return env && env.trim().length > 0 ? path.resolve(env) : DEFAULT_BACKUP_DIR
}

/** Ensure the backup storage directory exists; returns its absolute path. */
async function ensureStorageDir(): Promise<string> {
  const dir = getBackupStorageDir()
  await fs.mkdir(dir, { recursive: true })
  return dir
}

/** Outcome of a single backup attempt. */
export interface BackupResult {
  /** Absolute path of the JSON file that was written. */
  filePath: string
  /** Human-readable filename (basename of `filePath`). */
  filename: string
  /** File size in bytes. */
  sizeBytes: number
  /** SHA-256 hex digest of the file contents. */
  checksum: string
  /** Per-table row counts, keyed by table name. */
  tableCounts: Record<string, number>
  /** Total number of tables dumped. */
  tableCount: number
  /** Total number of rows across all tables. */
  rowCount: number
}

/** A single { tableName, rowCount } entry, used for the UI. */
export interface TableCountEntry {
  name: string
  count: number
}

/**
 * List every user table in the public schema, excluding Prisma's own
 * bookkeeping table. Returns rows ordered alphabetically by table name.
 */
async function listTables(): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename != '_prisma_migrations'
    ORDER BY tablename ASC
  `
  return rows.map((r) => r.tablename).filter((t) => !EXCLUDED_TABLES.has(t))
}

/**
 * Walk a single row from `$queryRaw` and convert any non-JSON-serializable
 * value into a JSON-safe representation. Returns a new object — the input
 * row is not mutated.
 *
 *   Prisma.Decimal  -> string   (preserves full precision)
 *   bigint          -> string   (preserves full range)
 *   Date            -> ISO string (already what JSON.stringify would do,
 *                                  but made explicit for downstream code)
 *   Buffer          -> base64 string (bytea columns)
 *   Array           -> recursively converted
 *   plain object    -> recursively converted
 */
function serializeRow(value: unknown): unknown {
  if (value === null || value === undefined) return value
  if (value instanceof Prisma.Decimal) return value.toString()
  if (typeof value === "bigint") return value.toString()
  if (value instanceof Date) return value.toISOString()
  if (Buffer.isBuffer(value)) return value.toString("base64")
  if (Array.isArray(value)) return value.map(serializeRow)
  if (typeof value === "object") {
    // Plain object — walk keys. We avoid wrapping class instances other
    // than the Prisma types handled above.
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = serializeRow(v)
    }
    return out
  }
  return value
}

/**
 * Build a stable, lexicographically-sorted JSON string for a backup payload.
 * Sorting keys at every level makes the output byte-deterministic for the
 * same DB state, which gives the SHA-256 checksum a stable meaning across
 * re-runs.
 */
function stringifyBackup(payload: unknown): string {
  return JSON.stringify(payload, (_key, val) => {
    // We've already pre-serialized via serializeRow, so this replacer only
    // needs to handle anything JSON.stringify would otherwise coerce.
    if (typeof val === "bigint") return val.toString()
    if (val instanceof Prisma.Decimal) return val.toString()
    if (val instanceof Date) return val.toISOString()
    if (Buffer.isBuffer(val)) return val.toString("base64")
    return val
  }, 0)
}

/**
 * Dump every table in the `public` schema to a single JSON file on disk.
 *
 * @param onProgress  optional callback invoked once per table after its
 *                    rows have been fetched and serialized. Useful for
 *                    logging progress in long-running backups.
 */
export async function createDatabaseBackup(
  onProgress?: (tableName: string, rowCount: number) => void,
): Promise<BackupResult> {
  const tables = await listTables()

  const tableData: Record<string, unknown[]> = {}
  const tableCounts: Record<string, number> = {}
  let totalRows = 0

  for (const tableName of tables) {
    // $queryRawUnsafe is required here because table names cannot be
    // parameterised — Postgres doesn't accept identifiers as bind params.
    // The table name comes from `pg_tables` (a system catalogue), so it
    // is safe from injection.
    const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT * FROM "${tableName}"`)
    const serialized = rows.map(serializeRow)
    tableData[tableName] = serialized
    tableCounts[tableName] = serialized.length
    totalRows += serialized.length
    onProgress?.(tableName, serialized.length)
  }

  // Stable hash of the DATABASE_URL so we can later tell which DB a backup
  // came from without storing the connection string itself.
  const dbUrlHash = crypto
    .createHash("sha256")
    .update(process.env.DATABASE_URL ?? process.env.DIRECT_URL ?? "")
    .digest("hex")
    .slice(0, 8)

  const payload = {
    _meta: {
      version: 1,
      createdAt: new Date().toISOString(),
      databaseUrlHash: dbUrlHash,
      tableCount: tables.length,
      rowCount: totalRows,
    },
    tables: tableData,
  }

  const jsonStr = stringifyBackup(payload)
  const checksum = crypto.createHash("sha256").update(jsonStr, "utf8").digest("hex")
  const sizeBytes = Buffer.byteLength(jsonStr, "utf8")

  const dir = await ensureStorageDir()
  const stamp = formatTimestamp(new Date())
  const shortId = crypto.randomBytes(4).toString("hex")
  const filename = `backup-${stamp}-${shortId}.json`
  const filePath = path.join(dir, filename)

  await fs.writeFile(filePath, jsonStr, "utf8")

  return {
    filePath,
    filename,
    sizeBytes,
    checksum,
    tableCounts,
    tableCount: tables.length,
    rowCount: totalRows,
  }
}

/** YYYY-MM-DD-HHmmss, in the server's local timezone (good enough for a filename). */
function formatTimestamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  )
}

/**
 * Read a previously-written backup file from disk and return its raw JSON
 * string. Throws if the file does not exist (the caller should surface a
 * friendly error to the user).
 */
export async function readBackupFile(filePath: string): Promise<string> {
  return fs.readFile(filePath, "utf8")
}

/** Delete a backup file from disk. Silently no-ops if it doesn't exist. */
export async function deleteBackupFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath)
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err
  }
}

/** True if a backup file still exists on disk. */
export async function backupFileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

/**
 * Quick statistics about the database — surfaced in the "Create Backup"
 * panel so admins can see what they're about to snapshot. Returns table
 * counts and total row count without actually dumping any rows.
 */
export async function getDatabaseStats(): Promise<{
  tableCount: number
  rowCount: number
  tables: TableCountEntry[]
}> {
  const tables = await listTables()
  const counts: TableCountEntry[] = []
  let total = 0
  for (const t of tables) {
    // COUNT(*) is safe for an identifier we trust (from pg_tables).
    const rows = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
      `SELECT COUNT(*)::bigint AS count FROM "${t}"`,
    )
    const count = Number(rows[0]?.count ?? 0)
    counts.push({ name: t, count })
    total += count
  }
  return { tableCount: tables.length, rowCount: total, tables: counts }
}
