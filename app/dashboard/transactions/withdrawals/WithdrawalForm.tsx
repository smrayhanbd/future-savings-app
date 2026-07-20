"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import CashAccountSelect from "@/components/transactions/CashAccountSelect"
import { createTransaction, submitTransaction } from "@/app/actions/transactions"
import { toast } from "sonner"
import { formatBDT } from "@/lib/accounting"
import { Save, Send, ArrowUpFromLine, AlertTriangle } from "lucide-react"
import type { AccountType } from "@/lib/accounting"
import type { PaymentMethod } from "@/lib/transactions/types"

interface Props {
  members: {
    id: string
    memberNo: string
    fullName: string
    phone: string | null
    balance: number
  }[]
  accounts: {
    id: string
    accountCode: string
    accountName: string
    accountType: AccountType
    isCash: boolean
    isBank: boolean
    currentBalance: number
  }[]
}

// Per spec §7: only Bank Transfer or Cheque.
const WITHDRAWAL_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "CHEQUE", label: "Bank Cheque" },
]

export default function WithdrawalForm({ members, accounts }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [memberId, setMemberId] = useState("")
  const [withdrawalType, setWithdrawalType] = useState<"PARTIAL" | "FULL">("PARTIAL")
  const [amount, setAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("BANK_TRANSFER")
  const [cashAccountId, setCashAccountId] = useState("")
  const [referenceNo, setReferenceNo] = useState("")
  const [reason, setReason] = useState("")

  const selectedMember = members.find((m) => m.id === memberId)

  const handleMemberChange = (id: string) => {
    setMemberId(id)
    const m = members.find((x) => x.id === id)
    if (withdrawalType === "FULL" && m) setAmount(m.balance.toFixed(2))
  }

  const handleTypeChange = (t: "PARTIAL" | "FULL") => {
    setWithdrawalType(t)
    if (t === "FULL" && selectedMember) setAmount(selectedMember.balance.toFixed(2))
  }

  const handleSave = (submit: boolean) => {
    if (!memberId) return toast.error("Select a member")
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) return toast.error("Enter a valid amount")
    if (selectedMember && amt > selectedMember.balance) {
      return toast.error("Amount exceeds member balance", {
        description: `Available: ${formatBDT(selectedMember.balance)}`,
      })
    }
    if (!cashAccountId) return toast.error("Select a Bank account to pay from")

    startTransition(async () => {
      const res = await createTransaction({
        transactionType: "WITHDRAWAL",
        subType: "SAVINGS_DEPOSIT",
        memberId,
        amount: amt,
        paymentMethod,
        cashAccountId: cashAccountId || null,
        referenceNo: referenceNo.trim() || null,
        remarks: [reason.trim(), `[${withdrawalType} withdrawal]`].filter(Boolean).join("\n"),
      })
      if (!res.ok) {
        toast.error("Could not create", { description: res.error })
        return
      }
      toast.success(submit ? "Submitted for approval" : "Saved as draft", {
        description: res.voucherNo,
      })
      if (submit && res.id) {
        const sub = await submitTransaction(res.id)
        if (!sub.ok) toast.error("Submit failed", { description: sub.error })
      }
      router.push("/dashboard/transactions")
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <ArrowUpFromLine className="h-7 w-7 text-rose-600" />
          Withdrawal Transaction
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
          Pay out from a member&apos;s savings. Bank Transfer / Cheque only (spec §7).
          Eligibility &amp; funds are re-validated at approval time.
        </p>
      </div>

      <Card className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wider text-slate-500">
            Member &amp; Amount
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Member *</Label>
            <Select value={memberId} onValueChange={(v) => { if (v) handleMemberChange(v) }}>
              <SelectTrigger className="bg-white dark:bg-slate-950">
                <SelectValue placeholder="Select member" />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.memberNo} · {m.fullName} — {formatBDT(m.balance)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Withdrawal Type *</Label>
            <Select
              value={withdrawalType}
              onValueChange={(v) => { if (v) handleTypeChange(v as "PARTIAL" | "FULL") }}
            >
              <SelectTrigger className="bg-white dark:bg-slate-950">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PARTIAL">Partial</SelectItem>
                <SelectItem value="FULL">Full Closure</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (৳) *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              disabled={withdrawalType === "FULL"}
              className="bg-white dark:bg-slate-950"
            />
          </div>

          {selectedMember && (
            <div className="md:col-span-2 flex items-center gap-2 text-xs text-slate-500 bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
              Available balance: <strong className="text-slate-700 dark:text-slate-200">{formatBDT(selectedMember.balance)}</strong>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wider text-slate-500">
            Payment Destination (Bank only)
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Payment Method *</Label>
            <Select
              value={paymentMethod}
              onValueChange={(v) => { if (v) setPaymentMethod(v as PaymentMethod) }}
            >
              <SelectTrigger className="bg-white dark:bg-slate-950">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WITHDRAWAL_METHODS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Source Bank Account *</Label>
            <CashAccountSelect
              accounts={accounts.filter((a) => a.isBank)}
              value={cashAccountId}
              onValueChange={(v) => setCashAccountId(v ?? "")}
              className="bg-white dark:bg-slate-950"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="referenceNo">Reference Number</Label>
            <Input
              id="referenceNo"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              placeholder="Cheque / transfer no."
              className="bg-white dark:bg-slate-950"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl">
        <CardContent className="space-y-2">
          <Label htmlFor="reason">Withdrawal Reason</Label>
          <Textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why is the member withdrawing?"
            className="bg-white dark:bg-slate-950"
          />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button variant="secondary" disabled={isPending} onClick={() => handleSave(false)}>
          <Save className="h-4 w-4 mr-2" /> Save Draft
        </Button>
        <Button className="bg-amber-600 hover:bg-amber-700" disabled={isPending} onClick={() => handleSave(true)}>
          <Send className="h-4 w-4 mr-2" /> Save & Submit
        </Button>
      </div>
    </div>
  )
}
