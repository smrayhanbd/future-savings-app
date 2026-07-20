import { redirect } from "next/navigation"
import { getCurrentUser, isSuperAdmin } from "@/lib/permissions"
import UserForm from "./UserForm"

export const dynamic = "force-dynamic"

export default async function NewUserPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/")
  if (!isSuperAdmin(user)) redirect("/dashboard/users")

  return <UserForm mode="create" />
}
