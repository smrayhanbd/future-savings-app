"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createTransaction, submitTransaction } from "@/app/actions/transactions"
import { toast } from "sonner"
import {
  Save,
  Send,
  ArrowDownToLine,
  Search,
  Hash,
  Wallet,
  Landmark,
  Smartphone,
  AlertTriangle,
  BookOpen,
  Calendar,
  User,
} from "lucide-react"
import type { AccountType } from "@/lib/accounting"
import type { PaymentMethod } from "@/lib/transactions/types"
import type { MethodGroup } from "@/lib/transactions/bankAccounts"

// ─── Types ───────────────────────────────────────────────────────────────
interface MemberSummary {
  id: string
  memberNo: string
  fullName: string
  phone: string | null
  photoUrl: string | null
  gender: string | null
  status: string
  dueBalance: number
  lateFines: number
  totalDeposits: number
  lastDeposit: { amount: number; date: string } | null
}

interface AccountOption {
  id: string
  accountCode: string
  accountName: string
  accountType: AccountType
  isCash: boolean
  isBank: boolean
  currentBalance: number
}

interface DefaultCoa {
  group: MethodGroup
  paymentMethod: PaymentMethod
  bankAccountId: string | null
  coaAccountId: string | null
  coaAccountCode: string | null
  coaAccountName: string | null
  missing: boolean
}

interface Props {
  members: MemberSummary[]
  accounts: AccountOption[]
  collectionTypes: { id: string; name: string }[]
  defaultCoas: DefaultCoa[]
  missingGroups: MethodGroup[]
  memberSavingsLiability: { id: string; accountCode: string; accountName: string } | null
}

// ─── Static option lists ────────────────────────────────────────────────
/** The 3 collection-method groups shown in the UI, each mapping to one or
 *  more granular PaymentMethod values that are what actually get stored. */
const METHOD_GROUPS: { group: MethodGroup; label: string; icon: typeof Wallet; methods: { value: PaymentMethod; label: string }[] }[] = [
  { group: "CASH", label: "Cash", icon: Wallet, methods: [{ value: "CASH", label: "Cash" }] },
  {
    group: "BANK",
    label: "Bank Transfer / Cheque",
    icon: Landmark,
    methods: [
      { value: "BANK_TRANSFER", label: "Bank Transfer" },
      { value: "CHEQUE", label: "Cheque" },
    ],
  },
  {
    group: "MOBILE",
    label: "Mobile Banking",
    icon: Smartphone,
    methods: [
      { value: "BKASH", label: "bKash" },
      { value: "NAGAD", label: "Nagad" },
      { value: "ROCKET", label: "Rocket" },
    ],
  },
]

const METHOD_LABEL: Record<PaymentMethod, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  CHEQUE: "Cheque",
  BKASH: "bKash",
  NAGAD: "Nagad",
  ROCKET: "Rocket",
}

function groupForMethod(method: PaymentMethod): MethodGroup {
  if (method === "CASH") return "CASH"
  if (method === "BANK_TRANSFER" || method === "CHEQUE") return "BANK"
  return "MOBILE"
}

// Member status → badge styling (mirrors components/member/MemberQuickView.tsx).
const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  ACTIVE: { bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-300", label: "Active" },
  PENDING: { bg: "bg-amber-500/10", text: "text-amber-700 dark:text-amber-300", label: "Pending" },
  SUSPENDED: { bg: "bg-red-500/10", text: "text-red-700 dark:text-red-300", label: "Suspended" },
  INACTIVE: { bg: "bg-slate-500/10", text: "text-slate-700 dark:text-slate-300", label: "Inactive" },
  REJECTED: { bg: "bg-rose-500/10", text: "text-rose-700 dark:text-rose-300", label: "Rejected" },
}

const AVATAR_COLORS: Record<string, string> = {
  MALE: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300",
  FEMALE: "bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-300",
  OTHER: "bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300",
}

function formatBDT(n: number): string {
  return "৳" + " " + n.toLocaleString("en-IN", { maximumFractionDigits: 2 })
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

// ─── Component ───────────────────────────────────────────────────────────
export default function DepositForm({
  members,
  accounts,
  collectionTypes,
  defaultCoas,
  missingGroups,
  memberSavingsLiability,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Member search + selection
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedMember, setSelectedMember] = useState<MemberSummary | null>(null)

  // Form fields
  const [collectionTypeId, setCollectionTypeId] = useState("")
  const [amount, setAmount] = useState("")
  const [depositDate, setDepositDate] = useState(new Date().toISOString().slice(0, 10))
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH")
  const [cashAccountId, setCashAccountId] = useState<string>("")
  const [coaOverridden, setCoaOverridden] = useState(false) // user manually changed the COA
  const [referenceNo, setReferenceNo] = useState("")
  const [remarks, setRemarks] = useState("")

  // Default COA per group (pre-seeded by the server from Somiti Settings).
  const defaultByGroup = useMemo(() => {
    const map: Partial<Record<MethodGroup, DefaultCoa>> = {}
    for (const d of defaultCoas) map[d.group] = d
    return map
  }, [defaultCoas])

  // Cash/bank/wallet accounts for the override dropdown (same filter as CashAccountSelect).
  const cashLikeAccounts = useMemo(
    () => accounts.filter((a) => a.isCash || a.isBank || a.accountCode.startsWith("MOBILE-WALLETS")),
    [accounts]
  )

  // Member search results (top 5 by name / memberNo / phone).
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase()
    return members
      .filter(
        (m) =>
          m.fullName.toLowerCase().includes(q) ||
          m.memberNo.toLowerCase().includes(q) ||
          (m.phone ?? "").includes(q)
      )
      .slice(0, 5)
  }, [searchQuery, members])

  /** Resolve the auto-mapped COA for the current payment method. */
  const currentDefaultCoa = defaultByGroup[groupForMethod(paymentMethod)]

  /** The COA actually in effect: the auto-mapped one unless the user overrode it. */
  const effectiveCoa = useMemo(() => {
    return accounts.find((a) => a.id === cashAccountId) ?? null
  }, [accounts, cashAccountId])

  /** When the collection method changes, auto-map the COA (unless the user had
   *  manually overridden — in which case keep their choice but warn). */
  const handleMethodChange = (method: PaymentMethod) => {
    setPaymentMethod(method)
    const def = defaultByGroup[groupForMethod(method)]
    if (!coaOverridden) {
      setCashAccountId(def?.coaAccountId ?? "")
    }
  }

  /** Manual COA change marks the field as overridden so subsequent method
   *  switches no longer clobber the user's pick. */
  const handleCoaOverride = (id: string) => {
    setCashAccountId(id)
    setCoaOverridden(true)
  }

  const handleSelectMember = (m: MemberSummary) => {
    setSelectedMember(m)
    setSearchQuery("")
  }

  const buildPayload = () => {
    const selectedType = collectionTypes.find((c) => c.id === collectionTypeId)
    return {
      transactionType: "DEPOSIT" as const,
      subType: "SAVINGS_DEPOSIT" as const, // engine-level subtype; ChargeType carries the business label
      memberId: selectedMember?.id ?? "",
      amount: parseFloat(amount) || 0,
      paymentMethod,
      cashAccountId: cashAccountId || null,
      referenceNo: referenceNo.trim() || null,
      remarks: remarks.trim() || null,
      transactionDate: new Date(depositDate).toISOString(),
      // Store the chosen Collection Type (ChargeType id+name) in the JSON
      // breakdown column. Cast because TransactionBreakdown is a fixed shape
      // but the column is schemaless JSON and the engine treats it as opaque.
      breakdown: selectedType
        ? ({ collectionTypeId: selectedType.id, collectionTypeName: selectedType.name } as unknown as Record<string, string>)
        : null,
    }
  }

  const handleSave = (submit: boolean) => {
    if (!selectedMember) return toast.error("Select a member first.")
    if (!collectionTypeId) return toast.error("Select a deposit type.")
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) return toast.error("Enter a valid amount.")
    if (!cashAccountId) return toast.error("No COA auto-mapped for this method. Select one manually or configure it in Somiti Settings.")

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

  // ─── Derived display values ───────────────────────────────────────────
  const st = selectedMember ? STATUS_STYLE[selectedMember.status] ?? STATUS_STYLE.PENDING : null
  const initials = selectedMember
    ? selectedMember.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : ""
  const amountNum = parseFloat(amount) || 0
  const groupMissing = missingGroups.includes(groupForMethod(paymentMethod))

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <ArrowDownToLine className="h-7 w-7 text-emerald-600" />
          Deposit Transaction
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
          Record money received from a member. Saved as draft, then submitted for Maker-Checker approval.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ═══ LEFT (2 cols): Entry form ═══ */}
        <div className="lg:col-span-2 space-y-6">
          {/* Member search — overflow-visible so the dropdown can float over the cards below
              (the shared Card component applies overflow-hidden by default, which clips it). */}
          <Card className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl overflow-visible relative z-20">
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wider text-slate-500">Member</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label htmlFor="memberSearch">Quick Search (Member ID, Name, Mobile)</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="memberSearch"
                  placeholder="Type to search member..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-white dark:bg-slate-950 h-11 text-base shadow-sm"
                />
                {filteredMembers.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden">
                    {filteredMembers.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleSelectMember(m)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 last:border-0"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-900 dark:text-white truncate">{m.fullName}</div>
                          <div className="text-xs text-slate-500 font-mono">
                            {m.memberNo} {m.phone ? `· ${m.phone}` : ""}
                          </div>
                        </div>
                        {m.dueBalance > 0 && (
                          <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300 shrink-0">
                            Due {formatBDT(m.dueBalance)}
                          </Badge>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedMember && (
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 pt-1">
                  <User className="h-4 w-4 text-emerald-600" />
                  <span>
                    Selected: <span className="font-medium">{selectedMember.fullName}</span> ({selectedMember.memberNo})
                  </span>
                  <button
                    type="button"
                    onClick={() => { setSelectedMember(null); setCoaOverridden(false) }}
                    className="ml-auto text-xs text-red-500 hover:underline"
                  >
                    Change
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Deposit details */}
          <Card className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wider text-slate-500">Deposit Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Deposit Type — active collection types only */}
              <div className="space-y-2">
                <Label>Deposit Type *</Label>
                <Select value={collectionTypeId} onValueChange={(v) => v && setCollectionTypeId(v)}>
                  <SelectTrigger className="bg-white dark:bg-slate-950">
                    <SelectValue placeholder={collectionTypes.length ? "Select deposit type" : "No collection types configured"} />
                  </SelectTrigger>
                  <SelectContent>
                    {collectionTypes.length === 0 ? (
                      <div className="px-3 py-6 text-center text-sm text-slate-500">
                        No active collection types.{" "}
                        <Link href="/dashboard/collection-setup" className="underline text-indigo-600">Add one →</Link>
                      </div>
                    ) : (
                      collectionTypes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Deposit Amount */}
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

              {/* Deposit Date */}
              <div className="space-y-2">
                <Label htmlFor="depositDate">Deposit Date *</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <Input
                    id="depositDate"
                    type="date"
                    value={depositDate}
                    onChange={(e) => setDepositDate(e.target.value)}
                    className="pl-9 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>

              {/* Collection Method — 3 groups, stores granular PaymentMethod */}
              <div className="space-y-2">
                <Label>Collection Method *</Label>
                <Select value={paymentMethod} onValueChange={(v) => v && handleMethodChange(v as PaymentMethod)}>
                  <SelectTrigger className="bg-white dark:bg-slate-950">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {METHOD_GROUPS.map((g) => (
                      <SelectGroup key={g.group}>
                        <SelectLabel>{g.label}</SelectLabel>
                        {g.methods.map((m) => (
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Payment source — auto-mapped COA with override */}
          <Card className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wider text-slate-500">Received COA</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {groupMissing && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30 p-3 text-sm text-amber-800 dark:text-amber-200">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    No default account configured for <strong>{METHOD_LABEL[paymentMethod]}</strong>. Select a COA manually, or{" "}
                    <Link href="/dashboard/settings/bank" className="underline font-medium">configure it in Somiti Settings →</Link>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>
                    Received COA {coaOverridden ? "(overridden)" : currentDefaultCoa?.coaAccountName ? "(auto)" : ""}
                  </Label>
                  <Select value={cashAccountId} onValueChange={(v) => v && handleCoaOverride(v)}>
                    <SelectTrigger className="bg-white dark:bg-slate-950">
                      <SelectValue placeholder={groupMissing ? "Select COA manually" : "Auto-selected from method"} />
                    </SelectTrigger>
                    <SelectContent>
                      {cashLikeAccounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.accountCode} · {a.accountName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {coaOverridden && (
                    <button
                      type="button"
                      onClick={() => { setCoaOverridden(false); setCashAccountId(currentDefaultCoa?.coaAccountId ?? "") }}
                      className="text-xs text-indigo-600 hover:underline"
                    >
                      Reset to auto-mapped COA
                    </button>
                  )}
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
              </div>
            </CardContent>
          </Card>

          {/* Remarks */}
          <Card className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wider text-slate-500">Additional Information</CardTitle>
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

          {/* Action buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
            <Button variant="secondary" disabled={isPending} onClick={() => handleSave(false)}>
              <Save className="h-4 w-4 mr-2" /> Save Draft
            </Button>
            <Button className="bg-amber-600 hover:bg-amber-700" disabled={isPending} onClick={() => handleSave(true)}>
              <Send className="h-4 w-4 mr-2" /> Save & Submit
            </Button>
          </div>
        </div>

        {/* ═══ RIGHT (1 col): Member profile card + journal preview ═══ */}
        <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          {/* Member profile card */}
          {!selectedMember ? (
            <Card className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                  <User className="h-8 w-8 text-slate-400" />
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Search &amp; select a member to view details
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="overflow-hidden rounded-2xl border border-slate-200/50 dark:border-slate-800/50 bg-white dark:bg-slate-900 shadow-sm">
              {/* Gradient header with photo */}
              <div className="relative bg-gradient-to-br from-indigo-600 to-violet-700 dark:from-indigo-700 dark:to-violet-900 px-6 pt-6 pb-5 text-white">
                <div className="flex items-center gap-4">
                  {selectedMember.photoUrl ? (
                    <img
                      src={selectedMember.photoUrl}
                      alt={selectedMember.fullName}
                      className="w-20 h-20 rounded-2xl object-cover ring-4 ring-white/20 shadow-xl"
                    />
                  ) : (
                    <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold ring-4 ring-white/20 shadow-xl ${AVATAR_COLORS[selectedMember.gender ?? "OTHER"] ?? AVATAR_COLORS.OTHER}`}>
                      {initials}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h2 className="text-xl font-bold tracking-tight truncate">{selectedMember.fullName}</h2>
                    <p className="text-indigo-100 text-sm font-mono flex items-center gap-1.5 mt-0.5">
                      <Hash className="w-3.5 h-3.5" /> {selectedMember.memberNo}
                    </p>
                    {st && (
                      <span className={`inline-flex mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${st.bg} ${st.text}`}>
                        {st.label}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Financial summary */}
              <CardContent className="p-5 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-red-50 dark:bg-red-950/20 p-3">
                    <div className="text-xs text-slate-500 dark:text-slate-400">Due Balance</div>
                    <div className={`text-lg font-bold ${selectedMember.dueBalance > 0 ? "text-red-600 dark:text-red-400" : "text-slate-700 dark:text-slate-300"}`}>
                      {formatBDT(selectedMember.dueBalance)}
                    </div>
                    {selectedMember.lateFines > 0 && (
                      <div className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
                        incl. {formatBDT(selectedMember.lateFines)} fines
                      </div>
                    )}
                  </div>
                  <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 p-3">
                    <div className="text-xs text-slate-500 dark:text-slate-400">Total Deposits</div>
                    <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {formatBDT(selectedMember.totalDeposits)}
                    </div>
                  </div>
                </div>

                {selectedMember.lastDeposit && (
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 text-sm flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-500 dark:text-slate-400">Last deposit:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      {formatBDT(selectedMember.lastDeposit.amount)}
                    </span>
                    <span className="text-xs text-slate-400">on {formatDate(selectedMember.lastDeposit.date)}</span>
                  </div>
                )}

                {selectedMember.dueBalance > 0 && (
                  <div className="text-xs text-slate-500 dark:text-slate-400 pt-1 flex items-start gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                    Tip: pick the <span className="font-medium">Due Payment</span> deposit type to clear dues.
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Live journal preview */}
          <Card className="rounded-2xl border border-slate-200/50 dark:border-slate-800/50 bg-white dark:bg-slate-900 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <BookOpen className="h-4 w-4" /> Accounting Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase text-slate-500">
                      <th className="text-left px-3 py-2 font-semibold">Account</th>
                      <th className="text-right px-3 py-2 font-semibold">Debit</th>
                      <th className="text-right px-3 py-2 font-semibold">Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                        {effectiveCoa ? (
                          <span>{effectiveCoa.accountName}<span className="text-slate-400 font-mono ml-1">{effectiveCoa.accountCode}</span></span>
                        ) : (
                          <span className="text-slate-400 italic">— received COA —</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-emerald-600 dark:text-emerald-400">
                        {amountNum > 0 ? formatBDT(amountNum) : "—"}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-300">—</td>
                    </tr>
                    <tr className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                        {memberSavingsLiability ? (
                          <span>{memberSavingsLiability.accountName}<span className="text-slate-400 font-mono ml-1">{memberSavingsLiability.accountCode}</span></span>
                        ) : (
                          <span className="text-red-500 italic">Member Savings Liability (missing)</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-300">—</td>
                      <td className="px-3 py-2 text-right font-mono text-rose-600 dark:text-rose-400">
                        {amountNum > 0 ? formatBDT(amountNum) : "—"}
                      </td>
                    </tr>
                    <tr className="border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 font-semibold">
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-200">Total</td>
                      <td className="px-3 py-2 text-right font-mono text-slate-700 dark:text-slate-200">
                        {amountNum > 0 ? formatBDT(amountNum) : "—"}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-slate-700 dark:text-slate-200">
                        {amountNum > 0 ? formatBDT(amountNum) : "—"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Posting occurs on approval. Voucher type: <span className="font-medium">RECEIPT</span>.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
