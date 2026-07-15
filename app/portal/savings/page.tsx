import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import MySavingsClient from "./MySavingsClient"
import { Wallet, TrendingUp, TrendingDown, AlertCircle, Receipt } from "lucide-react"

export const dynamic = 'force-dynamic'

export default async function MySavingsPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "MEMBER") {
    redirect("/")
  }

  const memberId = session.user.id

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: { 
      savings: { orderBy: { date: "desc" } },
      requests: { where: { type: "WITHDRAWAL" }, orderBy: { createdAt: "desc" }, take: 5 }
    },
  })

  if (!member) redirect("/portal")

  const totalDeposit = member.savings.filter(s => s.type !== "WITHDRAWAL").reduce((acc, s) => acc + Number(s.amount), 0)
  const totalWithdrawal = member.savings.filter(s => s.type === "WITHDRAWAL").reduce((acc, s) => acc + Number(s.amount), 0)
  const currentBalance = totalDeposit - totalWithdrawal

  const stats = [
    { label: "Current Balance", value: `৳ ${currentBalance.toLocaleString()}`, icon: Wallet, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/50", border: "border-emerald-200/50 dark:border-emerald-900/50" },
    { label: "Total Deposited", value: `৳ ${totalDeposit.toLocaleString()}`, icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/50", border: "border-blue-200/50 dark:border-blue-900/50" },
    { label: "Total Withdrawn", value: `৳ ${totalWithdrawal.toLocaleString()}`, icon: TrendingDown, color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-950/50", border: "border-rose-200/50 dark:border-rose-900/50" },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">My Savings & Transactions</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">View your transaction history and request withdrawals.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {stats.map((stat, index) => (
          <Card key={index} className={`bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border ${stat.border} ${stat.bg} shadow-sm rounded-2xl overflow-hidden`}>
            <CardContent className="p-5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-widest font-bold text-slate-500 dark:text-slate-400">{stat.label}</span>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <h3 className={`text-2xl font-extrabold tracking-tight ${stat.color}`}>{stat.value}</h3>
            </CardContent>
          </Card>
        ))}
      </div>

      <MySavingsClient memberId={member.id} currentBalance={currentBalance} requests={member.requests} />

      <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200/50 dark:border-slate-800/50 px-6 py-4">
          <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-white">
            <Receipt className="h-5 w-5 text-indigo-500" /> Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-200/50 dark:border-slate-800/50 hover:bg-transparent">
                <TableHead className="px-6 py-4 text-[11px] uppercase tracking-widest font-bold text-slate-400">Date</TableHead>
                <TableHead className="px-6 py-4 text-[11px] uppercase tracking-widest font-bold text-slate-400">Receipt/Voucher</TableHead>
                <TableHead className="px-6 py-4 text-[11px] uppercase tracking-widest font-bold text-slate-400">Type</TableHead>
                <TableHead className="px-6 py-4 text-[11px] uppercase tracking-widest font-bold text-slate-400">Method</TableHead>
                <TableHead className="px-6 py-4 text-right text-[11px] uppercase tracking-widest font-bold text-slate-400">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {member.savings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-slate-500">
                    No transactions yet.
                  </TableCell>
                </TableRow>
              ) : (
                member.savings.map((sav) => (
                  <TableRow key={sav.id} className="border-b border-slate-100 dark:border-slate-800/50 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <TableCell className="px-6 py-4 text-sm text-slate-700 dark:text-slate-200">
                      {new Date(sav.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm font-mono text-slate-500">
                      {sav.receiptNo || "N/A"}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm">
                      <Badge variant="outline" className={
                        sav.type === "WITHDRAWAL" ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400" :
                        sav.type === "FINE" ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400" :
                        "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400"
                      }>
                        {sav.type.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm text-slate-500">{sav.method}</TableCell>
                    <TableCell className={`px-6 py-4 text-right font-bold text-sm ${sav.type === "WITHDRAWAL" ? "text-rose-600" : "text-emerald-600"}`}>
                      {sav.type === "WITHDRAWAL" ? "- " : "+ "} ৳ {Number(sav.amount).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}