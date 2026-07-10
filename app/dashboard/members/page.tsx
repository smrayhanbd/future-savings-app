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
  const members = dbMembers.map((m) => {
    const totalSavings = m.savings.reduce((acc, s) => acc + Number(s.amount), 0)
    
    // Calculate Due Balance (Assuming 500 BDT expected per month)
    const joinDate = new Date(m.createdAt)
    const now = new Date()
    const monthsJoined = (now.getFullYear() - joinDate.getFullYear()) * 12 + (now.getMonth() - joinDate.getMonth())
    const expectedAmount = monthsJoined * 500 // You can change 500 to your standard monthly amount
    const dueBalance = Math.max(0, expectedAmount - totalSavings)

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
      dueBalance: dueBalance, // The calculated due amount
    }
  })

  return <MemberListClient members={members} />
}