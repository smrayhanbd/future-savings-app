"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  approveTransaction,
  bulkApproveTransactions,
  rejectTransaction,
  returnTransaction,
} from "@/app/actions/transactions"
import { approveMemberRequest, rejectMemberRequest } from "@/app/actions/portal"
import { toast } from "sonner"
import { formatBDT, formatDate } from "@/lib/accounting"
import {
  TRANSACTION_TYPE_LABELS,
  SUBTYPE_LABELS,
  type TransactionType,
} from "@/lib/transactions/types"
import {
  CheckCircle2,
  XCircle,
  Undo2,
  Eye,
  Layers,
  Clock,
  CheckCheck,
} from "lucide-react"

interface PendingTxn {
  id: string
  voucherNo: string
  transactionType: TransactionType
  subType: string
  amount: number
  approvalLevel: string | null
  submittedBy: string | null
  submittedAt: string
  createdBy: string
  createdById: string
  paymentMethod: string | null
  member: { id: string; memberNo: string; fullName: string } | null
  cashAccountName: string | null
}

interface MemberRequest {
  id: string
  type: string
  amount: number | null
  method: string | null
  reason: string | null
  notes: string | null
  createdAt: string
  member: { id: string; memberNo: string; fullName: string; phone: string | null }
}

interface Props {
  pendingTxns: PendingTxn[]
  memberRequests: MemberRequest[]
  currentUserId: string
}

export default function ApprovalsClient({
  pendingTxns,
  memberRequests,
  currentUserId,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialTab = searchParams.get("tab") === "member" ? "member" : "admin"
  const [tab, setTab] = useState(initialTab)
  const [isPending, startTransition] = useTransition()
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const isMaker = (t: PendingTxn) => t.createdById === currentUserId

  const approveOne = (id: string) => {
    startTransition(async () => {
      const res = await approveTransaction(id)
      if (res.ok) {
        toast.success("Approved")
        router.refresh()
      } else {
        toast.error("Cannot approve", { description: res.error })
      }
    })
  }

  const bulkApprove = () => {
    if (selected.size === 0) return toast.error("Select transactions first")
    const ids = pendingTxns.filter((t) => selected.has(t.id) && !isMaker(t)).map((t) => t.id)
    if (ids.length === 0)
      return toast.error("Nothing to approve (Maker-Checker blocks your own)")
    startTransition(async () => {
      const res = await bulkApproveTransactions(ids)
      toast.success(`${res.approved.length} approved`)
      if (res.failed.length > 0) {
        toast.warning(`${res.failed.length} failed`, {
          description: res.failed.map((f) => `${f.id.slice(0, 8)}: ${f.error}`).join("\n"),
        })
      }
      setSelected(new Set())
      router.refresh()
    })
  }

  const handleReject = (id: string) => {
    const reason = prompt("Rejection reason?")
    if (!reason?.trim()) return
    startTransition(async () => {
      const res = await rejectTransaction(id, reason)
      if (res.ok) {
        toast.success("Rejected")
        router.refresh()
      } else toast.error("Failed", { description: res.error })
    })
  }

  const handleReturn = (id: string) => {
    const reason = prompt("What needs correction?")
    if (!reason?.trim()) return
    startTransition(async () => {
      const res = await returnTransaction(id, reason)
      if (res.ok) {
        toast.success("Returned to maker")
        router.refresh()
      } else toast.error("Failed", { description: res.error })
    })
  }

  const handleMemberRequest = async (id: string, action: "approve" | "reject") => {
    startTransition(async () => {
      const res =
        action === "approve"
          ? await approveMemberRequest(id)
          : await rejectMemberRequest(id)
      if (res.ok) {
        toast.success(action === "approve" ? "Request approved" : "Request rejected")
        router.refresh()
      } else toast.error("Failed", { description: res.error })
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Transaction Approvals
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
          Centralized Maker-Checker dashboard. You cannot approve transactions
          you created yourself (spec §12).
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="admin" className="gap-1">
            <Layers className="h-3.5 w-3.5" />
            Admin Submitted
            <span className="ml-1 inline-flex items-center justify-center h-5 min-w-5 px-1 text-[10px] font-bold rounded-full bg-amber-100 text-amber-700">
              {pendingTxns.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="member" className="gap-1">
            <Clock className="h-3.5 w-3.5" />
            Member Requests
            <span className="ml-1 inline-flex items-center justify-center h-5 min-w-5 px-1 text-[10px] font-bold rounded-full bg-indigo-100 text-indigo-700">
              {memberRequests.length}
            </span>
          </TabsTrigger>
        </TabsList>

        {/* Admin Submitted Transactions */}
        <TabsContent value="admin" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {pendingTxns.length} pending · {selected.size} selected
            </p>
            <Button onClick={bulkApprove} disabled={isPending || selected.size === 0}>
              <CheckCheck className="h-4 w-4 mr-2" /> Bulk Approve
            </Button>
          </div>
          <Card className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                  <TableHead className="w-10"></TableHead>
                  <TableHead className="text-[11px] uppercase tracking-widest font-bold text-slate-400">
                    Voucher
                  </TableHead>
                  <TableHead className="text-[11px] uppercase tracking-widest font-bold text-slate-400">
                    Member
                  </TableHead>
                  <TableHead className="text-[11px] uppercase tracking-widest font-bold text-slate-400 text-right">
                    Amount
                  </TableHead>
                  <TableHead className="text-[11px] uppercase tracking-widest font-bold text-slate-400">
                    Maker
                  </TableHead>
                  <TableHead className="text-[11px] uppercase tracking-widest font-bold text-slate-400 text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingTxns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-16 text-slate-400">
                      <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-emerald-300" />
                      <p className="font-medium">All caught up!</p>
                      <p className="text-sm">No pending approvals.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingTxns.map((t) => {
                    const maker = isMaker(t)
                    return (
                      <TableRow key={t.id}>
                        <TableCell>
                          <Checkbox
                            checked={selected.has(t.id)}
                            onCheckedChange={() => toggle(t.id)}
                            disabled={maker}
                          />
                        </TableCell>
                        <TableCell>
                          <p className="font-mono text-sm font-semibold text-slate-900 dark:text-white">
                            {t.voucherNo}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {TRANSACTION_TYPE_LABELS[t.transactionType]} ·{" "}
                            {SUBTYPE_LABELS[t.subType as keyof typeof SUBTYPE_LABELS] ?? t.subType}
                            {t.approvalLevel ? ` · ${t.approvalLevel}` : ""}
                          </p>
                        </TableCell>
                        <TableCell>
                          {t.member ? (
                            <div>
                              <p className="text-sm text-slate-700 dark:text-slate-200">
                                {t.member.fullName}
                              </p>
                              <p className="text-[11px] text-slate-400">{t.member.memberNo}</p>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-bold tabular-nums">
                          {formatBDT(t.amount)}
                        </TableCell>
                        <TableCell>
                          <p className="text-xs text-slate-500">{t.createdBy}</p>
                          <p className="text-[11px] text-slate-400">{formatDate(t.submittedAt)}</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Link href={`/dashboard/transactions/${t.id}`}>
                              <Button variant="ghost" size="icon" className="h-8 w-8" title="Review">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-emerald-600 hover:bg-emerald-50"
                              disabled={isPending || maker}
                              onClick={() => approveOne(t.id)}
                              title={maker ? "Maker-Checker: you created this" : "Approve"}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-blue-600 hover:bg-blue-50"
                              disabled={isPending}
                              onClick={() => handleReturn(t.id)}
                              title="Return for correction"
                            >
                              <Undo2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-rose-600 hover:bg-rose-50"
                              disabled={isPending}
                              onClick={() => handleReject(t.id)}
                              title="Reject"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Member Requests (portal) */}
        <TabsContent value="member" className="space-y-4">
          <Card className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                  <TableHead className="text-[11px] uppercase tracking-widest font-bold text-slate-400">
                    Member
                  </TableHead>
                  <TableHead className="text-[11px] uppercase tracking-widest font-bold text-slate-400">
                    Type
                  </TableHead>
                  <TableHead className="text-[11px] uppercase tracking-widest font-bold text-slate-400 text-right">
                    Amount
                  </TableHead>
                  <TableHead className="text-[11px] uppercase tracking-widest font-bold text-slate-400">
                    Reason
                  </TableHead>
                  <TableHead className="text-[11px] uppercase tracking-widest font-bold text-slate-400">
                    Requested
                  </TableHead>
                  <TableHead className="text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {memberRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-16 text-slate-400">
                      <Clock className="h-10 w-10 mx-auto mb-2 text-slate-300" />
                      <p className="font-medium">No pending member requests</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  memberRequests.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <p className="text-sm text-slate-700 dark:text-slate-200">
                          {r.member.fullName}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {r.member.memberNo} · {r.member.phone}
                        </p>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-semibold uppercase text-indigo-600">
                          {r.type}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {r.amount ? formatBDT(r.amount) : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 max-w-xs truncate">
                        {r.reason ?? r.notes ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs text-slate-400">
                        {formatDate(r.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-emerald-600 hover:bg-emerald-50"
                            disabled={isPending}
                            onClick={() => handleMemberRequest(r.id, "approve")}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-rose-600 hover:bg-rose-50"
                            disabled={isPending}
                            onClick={() => handleMemberRequest(r.id, "reject")}
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
