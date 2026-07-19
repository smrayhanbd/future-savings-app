"use client"

// Trust Score leaderboard (FRS §11, §17 GET /api/members/leaderboard).
//
// System-wide ranking with summary stat cards (avg score, tier distribution,
// suspended count), search, and per-row links to the detail dashboard.

import { useState, useMemo } from "react"
import Link from "next/link"
import { Award, Search, Trophy, TrendingUp, AlertTriangle, ShieldCheck } from "lucide-react"

interface LeaderMember {
  id: string
  fullName: string
  memberNo: string
  photoUrl: string | null
  status: string
  trustScore: number
  badgeLevel: string
  riskLevel: string
  scoreLastUpdated: string | null
}

export default function TrustLeaderboardClient({
  members,
}: {
  members: LeaderMember[]
}) {
  const [search, setSearch] = useState("")
  const [tierFilter, setTierFilter] = useState<string>("all")

  const filtered = useMemo(() => {
    let r = [...members].sort((a, b) => b.trustScore - a.trustScore)
    if (search) {
      const q = search.toLowerCase()
      r = r.filter(
        (m) =>
          m.fullName.toLowerCase().includes(q) ||
          m.memberNo.toLowerCase().includes(q)
      )
    }
    if (tierFilter !== "all") r = r.filter((m) => badgeTier(m.trustScore) === tierFilter)
    return r
  }, [members, search, tierFilter])

  const avg = members.length
    ? Math.round(members.reduce((s, m) => s + m.trustScore, 0) / members.length)
    : 0
  const suspended = members.filter((m) => m.status === "SUSPENDED").length
  const diamond = members.filter((m) => m.trustScore >= 90).length

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Trophy className="w-5 h-5" />} label="Average Score" value={avg} tone="indigo" />
        <StatCard icon={<Award className="w-5 h-5" />} label="Diamond Members" value={diamond} tone="violet" />
        <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Total Scored" value={members.length} tone="emerald" />
        <StatCard icon={<AlertTriangle className="w-5 h-5" />} label="Suspended" value={suspended} tone="red" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search members by name or ID..."
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
          className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
        >
          <option value="all">All Tiers</option>
          <option value="diamond">💎 Diamond (90+)</option>
          <option value="platinum">🏆 Platinum (80–89)</option>
          <option value="gold">🥇 Gold (70–79)</option>
          <option value="silver">🥈 Silver (60–69)</option>
          <option value="warning">⚠️ Needs Improvement (50–59)</option>
          <option value="highrisk">🚨 High Risk (40–49)</option>
          <option value="suspended">❌ Suspended (&lt;40)</option>
        </select>
      </div>

      {/* Leaderboard */}
      <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 text-left w-12">#</th>
                <th className="px-4 py-3 text-left">Member</th>
                <th className="px-4 py-3 text-center">Score</th>
                <th className="px-4 py-3 text-left">Badge</th>
                <th className="px-4 py-3 text-left">Risk</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No members match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((m, i) => (
                  <tr
                    key={m.id}
                    className="border-b border-slate-100 dark:border-slate-800/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-900/50"
                  >
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                          i === 0
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                            : i === 1
                            ? "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            : i === 2
                            ? "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400"
                            : "text-slate-400"
                        }`}
                      >
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {m.photoUrl ? (
                          <img src={m.photoUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-950/40 flex items-center justify-center text-sm font-bold text-indigo-600">
                            {m.fullName.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-sm text-slate-900 dark:text-white">{m.fullName}</p>
                          <p className="text-xs font-mono text-slate-400">{m.memberNo}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xl font-extrabold ${scoreColor(m.trustScore)}`}>{m.trustScore}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                      {emojiForBadge(m.badgeLevel)} {m.badgeLevel}
                    </td>
                    <td className="px-4 py-3">
                      <RiskBadge risk={m.riskLevel} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusPill status={m.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/trust-score/${m.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" /> View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function badgeTier(score: number): string {
  if (score >= 90) return "diamond"
  if (score >= 80) return "platinum"
  if (score >= 70) return "gold"
  if (score >= 60) return "silver"
  if (score >= 50) return "warning"
  if (score >= 40) return "highrisk"
  return "suspended"
}

function emojiForBadge(label: string): string {
  if (label.includes("Diamond")) return "💎"
  if (label.includes("Platinum")) return "🏆"
  if (label.includes("Gold")) return "🥇"
  if (label.includes("Silver")) return "🥈"
  if (label.includes("Improvement")) return "⚠️"
  if (label.includes("High Risk")) return "🚨"
  return "❌"
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400"
  if (score >= 60) return "text-indigo-600 dark:text-indigo-400"
  if (score >= 40) return "text-amber-600 dark:text-amber-400"
  return "text-red-600 dark:text-red-400"
}

function RiskBadge({ risk }: { risk: string }) {
  const map: Record<string, string> = {
    "Low Risk": "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400",
    Average: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400",
    "Elevated Risk": "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400",
    "High Risk": "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400",
  }
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${map[risk] || map.Average}`}>
      {risk}
    </span>
  )
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400",
    SUSPENDED: "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400",
    INACTIVE: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
    PENDING: "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400",
  }
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${map[status] || map.INACTIVE}`}>
      {status}
    </span>
  )
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: number
  tone: "indigo" | "violet" | "emerald" | "red"
}) {
  const tones: Record<string, string> = {
    indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900",
    violet: "bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300 border-violet-200 dark:border-violet-900",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900",
    red: "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300 border-red-200 dark:border-red-900",
  }
  return (
    <div className={`rounded-2xl border p-4 ${tones[tone]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
        <div className="w-8 h-8 rounded-lg bg-white/50 dark:bg-slate-900/50 flex items-center justify-center">
          {icon}
        </div>
      </div>
      <p className="text-2xl font-extrabold">{value.toLocaleString()}</p>
    </div>
  )
}
