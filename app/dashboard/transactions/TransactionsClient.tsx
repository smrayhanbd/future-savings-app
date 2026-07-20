"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { TransactionStatusBadge } from "@/components/transactions/TransactionStatusBadge"
import {
  formatBDT,
  formatDate,
} from "@/lib/accounting"
import {
  TRANSACTION_TYPE_LABELS,
  SUBTYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  type TransactionType,
  type TransactionStatus,
} from "@/lib/transactions/types"
import {
  Search,
  Filter,
  Plus,
  ArrowDownToLine,
  ArrowUpFromLine,
  Receipt,
  PieChart,
  FileText,
  Eye,
  Printer,
} from "lucide-react"

interface Row {
  id: string
  voucherNo: string
  transactionType: TransactionType
  subType: string
  status: TransactionStatus
  amount: number
  paymentMethod: string | null
  referenceNo: string | null
  createdAt: string
  approvedAt: string | null
  member: { id: string; memberNo: string; fullName: string } | null
  cashAccountName: string | null
  createdBy: string
}

interface Props {
  rows: Row[]
  members: { id: string; memberNo: string; fullName: string }[]
}

const TYPE_ICON: Record<TransactionType, typeof FileText> = {
  DEPOSIT: ArrowDownToLine,
  WITHDRAWAL: ArrowUpFromLine,
  CHARGE: Receipt,
  INCOME_DISTRIBUTION: PieChart,
}

export default function TransactionsClient({ rows }: Props) {
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<TransactionType | "ALL">("ALL")
  const [statusFilter, setStatusFilter] = useState<TransactionStatus | "ALL">("ALL")

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (typeFilter !== "ALL" && r.transactionType !== typeFilter) return false
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        return (
          r.voucherNo.toLowerCase().includes(q) ||
          (r.referenceNo ?? "").toLowerCase().includes(q) ||
          (r.member?.fullName ?? "").toLowerCase().includes(q) ||
          (r.member?.memberNo ?? "").toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [rows, search, typeFilter, statusFilter])

  const stats = useMemo(() => {
    const approved = rows.filter((r) => r.status === "APPROVED")
    const pending = rows.filter((r) => r.status === "PENDING_APPROVAL")
    const inflow = approved
      .filter((r) => r.transactionType === "DEPOSIT")
      .reduce((s, r) => s + r.amount, 0)
    const outflow = approved
      .filter((r) => r.transactionType === "WITHDRAWAL")
      .reduce((s, r) => s + r.amount, 0)
    return {
      total: rows.length,
      pending: pending.length,
      inflow,
      outflow,
    }
  }, [rows])

  const exportCsv = () => {
    const header = [
      "Voucher",
      "Type",
      "Sub Type",
      "Status",
      "Member",
      "Amount",
      "Method",
      "Reference",
      "Created",
      "Approved",
    ]
    const body = filtered.map((r) => [
      r.voucherNo,
      r.transactionType,
      r.subType,
      r.status,
      r.member ? `${r.member.memberNo} ${r.member.fullName}` : "",
      r.amount.toFixed(2),
      r.paymentMethod ?? "",
      r.referenceNo ?? "",
      r.createdAt,
      r.approvedAt ?? "",
    ])
    const csv = [header, ...body]
      .map((line) => line.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Transaction History
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Unified ledger of every financial transaction with full audit trail.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv}>
            Export CSV
          </Button>
          <Link href="/dashboard/transactions/deposits">
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="mr-2 h-4 w-4" /> New Transaction
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniStat label="Total" value={stats.total} />
        <MiniStat label="Pending Approval" value={stats.pending} tone="text-amber-600" />
        <MiniStat label="Approved Inflow" value={formatBDT(stats.inflow)} tone="text-emerald-600" />
        <MiniStat label="Approved Outflow" value={formatBDT(stats.outflow)} tone="text-rose-600" />
      </div>

      <Card className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm rounded-2xl">
        <CardContent className="p-4 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search voucher, member, reference…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white dark:bg-slate-950"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <Select value={typeFilter} onValueChange={(v) => { if (v) setTypeFilter(v as TransactionType | "ALL") }}>
              <SelectTrigger className="w-40 bg-white dark:bg-slate-950">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="DEPOSIT">Deposit</SelectItem>
                <SelectItem value="WITHDRAWAL">Withdrawal</SelectItem>
                <SelectItem value="CHARGE">Charge</SelectItem>
                <SelectItem value="INCOME_DISTRIBUTION">Income Distribution</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { if (v) setStatusFilter(v as TransactionStatus | "ALL") }}>
              <SelectTrigger className="w-40 bg-white dark:bg-slate-950">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="PENDING_APPROVAL">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="RETURNED">Returned</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="REVERSED">Reversed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm rounded-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 dark:bg-slate-800/50 hover:bg-transparent">
              <TableHead className="text-[11px] uppercase tracking-widest font-bold text-slate-400">
                Voucher
              </TableHead>
              <TableHead className="text-[11px] uppercase tracking-widest font-bold text-slate-400">
                Type
              </TableHead>
              <TableHead className="text-[11px] uppercase tracking-widest font-bold text-slate-400">
                Member
              </TableHead>
              <TableHead className="text-[11px] uppercase tracking-widest font-bold text-slate-400 text-right">
                Amount
              </TableHead>
              <TableHead className="text-[11px] uppercase tracking-widest font-bold text-slate-400 text-center">
                Status
              </TableHead>
              <TableHead className="text-[11px] uppercase tracking-widest font-bold text-slate-400">
                Date
              </TableHead>
              <TableHead className="text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16 text-slate-500">
                  <FileText className="h-10 w-10 mx-auto mb-2 text-slate-300" />
                  <p className="font-medium">No transactions found</p>
                  <p className="text-sm">Create one from the Deposit / Withdrawal / Charge pages.</p>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => {
                const Icon = TYPE_ICON[r.transactionType] ?? FileText
                return (
                  <TableRow
                    key={r.id}
                    className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          <Icon className="h-4 w-4 text-slate-500" />
                        </div>
                        <div>
                          <p className="font-mono text-sm font-semibold text-slate-900 dark:text-white">
                            {r.voucherNo}
                          </p>
                          {r.paymentMethod && (
                            <p className="text-[11px] text-slate-400">
                              {PAYMENT_METHOD_LABELS[r.paymentMethod as keyof typeof PAYMENT_METHOD_LABELS] ?? r.paymentMethod}
                              {r.cashAccountName ? ` · ${r.cashAccountName}` : ""}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {TRANSACTION_TYPE_LABELS[r.transactionType]}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {SUBTYPE_LABELS[r.subType as keyof typeof SUBTYPE_LABELS] ?? r.subType}
                      </p>
                    </TableCell>
                    <TableCell>
                      {r.member ? (
                        <div>
                          <p className="text-sm text-slate-700 dark:text-slate-200">
                            {r.member.fullName}
                          </p>
                          <p className="text-[11px] text-slate-400">{r.member.memberNo}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-bold tabular-nums text-slate-900 dark:text-white">
                      {formatBDT(r.amount)}
                    </TableCell>
                    <TableCell className="text-center">
                      <TransactionStatusBadge status={r.status} />
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {formatDate(r.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/dashboard/transactions/${r.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="View details">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        {r.status === "APPROVED" && (r.transactionType === "DEPOSIT" || r.transactionType === "WITHDRAWAL") && (
                          <Link href={`/dashboard/receipts/${r.id}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30" title="Print money receipt">
                              <Printer className="h-4 w-4" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}

function MiniStat({
  label,
  value,
  tone = "text-slate-900 dark:text-white",
}: {
  label: string
  value: string | number
  tone?: string
}) {
  return (
    <Card className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl">
      <CardContent className="p-3">
        <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">{label}</p>
        <p className={`text-lg font-extrabold tabular-nums ${tone}`}>{value}</p>
      </CardContent>
    </Card>
  )
}
