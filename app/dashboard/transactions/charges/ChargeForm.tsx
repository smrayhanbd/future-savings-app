"use client"

import { useState, useTransition, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
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
import { createTransaction } from "@/app/actions/transactions"
import { toast } from "sonner"
import { formatBDT } from "@/lib/accounting"
import { Receipt, Save, Check } from "lucide-react"
import type { TransactionSubType } from "@/lib/transactions/types"

interface Props {
  members: { id: string; memberNo: string; fullName: string; balance: number }[]
}

const CHARGE_SUBTYPES: { value: TransactionSubType; label: string }[] = [
  { value: "SERVICE_CHARGE", label: "Service Charge" },
  { value: "BANK_CHARGE", label: "Bank Charge" },
  { value: "ANNUAL_FEE", label: "Annual Membership Fee" },
  { value: "ADMIN_CHARGE", label: "Administrative Charge" },
  { value: "FINE_PENALTY", label: "Fine / Penalty" },
  { value: "OTHER_CHARGE", label: "Other Charge" },
]

export default function ChargeForm({ members }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [subType, setSubType] = useState<TransactionSubType>("SERVICE_CHARGE")
  const [method, setMethod] = useState<"FIXED" | "PERCENTAGE">("FIXED")
  const [amount, setAmount] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)
  const [remarks, setRemarks] = useState("")

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const toggleAll = () => {
    if (selectAll) {
      setSelected(new Set())
      setSelectAll(false)
    } else {
      setSelected(new Set(members.map((m) => m.id)))
      setSelectAll(true)
    }
  }

  const targets = useMemo(
    () => members.filter((m) => selected.has(m.id)),
    [members, selected]
  )

  const preview = useMemo(() => {
    const base = parseFloat(amount) || 0
    return targets.map((m) => ({
      ...m,
      charge: method === "PERCENTAGE" ? (m.balance * base) / 100 : base,
    }))
  }, [targets, amount, method])

  const handleApply = () => {
    if (targets.length === 0) return toast.error("Select at least one member")
    const base = parseFloat(amount)
    if (!base || base <= 0) return toast.error("Enter a valid amount / percentage")

    startTransition(async () => {
      let ok = 0
      let failed = 0
      for (const m of preview) {
        if (m.charge <= 0) continue
        const res = await createTransaction({
          transactionType: "CHARGE",
          subType,
          memberId: m.id,
          amount: m.charge,
          remarks: remarks.trim() || null,
        })
        if (res.ok) ok++
        else failed++
      }
      if (failed > 0) {
        toast.warning(`${ok} created, ${failed} failed`)
      } else {
        toast.success(`${ok} charge transaction(s) created as drafts`)
      }
      router.push("/dashboard/transactions")
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <Receipt className="h-7 w-7 text-amber-600" />
          Charge Management
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
          Apply a charge to one, multiple, or all members. Each member gets their
          own draft transaction for individual approval.
        </p>
      </div>

      <Card className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wider text-slate-500">
            Charge Setup
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Charge Type *</Label>
            <Select value={subType} onValueChange={(v) => { if (v) setSubType(v as TransactionSubType) }}>
              <SelectTrigger className="bg-white dark:bg-slate-950">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHARGE_SUBTYPES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Method *</Label>
            <Select value={method} onValueChange={(v) => { if (v) setMethod(v as "FIXED" | "PERCENTAGE") }}>
              <SelectTrigger className="bg-white dark:bg-slate-950">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FIXED">Fixed Amount</SelectItem>
                <SelectItem value="PERCENTAGE">Percentage of Balance</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">
              {method === "FIXED" ? "Amount (৳) *" : "Percentage (%) *"}
            </Label>
            <Input
              id="amount"
              type="number"
              step={method === "FIXED" ? "0.01" : "0.1"}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={method === "FIXED" ? "0.00" : "0.0"}
              className="bg-white dark:bg-slate-950"
            />
          </div>
          <div className="md:col-span-3 space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Why is this charge being applied?"
              className="bg-white dark:bg-slate-950"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-sm uppercase tracking-wider text-slate-500">
            Target Members ({selected.size} selected)
          </CardTitle>
          <Button variant="outline" size="sm" onClick={toggleAll}>
            <Check className="h-3.5 w-3.5 mr-1" />
            {selectAll ? "Clear all" : "Select all"}
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                <TableHead className="w-10"></TableHead>
                <TableHead className="text-[11px] uppercase tracking-widest font-bold text-slate-400">
                  Member
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-widest font-bold text-slate-400 text-right">
                  Balance
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-widest font-bold text-slate-400 text-right">
                  Charge
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preview.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10 text-slate-400">
                    Select members to preview the charge.
                  </TableCell>
                </TableRow>
              ) : (
                preview.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <Checkbox checked={selected.has(m.id)} onCheckedChange={() => toggle(m.id)} />
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-slate-700 dark:text-slate-200">{m.fullName}</p>
                      <p className="text-[11px] text-slate-400">{m.memberNo}</p>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {formatBDT(m.balance)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <Badge variant="outline" className="text-rose-600 border-rose-200 bg-rose-50">
                        {formatBDT(m.charge)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button onClick={handleApply} disabled={isPending}>
          <Save className="h-4 w-4 mr-2" /> Create {selected.size || ""} Draft(s)
        </Button>
      </div>
    </div>
  )
}
