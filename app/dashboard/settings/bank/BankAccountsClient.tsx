"use client"

import { useState, useTransition } from "react"
import {
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
  toggleBankAccountStatus,
  setDefaultBankAccount,
} from "@/app/actions/finance"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { Landmark, Plus, Star, Trash2, Pencil, AlertTriangle } from "lucide-react"
import Link from "next/link"
import type { PaymentMethod } from "@/lib/transactions/types"
import type { AccountType } from "@/lib/accounting"

interface BankAccountRow {
  id: string
  accountName: string
  bankName: string | null
  accountNumber: string | null
  branch: string | null
  paymentMethod: PaymentMethod
  coaAccountId: string
  coaAccountCode: string
  coaAccountName: string
  isActive: boolean
  isDefault: boolean
}

interface AccountOption {
  id: string
  accountCode: string
  accountName: string
  accountType: AccountType
  isCash: boolean
  isBank: boolean
}

/** The 3 collection-method groups shown in the UI. */
const METHOD_GROUPS = [
  { group: "CASH", label: "Cash", methods: ["CASH"] as PaymentMethod[] },
  { group: "BANK", label: "Bank Transfer / Cheque", methods: ["BANK_TRANSFER", "CHEQUE"] as PaymentMethod[] },
  { group: "MOBILE", label: "Mobile Banking", methods: ["BKASH", "NAGAD", "ROCKET"] as PaymentMethod[] },
] as const

const METHOD_LABEL: Record<PaymentMethod, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  CHEQUE: "Cheque",
  BKASH: "bKash",
  NAGAD: "Nagad",
  ROCKET: "Rocket",
}

const GROUP_BADGE: Record<string, string> = {
  CASH: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  BANK: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  MOBILE: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
}

function groupForMethod(method: PaymentMethod): string {
  if (method === "CASH") return "CASH"
  if (method === "BANK_TRANSFER" || method === "CHEQUE") return "BANK"
  return "MOBILE"
}

export default function BankAccountsClient({
  bankAccounts,
  accounts,
}: {
  bankAccounts: BankAccountRow[]
  accounts: AccountOption[]
}) {
  const [isPending, startTransition] = useTransition()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<BankAccountRow | null>(null)

  // form state
  const [fAccountName, setFAccountName] = useState("")
  const [fBankName, setFBankName] = useState("")
  const [fAccountNumber, setFAccountNumber] = useState("")
  const [fBranch, setFBranch] = useState("")
  const [fPaymentMethod, setFPaymentMethod] = useState<PaymentMethod>("CASH")
  const [fCoaAccountId, setFCoaAccountId] = useState("")
  const [fIsDefault, setFIsDefault] = useState(false)

  const resetForm = () => {
    setFAccountName("")
    setFBankName("")
    setFAccountNumber("")
    setFBranch("")
    setFPaymentMethod("CASH")
    setFCoaAccountId("")
    setFIsDefault(false)
    setEditing(null)
  }

  const openCreate = () => {
    resetForm()
    setDialogOpen(true)
  }

  const openEdit = (row: BankAccountRow) => {
    setEditing(row)
    setFAccountName(row.accountName)
    setFBankName(row.bankName ?? "")
    setFAccountNumber(row.accountNumber ?? "")
    setFBranch(row.branch ?? "")
    setFPaymentMethod(row.paymentMethod)
    setFCoaAccountId(row.coaAccountId)
    setFIsDefault(row.isDefault)
    setDialogOpen(true)
  }

  const buildFormData = () => {
    const fd = new FormData()
    fd.append("accountName", fAccountName)
    fd.append("bankName", fBankName)
    fd.append("accountNumber", fAccountNumber)
    fd.append("branch", fBranch)
    fd.append("paymentMethod", fPaymentMethod)
    fd.append("coaAccountId", fCoaAccountId)
    fd.append("isDefault", fIsDefault ? "YES" : "NO")
    return fd
  }

  const handleSubmit = () => {
    if (!fAccountName.trim()) return toast.error("Account name is required.")
    if (!fCoaAccountId) return toast.error("Select a Chart-of-Accounts account.")

    startTransition(async () => {
      try {
        if (editing) {
          await updateBankAccount(editing.id, buildFormData())
          toast.success("Bank account updated")
        } else {
          await createBankAccount(buildFormData())
          toast.success("Bank account created")
        }
        setDialogOpen(false)
        resetForm()
      } catch (error) {
        toast.error("Could not save", { description: error instanceof Error ? error.message : "Failed" })
      }
    })
  }

  const handleToggleActive = (row: BankAccountRow) => {
    startTransition(async () => {
      try {
        await toggleBankAccountStatus(row.id, !row.isActive)
        toast.success(`Account ${!row.isActive ? "activated" : "deactivated"}`)
      } catch (error) {
        toast.error("Failed", { description: error instanceof Error ? error.message : undefined })
      }
    })
  }

  const handleSetDefault = (row: BankAccountRow) => {
    if (row.isDefault) return
    startTransition(async () => {
      try {
        await setDefaultBankAccount(row.id, row.paymentMethod)
        toast.success(`Default ${groupForMethod(row.paymentMethod).toLowerCase()} account updated`)
      } catch (error) {
        toast.error("Failed", { description: error instanceof Error ? error.message : undefined })
      }
    })
  }

  const handleDelete = (row: BankAccountRow) => {
    if (!confirm(`Delete "${row.accountName}"? This cannot be undone.`)) return
    startTransition(async () => {
      try {
        await deleteBankAccount(row.id)
        toast.success("Bank account deleted")
      } catch (error) {
        toast.error("Failed", { description: error instanceof Error ? error.message : undefined })
      }
    })
  }

  // Coverage check — warn if any group has no default.
  const missingDefaults = METHOD_GROUPS.filter(
    (g) => !bankAccounts.some((b) => b.isDefault && b.isActive && groupForMethod(b.paymentMethod) === g.group)
  ).map((g) => g.label)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <Landmark className="h-7 w-7 text-indigo-600" />
          Active Bank Accounts
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
          Map each Collection Method to the Chart-of-Accounts account that should receive deposits.
          The Deposit form auto-selects the default account for the chosen method.
        </p>
      </div>

      {/* Coverage warning */}
      {missingDefaults.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30 p-4">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 dark:text-amber-200">
            <p className="font-semibold">No default account configured for: {missingDefaults.join(", ")}.</p>
            <p className="mt-0.5">
              The Deposit form cannot auto-map these methods until a default is set. Mark one account per
              group as default (★), or collectors will have to pick the COA manually.{" "}
              <Link href="/dashboard/transactions/deposits" className="underline font-medium">
                Go to Deposit form →
              </Link>
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Add/Edit form */}
        <div className="lg:col-span-1">
          <Card className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl lg:sticky lg:top-6">
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Plus className="h-4 w-4" /> {editing ? "Edit Account" : "Add Account"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm() }}>
                <DialogTrigger
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 w-full bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer"
                  onClick={openCreate}
                >
                  <Plus className="h-4 w-4" /> New Bank Account
                </DialogTrigger>
                <DialogContent className="max-w-lg bg-white dark:bg-slate-950 rounded-2xl">
                  <DialogHeader>
                    <DialogTitle>{editing ? "Edit Bank Account" : "Add Bank Account"}</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
                    <div className="space-y-2 md:col-span-2">
                      <Label>Account Name *</Label>
                      <Input value={fAccountName} onChange={(e) => setFAccountName(e.target.value)} placeholder="e.g. Cash Drawer — Counter 1" />
                    </div>
                    <div className="space-y-2">
                      <Label>Bank / Provider</Label>
                      <Input value={fBankName} onChange={(e) => setFBankName(e.target.value)} placeholder="e.g. City Bank / bKash" />
                    </div>
                    <div className="space-y-2">
                      <Label>Account / Wallet No.</Label>
                      <Input value={fAccountNumber} onChange={(e) => setFAccountNumber(e.target.value)} placeholder="masked number" />
                    </div>
                    <div className="space-y-2">
                      <Label>Branch</Label>
                      <Input value={fBranch} onChange={(e) => setFBranch(e.target.value)} placeholder="optional" />
                    </div>
                    <div className="space-y-2">
                      <Label>Collection Method *</Label>
                      <Select value={fPaymentMethod} onValueChange={(v) => v && setFPaymentMethod(v as PaymentMethod)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {METHOD_GROUPS.map((g) => (
                            <SelectGroup key={g.group}>
                              <SelectLabel>{g.label}</SelectLabel>
                              {g.methods.map((m) => (
                                <SelectItem key={m} value={m}>{METHOD_LABEL[m]}</SelectItem>
                              ))}
                            </SelectGroup>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Received COA (Chart-of-Accounts) *</Label>
                      <Select value={fCoaAccountId} onValueChange={(v) => v && setFCoaAccountId(v)}>
                        <SelectTrigger><SelectValue placeholder="Select COA account" /></SelectTrigger>
                        <SelectContent>
                          {accounts.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.accountCode} · {a.accountName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-2 flex items-center gap-2 pt-1">
                      <Checkbox id="isDefault" checked={fIsDefault} onCheckedChange={(v) => setFIsDefault(v === true)} />
                      <Label htmlFor="isDefault" className="cursor-pointer font-normal text-sm">
                        Set as default for this collection method group
                      </Label>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm() }}>Cancel</Button>
                    <Button disabled={isPending} onClick={handleSubmit} className="bg-indigo-600 hover:bg-indigo-700">
                      {isPending ? "Saving…" : editing ? "Save Changes" : "Create Account"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <p className="text-xs text-slate-500 dark:text-slate-400 pt-2 leading-relaxed">
                Tip: pick a COA that matches the method — Cash accounts for <em>Cash</em>, Bank accounts
                for <em>Bank/Cheque</em>, and a Mobile Wallet account for <em>Mobile Banking</em>.
                The ★ star marks the default that the Deposit form auto-selects.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: existing accounts table */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Existing Bank Accounts</h2>
          <Card className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                    <TableHead className="px-4 py-3 text-xs uppercase font-bold text-slate-500">Account</TableHead>
                    <TableHead className="px-4 py-3 text-xs uppercase font-bold text-slate-500">Method</TableHead>
                    <TableHead className="px-4 py-3 text-xs uppercase font-bold text-slate-500">Received COA</TableHead>
                    <TableHead className="px-4 py-3 text-xs uppercase font-bold text-slate-500 text-center">Default</TableHead>
                    <TableHead className="px-4 py-3 text-xs uppercase font-bold text-slate-500 text-center">Active</TableHead>
                    <TableHead className="px-4 py-3 text-xs uppercase font-bold text-slate-500 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bankAccounts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-slate-500">
                        No bank accounts configured yet. Add one to enable auto-mapping on the Deposit form.
                      </TableCell>
                    </TableRow>
                  ) : (
                    bankAccounts.map((b) => {
                      const group = groupForMethod(b.paymentMethod)
                      return (
                        <TableRow key={b.id} className="border-b border-slate-100 dark:border-slate-800">
                          <TableCell className="px-4 py-4">
                            <div className="font-medium text-slate-900 dark:text-white">{b.accountName}</div>
                            {(b.bankName || b.accountNumber) && (
                              <div className="text-xs text-slate-500">
                                {[b.bankName, b.accountNumber, b.branch].filter(Boolean).join(" · ")}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="px-4 py-4">
                            <Badge variant="secondary" className={GROUP_BADGE[group]}>
                              {METHOD_LABEL[b.paymentMethod]}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-4 py-4 text-sm">
                            <div className="font-medium text-slate-700 dark:text-slate-200">{b.coaAccountName}</div>
                            <div className="text-xs text-slate-500 font-mono">{b.coaAccountCode}</div>
                          </TableCell>
                          <TableCell className="px-4 py-4 text-center">
                            <button
                              type="button"
                              disabled={isPending || !b.isActive}
                              onClick={() => handleSetDefault(b)}
                              title={b.isDefault ? "Default for this group" : "Set as default"}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            >
                              <Star className={`h-4 w-4 ${b.isDefault ? "fill-amber-400 text-amber-400" : "text-slate-400"}`} />
                            </button>
                          </TableCell>
                          <TableCell className="px-4 py-4 text-center">
                            <Switch checked={b.isActive} onCheckedChange={() => handleToggleActive(b)} />
                          </TableCell>
                          <TableCell className="px-4 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-indigo-600" onClick={() => openEdit(b)} title="Edit">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={() => handleDelete(b)} title="Delete">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
