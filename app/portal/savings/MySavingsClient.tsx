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
import { HandCoins, AlertCircle, CheckCircle2, Clock } from "lucide-react"

export default function MySavingsClient({ memberId, currentBalance, requests }: { memberId: string, currentBalance: number, requests: any[] }) {
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
    } catch (err: any) {
      toast.error("Failed", { description: err.message })
      setLoading(false)
    }
  }

  return (
    <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl rounded-2xl overflow-hidden">
      <CardHeader className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200/50 dark:border-slate-800/50 px-6 py-4 flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-white">
          <HandCoins className="h-5 w-5 text-amber-500" /> Withdrawal Requests
        </CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 bg-rose-600 text-white shadow hover:bg-rose-700 h-9 px-3 cursor-pointer">
            Request Withdrawal
          </DialogTrigger>
          <DialogContent className="max-w-md bg-white dark:bg-slate-950 rounded-2xl">
            <DialogHeader>
              <DialogTitle>Request Withdrawal</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (৳)</Label>
                <Input id="amount" name="amount" type="number" step="0.01" required placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
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
          <div className="text-center py-8 text-slate-500 flex flex-col items-center">
            <AlertCircle className="h-10 w-10 text-slate-300 mb-2" />
            <p className="font-medium">No withdrawal requests yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
              <div key={req.id} className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950">
                <div>
                  <p className="font-bold text-lg text-slate-900 dark:text-white">৳ {Number(req.amount).toLocaleString()}</p>
                  <p className="text-xs text-slate-500">{new Date(req.createdAt).toLocaleDateString()} • {req.method}</p>
                </div>
                <Badge variant="outline" className={
                  req.status === "APPROVED" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                  req.status === "REJECTED" ? "bg-red-50 text-red-700 border-red-200" :
                  "bg-amber-50 text-amber-700 border-amber-200"
                }>
                  {req.status === "PENDING" && <Clock className="w-3 h-3 mr-1" />}
                  {req.status === "APPROVED" && <CheckCircle2 className="w-3 h-3 mr-1" />}
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