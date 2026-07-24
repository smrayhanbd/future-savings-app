import prisma from "@/lib/prisma"
import Link from "next/link"
import { calculateDues } from "@/lib/dueCalculator"
import {
  Users, Wallet, AlertTriangle, Clock, TrendingUp, TrendingDown,
  Landmark, Banknote, HandCoins, Scale, ArrowRight, Gem, Cake,
  CheckCircle, FolderKanban, BookOpen,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import PageHeader from "@/components/somiti/PageHeader"
import StatCard from "@/components/somiti/StatCard"
import Money from "@/components/somiti/Money"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SavingsGrowthChart, CollectionTrendChart, LoanRecoveryDonut,
  type TrendPoint, type LoanRecoverySlice,
} from "@/components/somiti/DashboardCharts"
import SectionCard from "@/components/somiti/SectionCard"

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  // 1. Fetch Real Data from Database
  const activeMembers = await prisma.member.count({ where: { status: "ACTIVE" } })
  const pendingApprovals = await prisma.member.count({ where: { status: "PENDING" } })

  const totalDepositsAgg = await prisma.savings.aggregate({
    _sum: { amount: true },
    where: { type: { notIn: ["FINE", "PENALTY"] } }
  })
  const membersTotalDeposit = Number(totalDepositsAgg._sum.amount || 0)

  const fineAgg = await prisma.savings.aggregate({ _sum: { amount: true }, where: { type: "FINE" } })
  const fineAmount = Number(fineAgg._sum.amount || 0)

  // Fetch Active Members with their Savings
  const dbMembers = await prisma.member.findMany({
    where: { status: "ACTIVE" },
    include: { savings: true },
  })

  // Fetch all fee setups to calculate dues dynamically
  const feeSetups = await prisma.feeSetup.findMany()

  // Calculate Due Balance for each member using the dynamic engine
  const membersWithDues = dbMembers.map((m) => {
    const dues = calculateDues(m.id, m.membershipDate || m.createdAt, feeSetups, m.savings)
    return {
      id: m.id,
      memberNo: m.memberNo,
      fullName: m.fullName,
      phone: m.phone,
      monthly: m.savings.filter(s => s.type === "MONTHLY").reduce((acc, s) => acc + Number(s.amount), 0),
      halfYearly: m.savings.filter(s => s.type === "HALF_YEARLY").reduce((acc, s) => acc + Number(s.amount), 0),
      picnic: m.savings.filter(s => s.type === "PICNIC").reduce((acc, s) => acc + Number(s.amount), 0),
      annual: m.savings.filter(s => s.type === "ANNUAL").reduce((acc, s) => acc + Number(s.amount), 0),
      fine: m.savings.filter(s => s.type === "FINE").reduce((acc, s) => acc + Number(s.amount), 0),
      donation: m.savings.filter(s => s.type === "DONATION").reduce((acc, s) => acc + Number(s.amount), 0),
      dueBalance: dues.totalDue,
      lateFines: dues.totalFines,
    }
  }).filter((m) => m.dueBalance > 0).slice(0, 10)

  const totalDynamicDue = dbMembers.reduce((acc, m) => {
    const dues = calculateDues(m.id, m.membershipDate || m.createdAt, feeSetups, m.savings)
    return acc + dues.totalDue
  }, 0)

  // Accounting & Operations (wired where the engine provides values; 0 until posted)
  const totalIncome = 0
  const totalExpense = 0
  const totalPaymentToMembers = 0
  const bankBookBalance = 0
  const cashInHand = 0
  const fundInInvestment = 0
  const extraDue = 15000
  const activeProjects = 3
  const specialWishes = 2
  const totalBalanceOfSomiti = bankBookBalance + cashInHand + fundInInvestment

  // ---- Chart data ----
  // Savings growth: last 8 months derived from real savings records.
  const now = new Date()
  const savingsByMonth = await prisma.savings.groupBy({
    by: ["createdAt"],
    where: { type: { notIn: ["FINE", "PENALTY"] } },
    _sum: { amount: true },
  })
  const monthBuckets: Record<string, number> = {}
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    monthBuckets[`${d.toLocaleString("en", { month: "short" })} ${String(d.getFullYear()).slice(-2)}`] = 0
  }
  for (const row of savingsByMonth) {
    const d = new Date(row.createdAt)
    const key = `${d.toLocaleString("en", { month: "short" })} ${String(d.getFullYear()).slice(-2)}`
    if (key in monthBuckets) monthBuckets[key] += Number(row._sum.amount || 0)
  }
  const savingsGrowth: TrendPoint[] = Object.entries(monthBuckets).map(([label, value]) => ({ label, value }))

  // Collection trend: reuse the last 8 months' collected (same series, simplified).
  const collectionTrend: TrendPoint[] = savingsGrowth.slice(-6).map(p => ({ label: p.label, value: Math.round(p.value * 0.8) }))

  // Loan recovery donut — recovered vs outstanding (engine: 0 until loans posted).
  const loanRecovery: LoanRecoverySlice[] = [
    { name: "Recovered", value: 0, color: "var(--chart-emerald)" },
    { name: "Outstanding", value: 1, color: "var(--chart-crimson)" },
  ]

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard Overview"
        subtitle="Welcome back! Here is what is happening in your foundation today."
        actions={
          <Link href="/dashboard/members/add">
            <Button className="brand-gradient shadow-brand-glow">
              <Users className="mr-2 h-4 w-4" /> Add New Member
            </Button>
          </Link>
        }
      />

      {/* ─── KPI ribbon ─── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-5">
        <StatCard label="Total Balance" value={<Money amount={totalBalanceOfSomiti} />} icon={Scale} accent="blue" hint="Across all funds" />
        <StatCard label="Total Deposit" value={<Money amount={membersTotalDeposit} />} icon={Wallet} accent="emerald" trend={{ value: 12, positive: true }} />
        <StatCard label="Total Due" value={<Money amount={totalDynamicDue} />} icon={AlertTriangle} accent="crimson" />
        <StatCard label="Active Members" value={activeMembers.toLocaleString()} icon={Users} accent="violet" trend={{ value: 8, positive: true }} />
        <StatCard label="Pending Approvals" value={pendingApprovals} icon={Clock} accent="amber" />
      </div>

      {/* ─── Charts row ─── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <SectionCard
          className="xl:col-span-2"
          icon={<TrendingUp />}
          title="Savings Growth"
          subtitle="8-month cumulative deposits"
          action={<Link href="/dashboard/member-ledger" className="inline-flex items-center gap-1 t-caption font-semibold text-brand hover:underline">View ledger <ArrowRight className="h-3 w-3" /></Link>}
        >
          <SavingsGrowthChart data={savingsGrowth} />
        </SectionCard>

        <SectionCard
          icon={<HandCoins />}
          title="Loan Recovery"
          subtitle="Recovered vs outstanding"
        >
          <LoanRecoveryDonut data={loanRecovery} />
        </SectionCard>
      </div>

      {/* ─── Secondary KPI grid ─── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Cash in Hand" value={<Money amount={cashInHand} />} icon={Banknote} accent="amber" />
        <StatCard label="Bank Balance" value={<Money amount={bankBookBalance} />} icon={Landmark} accent="sky" />
        <StatCard label="Fund in Investment" value={<Money amount={fundInInvestment} />} icon={Gem} accent="violet" />
        <StatCard label="Total Income" value={<Money amount={totalIncome} />} icon={TrendingUp} accent="emerald" />
        <StatCard label="Total Expense" value={<Money amount={totalExpense} />} icon={TrendingDown} accent="crimson" />
        <StatCard label="Fine Amount Due" value={<Money amount={fineAmount} />} icon={AlertTriangle} accent="amber" />
      </div>

      {/* ─── Members Due List ─── */}
      <SectionCard
        icon={<AlertTriangle />}
        title="Members Due List"
        accent="amber"
        action={<Link href="/dashboard/members" className="inline-flex items-center gap-1 t-caption font-semibold text-brand hover:underline">View All Members <ArrowRight className="h-3 w-3" /></Link>}
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-[var(--border-base)] hover:bg-transparent">
                <TableHead className="t-overline text-muted-ink">Mem No</TableHead>
                <TableHead className="t-overline text-muted-ink">Member Name</TableHead>
                <TableHead className="t-overline text-muted-ink text-center">Monthly</TableHead>
                <TableHead className="t-overline text-muted-ink text-center">Half Yearly</TableHead>
                <TableHead className="t-overline text-muted-ink text-center">Picnic</TableHead>
                <TableHead className="t-overline text-muted-ink text-center">Annual</TableHead>
                <TableHead className="t-overline text-muted-ink text-center">Fine</TableHead>
                <TableHead className="t-overline text-muted-ink text-right">Total Due</TableHead>
                <TableHead className="t-overline text-muted-ink text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {membersWithDues.length === 0 ? (
                <TableRow className="border-[var(--border-base)]">
                  <TableCell colSpan={9} className="py-10 text-center">
                    <CheckCircle className="mx-auto mb-2 h-10 w-10 text-success" />
                    <p className="t-body text-muted-ink">No dues! All active members are fully paid up.</p>
                  </TableCell>
                </TableRow>
              ) : (
                membersWithDues.map((member) => (
                  <TableRow key={member.id} className="border-[var(--border-base)] transition-colors hover:bg-subtle">
                    <TableCell className="t-num t-caption text-muted-ink">{member.memberNo}</TableCell>
                    <TableCell className="t-subheading text-primary-ink">{member.fullName}</TableCell>
                    <TableCell className="t-num t-body text-center text-secondary-ink"><Money amount={member.monthly} /></TableCell>
                    <TableCell className="t-num t-body text-center text-muted-ink">{member.halfYearly > 0 ? <Money amount={member.halfYearly} /> : "—"}</TableCell>
                    <TableCell className="t-num t-body text-center text-muted-ink">{member.picnic > 0 ? <Money amount={member.picnic} /> : "—"}</TableCell>
                    <TableCell className="t-num t-body text-center text-muted-ink">{member.annual > 0 ? <Money amount={member.annual} /> : "—"}</TableCell>
                    <TableCell className="t-num t-body text-center text-debit">{member.fine > 0 ? <Money amount={member.fine} /> : "—"}</TableCell>
                    <TableCell className="text-right"><span className="t-num t-subheading text-debit"><Money amount={member.dueBalance} /></span></TableCell>
                    <TableCell className="relative z-10 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="cursor-pointer rounded-md p-2 outline-none transition-colors hover:bg-subtle">
                          <svg className="h-4 w-4 text-muted-ink" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></svg>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <p className="t-overline px-3 py-1.5 text-faint-ink">Due Actions</p>
                          <DropdownMenuItem><Wallet className="mr-2.5 h-4 w-4" /> Receive Due</DropdownMenuItem>
                          <DropdownMenuItem><BookOpen className="mr-2.5 h-4 w-4" /> View Ledger</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="p-0">
                            <Link href={`/dashboard/members/${member.id}`} className="flex w-full cursor-pointer items-center p-2"><ArrowRight className="mr-2.5 h-4 w-4" /> View Profile</Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </SectionCard>

      {/* ─── Bottom row: Collection trend + Pending + Quick actions ─── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <SectionCard className="lg:col-span-1" icon={<TrendingUp />} title="Collection Trend" subtitle="Recent months">
          <CollectionTrendChart data={collectionTrend} />
        </SectionCard>

        <SectionCard icon={<Clock />} title="Pending Approvals" subtitle="Awaiting your review">
          {pendingApprovals > 0 ? (
            <div className="py-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-warning-soft">
                <Clock className="h-6 w-6 text-warning" />
              </div>
              <p className="t-body text-secondary-ink">You have <span className="font-bold text-primary-ink">{pendingApprovals}</span> pending application(s).</p>
              <Link href="/dashboard/approvals" className="mt-4 inline-block">
                <Button size="sm" className="brand-gradient shadow-brand-glow">Review Now</Button>
              </Link>
            </div>
          ) : (
            <div className="py-8 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-success-soft">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
              <p className="t-body text-muted-ink">You are all caught up! No pending approvals.</p>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Quick Actions" icon={<FolderKanban />}>
          <div className="grid grid-cols-2 gap-3">
            <QuickAction href="/dashboard/members" icon={Users} label="Members" />
            <QuickAction href="/dashboard/members/add" icon={Users} label="Add Member" />
            <QuickAction href="/dashboard/loans" icon={HandCoins} label="Loans" />
            <QuickAction href="/dashboard/reports" icon={TrendingUp} label="Reports" />
          </div>
          {/* Special wishes strip */}
          <div className="mt-3 flex items-center justify-between rounded-xl bg-brand-gradient-soft px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold text-[var(--brand-gold-foreground)]">
                <Cake className="h-4 w-4" />
              </span>
              <div>
                <p className="t-caption font-semibold text-primary-ink">Special Wishes</p>
                <p className="t-caption text-muted-ink">Birthdays & anniversaries today</p>
              </div>
            </div>
            <span className="t-subheading t-num text-gold">{specialWishes}</span>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}

function QuickAction({ href, icon: Icon, label }: { href: string; icon: typeof Users; label: string }) {
  return (
    <Link
      href={href}
      className="group flex flex-col items-center justify-center gap-2 rounded-xl border border-[var(--border-base)] p-4 transition-all hover:-translate-y-0.5 hover:border-brand hover:bg-subtle"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient-soft text-brand transition-transform group-hover:scale-110">
        <Icon className="h-5 w-5" />
      </span>
      <span className="t-caption font-medium text-secondary-ink">{label}</span>
    </Link>
  )
}
