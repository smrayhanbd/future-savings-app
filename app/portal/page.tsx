import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { calculateDues } from "@/lib/dueCalculator"
import Sparkline from "@/components/portal/Sparkline"
import {
  Wallet, TrendingUp, AlertTriangle, Receipt, CalendarDays, MapPin,
  ArrowRight, HandCoins, BadgeCheck, Clock, FilePlus2,
} from "lucide-react"

export const dynamic = "force-dynamic"

// Loan status -> badge classes (kept in sync with the admin dashboard palette).
const LOAN_STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  APPROVED: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  DISBURSED: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  REPAID: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  CLOSED: "bg-slate-500/10 text-slate-600 border-slate-500/20",
  DEFAULTED: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  WRITTEN_OFF: "bg-rose-500/10 text-rose-600 border-rose-500/20",
  REJECTED: "bg-rose-500/10 text-rose-600 border-rose-500/20",
}

const SAVINGS_TYPE_STYLES: Record<string, string> = {
  WITHDRAWAL: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400",
  FINE: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400",
  LOAN_PAYMENT: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400",
}

export default async function PortalDashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "MEMBER") {
    redirect("/")
  }

  const memberId = session.user.id

  // Fetch everything we need in parallel.
  const [member, meetings, feeSetups, activeLoans] = await Promise.all([
    prisma.member.findUnique({
      where: { id: memberId },
      include: { savings: { orderBy: { date: "desc" } } },
    }),
    prisma.meeting.findMany({
      where: { date: { gte: new Date() } },
      orderBy: { date: "asc" },
      take: 3,
    }),
    prisma.feeSetup.findMany(),
    prisma.loan.findMany({
      where: { memberId, status: { in: ["DISBURSED", "DEFAULTED"] } },
      include: { product: true },
      orderBy: { createdAt: "desc" },
    }),
  ])

  if (!member) redirect("/")

  // --- Financials ---
  const joinDate = member.membershipDate || member.createdAt
  const dues = calculateDues(member.id, joinDate, feeSetups, member.savings)

  const totalDeposit = member.savings
    .filter((s) => s.type !== "WITHDRAWAL")
    .reduce((acc, s) => acc + Number(s.amount), 0)
  const totalWithdrawal = member.savings
    .filter((s) => s.type === "WITHDRAWAL")
    .reduce((acc, s) => acc + Number(s.amount), 0)
  const currentBalance = totalDeposit - totalWithdrawal

  // --- Sparkline: deposits over the last 6 months ---
  const trend = buildMonthlyTrend(member.savings, 6)

  const stats = [
    {
      label: "Current Balance",
      value: `৳ ${currentBalance.toLocaleString()}`,
      icon: Wallet,
      color: "text-emerald-600",
      iconBg: "bg-emerald-100 dark:bg-emerald-950/50",
      border: "border-emerald-200/60 dark:border-emerald-900/40",
    },
    {
      label: "Total Deposited",
      value: `৳ ${Number(dues.totalPaid).toLocaleString()}`,
      icon: TrendingUp,
      color: "text-blue-600",
      iconBg: "bg-blue-100 dark:bg-blue-950/50",
      border: "border-blue-200/60 dark:border-blue-900/40",
    },
    {
      label: "Late Fines",
      value: `৳ ${Number(dues.totalFines).toLocaleString()}`,
      icon: AlertTriangle,
      color: "text-rose-600",
      iconBg: "bg-rose-100 dark:bg-rose-950/50",
      border: "border-rose-200/60 dark:border-rose-900/40",
    },
    {
      label: "Net Due Balance",
      value: `৳ ${Number(dues.totalDue).toLocaleString()}`,
      icon: Receipt,
      color: "text-amber-600",
      iconBg: "bg-amber-100 dark:bg-amber-950/50",
      border: "border-amber-200/60 dark:border-amber-900/40",
    },
  ]

  const totalOutstanding = activeLoans.reduce((acc, l) => acc + Number(l.outstandingBalance), 0)
  const nextDue = activeLoans
    .map((l) => l.nextDueDate)
    .filter(Boolean)
    .sort((a, b) => new Date(a!).getTime() - new Date(b!).getTime())[0]
  const recentSavings = member.savings.slice(0, 5)
  const firstName = member.fullName.split(" ")[0]

  return (
    <div className="space-y-6">
      {/* Welcome / hero header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 shadow-xl">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute -top-10 -right-10 h-48 w-48 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute -bottom-16 -left-10 h-56 w-56 rounded-full bg-fuchsia-400/30 blur-3xl" />
        </div>
        <div className="relative p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-5 justify-between">
          <div className="flex items-center gap-4">
            {member.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={member.photoUrl}
                alt={member.fullName}
                className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl object-cover ring-4 ring-white/30 shadow-lg"
              />
            ) : (
              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-2xl sm:text-3xl font-bold text-white ring-4 ring-white/30 shadow-lg">
                {firstName.charAt(0)}
              </div>
            )}
            <div className="text-white">
              <p className="text-xs font-medium text-indigo-100 uppercase tracking-wider">Welcome back</p>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{firstName}!</h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-mono font-medium backdrop-blur">
                  {member.memberNo}
                </span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  member.status === "ACTIVE"
                    ? "bg-emerald-400/25 text-emerald-50"
                    : "bg-amber-400/25 text-amber-50"
                }`}>
                  {member.status}
                </span>
                {member.kycVerified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium backdrop-blur">
                    <BadgeCheck className="h-3 w-3" /> KYC Verified
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="hidden sm:block text-right text-white">
            <p className="text-xs font-medium text-indigo-100 uppercase tracking-wider">Member since</p>
            <p className="text-lg font-semibold">
              {new Date(joinDate).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </p>
            <Link href="/portal/loans/apply">
              <Button className="mt-2 bg-white text-indigo-700 hover:bg-indigo-50 shadow-sm" size="sm">
                <FilePlus2 className="h-4 w-4 mr-1.5" /> Apply for Loan
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card
            key={stat.label}
            className={`bg-white dark:bg-slate-900 border ${stat.border} shadow-sm rounded-2xl overflow-hidden`}
          >
            <CardContent className="p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-widest font-bold text-slate-500 dark:text-slate-400">
                  {stat.label}
                </span>
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${stat.iconBg}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </div>
              <h3 className={`text-2xl font-extrabold tracking-tight ${stat.color}`}>{stat.value}</h3>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Savings trend + active loans summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/70 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200/60 dark:border-slate-800/60 px-6 py-4 flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm text-slate-800 dark:text-white">
              <TrendingUp className="h-4 w-4 text-indigo-500" /> Savings Trend
              <span className="text-xs font-normal text-slate-400">Last 6 months</span>
            </CardTitle>
            <Link href="/portal/savings">
              <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700">
                View all <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-6">
            <Sparkline data={trend} height={64} />
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/70 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200/60 dark:border-slate-800/60 px-6 py-4">
            <CardTitle className="flex items-center gap-2 text-sm text-slate-800 dark:text-white">
              <HandCoins className="h-4 w-4 text-amber-500" /> Active Loans
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3">
                <p className="text-[11px] uppercase font-bold tracking-wider text-slate-400">Outstanding</p>
                <p className="text-lg font-bold text-rose-600 mt-0.5">
                  ৳ {totalOutstanding.toLocaleString()}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3">
                <p className="text-[11px] uppercase font-bold tracking-wider text-slate-400">Active Loans</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{activeLoans.length}</p>
              </div>
            </div>
            {nextDue && (
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                <Clock className="h-3.5 w-3.5 text-amber-500" />
                Next installment due:{" "}
                <span className="font-semibold">
                  {new Date(nextDue).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
            )}
            <Link href="/portal/loans">
              <Button variant="outline" className="w-full" size="sm">
                Manage loans <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Lower split: meetings + recent transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Meetings */}
        <Card className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/70 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200/60 dark:border-slate-800/60 px-6 py-4">
            <CardTitle className="flex items-center gap-2 text-sm text-slate-800 dark:text-white">
              <CalendarDays className="h-4 w-4 text-indigo-500" /> Upcoming Meetings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-3">
            {meetings.length === 0 ? (
              <div className="text-center py-8">
                <CalendarDays className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No upcoming meetings scheduled.</p>
              </div>
            ) : (
              meetings.map((m) => (
                <div
                  key={m.id}
                  className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 hover:border-indigo-200 dark:hover:border-indigo-900 transition-colors"
                >
                  <h4 className="font-bold text-slate-900 dark:text-white">{m.title}</h4>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-1">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {new Date(m.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                    {m.location && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" /> {m.location}
                      </span>
                    )}
                  </div>
                  {m.agenda && <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 line-clamp-2">{m.agenda}</p>}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/70 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200/60 dark:border-slate-800/60 px-6 py-4 flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm text-slate-800 dark:text-white">
              <Receipt className="h-4 w-4 text-indigo-500" /> Recent Transactions
            </CardTitle>
            <Link href="/portal/savings">
              <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700">
                All <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-slate-200/60 dark:border-slate-800/60 hover:bg-transparent">
                  <TableHead className="px-6 py-3 text-[11px] uppercase tracking-widest font-bold text-slate-400">Date</TableHead>
                  <TableHead className="px-6 py-3 text-[11px] uppercase tracking-widest font-bold text-slate-400">Type</TableHead>
                  <TableHead className="px-6 py-3 text-right text-[11px] uppercase tracking-widest font-bold text-slate-400">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSavings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-10 text-slate-500">
                      No transactions yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  recentSavings.map((sav) => (
                    <TableRow
                      key={sav.id}
                      className="border-b border-slate-100 dark:border-slate-800/50 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                    >
                      <TableCell className="px-6 py-3 text-sm text-slate-700 dark:text-slate-200">
                        {new Date(sav.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </TableCell>
                      <TableCell className="px-6 py-3">
                        <Badge
                          variant="outline"
                          className={SAVINGS_TYPE_STYLES[sav.type] || "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300"}
                        >
                          {sav.type.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={`px-6 py-3 text-right font-bold text-sm ${sav.type === "WITHDRAWAL" ? "text-rose-600" : "text-emerald-600"}`}
                      >
                        {sav.type === "WITHDRAWAL" ? "− " : "+ "}৳ {Number(sav.amount).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Build a { label, value }[] series of deposit totals per month, for the last `months` months.
// Excludes WITHDRAWAL rows (consistent with how deposits are computed elsewhere).
function buildMonthlyTrend(
  savings: { amount: unknown; type: string; date: Date }[],
  months: number
): { label: string; value: number }[] {
  const now = new Date()
  const buckets: { key: string; label: string; value: number }[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    buckets.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleString(undefined, { month: "short" }),
      value: 0,
    })
  }
  const index = new Map(buckets.map((b, i) => [b.key, i]))
  for (const s of savings) {
    if (s.type === "WITHDRAWAL") continue
    const d = new Date(s.date)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    const i = index.get(key)
    if (i !== undefined) buckets[i].value += Number(s.amount)
  }
  return buckets.map((b) => ({ label: b.label, value: b.value }))
}
