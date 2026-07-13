"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { deleteAccount } from "@/app/actions/accounts"
import AccountModal from "@/components/AccountModal"
import { 
  Search, Filter, Upload, Download, Printer, RefreshCw, 
  ChevronRight, ChevronDown, Wallet, Landmark, Scale, 
  TrendingUp, TrendingDown, Banknote, Layers, Trash2, Edit 
} from "lucide-react"

interface Account {
  id: string; accountCode: string; accountName: string; accountType: string;
  nature: string; currentBalance: number; status: string; isBank: boolean; isCash: boolean;
  childAccounts: Account[]
}

export default function ChartOfAccountsClient({ accounts }: { accounts: Account[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState("")

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expanded)
    if (newExpanded.has(id)) newExpanded.delete(id)
    else newExpanded.add(id)
    setExpanded(newExpanded)
  }

  // Calculate Summary Stats
  const stats = {
    totalAssets: accounts.filter(a => a.accountType === "ASSET").reduce((acc, a) => acc + a.currentBalance, 0),
    totalLiabilities: accounts.filter(a => a.accountType === "LIABILITY").reduce((acc, a) => acc + a.currentBalance, 0),
    totalEquity: accounts.filter(a => a.accountType === "EQUITY").reduce((acc, a) => acc + a.currentBalance, 0),
    totalIncome: accounts.filter(a => a.accountType === "INCOME").reduce((acc, a) => acc + a.currentBalance, 0),
    totalExpenses: accounts.filter(a => a.accountType === "EXPENSE").reduce((acc, a) => acc + a.currentBalance, 0),
    bankAccounts: accounts.filter(a => a.isBank).length,
    cashAccounts: accounts.filter(a => a.isCash).length,
    totalAccounts: accounts.length,
  }

  const summaryCards = [
    { label: "Total Assets", value: `৳ ${stats.totalAssets.toLocaleString()}`, icon: Wallet, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/50", border: "border-emerald-200/50 dark:border-emerald-900/50" },
    { label: "Total Liabilities", value: `৳ ${stats.totalLiabilities.toLocaleString()}`, icon: Landmark, color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-950/50", border: "border-rose-200/50 dark:border-rose-900/50" },
    { label: "Total Equity", value: `৳ ${stats.totalEquity.toLocaleString()}`, icon: Scale, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/50", border: "border-blue-200/50 dark:border-blue-900/50" },
    { label: "Total Income", value: `৳ ${stats.totalIncome.toLocaleString()}`, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/50", border: "border-green-200/50 dark:border-green-900/50" },
    { label: "Total Expenses", value: `৳ ${stats.totalExpenses.toLocaleString()}`, icon: TrendingDown, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/50", border: "border-red-200/50 dark:border-red-900/50" },
    { label: "Bank Accounts", value: stats.bankAccounts, icon: Banknote, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/50", border: "border-purple-200/50 dark:border-purple-900/50" },
    { label: "Cash Accounts", value: stats.cashAccounts, icon: Wallet, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/50", border: "border-amber-200/50 dark:border-amber-900/50" },
    { label: "Total Accounts", value: stats.totalAccounts, icon: Layers, color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-950/50", border: "border-indigo-200/50 dark:border-indigo-900/50" },
  ]

  // Recursive Tree Row Renderer
  const renderRow = (account: Account, level: number = 0): React.ReactNode => {
    const hasChildren = account.childAccounts && account.childAccounts.length > 0
    const isExpanded = expanded.has(account.id)
    
    return (
      <>
        <tr className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
          <td className="px-6 py-3">
            <div className="flex items-center" style={{ paddingLeft: `${level * 24}px` }}>
              {hasChildren ? (
                <button onClick={() => toggleExpand(account.id)} className="mr-2 text-slate-400 hover:text-slate-900 dark:hover:text-white">
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
              ) : (
                <div className="w-6 mr-2"></div>
              )}
              <span className="font-mono text-xs text-slate-500">{account.accountCode}</span>
            </div>
          </td>
          <td className="px-6 py-3 font-medium text-slate-900 dark:text-white">{account.accountName}</td>
          <td className="px-6 py-3 text-sm">
            <Badge variant="outline" className={
              account.accountType === "ASSET" ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400" :
              account.accountType === "LIABILITY" ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400" :
              account.accountType === "EQUITY" ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400" :
              account.accountType === "INCOME" ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400" :
              "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400"
            }>{account.accountType}</Badge>
          </td>
          <td className="px-6 py-3 text-sm text-slate-500">{account.nature}</td>
          <td className="px-6 py-3 text-sm font-bold text-slate-900 dark:text-white text-right">৳ {Number(account.currentBalance).toLocaleString()}</td>
          <td className="px-6 py-3 text-center">
            <Badge variant={account.status === "ACTIVE" ? "default" : "secondary"} className={account.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-slate-500/10 text-slate-600 border border-slate-500/20"}>
              {account.status}
            </Badge>
          </td>
          <td className="px-6 

py-3 text-right">
            <div className="flex items-center justify-end gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-600"><Edit className="h-4 w-4" /></Button>
              <form action={() => deleteAccount(account.id)}>
                <Button type="submit" variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></Button>
              </form>
            </div>
          </td>
        </tr>
        {isExpanded && hasChildren && account.childAccounts.map((child) => renderRow(child, level + 1))}
      </>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryCards.map((stat, index) => (
          <Card key={index} className={`bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border ${stat.border} ${stat.bg} shadow-sm hover:shadow-lg hover:-translate-y-1 rounded-2xl transition-all duration-300`}>
            <CardContent className="p-4 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-widest font-bold text-slate-500">{stat.label}</span>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <h3 className={`text-lg font-extrabold tracking-tight ${stat.color}`}>{stat.value}</h3>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl rounded-2xl p-4 flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Search accounts by code or name..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-white dark:bg-slate-950" />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button variant="outline" size="icon" className="rounded-xl shadow-sm"><Filter className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" className="rounded-xl shadow-sm"><Upload className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" className="rounded-xl shadow-sm"><Download className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" className="rounded-xl shadow-sm"><Printer className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" className="rounded-xl shadow-sm"><RefreshCw className="h-4 w-4" /></Button>
          <AccountModal accounts={accounts} />
        </div>
      </Card>

      {/* Accounts Table / Tree View */}
      <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200/50 dark:border-slate-800/50">
              <tr>
                <th className="px-6 py-4 text-[11px] uppercase tracking-widest font-bold text-slate-400">Code</th>
                <th className="px-6 py-4 text-[11px] uppercase tracking-widest font-bold text-slate-400">Account Name</th>
                <th className="px-6 py-4 text-[11px] uppercase tracking-widest font-bold text-slate-400">Type</th>
                <th className="px-6 py-4 text-[11px] uppercase tracking-widest font-bold text-slate-400">Nature</th>
                <th className="px-6 py-4 text-[11px] uppercase tracking-widest font-bold text-slate-400 text-right">Balance</th>
                <th className="px-6 py-4 text-[11px] uppercase tracking-widest font-bold text-slate-400 text-center">Status</th>
                <th className="px-6 py-4 text-[11px] uppercase tracking-widest font-bold text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-slate-500">
                    <Layers className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                    <p className="font-medium">No accounts found.</p>
                    <p className="text-sm">Click "Add New Account" to create your first ledger account.</p>
                  </td>
                </tr>
              ) : (
                accounts.filter(acc => acc.accountName.toLowerCase().includes(search.toLowerCase()) || acc.accountCode.includes(search)).map((account) => renderRow(account))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}