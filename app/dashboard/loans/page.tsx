import prisma from "@/lib/prisma"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  HandCoins, PlusCircle, PackagePlus, FileSignature, Wallet,
  TrendingUp, AlertTriangle, Clock, Eye, ArrowRight,
} from "lucide-react"
import LoanProductManager, { type ProductRow } from "./products/LoanProductManager"
import ApplicationsTable, { type ApplicationRow } from "./ApplicationsTable"

export const dynamic = 'force-dynamic'

const STATUS_STYLES: Record<string, string> = {
  DISBURSED: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  REPAID: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  CLOSED: "bg-slate-500/10 text-slate-600 border-slate-500/20",
  DEFAULTED: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  WRITTEN_OFF: "bg-rose-500/10 text-rose-600 border-rose-500/20",
}

export default async function LoansHubPage() {
  const [loans, applications, products] = await Promise.all([
    prisma.loan.findMany({
      where: { status: { in: ["DISBURSED", "REPAID", "DEFAULTED", "CLOSED", "WRITTEN_OFF"] } },
      include: { member: true, product: true },
      orderBy: { disbursedDate: "desc" },
    }),
    prisma.loan.findMany({
      where: { status: { in: ["PENDING", "APPROVED"] } },
      include: { member: true, product: true },
      orderBy: { applicationDate: "desc" },
    }),
    prisma.loanProduct.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { loans: true } } },
    }),
  ])

  // KPIs
  const totalDisbursed = loans
    .filter((l) => ["DISBURSED", "REPAID", "DEFAULTED"].includes(l.status))
    .reduce((sum, l) => sum + Number(l.principal), 0)
  const totalOutstanding = loans
    .filter((l) => ["DISBURSED", "DEFAULTED"].includes(l.status))
    .reduce((sum, l) => sum + Number(l.outstandingBalance), 0)
  const totalCollectedInterest = loans.reduce((sum, l) => sum + Number(l.interestPaid), 0)
  const overdueCount = loans.filter((l) => l.status === "DISBURSED" && l.nextDueDate && new Date(l.nextDueDate) < new Date()).length
  const pendingCount = applications.filter((a) => a.status === "PENDING").length

  const serializedProducts: ProductRow[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    code: p.code,
    interestRate: Number(p.interestRate),
    interestType: p.interestType,
    repaymentFreq: p.repaymentFreq,
    numberOfInstallments: p.numberOfInstallments,
    minAmount: Number(p.minAmount),
    maxAmount: Number(p.maxAmount),
    isActive: p.isActive,
    _count: { loans: p._count.loans },
  }))

  const serializedApps: ApplicationRow[] = applications.map((a) => ({
    id: a.id,
    loanNo: a.loanNo,
    status: a.status,
    memberName: a.member.fullName,
    memberNo: a.member.memberNo,
    memberPhone: a.member.phone,
    memberId: a.member.id,
    productName: a.product.name,
    principal: Number(a.principal),
    totalPayable: Number(a.totalPayable),
    applicationDate: a.applicationDate.toISOString(),
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <HandCoins className="h-7 w-7 text-indigo-600" /> Loan Management
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage loan products, applications, disbursements and repayments.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/loans/products/new">
            <Button variant="outline" className="rounded-xl bg-slate-50 dark:bg-slate-900">
              <PackagePlus className="mr-2 h-4 w-4" /> New Product
            </Button>
          </Link>
          <Link href="/dashboard/loans/apply">
            <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-xl">
              <PlusCircle className="mr-2 h-4 w-4" /> New Loan
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="Total Disbursed" value={`৳ ${totalDisbursed.toLocaleString()}`} icon={Wallet} color="text-indigo-600" bg="bg-indigo-50 dark:bg-indigo-950/40" border="border-indigo-200/50 dark:border-indigo-900/50" />
        <Kpi label="Outstanding" value={`৳ ${totalOutstanding.toLocaleString()}`} icon={AlertTriangle} color="text-amber-600" bg="bg-amber-50 dark:bg-amber-950/40" border="border-amber-200/50 dark:border-amber-900/50" />
        <Kpi label="Interest Collected" value={`৳ ${totalCollectedInterest.toLocaleString()}`} icon={TrendingUp} color="text-emerald-600" bg="bg-emerald-50 dark:bg-emerald-950/40" border="border-emerald-200/50 dark:border-emerald-900/50" />
        <Kpi label="Overdue Loans" value={String(overdueCount)} icon={Clock} color="text-rose-600" bg="bg-rose-50 dark:bg-rose-950/40" border="border-rose-200/50 dark:border-rose-900/50" />
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full max-w-xl grid-cols-3 bg-slate-100 dark:bg-slate-900">
          <TabsTrigger value="active">Active Loans ({loans.length})</TabsTrigger>
          <TabsTrigger value="applications">
            Applications{pendingCount > 0 && <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold">{pendingCount}</span>}
          </TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
        </TabsList>

        {/* Active Loans */}
        <TabsContent value="active" className="mt-4">
          <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm rounded-2xl overflow-hidden">
            <CardContent className="p-0">
              {loans.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="p-4 rounded-full bg-indigo-50 dark:bg-indigo-950/40 mb-4 ring-4 ring-white dark:ring-slate-900">
                    <HandCoins className="h-10 w-10 text-indigo-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">No active loans</h3>
                  <p className="text-slate-500 max-w-sm mt-1">Disburse a loan to see it tracked here with live repayment progress.</p>
                  <Link href="/dashboard/loans/apply" className="mt-4">
                    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700"><FileSignature className="mr-2 h-4 w-4" /> Create Loan</Button>
                  </Link>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-800/50 hover:bg-transparent">
                      <TableHead className="px-4 py-3 text-[11px] uppercase tracking-widest font-bold text-slate-400">Loan / Member</TableHead>
                      <TableHead className="px-4 py-3 text-[11px] uppercase tracking-widest font-bold text-slate-400">Product</TableHead>
                      <TableHead className="px-4 py-3 text-right text-[11px] uppercase tracking-widest font-bold text-slate-400">Principal</TableHead>
                      <TableHead className="px-4 py-3 text-right text-[11px] uppercase tracking-widest font-bold text-slate-400">Outstanding</TableHead>
                      <TableHead className="px-4 py-3 text-[11px] uppercase tracking-widest font-bold text-slate-400">Next Due</TableHead>
                      <TableHead className="px-4 py-3 text-center text-[11px] uppercase tracking-widest font-bold text-slate-400">Status</TableHead>
                      <TableHead className="px-4 py-3 text-right text-[11px] uppercase tracking-widest font-bold text-slate-400">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loans.map((l) => {
                      const progress = Number(l.totalPayable) > 0
                        ? Math.min(100, Math.round(((Number(l.principalPaid) + Number(l.interestPaid) + Number(l.finePaid)) / Number(l.totalPayable)) * 100))
                        : 0
                      const overdue = l.status === "DISBURSED" && l.nextDueDate && new Date(l.nextDueDate) < new Date()
                      return (
                        <TableRow key={l.id} className="border-b border-slate-100 dark:border-slate-800/50 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <TableCell className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 font-bold text-xs">
                                {l.member.fullName.charAt(0)}
                              </div>
                              <div>
                                <Link href={`/dashboard/loans/${l.id}`} className="font-semibold text-sm text-slate-900 dark:text-white hover:underline">{l.member.fullName}</Link>
                                <p className="text-[11px] text-slate-500 font-mono">{l.loanNo} · {l.member.memberNo}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{l.product.name}</TableCell>
                          <TableCell className="px-4 py-3 text-right text-sm font-semibold text-slate-900 dark:text-white">৳ {Number(l.principal).toLocaleString()}</TableCell>
                          <TableCell className="px-4 py-3 text-right">
                            <p className="text-sm font-bold text-amber-600">৳ {Number(l.outstandingBalance).toLocaleString()}</p>
                            <div className="mt-1 h-1.5 w-24 ml-auto rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div className="h-full bg-emerald-500" style={{ width: `${progress}%` }} />
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-sm">
                            {l.nextDueDate ? (
                              <span className={overdue ? "text-red-600 font-semibold" : "text-slate-500"}>
                                {new Date(l.nextDueDate).toLocaleDateString()}
                              </span>
                            ) : "—"}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-center">
                            <Badge variant="outline" className={`uppercase text-[10px] px-2 py-0.5 rounded-full font-bold ${STATUS_STYLES[l.status] || ""}`}>
                              {l.status.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-right">
                            <Link href={`/dashboard/loans/${l.id}`}>
                              <Button variant="ghost" size="sm" className="text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30">
                                View <ArrowRight className="ml-1 h-3 w-3" />
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Applications */}
        <TabsContent value="applications" className="mt-4">
          <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm rounded-2xl overflow-hidden">
            <CardContent className="p-0">
              <ApplicationsTable applications={serializedApps} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Products */}
        <TabsContent value="products" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Link href="/dashboard/loans/products/new">
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700"><PackagePlus className="mr-2 h-4 w-4" /> New Product</Button>
            </Link>
          </div>
          <LoanProductManager products={serializedProducts} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Kpi({
  label,
  value,
  icon: Icon,
  color,
  bg,
  border,
}: {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  bg: string
  border: string
}) {
  return (
    <Card className={`bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border ${border} ${bg} shadow-sm rounded-2xl overflow-hidden`}>
      <CardContent className="p-3 flex flex-row items-center justify-between gap-2">
        <div>
          <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500 dark:text-slate-400">{label}</span>
          <h3 className={`text-lg font-extrabold tracking-tight ${color}`}>{value}</h3>
        </div>
        <div className={`p-2 rounded-lg bg-white/50 dark:bg-slate-900/50 border ${border}`}>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
      </CardContent>
    </Card>
  )
}
