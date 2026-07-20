import prisma from "@/lib/prisma"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/permissions"
import ChargeForm from "./ChargeForm"

export const dynamic = "force-dynamic"

export default async function ChargeTransactionsPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/")

  const members = await prisma.member.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      memberNo: true,
      fullName: true,
      savings: { select: { amount: true, type: true } },
    },
    orderBy: { memberNo: "asc" },
  })

  return (
    <ChargeForm
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
          balance: deposit - withdrawal,
        }
      })}
    />
  )
}
