import prisma from "@/lib/prisma"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/permissions"
import WithdrawalForm from "./WithdrawalForm"

export const dynamic = "force-dynamic"

export default async function WithdrawalTransactionsPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/")

  const [members, accounts] = await Promise.all([
    prisma.member.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        memberNo: true,
        fullName: true,
        phone: true,
        savings: { select: { amount: true, type: true } },
      },
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
  ])

  return (
    <WithdrawalForm
      members={members.map((m) => {
        const deposit = m.savings
          .filter((s) => s.type !== "WITHDRAWAL")
          .reduce((s, r) => s + Number(r.amount), 0)
        const withdrawal = m.savings
          .filter((s) => s.type === "WITHDRAWAL")
          .reduce((s, r) => s + Number(r.amount), 0)
        return {
          id: m.id,
          memberNo: m.memberNo,
          fullName: m.fullName,
          phone: m.phone,
          balance: deposit - withdrawal,
        }
      })}
      accounts={accounts.map((a) => ({
        id: a.id,
        accountCode: a.accountCode,
        accountName: a.accountName,
        accountType: a.accountType as "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE",
        isCash: a.isCash,
        isBank: a.isBank,
        currentBalance: Number(a.currentBalance),
      }))}
    />
  )
}
