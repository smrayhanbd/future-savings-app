"use client"

import { useState } from "react"
import { createAccount } from "@/app/actions/accounts"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus } from "lucide-react"

export default function AccountModal({ accounts }: { accounts: any[] }) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Fix: DialogTrigger acts as the button directly to avoid nested buttons */}
      <DialogTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-indigo-600 text-white shadow hover:bg-indigo-700 h-9 px-4 py-2 cursor-pointer">
        <Plus className="mr-2 h-4 w-4" /> Add New Account
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl bg-white dark:bg-slate-950 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">Create New Account</DialogTitle>
        </DialogHeader>
        
        <form action={createAccount} onSubmit={() => setOpen(false)} className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="accountCode">Account Code *</Label>
              <Input id="accountCode" name="accountCode" required placeholder="e.g. 1010" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountName">Account Name *</Label>
              <Input id="accountName" name="accountName" required placeholder="e.g. Cash in Hand" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="parentAccountId">Parent Account</Label>
              <Select name="parentAccountId">
                <SelectTrigger id="parentAccountId"><SelectValue placeholder="None (Root Account)" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>{acc.accountCode} - {acc.accountName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountType">Account Type *</Label>
              <Select name="accountType" required>
                <SelectTrigger id="accountType"><SelectValue placeholder="Select Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ASSET">Asset</SelectItem>
                  <SelectItem value="LIABILITY">Liability</SelectItem>
                  <SelectItem value="EQUITY">Equity</SelectItem>
                  <SelectItem value="INCOME">Income</SelectItem>
                  <SelectItem value="EXPENSE">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nature">Nature *</Label>
              <Select name="nature" required>
                <SelectTrigger id="nature"><SelectValue placeholder="Select Nature" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DEBIT">Debit</SelectItem>
                  <SelectItem value="CREDIT">Credit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="openingBalance">Opening Balance (৳)</Label>
              <Input id="openingBalance" name="openingBalance" type="number" step="0.01" defaultValue="0" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input id="category" name="category" placeholder="e.g. Current Asset" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" name="description" placeholder="Optional notes..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Input id="currency" name="currency" defaultValue="BDT" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select name="status">
                <SelectTrigger id="status"><SelectValue placeholder="Select Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              <input type="checkbox" name="isBank" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" /> Is Bank Account?
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              <input type="checkbox" name="isCash" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" /> Is Cash Account?
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              <input type="checkbox" name="allowPosting" defaultChecked className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" /> Allow Posting
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              <input type="checkbox" name="allowJournal" defaultChecked className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" /> Allow Journal
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">Save Account</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}