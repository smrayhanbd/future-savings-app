import prisma from "@/lib/prisma"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/permissions"
import DepositForm from "./DepositForm"

export const dynamic = "force-dynamic"

export default async function DepositTransactionsPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/")

  const [members, accounts, collectionTypes] = await Promise.all([
    prisma.member.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, memberNo: true, fullName: true, phone: true },
      orderBy: { memberNo: "asc" },
    }),
    prisma.account.findMany({
      where: { status: "ACTIVE", allowPosting: true },
      select: {
        id: true,
        accountCode: true,
        accountName: true,
        accountType: true,
        isCash: true,
        isBank: true,
        currentBalance: true,
      },
      orderBy: { accountCode: "asc" },
    }),
    prisma.chargeType.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    }),
  ])

  return (
    <DepositForm
      members={members.map((m) => ({
        id: m.id,
        memberNo: m.memberNo,
        fullName: m.fullName,
        phone: m.phone,
      }))}
      accounts={accounts.map((a) => ({
        id: a.id,
        accountCode: a.accountCode,
        accountName: a.accountName,
        accountType: a.accountType as "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE",
        isCash: a.isCash,
        isBank: a.isBank,
        currentBalance: Number(a.currentBalance),
      }))}
      collectionTypes={collectionTypes.map((c) => ({ id: c.id, name: c.name }))}
    />
  )
}
