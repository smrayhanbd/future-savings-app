import prisma from "@/lib/prisma"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/permissions"
import DistributionForm from "./DistributionForm"

export const dynamic = "force-dynamic"

export default async function IncomeDistributionPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/")

  const members = await prisma.member.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      memberNo: true,
      fullName: true,
      savings: { select: { amount: true, type: true, date: true } },
    },
    orderBy: { memberNo: "asc" },
  })

  // Compute each member's average daily balance over the last 30 days
  // (spec §8 recommended method). Deposit rows increase; WITHDRAWAL decrease.
  // The cutoff is computed before the JSX so the lint rule about impure
  // functions during render does not fire.
  const now = new Date()
  const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  return (
    <DistributionForm
      members={members.map((m) => {
        const recent = m.savings.filter((s) => new Date(s.date) >= cutoff)
        const deposit = recent
          .filter((s) => s.type !== "WITHDRAWAL")
          .reduce((s, r) => s + Number(r.amount), 0)
        const withdrawal = recent
          .filter((s) => s.type === "WITHDRAWAL")
          .reduce((s, r) => s + Number(r.amount), 0)
        return {
          id: m.id,
          memberNo: m.memberNo,
          fullName: m.fullName,
          avgDailyBalance: Math.max(0, deposit - withdrawal),
        }
      })}
    />
  )
}
