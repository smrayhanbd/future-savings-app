import prisma from "@/lib/prisma"
import { redirect, notFound } from "next/navigation"
import { getCurrentUser } from "@/lib/permissions"
import { isSuperAdminUser } from "@/lib/permissions/resolver"
import PermissionMatrixClient from "./PermissionMatrixClient"

export const dynamic = "force-dynamic"

// Permission Matrix for a single role. Loads the role's current permission
// key set and hands it (plus the registry) to the client editor.
export default async function RolePermissionMatrixPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getCurrentUser()
  if (!user) redirect("/")
  const allowed = await isSuperAdminUser(user.id)
  if (!allowed) redirect("/dashboard/unauthorized")
  const { id } = await params

  const role = await prisma.role.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      isSystem: true,
      isSuperAdmin: true,
      permissions: {
        select: {
          permission: { select: { menuGroup: true, page: true, tab: true, action: true } },
        },
      },
    },
  })
  if (!role) notFound()
  if (role.isSuperAdmin) redirect("/dashboard/permissions/roles")

  const toKey = (p: { menuGroup: string; page: string; tab: string; action: string }) =>
    p.action !== ""
      ? `${p.menuGroup}::${p.page}::${p.tab}::${p.action}`
      : p.tab !== ""
        ? `${p.menuGroup}::${p.page}::${p.tab}`
        : p.page !== ""
          ? `${p.menuGroup}::${p.page}`
          : p.menuGroup

  const grantedKeys = role.permissions.map((rp) => toKey(rp.permission))

  return (
    <PermissionMatrixClient
      role={{
        id: role.id,
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
      }}
      initialGrantedKeys={grantedKeys}
    />
  )
}
