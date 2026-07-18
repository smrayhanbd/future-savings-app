"use client"

import React, { useState, useMemo, useTransition } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Users, PlusCircle, Eye, MoreHorizontal, Edit, Banknote, CreditCard, BookOpen,
  Printer, Mail, MessageSquare, PauseCircle, Trash2, PlayCircle,
  Search, Filter, Upload, TrendingUp, TrendingDown,
  UserCheck, AlertTriangle, Lock, ChevronLeft, ChevronRight, X, Check, UserX,
  ArrowUpDown, Clock, Shield, Wallet, Phone, RefreshCw, ChevronDown,
  SearchX, CheckCircle2, AlertCircle, UserPlus, Download, ShieldCheck,
  Loader2,
} from "lucide-react"

import {
  updateMemberStatus, deleteMember, setMemberKyc,
  bulkUpdateMemberStatus, bulkDeleteMembers,
} from "@/app/actions/member"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import MemberQuickView, { type QuickViewMember } from "@/components/member/MemberQuickView"

interface Member {
  id: string
  fullName: string
  memberNo: string
  phone: string
  email: string | null
  gender: "MALE" | "FEMALE" | "OTHER"
  status: "ACTIVE" | "PENDING" | "SUSPENDED" | "INACTIVE" | "REJECTED"
  nidNumber: string | null
  kycVerified: boolean
  photoUrl: string | null
  profession: string | null
  nomineesCount?: number
  savings: { amount: number }[]
  createdAt: string
  membershipDate: string
  dueBalance: number
  lateFines: number
}

interface StatCard {
  label: string
  value: number
  icon: React.ReactNode
  bgLight: string
  bgDark: string
  borderLight: string
  borderDark: string
  textLight: string
  textDark: string
  trend?: { value: number; isPositive: boolean }
}

// ─── Components ──────────────────────────────────────────────────────
function StatCardComponent({ stat }: { stat: StatCard }) {
  const [isHovered, setIsHovered] = useState(false)
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-white dark:bg-slate-950 ${stat.borderLight} ${stat.borderDark} transition-all duration-300 ease-out hover:shadow-lg hover:-translate-y-1 cursor-pointer group`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-10 ${stat.bgLight} ${stat.bgDark} transition-transform duration-500 ease-out ${isHovered ? "scale-150" : "scale-100"}`} />
      <div className="relative p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className={`text-[10px] font-bold uppercase tracking-widest ${stat.textLight} ${stat.textDark}`}>{stat.label}</span>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${stat.bgLight} ${stat.bgDark} transition-transform duration-300 ${isHovered ? "scale-110 rotate-3" : ""}`}>
            <div className={stat.textLight + " " + stat.textDark}>{stat.icon}</div>
          </div>
        </div>
        <div className="flex items-end gap-2">
          <h3 className={`text-2xl font-bold tracking-tight ${stat.textLight} ${stat.textDark} transition-all duration-300 ${isHovered ? "scale-105" : ""}`}>
            {stat.value.toLocaleString()}
          </h3>
          {stat.trend && (
            <div className={`flex items-center gap-0.5 text-[10px] font-semibold mb-1.5 ${stat.trend.isPositive ? "text-emerald-600" : "text-red-500"}`}>
              {stat.trend.isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {stat.trend.value}%
            </div>
          )}
        </div>
        <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ease-out ${stat.bgLight}`} style={{ width: isHovered ? "100%" : "60%", transitionDelay: "100ms" }} />
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
    ACTIVE: { bg: "bg-emerald-500/10 dark:bg-emerald-500/20", text: "text-emerald-700 dark:text-emerald-300", icon: <CheckCircle2 className="w-3 h-3" />, label: "Active" },
    PENDING: { bg: "bg-amber-500/10 dark:bg-amber-500/20", text: "text-amber-700 dark:text-amber-300", icon: <Clock className="w-3 h-3" />, label: "Pending" },
    SUSPENDED: { bg: "bg-red-500/10 dark:bg-red-500/20", text: "text-red-700 dark:text-red-300", icon: <AlertCircle className="w-3 h-3" />, label: "Suspended" },
    INACTIVE: { bg: "bg-slate-500/10 dark:bg-slate-500/20", text: "text-slate-700 dark:text-slate-300", icon: <UserX className="w-3 h-3" />, label: "Inactive" },
    REJECTED: { bg: "bg-rose-500/10 dark:bg-rose-500/20", text: "text-rose-700 dark:text-rose-300", icon: <AlertCircle className="w-3 h-3" />, label: "Rejected" },
  }
  const config = configs[status] || configs.PENDING
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide ${config.bg} ${config.text} border border-current border-opacity-20`}>
      {config.icon}{config.label}
    </span>
  )
}

function KycToggleInline({ member, onDone }: { member: Member; onDone: () => void }) {
  const [isPending, startTransition] = useTransition()
  const toggle = () => {
    startTransition(async () => {
      await setMemberKyc(member.id, !member.kycVerified)
      toast.success(`KYC ${member.kycVerified ? "revoked" : "verified"} for ${member.fullName}.`)
      onDone()
    })
  }
  return (
    <button
      onClick={toggle}
      disabled={isPending}
      title={member.kycVerified ? "Revoke KYC" : "Verify KYC"}
      className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
        member.kycVerified
          ? "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
          : "text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
      }`}
    >
      {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (member.kycVerified ? <ShieldCheck className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />)}
    </button>
  )
}

function MemberAvatar({ member }: { member: Member }) {
  if (member.photoUrl) {
    return <img src={member.photoUrl} alt={member.fullName} className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-100 dark:ring-slate-800" />
  }
  const initials = member.fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
  const colors: Record<string, string> = {
    MALE: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300",
    FEMALE: "bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-300",
    OTHER: "bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300",
  }
  return <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ring-2 ring-slate-100 dark:ring-slate-800 ${colors[member.gender]}`}>{initials}</div>
}

function ActionDropdown({ member }: { member: Member }) {
  const [isPending, startTransition] = useTransition()

  const run = (fn: () => Promise<void>) => startTransition(async () => { await fn() })

  const handleSuspend = () => {
    if (confirm(`Suspend ${member.fullName}? They will lose portal access.`)) {
      run(async () => { await updateMemberStatus(member.id, "SUSPENDED"); toast.success(`${member.fullName} suspended.`) })
    }
  }
  const handleActivate = () => {
    if (confirm(`Activate ${member.fullName}?`)) {
      run(async () => { await updateMemberStatus(member.id, "ACTIVE"); toast.success(`${member.fullName} activated.`) })
    }
  }
  const handleDelete = () => {
    if (confirm(`DELETE ${member.fullName}? This action cannot be undone.`)) {
      run(async () => { await deleteMember(member.id); toast.success(`${member.fullName} deleted.`) })
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors outline-none cursor-pointer">
        <MoreHorizontal className="w-4 h-4 text-slate-500" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 z-50">
        <p className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Member Actions</p>
        <DropdownMenuItem className="p-0">
          <Link href={`/dashboard/members/${member.id}`} className="flex items-center gap-2.5 w-full cursor-pointer p-2"><Eye className="w-4 h-4" /> View Profile</Link>
        </DropdownMenuItem>
        <DropdownMenuItem className="p-0">
          <Link href={`/dashboard/members/${member.id}/edit`} className="flex items-center gap-2.5 w-full cursor-pointer p-2"><Edit className="h-4 w-4" /> Edit Profile</Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => window.print()}><Printer className="mr-2.5 h-4 w-4" /> Print Form</DropdownMenuItem>

        <DropdownMenuSeparator />
        <p className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Financial</p>
        <DropdownMenuItem className="p-0">
          <Link href="/dashboard/collection-entry" className="flex items-center gap-2.5 w-full cursor-pointer p-2"><Banknote className="h-4 w-4" /> Deposit Entry</Link>
        </DropdownMenuItem>
        <DropdownMenuItem className="p-0">
          <Link href="/dashboard/deposits" className="flex items-center gap-2.5 w-full cursor-pointer p-2"><CreditCard className="h-4 w-4" /> Payment Entry</Link>
        </DropdownMenuItem>
        <DropdownMenuItem className="p-0">
          <Link href="/dashboard/member-ledger" className="flex items-center gap-2.5 w-full cursor-pointer p-2"><BookOpen className="h-4 w-4" /> View Ledger</Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <p className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Communication</p>
        {member.email ? (
          <DropdownMenuItem className="p-0"><a href={`mailto:${member.email}`} className="flex items-center gap-2.5 w-full cursor-pointer p-2"><Mail className="h-4 w-4" /> Send Email</a></DropdownMenuItem>
        ) : (
          <DropdownMenuItem disabled><Mail className="mr-2.5 h-4 w-4" /> No Email</DropdownMenuItem>
        )}
        {member.phone ? (
          <DropdownMenuItem className="p-0"><a href={`sms:${member.phone}`} className="flex items-center gap-2.5 w-full cursor-pointer p-2"><MessageSquare className="h-4 w-4" /> Send SMS</a></DropdownMenuItem>
        ) : (
          <DropdownMenuItem disabled><MessageSquare className="mr-2.5 h-4 w-4" /> No Phone</DropdownMenuItem>
        )}

        <DropdownMenuSeparator />
        {member.status !== "SUSPENDED" ? (
          <DropdownMenuItem onClick={handleSuspend} disabled={isPending} className="text-yellow-600 focus:text-yellow-700 cursor-pointer">
            <PauseCircle className="mr-2.5 h-4 w-4" /> {isPending ? "Suspending..." : "Suspend Account"}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={handleActivate} disabled={isPending} className="text-emerald-600 focus:text-emerald-700 cursor-pointer">
            <PlayCircle className="mr-2.5 h-4 w-4" /> {isPending ? "Activating..." : "Activate Account"}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={handleDelete} disabled={isPending} className="text-red-600 focus:text-red-700 cursor-pointer">
          <Trash2 className="mr-2.5 h-4 w-4" /> {isPending ? "Deleting..." : "Delete"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center mb-4">
        <SearchX className="w-8 h-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">No members found</h3>
      <p className="text-sm text-slate-500 max-w-sm mb-6">Try adjusting your search or filters, or add a new member to get started.</p>
      <Link href="/dashboard/members/add">
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
          <PlusCircle className="w-4 h-4" /> Add New Member
        </button>
      </Link>
    </div>
  )
}

// ─── CSV export (client-side, no new dependency) ─────────────────────
function exportMembersCsv(members: Member[]) {
  const headers = ["Member No", "Full Name", "Phone", "Email", "Gender", "Status", "KYC", "Savings", "Due Balance", "Late Fines", "Joined", "Profession"]
  const rows = members.map(m => [
    m.memberNo, m.fullName, m.phone, m.email || "", m.gender, m.status,
    m.kycVerified ? "Verified" : "Pending",
    String(m.savings.reduce((a, s) => a + s.amount, 0)),
    String(m.dueBalance), String(m.lateFines),
    new Date(m.membershipDate).toLocaleDateString(),
    m.profession || "",
  ])
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`
  const csv = [headers, ...rows].map(r => r.map(escape).join(",")).join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `members-${new Date().toISOString().split("T")[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
  toast.success(`Exported ${members.length} members to CSV.`)
}

// ─── Main Page ───────────────────────────────────────────────────────
export default function MemberListClient({ members }: { members: Member[] }) {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [sortField, setSortField] = useState<keyof Member>("createdAt")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [quickViewId, setQuickViewId] = useState<string | null>(null)
  const itemsPerPage = 8

  const filteredMembers = useMemo(() => {
    let result = [...members]
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(m =>
        m.fullName.toLowerCase().includes(q) ||
        m.memberNo.toLowerCase().includes(q) ||
        m.phone.includes(q) ||
        (m.email && m.email.toLowerCase().includes(q))
      )
    }
    if (statusFilter !== "all") result = result.filter(m => m.status === statusFilter)
    if (typeFilter === "savings") result = result.filter(m => m.savings.length > 0)
    else if (typeFilter === "kyc") result = result.filter(m => !m.kycVerified)
    else if (typeFilter === "due") result = result.filter(m => m.dueBalance > 0)
    result.sort((a, b) => {
      const aVal = a[sortField] as string | number | boolean | null
      const bVal = b[sortField] as string | number | boolean | null
      const modifier = sortDirection === "asc" ? 1 : -1
      if (aVal === null || aVal === undefined) return 1 * modifier
      if (bVal === null || bVal === undefined) return -1 * modifier
      if (typeof aVal === "string" && typeof bVal === "string") return aVal.localeCompare(bVal) * modifier
      return (Number(aVal) - Number(bVal)) * modifier
    })
    return result
  }, [searchQuery, statusFilter, typeFilter, sortField, sortDirection, members])

  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage) || 1
  const paginatedMembers = filteredMembers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  // Quick-view target: look up against the full list so it works even if filtered
  const quickViewMember = useMemo<QuickViewMember | null>(() => {
    if (!quickViewId) return null
    const m = members.find(x => x.id === quickViewId)
    if (!m) return null
    return {
      id: m.id, fullName: m.fullName, memberNo: m.memberNo,
      phone: m.phone, email: m.email, gender: m.gender,
      status: m.status, kycVerified: m.kycVerified, photoUrl: m.photoUrl,
      profession: m.profession, membershipDate: m.membershipDate,
      createdAt: m.createdAt, dueBalance: m.dueBalance, lateFines: m.lateFines,
      nomineesCount: m.nomineesCount,
      savings: m.savings.map(s => ({ amount: s.amount })),
    }
  }, [quickViewId, members])

  const stats: StatCard[] = useMemo(() => {
    const total = members.length
    const active = members.filter(m => m.status === "ACTIVE").length
    const pending = members.filter(m => m.status === "PENDING").length
    const male = members.filter(m => m.gender === "MALE").length
    const female = members.filter(m => m.gender === "FEMALE").length
    const pendingKyc = members.filter(m => !m.kycVerified).length
    const suspended = members.filter(m => m.status === "SUSPENDED").length
    const newThisMonth = members.filter(m => {
      const d = new Date(m.createdAt); const now = new Date()
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).length

    return [
      { label: "Total Members", value: total, icon: <Users className="w-4 h-4" />, bgLight: "bg-indigo-600", bgDark: "bg-indigo-600", borderLight: "border-indigo-200", borderDark: "dark:border-indigo-900", textLight: "text-indigo-600", textDark: "dark:text-indigo-300", trend: { value: 12, isPositive: true } },
      { label: "Active", value: active, icon: <UserCheck className="w-4 h-4" />, bgLight: "bg-emerald-600", bgDark: "bg-emerald-600", borderLight: "border-emerald-200", borderDark: "dark:border-emerald-900", textLight: "text-emerald-600", textDark: "dark:text-emerald-300", trend: { value: 8, isPositive: true } },
      { label: "Pending", value: pending, icon: <Clock className="w-4 h-4" />, bgLight: "bg-amber-500", bgDark: "bg-amber-500", borderLight: "border-amber-200", borderDark: "dark:border-amber-900", textLight: "text-amber-600", textDark: "dark:text-amber-300" },
      { label: "New This Month", value: newThisMonth, icon: <UserPlus className="w-4 h-4" />, bgLight: "bg-sky-500", bgDark: "bg-sky-500", borderLight: "border-sky-200", borderDark: "dark:border-sky-900", textLight: "text-sky-600", textDark: "dark:text-sky-300", trend: { value: 25, isPositive: true } },
      { label: "Male", value: male, icon: <UserCheck className="w-4 h-4" />, bgLight: "bg-blue-600", bgDark: "bg-blue-600", borderLight: "border-blue-200", borderDark: "dark:border-blue-900", textLight: "text-blue-600", textDark: "dark:text-blue-300" },
      { label: "Female", value: female, icon: <UserCheck className="w-4 h-4" />, bgLight: "bg-pink-600", bgDark: "bg-pink-600", borderLight: "border-pink-200", borderDark: "dark:border-pink-900", textLight: "text-pink-600", textDark: "dark:text-pink-300" },
      { label: "Pending KYC", value: pendingKyc, icon: <AlertTriangle className="w-4 h-4" />, bgLight: "bg-yellow-500", bgDark: "bg-yellow-500", borderLight: "border-yellow-200", borderDark: "dark:border-yellow-900", textLight: "text-yellow-600", textDark: "dark:text-yellow-300" },
      { label: "Suspended", value: suspended, icon: <Lock className="w-4 h-4" />, bgLight: "bg-red-600", bgDark: "bg-red-600", borderLight: "border-red-200", borderDark: "dark:border-red-900", textLight: "text-red-600", textDark: "dark:text-red-300" },
    ]
  }, [members])

  const toggleRow = (id: string) => {
    setSelectedRows(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  const toggleSelectAll = () => {
    if (selectedRows.size === paginatedMembers.length) setSelectedRows(new Set())
    else setSelectedRows(new Set(paginatedMembers.map(m => m.id)))
  }
  const handleSort = (field: keyof Member) => {
    if (sortField === field) setSortDirection(p => p === "asc" ? "desc" : "asc")
    else { setSortField(field); setSortDirection("asc") }
  }

  // Bulk ops read IDs straight from selectedRows state — no DOM hacking.
  const bulkActivate = async () => {
    const ids = Array.from(selectedRows)
    if (!confirm(`Activate ${ids.length} member(s)?`)) return
    await bulkUpdateMemberStatus(ids, "ACTIVE")
    toast.success(`${ids.length} member(s) activated.`); setSelectedRows(new Set())
  }
  const bulkSuspend = async () => {
    const ids = Array.from(selectedRows)
    if (!confirm(`Suspend ${ids.length} member(s)?`)) return
    await bulkUpdateMemberStatus(ids, "SUSPENDED")
    toast.success(`${ids.length} member(s) suspended.`); setSelectedRows(new Set())
  }
  const bulkRemove = async () => {
    const ids = Array.from(selectedRows)
    if (!confirm(`DELETE ${ids.length} member(s)? This cannot be undone.`)) return
    await bulkDeleteMembers(ids)
    toast.success(`${ids.length} member(s) deleted.`); setSelectedRows(new Set())
  }
  const bulkExport = () => {
    const selected = members.filter(m => selectedRows.has(m.id))
    exportMembersCsv(selected)
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Members</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your foundation members, KYC, and finances.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportMembersCsv(filteredMembers)}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Download className="w-4 h-4" /> Export
          </button>
          <Link href="/dashboard/members/add">
            <Button className="bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/20">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Member
            </Button>
          </Link>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {stats.map(stat => <StatCardComponent key={stat.label} stat={stat} />)}
      </div>

      {/* Toolbar Card */}
      <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Search & Primary Actions */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search className={`w-5 h-5 transition-colors ${isSearchFocused ? "text-indigo-500" : "text-slate-400"}`} />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                placeholder="Search members by name, ID, or phone..."
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(""); setCurrentPage(1) }} className="absolute inset-y-0 right-0 pr-3.5 flex items-center">
                  <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button className="inline-flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <Filter className="w-4 h-4" /> Filters <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>
              <button
                onClick={() => window.location.reload()}
                className="p-2.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="px-4 py-3 flex flex-wrap items-center gap-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1) }}
            className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">Status: All</option>
            <option value="ACTIVE">Active</option>
            <option value="PENDING">Pending</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="INACTIVE">Inactive</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <select
            value={typeFilter}
            onChange={e => { setTypeFilter(e.target.value); setCurrentPage(1) }}
            className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">Type: All</option>
            <option value="savings">Has Savings</option>
            <option value="due">Has Due Balance</option>
            <option value="kyc">Pending KYC</option>
          </select>

          {(statusFilter !== "all" || typeFilter !== "all" || searchQuery) && (
            <div className="flex items-center gap-1.5 ml-2">
              <span className="text-xs text-slate-400">Active:</span>
              {statusFilter !== "all" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs font-medium dark:bg-indigo-950/30 dark:text-indigo-300">
                  Status: {statusFilter}
                  <button onClick={() => setStatusFilter("all")} className="hover:text-indigo-900"><X className="w-3 h-3" /></button>
                </span>
              )}
              {typeFilter !== "all" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs font-medium dark:bg-indigo-950/30 dark:text-indigo-300">
                  Type: {typeFilter}
                  <button onClick={() => setTypeFilter("all")} className="hover:text-indigo-900"><X className="w-3 h-3" /></button>
                </span>
              )}
              {searchQuery && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs font-medium dark:bg-indigo-950/30 dark:text-indigo-300">
                  Search: &ldquo;{searchQuery}&rdquo;
                  <button onClick={() => setSearchQuery("")} className="hover:text-indigo-900"><X className="w-3 h-3" /></button>
                </span>
              )}
              <button onClick={() => { setStatusFilter("all"); setTypeFilter("all"); setSearchQuery(""); setCurrentPage(1) }} className="text-xs text-slate-500 hover:text-slate-700 underline">Clear all</button>
            </div>
          )}

          <div className="flex-1" />
          <div className="hidden md:flex items-center gap-1">
            <button className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Print"><Printer className="w-4 h-4" /></button>
            <button className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Upload"><Upload className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Bulk action bar */}
        {selectedRows.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 bg-indigo-50 dark:bg-indigo-950/30 border-b border-indigo-100 dark:border-indigo-900/50">
            <div className="flex items-center gap-2 text-sm font-semibold text-indigo-700 dark:text-indigo-300">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-xs">{selectedRows.size}</span>
              selected of {filteredMembers.length}
            </div>
            <div className="flex-1" />
            <BulkBtn onClick={bulkActivate} icon={<PlayCircle className="w-3.5 h-3.5" />} label="Activate" tone="emerald" />
            <BulkBtn onClick={bulkSuspend} icon={<PauseCircle className="w-3.5 h-3.5" />} label="Suspend" tone="amber" />
            <BulkBtn onClick={bulkRemove} icon={<Trash2 className="w-3.5 h-3.5" />} label="Delete" tone="red" />
            <BulkBtn onClick={bulkExport} icon={<Download className="w-3.5 h-3.5" />} label="Export CSV" tone="indigo" />
            <button onClick={() => setSelectedRows(new Set())} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-white/50 dark:hover:bg-slate-800/40">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80">
                <th className="w-12 px-4 py-3.5">
                  <button
                    onClick={toggleSelectAll}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${selectedRows.size === paginatedMembers.length && paginatedMembers.length > 0 ? "bg-indigo-600 border-indigo-600" : "border-slate-300 dark:border-slate-700 hover:border-indigo-400"}`}
                  >
                    {selectedRows.size === paginatedMembers.length && paginatedMembers.length > 0 && <Check className="w-3 h-3 text-white" />}
                  </button>
                </th>
                {[
                  { key: "fullName" as const, label: "Member Info" },
                  { key: "phone" as const, label: "Contact" },
                  { key: "membershipDate" as const, label: "Join Date" },
                  { key: "savings" as const, label: "Finances" },
                  { key: "dueBalance" as const, label: "Due Balance" },
                  { key: "kycVerified" as const, label: "KYC" },
                  { key: "status" as const, label: "Status", center: true },
                ].map(col => (
                  <th key={col.key} className={`px-4 py-3.5 ${col.center ? "text-center" : "text-left"}`}>
                    <button
                      onClick={() => handleSort(col.key)}
                      className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                    >
                      {col.label}
                      <ArrowUpDown className={`w-3.5 h-3.5 ${sortField === col.key ? "text-indigo-500" : "opacity-0"}`} />
                    </button>
                  </th>
                ))}
                <th className="px-4 py-3.5 text-right text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedMembers.length === 0 ? (
                <tr><td colSpan={8}><EmptyState /></td></tr>
              ) : (
                paginatedMembers.map((member, index) => {
                  const totalSavings = member.savings.reduce((acc, s) => acc + s.amount, 0)
                  const isSelected = selectedRows.has(member.id)
                  const isEven = index % 2 === 0
                  return (
                    <tr
                      key={member.id}
                      className={`group border-b border-slate-100 dark:border-slate-800/50 transition-all duration-200 ${isSelected ? "bg-indigo-50/50 dark:bg-indigo-950/20" : ""} ${!isSelected ? "hover:bg-slate-50 dark:hover:bg-slate-900/50" : ""} ${isEven && !isSelected ? "bg-white dark:bg-slate-950" : "bg-slate-50/30 dark:bg-slate-900/30"}`}
                    >
                      <td className="px-4 py-4">
                        <button
                          onClick={() => toggleRow(member.id)}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${isSelected ? "bg-indigo-600 border-indigo-600" : "border-slate-300 dark:border-slate-700 hover:border-indigo-400"}`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <MemberAvatar member={member} />
                          <div>
                            <p className="font-semibold text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{member.fullName}</p>
                            <p className="font-mono text-[11px] text-indigo-500 dark:text-indigo-400 mt-0.5">{member.memberNo}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400" />{member.phone}</span>
                          {member.email && <span className="text-xs text-slate-400 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{member.email}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {new Date(member.membershipDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm flex items-center gap-1.5">
                          <Wallet className="w-3.5 h-3.5" /> ৳ {totalSavings.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {member.dueBalance > 0 ? (
                          <div className="flex flex-col gap-1">
                            <span className="text-red-600 dark:text-red-400 font-bold text-sm flex items-center gap-1.5 bg-red-50 dark:bg-red-950/30 px-2 py-1 rounded-md w-fit">
                              <AlertCircle className="w-3.5 h-3.5" /> ৳ {member.dueBalance.toLocaleString()}
                            </span>
                            {member.lateFines > 0 && (
                              <span className="text-orange-600 dark:text-orange-400 font-medium text-xs flex items-center gap-1.5 bg-orange-50 dark:bg-orange-950/30 px-2 py-1 rounded-md w-fit">
                                <AlertTriangle className="w-3 h-3" /> Fine: ৳ {member.lateFines.toLocaleString()}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 text-sm font-medium flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1 rounded-md w-fit">
                            <CheckCircle2 className="w-3.5 h-3.5" /> ৳ 0 (Clear)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-start">
                          <KycToggleInline member={member} onDone={() => { /* state updates via revalidate */ }} />
                          <span className={`ml-1 text-[10px] font-semibold ${member.kycVerified ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                            {member.kycVerified ? "Verified" : "Pending"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center"><StatusBadge status={member.status} /></td>
                      <td className="px-4 py-4 relative z-10">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setQuickViewId(member.id)}
                            title="Quick view"
                            className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <ActionDropdown member={member} />
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Showing <span className="font-bold text-slate-900 dark:text-white">{filteredMembers.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-{Math.min(currentPage * itemsPerPage, filteredMembers.length)}</span> of <span className="font-bold text-slate-900 dark:text-white">{filteredMembers.length}</span> Members
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 7).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === page ? "bg-indigo-600 text-white" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick view drawer */}
      <MemberQuickView
        member={quickViewMember}
        open={!!quickViewMember}
        onOpenChange={(o) => { if (!o) setQuickViewId(null) }}
      />
    </div>
  )
}

// Small button used inside the bulk bar — extracted to keep the main render readable.
function BulkBtn({ onClick, icon, label, tone }: {
  onClick: () => void
  icon: React.ReactNode
  label: string
  tone: "emerald" | "amber" | "red" | "indigo"
}) {
  const tones: Record<string, string> = {
    emerald: "text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/40 hover:bg-emerald-200 dark:hover:bg-emerald-900/40",
    amber: "text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/40 hover:bg-amber-200 dark:hover:bg-amber-900/40",
    red: "text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-950/40 hover:bg-red-200 dark:hover:bg-red-900/40",
    indigo: "text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/50 hover:bg-indigo-50 dark:hover:bg-indigo-950/40",
  }
  return (
    <button onClick={onClick} className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${tones[tone]}`}>
      {icon} {label}
    </button>
  )
}
