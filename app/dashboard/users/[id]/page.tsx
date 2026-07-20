import prisma from "@/lib/prisma"
import { redirect, notFound } from "next/navigation"
import { getCurrentUser, isSuperAdmin } from "@/lib/permissions"
import UserEditClient from "./UserEditClient"

export const dynamic = "force-dynamic"

export default async function UserEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) redirect("/")

  const target = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      isActive: true,
      lastLogin: true,
      createdAt: true,
      createdBy: true,
      permissions: { select: { permission: true } },
    },
  })
  if (!target) notFound()

  return (
    <UserEditClient
      user={{
        id: target.id,
        email: target.email,
        name: target.name,
        phone: target.phone,
        role: target.role,
        isActive: target.isActive,
        lastLogin: target.lastLogin?.toISOString() ?? null,
        createdAt: target.createdAt.toISOString(),
        createdBy: target.createdBy,
        permissions: target.permissions.map((p) => p.permission),
      }}
      canManage={isSuperAdmin(user)}
      currentUserId={user.id}
    />
  )
}
