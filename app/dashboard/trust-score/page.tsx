import prisma from "@/lib/prisma"
import TrustLeaderboardClient from "./TrustLeaderboardClient"
import Link from "next/link"
import { Settings, Medal } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function TrustLeaderboardPage() {
  const members = await prisma.member.findMany({
    where: { status: { in: ["ACTIVE", "SUSPENDED", "INACTIVE"] } },
    select: {
      id: true,
      fullName: true,
      memberNo: true,
      photoUrl: true,
      status: true,
      trustScore: true,
      badgeLevel: true,
      riskLevel: true,
      scoreLastUpdated: true,
    },
    orderBy: { trustScore: "desc" },
  })

  const serialized = members.map((m) => ({
    ...m,
    scoreLastUpdated: m.scoreLastUpdated?.toISOString() ?? null,
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Trust Score Leaderboard
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Member performance ranking by Trust Score. Scores update automatically from savings, loans, attendance, fines, and referrals.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/trust-score/badges"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <Medal className="w-4 h-4" /> Badges
          </Link>
          <Link
            href="/dashboard/trust-score/config"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl"
          >
            <Settings className="w-4 h-4" /> Score Settings
          </Link>
        </div>
      </div>

      <TrustLeaderboardClient members={serialized} />
    </div>
  )
}
