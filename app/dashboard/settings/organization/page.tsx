import prisma from "@/lib/prisma"
import { redirect } from "next/navigation"
import { getCurrentUser, isSuperAdmin } from "@/lib/permissions"
import OrganizationForm from "./OrganizationForm"

export const dynamic = "force-dynamic"

/**
 * Somiti Settings → Organization Info.
 *
 * Backs the singleton Organization row. Its fields (name, logo, contact,
 * legal, social) appear on every money receipt, voucher, and ledger.
 */
export default async function OrganizationInfoPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/")
  if (!isSuperAdmin(user)) redirect("/dashboard")

  const org = await prisma.organization.findUnique({ where: { id: "singleton" } })

  return (
    <OrganizationForm
      initial={{
        name: org?.name ?? "Future Savings Foundation",
        logo: org?.logo ?? null,
        tagline: org?.tagline ?? "",
        description: org?.description ?? "",
        email: org?.email ?? "",
        phone: org?.phone ?? "",
        website: org?.website ?? "",
        addressLine: org?.addressLine ?? "",
        city: org?.city ?? "",
        district: org?.district ?? "",
        postalCode: org?.postalCode ?? "",
        regNo: org?.regNo ?? "",
        licenseNo: org?.licenseNo ?? "",
        tradeLicenseNo: org?.tradeLicenseNo ?? "",
        establishedYear: org?.establishedYear ?? "",
        facebook: org?.facebook ?? "",
        whatsapp: org?.whatsapp ?? "",
        youtube: org?.youtube ?? "",
      }}
    />
  )
}
