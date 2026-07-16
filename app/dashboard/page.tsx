import prisma from "@/lib/prisma"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { calculateDues } from "@/lib/dueCalculator"
import { Users, Wallet, AlertTriangle, Clock, FolderKanban, TrendingUp, TrendingDown, Landmark, Banknote, HandCoins, Scale, ArrowRight, Gem, Cake, MoreHorizontal, Eye, MessageSquare, Mail, BookOpen, PauseCircle, CheckCircle } from "lucide-react"

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
    const dues = calculateDues(m.membershipDate || m.createdAt, feeSetups, m.savings)

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
      dueBalance: dues.totalDue, // Dynamic Due
      lateFines: dues.totalFines // Dynamic Fines
    }
  }).filter((m) => m.dueBalance > 0).slice(0, 10)

  // Calculate Total Dynamic Due for the Stats Card
  const totalDynamicDue = dbMembers.reduce((acc, m) => {
    const dues = calculateDues(m.membershipDate || m.createdAt, feeSetups, m.savings)
    return acc + dues.totalDue
  }, 0)

  // Mock data for Accounting & Operations
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

  // Helper component for compact horizontal cards
  const StatCard = ({ stat }: { stat: any }) => (
    <div className={`p-3 rounded-xl border ${stat.border} ${stat.bg} shadow-sm flex items-center gap-3`}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${stat.bg} border ${stat.border} shrink-0`}>
        <stat.icon className={`h-4 w-4 ${stat.color}`} />
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 leading-tight">
          {stat.label}
        </span>
        <h3 className={`text-base font-bold tracking-tight ${stat.color} leading-tight mt-0.5`}>
          {stat.value}
        </h3>
      </div>
    </div>
  )

  // Groups for Stat Cards
  const group1 = [
    { label: "Total Balance", value: `৳ ${totalBalanceOfSomiti.toLocaleString()}`, icon: Scale, color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-950/40", border: "border-indigo-200 dark:border-indigo-900" },
    { label: "Total Deposit", value: `৳ ${membersTotalDeposit.toLocaleString()}`, icon: Wallet, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/40", border: "border-emerald-200 dark:border-emerald-900" },
    { label: "Total Income", value: `৳ ${totalIncome.toLocaleString()}`, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/40", border: "border-green-200 dark:border-green-900" },
    { label: "Total Expense", value: `৳ ${totalExpense.toLocaleString()}`, icon: TrendingDown, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/40", border: "border-red-200 dark:border-red-900" },
  ]

  const group2 = [
    { label: "Bank Balance", value: `৳ ${bankBookBalance.toLocaleString()}`, icon: Landmark, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/40", border: "border-blue-200 dark:border-blue-900" },
    { label: "Cash in Hand", value: `৳ ${cashInHand.toLocaleString()}`, icon: Banknote, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/40", border: "border-amber-200 dark:border-amber-900" },
    { label: "Fund in Investment", value: `৳ ${fundInInvestment.toLocaleString()}`, icon: Gem, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/40", border: "border-purple-200 dark:border-purple-900" },
  ]

  const group3 = [
    { label: "Paid to Members", value: `৳ ${totalPaymentToMembers.toLocaleString()}`, icon: HandCoins, color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-950/40", border: "border-rose-200 dark:border-rose-900" },
    { label: "Total Due", value: `৳ ${totalDynamicDue.toLocaleString()}`, icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/40", border: "border-orange-200 dark:border-orange-900" },
    { label: "Extra Due", value: `৳ ${extraDue.toLocaleString()}`, icon: AlertTriangle, color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-950/40", border: "border-yellow-200 dark:border-yellow-900" },
    { label: "Fine Amount Due", value: `৳ ${fineAmount.toLocaleString()}`, icon: AlertTriangle, color: "text-red-700", bg: "bg-red-50 dark:bg-red-950/40", border: "border-red-200 dark:border-red-900" },
  ]

  const group4 = [
    { label: "Pending Approvals", value: pendingApprovals, icon: Clock, color: "text-sky-600", bg: "bg-sky-50 dark:bg-sky-950/40", border: "border-sky-200 dark:border-sky-900" },
    { label: "Active Projects", value: activeProjects, icon: FolderKanban, color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-950/40", border: "border-indigo-200 dark:border-indigo-900" },
    { label: "Special Wishes", value: specialWishes, icon: Cake, color: "text-pink-600", bg: "bg-pink-50 dark:bg-pink-950/40", border: "border-pink-200 dark:border-pink-900" },
  ]

  return (
    <div className="space-y-8">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Dashboard Overview</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Welcome back! Here is what&apos;s happening in your foundation today.</p>
        </div>
        <Link href="/dashboard/members/add">
          <Button className="bg-indigo-600 hover:bg-indigo-700">
            <Users className="mr-2 h-4 w-4" /> Add New Member
          </Button>
        </Link>
      </div>

      {/* 2x2 Grid for Groups */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
        
        {/* Group 1 */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-2 shrink-0">
              <Scale className="h-4 w-4" /> Financial Overview
            </h2>
            <div className="flex-1 h-px bg-indigo-200 dark:bg-indigo-900"></div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {group1.map((stat, index) => <StatCard key={index} stat={stat} />)}
          </div>
        </div>

        {/* Group 2 */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-2 shrink-0">
              <Landmark className="h-4 w-4" /> Cash & Investments
            </h2>
            <div className="flex-1 h-px bg-emerald-200 dark:bg-emerald-900"></div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {group2.map((stat, index) => <StatCard key={index} stat={stat} />)}
          </div>
        </div>

        {/* Group 3 */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-2 shrink-0">
              <AlertTriangle className="h-4 w-4" /> Dues & Payments
            </h2>
            <div className="flex-1 h-px bg-rose-200 dark:bg-rose-900"></div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {group3.map((stat, index) => <StatCard key={index} stat={stat} />)}
          </div>
        </div>

        {/* Group 4 */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 flex items-center gap-2 shrink-0">
              <FolderKanban className="h-4 w-4" /> Operations
            </h2>
            <div className="flex-1 h-px bg-sky-200 dark:bg-sky-900"></div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {group4.map((stat, index) => <StatCard key={index} stat={stat} />)}
          </div>
        </div>
      </div>

      {/* Members Due List Table */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-blue-200 dark:border-blue-900 flex items-center justify-between bg-blue-50 dark:bg-blue-950/40">
          <h2 className="font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-blue-600 dark:text-blue-400" /> Members Due List
          </h2>
          <Link href="/dashboard/members" className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
            View All Members <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="overflow-x-auto bg-white dark:bg-slate-950">
          <Table>
            <TableHeader>
              <TableRow className="bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900 hover:bg-blue-50 dark:hover:bg-blue-950/40">
                <TableHead className="uppercase text-xs tracking-wider text-blue-700 dark:text-blue-300">Mem No</TableHead>
                <TableHead className="uppercase text-xs tracking-wider text-blue-700 dark:text-blue-300">Member Name</TableHead>
                <TableHead className="uppercase text-xs tracking-wider text-blue-700 dark:text-blue-300 text-center">Monthly</TableHead>
                <TableHead className="uppercase text-xs tracking-wider text-blue-700 dark:text-blue-300 text-center">Half Yearly</TableHead>
                <TableHead className="uppercase text-xs tracking-wider text-blue-700 dark:text-blue-300 text-center">Picnic Fee</TableHead>
                <TableHead className="uppercase text-xs tracking-wider text-blue-700 dark:text-blue-300 text-center">Annual Fee</TableHead>
                <TableHead className="uppercase text-xs tracking-wider text-blue-700 dark:text-blue-300 text-center">Fine</TableHead>
                <TableHead className="uppercase text-xs tracking-wider text-blue-700 dark:text-blue-300 text-center">Donation</TableHead>
                <TableHead className="uppercase text-xs tracking-wider text-blue-700 dark:text-blue-300 text-right">Total Due</TableHead>
                <TableHead className="uppercase text-xs tracking-wider text-blue-700 dark:text-blue-300 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {membersWithDues.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-slate-500">
                    <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
                    No dues! All active members are fully paid up.
                  </TableCell>
                </TableRow>
              ) : (
                membersWithDues.map((member) => (
                  <TableRow key={member.id} className="border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <TableCell className="font-mono text-xs text-slate-500">{member.memberNo}</TableCell>
                    <TableCell className="font-medium text-slate-900 dark:text-white">{member.fullName}</TableCell>
                    <TableCell className="text-center text-sm text-slate-600 dark:text-slate-400">৳ {member.monthly.toLocaleString()}</TableCell>
                    <TableCell className="text-center text-sm text-slate-600 dark:text-slate-400">{member.halfYearly > 0 ? `৳ ${member.halfYearly.toLocaleString()}` : "-"}</TableCell>
                    <TableCell className="text-center text-sm text-slate-600 dark:text-slate-400">{member.picnic > 0 ? `৳ ${member.picnic.toLocaleString()}` : "-"}</TableCell>
                    <TableCell className="text-center text-sm text-slate-600 dark:text-slate-400">{member.annual > 0 ? `৳ ${member.annual.toLocaleString()}` : "-"}</TableCell>
                    <TableCell className="text-center text-sm text-red-600">{member.fine > 0 ? `৳ ${member.fine.toLocaleString()}` : "-"}</TableCell>
                    <TableCell className="text-center text-sm text-slate-600 dark:text-slate-400">{member.donation > 0 ? `৳ ${member.donation.toLocaleString()}` : "-"}</TableCell>
                    <TableCell className="text-right font-bold text-red-600 dark:text-red-400">৳ {member.dueBalance.toLocaleString()}</TableCell>
                    <TableCell className="text-right relative z-10">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 outline-none cursor-pointer">
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <p className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Due Actions</p>
                          <DropdownMenuItem><Wallet className="mr-2.5 h-4 w-4" /> Receive Due</DropdownMenuItem>
                          <DropdownMenuItem><MessageSquare className="mr-2.5 h-4 w-4" /> Send SMS Reminder</DropdownMenuItem>
                          <DropdownMenuItem><Mail className="mr-2.5 h-4 w-4" /> Send Email</DropdownMenuItem>
                          <DropdownMenuItem><BookOpen className="mr-2.5 h-4 w-4" /> View Ledger</DropdownMenuItem>
                          
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="p-0">
                            <Link href={`/dashboard/members/${member.id}`} className="flex items-center w-full cursor-pointer p-2">
                              <Eye className="mr-2.5 h-4 w-4" /> View Profile
                            </Link>
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-yellow-600 focus:text-yellow-700"><PauseCircle className="mr-2.5 h-4 w-4" /> Suspend Account</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Quick Actions & Pending List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        
        {/* Pending Approvals List */}
        <div className="lg:col-span-2">
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm h-full">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="h-5 w-5 text-indigo-600" /> Pending Approvals
              </h2>
              <Link href="/dashboard/approvals" className="text-xs font-medium text-indigo-600 hover:underline flex items-center gap-1">
                View All <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="p-5">
              {pendingApprovals > 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-sky-500 mx-auto mb-3" />
                  <p className="font-medium text-slate-700 dark:text-slate-300">You have {pendingApprovals} pending application(s).</p>
                  <Link href="/dashboard/approvals" className="mt-4 inline-block">
                    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">Review Now</Button>
                  </Link>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Users className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                  <p className="font-medium">You are all caught up! No pending approvals.</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Quick Links */}
        <div>
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm h-full">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800">
              <h2 className="font-bold text-slate-900 dark:text-white">Quick Actions</h2>
            </div>
            <div className="p-5 grid grid-cols-2 gap-3">
              <Link href="/dashboard/members" className="flex flex-col items-center justify-center p-4 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                <Users className="h-6 w-6 text-indigo-600 mb-2" />
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Members</span>
              </Link>
              <Link href="/dashboard/members/add" className="flex flex-col items-center justify-center p-4 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                <FolderKanban className="h-6 w-6 text-emerald-600 mb-2" />
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Add Member</span>
              </Link>
              <Link href="/dashboard/accounting" className="flex flex-col items-center justify-center p-4 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                <Wallet className="h-6 w-6 text-amber-600 mb-2" />
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Accounting</span>
              </Link>
              <Link href="/dashboard/reports" className="flex flex-col items-center justify-center p-4 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                <TrendingUp className="h-6 w-6 text-purple-600 mb-2" />
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Reports</span>
              </Link>
            </div>
          </Card>
        </div>

      </div>
    </div>
  )
}