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
import { Save, Send, ArrowDownToLine } from "lucide-react"
import type { AccountType } from "@/lib/accounting"
import type {
  TransactionSubType,
  PaymentMethod,
} from "@/lib/transactions/types"

interface Props {
  members: { id: string; memberNo: string; fullName: string; phone: string | null }[]
  accounts: {
    id: string
    accountCode: string
    accountName: string
    accountType: AccountType
    isCash: boolean
    isBank: boolean
    currentBalance: number
  }[]
  collectionTypes: { id: string; name: string }[]
}

const DEPOSIT_SUBTYPES: { value: TransactionSubType; label: string }[] = [
  { value: "SAVINGS_DEPOSIT", label: "Savings Deposit" },
  { value: "ADVANCE", label: "Advance Deposit" },
  { value: "DUE_PAYMENT", label: "Due Payment" },
]

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "BKASH", label: "bKash" },
  { value: "NAGAD", label: "Nagad" },
  { value: "ROCKET", label: "Rocket" },
]

export default function DepositForm({ members, accounts, collectionTypes }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [memberId, setMemberId] = useState("")
  const [subType, setSubType] = useState<TransactionSubType>("SAVINGS_DEPOSIT")
  const [amount, setAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH")
  const [cashAccountId, setCashAccountId] = useState("")
  const [referenceNo, setReferenceNo] = useState("")
  const [remarks, setRemarks] = useState("")

  const buildPayload = () => ({
    transactionType: "DEPOSIT" as const,
    subType,
    memberId,
    amount: parseFloat(amount) || 0,
    paymentMethod,
    cashAccountId: cashAccountId || null,
    referenceNo: referenceNo.trim() || null,
    remarks: remarks.trim() || null,
  })

  const handleSave = (submit: boolean) => {
    if (!memberId) return toast.error("Select a member")
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) return toast.error("Enter a valid amount")
    if (!cashAccountId) return toast.error("Select a Cash / Bank / Wallet account")

    startTransition(async () => {
      const res = await createTransaction(buildPayload())
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
          <ArrowDownToLine className="h-7 w-7 text-emerald-600" />
          Deposit Transaction
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
          Record money received from a member. Saved as draft, then submitted for
          Maker-Checker approval.
        </p>
      </div>

      <Card className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wider text-slate-500">
            General Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Member *</Label>
            <Select value={memberId} onValueChange={(v) => setMemberId(v ?? "")}>
              <SelectTrigger className="bg-white dark:bg-slate-950">
                <SelectValue placeholder="Select member" />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.memberNo} · {m.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Deposit Type *</Label>
            <Select
              value={subType}
              onValueChange={(v) => { if (v) setSubType(v as TransactionSubType) }}
            >
              <SelectTrigger className="bg-white dark:bg-slate-950">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEPOSIT_SUBTYPES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
                {collectionTypes.map((c) => (
                  <SelectItem key={c.id} value={c.name.toUpperCase().replace(/\s+/g, "_")}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Deposit Amount (৳) *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="bg-white dark:bg-slate-950"
            />
          </div>

          <div className="space-y-2">
            <Label>Collection Method *</Label>
            <Select
              value={paymentMethod}
              onValueChange={(v) => { if (v) setPaymentMethod(v as PaymentMethod) }}
            >
              <SelectTrigger className="bg-white dark:bg-slate-950">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wider text-slate-500">
            Payment Source
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label>Cash Drawer / Bank / Wallet *</Label>
            <CashAccountSelect
              accounts={accounts}
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
              placeholder="Txn / cheque / slip no."
              className="bg-white dark:bg-slate-950"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wider text-slate-500">
            Additional Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="remarks">Remarks</Label>
          <Textarea
            id="remarks"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Optional notes…"
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
