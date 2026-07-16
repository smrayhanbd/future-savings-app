import { calculateDues } from "@/lib/dueCalculator"
import prisma from "@/lib/prisma"
import MemberListClient from "./MemberListClient"

export const dynamic = 'force-dynamic'

export default async function MembersPage() {
  // Fetch real members from Supabase
  const dbMembers = await prisma.member.findMany({
    include: { savings: true },
    orderBy: { createdAt: "desc" },
  })

  // Format the data so the Client Component can read it perfectly
  const feeSetups = await prisma.feeSetup.findMany()

  const members = dbMembers.map(m => {
    const totalDeposit = m.savings.filter(s => s.type !== "WITHDRAWAL").reduce((acc, s) => acc + Number(s.amount), 0)
    const totalWithdrawal = m.savings.filter(s => s.type === "WITHDRAWAL").reduce((acc, s) => acc + Number(s.amount), 0)
    
    // Calculate real dues using the engine
    const dues = calculateDues(m.membershipDate || m.createdAt, feeSetups, m.savings)

    return {
      id: m.id,
      fullName: m.fullName,
      memberNo: m.memberNo,
      phone: m.phone,
      email: m.email,
      gender: m.gender || "OTHER",
      status: m.status as "ACTIVE" | "PENDING" | "SUSPENDED",
      nidNumber: m.nidNumber,
      photoUrl: m.photoUrl,
      savings: m.savings.map((s) => ({ amount: Number(s.amount) })),
      createdAt: m.createdAt.toISOString(),
      dueBalance: dues.totalDue,
      lateFines: dues.totalFines // Pass the late fines to the table
    }
  })

  return <MemberListClient members={members} />
}