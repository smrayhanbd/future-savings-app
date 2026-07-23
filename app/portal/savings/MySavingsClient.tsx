"use client"

import { useState } from "react"
import { submitWithdrawalRequest } from "@/app/actions/portal"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { toast } from "sonner"
import { HandCoins, AlertCircle, CheckCircle2, Clock, XCircle } from "lucide-react"

/** A withdrawal request row — subset of the Savings model rendered here.
 *  Server components pass these through `plain()` so Decimal/Date are already
 *  converted to number / ISO-string (serializable across the boundary). */
interface WithdrawalRequest {
  id: string
  amount: number | null
  createdAt: string
  method: string | null
  notes: string | null
  status: string
}

export default function MySavingsClient({ memberId, currentBalance, requests }: { memberId: string, currentBalance: number, requests: WithdrawalRequest[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState("")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)

    if (parseFloat(amount) > currentBalance) {
      toast.error("Invalid Amount", { description: "Withdrawal amount cannot exceed your current balance." })
      setLoading(false)
      return
    }

    try {
      await submitWithdrawalRequest(memberId, formData)
      toast.success("Request Submitted", { description: "Your withdrawal request is pending approval." })
      setOpen(false)
    } catch (err) {
      toast.error("Failed", { description: err instanceof Error ? err.message : "Failed" })
      setLoading(false)
    }
  }

  const statusStyle = (status: string) =>
    status === "APPROVED"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400"
      : status === "REJECTED"
        ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400"
        : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400"

  const StatusIcon = ({ status }: { status: string }) =>
    status === "PENDING" ? <Clock className="w-3 h-3 mr-1" /> :
    status === "APPROVED" ? <CheckCircle2 className="w-3 h-3 mr-1" /> :
    <XCircle className="w-3 h-3 mr-1" />

  return (
    <Card className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/70 shadow-sm rounded-2xl overflow-hidden">
      <CardHeader className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200/60 dark:border-slate-800/60 px-6 py-4 flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-sm text-slate-800 dark:text-white">
          <HandCoins className="h-4 w-4 text-amber-500" /> Withdrawal Requests
        </CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={<Button size="sm" className="bg-rose-600 hover:bg-rose-700" />}
          >
            <HandCoins className="h-4 w-4 mr-1" /> Request Withdrawal
          </DialogTrigger>
          <DialogContent className="max-w-md bg-white dark:bg-slate-950 rounded-2xl">
            <DialogHeader>
              <DialogTitle>Request Withdrawal</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (৳)</Label>
                <Input id="amount" name="amount" type="number" step="0.01" min="0" required placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
                <p className="text-xs text-slate-500">Available Balance: ৳ {currentBalance.toLocaleString()}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="method">Payment Method</Label>
                <Select name="method" required>
                  <SelectTrigger id="method"><SelectValue placeholder="Select Method" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="BANK">Bank Transfer</SelectItem>
                    <SelectItem value="BKASH">bKash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input id="notes" name="notes" placeholder="Any specific instructions..." />
              </div>
              <Button type="submit" className="w-full bg-rose-600 hover:bg-rose-700" disabled={loading}>
                {loading ? "Submitting..." : "Submit Request"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-6">
        {requests.length === 0 ? (
          <div className="text-center py-8 flex flex-col items-center">
            <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
              <AlertCircle className="h-6 w-6 text-slate-400" />
            </div>
            <p className="font-medium text-slate-700 dark:text-slate-200">No withdrawal requests yet</p>
            <p className="text-sm text-slate-500 mt-0.5">Click &quot;Request Withdrawal&quot; to create one.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div key={req.id} className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/50">
                <div>
                  <p className="font-bold text-lg text-slate-900 dark:text-white">৳ {Number(req.amount).toLocaleString()}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {new Date(req.createdAt).toLocaleDateString()} · {req.method}
                  </p>
                  {req.notes && <p className="text-xs text-slate-500 mt-1 line-clamp-1">&ldquo;{req.notes}&rdquo;</p>}
                </div>
                <Badge variant="outline" className={statusStyle(req.status)}>
                  <StatusIcon status={req.status} />
                  {req.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
