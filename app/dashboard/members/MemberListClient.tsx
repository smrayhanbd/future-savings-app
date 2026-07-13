"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Users, PlusCircle, Eye, MoreHorizontal, Edit, Banknote, CreditCard,
  BookOpen, Printer, Mail, MessageSquare, PauseCircle, Trash2, Search,
  Filter, FileText, Table as TableIcon, Upload, UserCheck, UserPlus,
  AlertTriangle, Lock, ChevronLeft, ChevronRight, X, Check, TrendingUp,
  TrendingDown, ArrowUpDown, Clock, Shield, Wallet, Receipt, Phone,
  Bell, Settings, Download, RefreshCw, ChevronDown, SearchX,
  CheckCircle2, AlertCircle
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────
interface Member {
  id: string; // Changed from number to string
  fullName: string;
  memberNo: string;
  phone: string;
  email: string | null;
  gender: "MALE" | "FEMALE" | "OTHER";
  status: "ACTIVE" | "PENDING" | "SUSPENDED";
  nidNumber: string | null;
  photoUrl: string | null;
  savings: { amount: number }[];
  createdAt: string;
  dueBalance: number;
}

interface StatCard {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  bgLight: string;
  bgDark: string;
  borderLight: string;
  borderDark: string;
  textLight: string;
  textDark: string;
  trend?: { value: number; isPositive: boolean };
}

// ─── Components ──────────────────────────────────────────────────────

function StatCardComponent({ stat, index }: { stat: StatCard; index: number }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl border bg-white dark:bg-slate-950
        ${stat.borderLight} ${stat.borderDark}
        transition-all duration-300 ease-out
        hover:shadow-lg hover:shadow-${stat.color}-500/10 hover:-translate-y-1
        cursor-pointer group
      `}
      style={{ animationDelay: `${index * 75}ms` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`
          absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-10
          ${stat.bgLight} ${stat.bgDark}
          transition-transform duration-500 ease-out
          ${isHovered ? "scale-150" : "scale-100"}
        `}
      />
      <div className="relative p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className={`text-[10px] font-bold uppercase tracking-widest ${stat.textLight} ${stat.textDark}`}>
            {stat.label}
          </span>
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
          <div className={`h-full rounded-full transition-all duration-700 ease-out ${stat.bgLight.replace("bg-", "bg-").replace("/10", "")}`} style={{ width: isHovered ? "100%" : "60%", transitionDelay: "100ms" }} />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
    ACTIVE: {
      bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
      text: "text-emerald-700 dark:text-emerald-300",
      icon: <CheckCircle2 className="w-3 h-3" />,
      label: "Active",
    },
    PENDING: {
      bg: "bg-amber-500/10 dark:bg-amber-500/20",
      text: "text-amber-700 dark:text-amber-300",
      icon: <Clock className="w-3 h-3" />,
      label: "Pending",
    },
    SUSPENDED: {
      bg: "bg-red-500/10 dark:bg-red-500/20",
      text: "text-red-700 dark:text-red-300",
      icon: <AlertCircle className="w-3 h-3" />,
      label: "Suspended",
    },
  };
  const config = configs[status] || configs.PENDING;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide ${config.bg} ${config.text} border border-current border-opacity-20`}>
      {config.icon}
      {config.label}
    </span>
  );
}

function KycBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-500/20">
      <Shield className="w-3 h-3" />
      Verified
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-500/20">
      <AlertTriangle className="w-3 h-3" />
      Pending
    </span>
  );
}

function MemberAvatar({ member }: { member: Member }) {
  if (member.photoUrl) {
    return <img src={member.photoUrl} alt={member.fullName} className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-100 dark:ring-slate-800" />;
  }
  const initials = member.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const colors: Record<string, string> = {
    MALE: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300",
    FEMALE: "bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-300",
    OTHER: "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300",
  };
  return (
    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ring-2 ring-slate-100 dark:ring-slate-800 ${colors[member.gender]}`}>
      {initials}
    </div>
  );
}

function ActionDropdown({ member }: { member: Member }) {
  return (
    <DropdownMenu>
            <DropdownMenuTrigger className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors outline-none cursor-pointer">
        <MoreHorizontal className="w-4 h-4 text-slate-500" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 z-50">
                <p className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Member Actions</p>
        <DropdownMenuItem className="p-0">
          <Link href={`/dashboard/members/${member.id}`} className="flex items-center gap-2.5 w-full cursor-pointer p-2">
            <Eye className="w-4 h-4" /> View Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem className="p-0">
                            <Link href={`/dashboard/members/${member.id}/edit`} className="flex items-center gap-2.5 w-full cursor-pointer p-2">
                              <Edit className="h-4 w-4" /> Edit Profile
                            </Link>
                          </DropdownMenuItem>
        <DropdownMenuItem><Printer className="mr-2.5 h-4 w-4" /> Print Form</DropdownMenuItem>
        
        <DropdownMenuSeparator />
        <p className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Financial</p>
        <DropdownMenuItem><Banknote className="mr-2.5 h-4 w-4" /> Deposit Entry</DropdownMenuItem>
        <DropdownMenuItem><CreditCard className="mr-2.5 h-4 w-4" /> Payment Entry</DropdownMenuItem>
        <DropdownMenuItem><BookOpen className="mr-2.5 h-4 w-4" /> View Ledger</DropdownMenuItem>
        
        <DropdownMenuSeparator />
        <p className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Communication</p>
        <DropdownMenuItem><Mail className="mr-2.5 h-4 w-4" /> Send Email</DropdownMenuItem>
        <DropdownMenuItem><MessageSquare className="mr-2.5 h-4 w-4" /> Send SMS</DropdownMenuItem>
        
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-yellow-600 focus:text-yellow-700"><PauseCircle className="mr-2.5 h-4 w-4" /> Suspend Account</DropdownMenuItem>
        <DropdownMenuItem className="text-red-600 focus:text-red-700"><Trash2 className="mr-2.5 h-4 w-4" /> Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
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
          <PlusCircle className="w-4 h-4" />
          Add New Member
        </button>
      </Link>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────
export default function MemberListClient({ members }: { members: Member[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<keyof Member>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const itemsPerPage = 8;

  const filteredMembers = useMemo(() => {
    let result = [...members];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((m) =>
        m.fullName.toLowerCase().includes(q) ||
        m.memberNo.toLowerCase().includes(q) ||
        m.phone.includes(q) ||
        (m.email && m.email.toLowerCase().includes(q))
      );
    }
    if (statusFilter !== "all") {
      result = result.filter((m) => m.status === statusFilter);
    }
    if (typeFilter !== "all") {
      if (typeFilter === "savings") result = result.filter((m) => m.savings.length > 0);
      else if (typeFilter === "loan") result = result.filter(() => false);
    }
    result.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      const modifier = sortDirection === "asc" ? 1 : -1;
      if (aVal === null) return 1 * modifier;
      if (bVal === null) return -1 * modifier;
      if (typeof aVal === "string" && typeof bVal === "string") {
        return aVal.localeCompare(bVal) * modifier;
      }
      return ((aVal as number) - (bVal as number)) * modifier;
    });
    return result;
  }, [searchQuery, statusFilter, typeFilter, sortField, sortDirection]);

  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
  const paginatedMembers = filteredMembers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const stats: StatCard[] = useMemo(() => {
    const total = members.length;
    const active = members.filter((m) => m.status === "ACTIVE").length;
    const pending = members.filter((m) => m.status === "PENDING").length;
    const male = members.filter((m) => m.gender === "MALE").length;
    const female = members.filter((m) => m.gender === "FEMALE").length;
    const pendingKyc = members.filter((m) => !m.nidNumber).length;
    const suspended = members.filter((m) => m.status === "SUSPENDED").length;
    const newThisMonth = members.filter((m) => {
      const date = new Date(m.createdAt);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;

    return [
      { label: "Total Members", value: total, icon: <Users className="w-4 h-4" />, color: "indigo", bgLight: "bg-indigo-600", bgDark: "bg-indigo-600", borderLight: "border-indigo-200", borderDark: "dark:border-indigo-900", textLight: "text-indigo-600", textDark: "dark:text-indigo-300", trend: { value: 12, isPositive: true } },
      { label: "Active", value: active, icon: <UserCheck className="w-4 h-4" />, color: "emerald", bgLight: "bg-emerald-600", bgDark: "bg-emerald-600", borderLight: "border-emerald-200", borderDark: "dark:border-emerald-900", textLight: "text-emerald-600", textDark: "dark:text-emerald-300", trend: { value: 8, isPositive: true } },
      { label: "Pending", value: pending, icon: <Clock className="w-4 h-4" />, color: "amber", bgLight: "bg-amber-500", bgDark: "bg-amber-500", borderLight: "border-amber-200", borderDark: "dark:border-amber-900", textLight: "text-amber-600", textDark: "dark:text-amber-300" },
      { label: "New This Month", value: newThisMonth, icon: <UserPlus className="w-4 h-4" />, color: "sky", bgLight: "bg-sky-500", bgDark: "bg-sky-500", borderLight: "border-sky-200", borderDark: "dark:border-sky-900", textLight: "text-sky-600", textDark: "dark:text-sky-300", trend: { value: 25, isPositive: true } },
      { label: "Male", value: male, icon: <UserCheck className="w-4 h-4" />, color: "blue", bgLight: "bg-blue-600", bgDark: "bg-blue-600", borderLight: "border-blue-200", borderDark: "dark:border-blue-900", textLight: "text-blue-600", textDark: "dark:text-blue-300" },
      { label: "Female", value: female, icon: <UserCheck className="w-4 h-4" />, color: "pink", bgLight: "bg-pink-600", bgDark: "bg-pink-600", borderLight: "border-pink-200", borderDark: "dark:border-pink-900", textLight: "text-pink-600", textDark: "dark:text-pink-300" },
      { label: "Pending KYC", value: pendingKyc, icon: <AlertTriangle className="w-4 h-4" />, color: "yellow", bgLight: "bg-yellow-500", bgDark: "bg-yellow-500", borderLight: "border-yellow-200", borderDark: "dark:border-yellow-900", textLight: "text-yellow-600", textDark: "dark:text-yellow-300" },
      { label: "Suspended", value: suspended, icon: <Lock className="w-4 h-4" />, color: "red", bgLight: "bg-red-600", bgDark: "bg-red-600", borderLight: "border-red-200", borderDark: "dark:border-red-900", textLight: "text-red-600", textDark: "dark:text-red-300" },
    ];
  }, []);

  const toggleRow = (id: string) => {
    const next = new Set(selectedRows);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedRows(next);
  };

  const toggleSelectAll = () => {
    if (selectedRows.size === paginatedMembers.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(paginatedMembers.map((m) => m.id)));
    }
  };

  const handleSort = (field: keyof Member) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950">

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Members</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your foundation members, KYC, and finances.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/members/add">
              <Button className="bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/20">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Member
              </Button>
            </Link>
          </div>
        </div>

      {/* Top Navigation Bar */}
       <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                {/* Statistics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {stats.map((stat, index) => (
            <StatCardComponent key={stat.label} stat={stat} index={index} />
          ))}
        </div>

        {/* Toolbar Card */}
        <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
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
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  placeholder="Search members by name, ID, or phone..."
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(""); setCurrentPage(1); }} className="absolute inset-y-0 right-0 pr-3.5 flex items-center">
                    <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button className="inline-flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <Filter className="w-4 h-4" />
                  Filters
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <button className="p-2.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="px-4 py-3 flex flex-wrap items-center gap-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">Status: All</option>
              <option value="ACTIVE">Active</option>
              <option value="PENDING">Pending</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
              className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">Type: All</option>
              <option value="savings">Has Savings</option>
              <option value="loan">Has Loan</option>
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
                <button onClick={() => { setStatusFilter("all"); setTypeFilter("all"); setSearchQuery(""); setCurrentPage(1); }} className="text-xs text-slate-500 hover:text-slate-700 underline">Clear all</button>
              </div>
            )}

            <div className="flex-1" />
            <div className="flex items-center gap-1">
              <button className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><FileText className="w-4 h-4" /></button>
              <button className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><TableIcon className="w-4 h-4" /></button>
              <button className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><Printer className="w-4 h-4" /></button>
              <button className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><Upload className="w-4 h-4" /></button>
            </div>
          </div>

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
                    { key: "savings" as const, label: "Finances" },
                    { key: "dueBalance" as const, label: "Due Balance" }, // <-- NEW COLUMN
                    { key: "nidNumber" as const, label: "KYC" },
                    { key: "status" as const, label: "Status", center: true },
                  ].map((col) => (
                    <th key={col.key} className={`px-4 py-3.5 ${col.center ? "text-center" : "text-left"}`}>
                      <button
                        onClick={() => handleSort(col.key)}
                        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                      >
                        {col.label}
                        <ArrowUpDown className={`w-3.5 h-3.5 ${sortField === col.key ? "text-indigo-500" : "opacity-0 group-hover:opacity-100"}`} />
                      </button>
                    </th>
                  ))}
                  <th className="px-4 py-3.5 text-right text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedMembers.length === 0 ? (
                  <tr><td colSpan={7}><EmptyState /></td></tr>
                ) : (
                  paginatedMembers.map((member, index) => {
                    const totalSavings = member.savings.reduce((acc, s) => acc + Number(s.amount), 0);
                    const isSelected = selectedRows.has(member.id);
                    const isEven = index % 2 === 0;
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
                            <span className="text-sm text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              {member.phone}
                            </span>
                            {member.email && (
                              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                                <Mail className="w-3.5 h-3.5" />
                                {member.email}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm flex items-center gap-1.5">
                              <Wallet className="w-3.5 h-3.5" />
                              ৳ {totalSavings.toLocaleString()}
                              <span className="text-[10px] font-normal text-emerald-500/70">(Savings)</span>
                            </span>
                            <span className="text-slate-400 text-xs flex items-center gap-1.5">
                              <Receipt className="w-3.5 h-3.5" />
                              ৳ 0 (Loan)
                            </span>
                          </div>
                        </td>
                        {/* Due Balance Cell */}
                        <td className="px-4 py-4">
                          {member.dueBalance > 0 ? (
                            <span className="text-red-600 dark:text-red-400 font-bold text-sm flex items-center gap-1.5 bg-red-50 dark:bg-red-950/30 px-2 py-1 rounded-md w-fit">
                              <AlertCircle className="w-3.5 h-3.5" />
                              ৳ {member.dueBalance.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 text-sm font-medium flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1 rounded-md w-fit">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              ৳ 0 (Clear)
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <KycBadge verified={!!member.nidNumber} />
                        </td>
                        <td className="px-4 py-4 text-center">
                          <StatusBadge status={member.status} />
                        </td>
                        <td className="px-4 py-4 relative z-10">
                          <div className="flex items-center justify-end gap-1">
                            <Link href={`/dashboard/members/${member.id}`}>
                              <button className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all">
                                <Eye className="w-4 h-4" />
                              </button>
                            </Link>
                            <ActionDropdown member={member} />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800">
            <p className="text-sm text-slate-500">
              Showing <span className="font-bold text-slate-900 dark:text-white">{filteredMembers.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-{Math.min(currentPage * itemsPerPage, filteredMembers.length)}</span> of <span className="font-bold text-slate-900 dark:text-white">{filteredMembers.length}</span> Members
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === page ? "bg-indigo-600 text-white" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3 group">
        <div className="flex flex-col gap-2 mb-2 opacity-0 translate-y-10 group-hover:opacity-100 group-hover:translate-y-0 transition-all pointer-events-none group-hover:pointer-events-auto">
          <button className="flex items-center gap-3 px-4 py-2 h-auto bg-white dark:bg-slate-950 shadow-lg rounded-full border border-slate-200 dark:border-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <Upload className="w-4 h-4 text-indigo-600" /> Import Members
          </button>
          <button className="flex items-center gap-3 px-4 py-2 h-auto bg-white dark:bg-slate-950 shadow-lg rounded-full border border-slate-200 dark:border-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <Banknote className="w-4 h-4 text-indigo-600" /> Collection
          </button>
        </div>
        <Link href="/dashboard/members/add">
          <button className="w-14 h-14 rounded-full shadow-2xl bg-indigo-600 hover:bg-indigo-700 hover:scale-110 transition-all flex items-center justify-center text-white">
            <PlusCircle className="w-6 h-6" />
          </button>
        </Link>
      </div>
    </div>
  );
}