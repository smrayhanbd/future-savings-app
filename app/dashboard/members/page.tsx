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
    const dues = calculateDues(m.id, m.membershipDate || m.createdAt, feeSetups, m.savings)

    return {
      id: m.id,
      fullName: m.fullName,
      memberNo: m.memberNo,
      phone: m.phone,
      email: m.email,
      gender: m.gender || "OTHER",
      status: m.status as "ACTIVE" | "PENDING" | "SUSPENDED" | "INACTIVE",
      nidNumber: m.nidNumber,
      kycVerified: m.kycVerified || false, // <-- ADD THIS LINE
      photoUrl: m.photoUrl,
      savings: m.savings.map((s) => ({ amount: Number(s.amount) })),
      createdAt: m.createdAt.toISOString(),
      membershipDate: (m.membershipDate || m.createdAt).toISOString(),
      dueBalance: dues.totalDue,
      lateFines: dues.totalFines
    }
  })

  return <MemberListClient members={members} />
}