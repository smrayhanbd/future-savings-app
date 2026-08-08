import prisma, { directPrisma } from "@/lib/prisma"
import { ok, bad, requirePermissionsAdmin, writeRbacAudit, AUDIT } from "@/lib/permissions/api"
import { z } from "zod"

export const dynamic = "force-dynamic"

// ── GET /api/permissions/roles/[roleId]/permissions ──────────────────────
// Returns the role's granted permission keys (rebuilt from the join rows).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ roleId: string }> }
) {
  const auth = await requirePermissionsAdmin()
  if (auth instanceof Response) return auth
  const { roleId } = await params

  const role = await prisma.role.findUnique({
    where: { id: roleId },
    select: {
      id: true,
      name: true,
      isSystem: true,
      isSuperAdmin: true,
      permissions: {
        select: {
          permission: { select: { menuGroup: true, page: true, tab: true, action: true } },
        },
      },
    },
  })
  if (!role) return bad("Role not found.", 404)

  const toKey = (p: { menuGroup: string; page: string; tab: string; action: string }) =>
    p.action !== ""
      ? `${p.menuGroup}::${p.page}::${p.tab}::${p.action}`
      : p.tab !== ""
        ? `${p.menuGroup}::${p.page}::${p.tab}`
        : p.page !== ""
          ? `${p.menuGroup}::${p.page}`
          : p.menuGroup

  return ok({
    ...role,
    permissionKeys: role.isSuperAdmin ? ["*"] : role.permissions.map((rp) => toKey(rp.permission)),
  })
}

// ── PUT /api/permissions/roles/[roleId]/permissions → replace full set ────
// Body: { permissionKeys: string[] } — every key the role should grant after
// this call. Resolves each key to its Permission row and replaces the join.
const ReplacePermsSchema = z.object({
  permissionKeys: z.array(z.string()).max(1000),
})

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ roleId: string }> }
) {
  const auth = await requirePermissionsAdmin()
  if (auth instanceof Response) return auth
  const { roleId } = await params

  const role = await prisma.role.findUnique({ where: { id: roleId } })
  if (!role) return bad("Role not found.", 404)
  if (role.isSuperAdmin) {
    return bad("Super Admin always has full access; its permission set cannot be changed.", 422)
  }

  const body = await request.json().catch(() => null)
  const parsed = ReplacePermsSchema.safeParse(body)
  if (!parsed.success) return bad("Expected { permissionKeys: string[] }.")

  // ── Step 1: Resolve ALL keys to Permission IDs in a SINGLE query ───────
  // This is deliberately OUTSIDE the transaction. The old code ran one
  // findUnique per key (up to ~283 calls) INSIDE a $transaction callback,
  // which held a pooled Supabase connection open for 5–15 seconds. Supavisor
  // (pgbouncer) reclaimed the connection mid-transaction, producing:
  //
  //   "Transaction not found. Transaction ID is invalid, refers to an old
  //    closed transaction Prisma doesn't have information about anymore..."
  //
  // A single findMany with OR conditions is one round-trip and doesn't need
  // a transaction at all — it's just a read.
  const keys = Array.from(new Set(parsed.data.permissionKeys)) // dedupe

  if (keys.length === 0) {
    // Edge case: user cleared every permission. Just delete all grants.
    try {
      await directPrisma.rolePermission.deleteMany({ where: { roleId } })
      await writeRbacAudit({
        actorId: auth.id,
        targetRoleId: roleId,
        action: AUDIT.ROLE_PERMISSIONS_REPLACED,
        details: { roleName: role.name, count: 0 },
      })
      return ok({ roleId, grantedCount: 0 })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to clear permissions."
      console.error("[PUT permissions] clear-all error:", err)
      return bad(message, 500)
    }
  }

  const keyFields = keys.map((key) => keyToFields(key.split("::")))

  let permissions: { id: string; menuGroup: string; page: string; tab: string; action: string }[]
  try {
    permissions = await prisma.permission.findMany({
      where: {
        OR: keyFields.map((f) => ({
          menuGroup: f.menuGroup,
          page: f.page,
          tab: f.tab,
          action: f.action,
        })),
      },
      select: { id: true, menuGroup: true, page: true, tab: true, action: true },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to resolve permission keys."
    console.error("[PUT permissions] findMany error:", err)
    return bad(message, 500)
  }

  // Check for keys that didn't resolve to a Permission row (e.g. the seed
  // hasn't been run, or the registry was updated but the DB wasn't synced).
  const foundSet = new Set(permissions.map(permKey))
  const rejected = keys.filter((k) => !foundSet.has(k))
  if (rejected.length > 0) {
    return bad(
      `Unknown permission keys (not in registry): ${rejected.slice(0, 5).join(", ")}${rejected.length > 5 ? "…" : ""}`,
    )
  }

  const permIds = permissions.map((p) => p.id)

  // ── Step 2: Replace the role's grants in a SHORT transaction ───────────
  // Only 2 queries (delete + create) — completes in milliseconds, well
  // within any pooler timeout. Uses directPrisma (session-mode, port 5432)
  // so the transaction gets a dedicated backend connection that Supavisor
  // cannot reclaim mid-flight.
  try {
    const result = await directPrisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId } })
      if (permIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permIds.map((permissionId) => ({ roleId, permissionId })),
        })
      }
      return permIds.length
    }, {
      timeout: 15_000,  // max time the transaction may take
      maxWait: 10_000,  // max time to wait for a connection slot
    })

    await writeRbacAudit({
      actorId: auth.id,
      targetRoleId: roleId,
      action: AUDIT.ROLE_PERMISSIONS_REPLACED,
      details: { roleName: role.name, count: result },
    })
    return ok({ roleId, grantedCount: result })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to replace permissions."
    console.error("[PUT /api/permissions/roles/[roleId]/permissions] transaction error:", err)
    return bad(message, 500)
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────

// Convert a key's split segments into the Permission natural-key fields.
// tab/action default to "" (empty string), never null — see the Permission
// model note in prisma/schema.prisma.
function keyToFields(parts: string[]): {
  menuGroup: string
  page: string
  tab: string
  action: string
} {
  return {
    menuGroup: parts[0] ?? "",
    page: parts[1] ?? "",
    tab: parts[2] ?? "",
    action: parts[3] ?? "",
  }
}

// Reconstruct the "::"-separated key from a Permission row — used to check
// which requested keys were actually found in the DB.
function permKey(p: { menuGroup: string; page: string; tab: string; action: string }): string {
  return p.action !== ""
    ? `${p.menuGroup}::${p.page}::${p.tab}::${p.action}`
    : p.tab !== ""
      ? `${p.menuGroup}::${p.page}::${p.tab}`
      : p.page !== ""
        ? `${p.menuGroup}::${p.page}`
        : p.menuGroup
}
