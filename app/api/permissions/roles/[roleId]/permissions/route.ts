import prisma from "@/lib/prisma"
import { ok, bad, requirePermissionsAdmin, writeRbacAudit, AUDIT } from "@/lib/permissions/api"
import { z } from "zod"
import type { Prisma } from "@prisma/client"

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

  // ── Resolve each key to a Permission id inside a transaction ───────────
  // Keys that don't match a Permission row are reported as rejected so the
  // caller can fix the registry/seed rather than silently dropping them.
  const result = await prisma.$transaction(async (tx) => {
    const rejected: string[] = []
    const permIds: string[] = []
    const seen = new Set<string>()

    for (const key of parsed.data.permissionKeys) {
      if (seen.has(key)) continue
      seen.add(key)
      const parts = key.split("::")
      const fields = keyToFields(parts)
      const perm = await tx.permission.findUnique({
        where: { menuGroup_page_tab_action: fields },
        select: { id: true },
      })
      if (!perm) {
        rejected.push(key)
        continue
      }
      permIds.push(perm.id)
    }

    if (rejected.length > 0) {
      throw new Error(`Unknown permission keys (not in registry): ${rejected.slice(0, 5).join(", ")}${rejected.length > 5 ? "…" : ""}`)
    }

    // Replace the role's grants atomically.
    await tx.rolePermission.deleteMany({ where: { roleId } })
    if (permIds.length > 0) {
      await tx.rolePermission.createMany({
        data: permIds.map((permissionId) => ({ roleId, permissionId })),
      })
    }

    return permIds.length
  }).catch((err: unknown) => {
    throw err instanceof Error ? err : new Error("Failed to replace permissions.")
  })

  await writeRbacAudit({
    actorId: auth.id,
    targetRoleId: roleId,
    action: AUDIT.ROLE_PERMISSIONS_REPLACED,
    details: { roleName: role.name, count: result },
  })
  return ok({ roleId, grantedCount: result })
}

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

// Keep the Prisma import referenced for type-stability of InputJsonValue paths.
export type _Tx = Prisma.TransactionClient
