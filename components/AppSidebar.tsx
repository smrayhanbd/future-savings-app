"use client"

import React, { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { signOut } from "next-auth/react"

// Shadcn UI Components
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

// Lucide Icons
import {
  LayoutDashboard, Users, Clock, PieChart, Landmark,
  Receipt, Printer, CalendarCheck, Briefcase, Gem,
  CheckSquare, Heart, UserCog, UserPen, Settings, Cloud, LogOut,
  ChevronLeft, ChevronRight, ChevronDown, Building2,
  SlidersHorizontal, FilePlus2, HandCoins, AlertTriangle,
  Scale, Award, ArrowDownToLine, ArrowUpFromLine, CheckCheck,
  Wallet, History,
  type LucideIcon
} from "lucide-react"

// --- Types ---
interface NavItem {
  label: string
  icon: LucideIcon
  href: string
  badge?: number
  subItems?: { label: string; href: string }[]
}

interface MenuGroup {
  title: string
  items: NavItem[]
}

// --- Menu Data ---
const SIDEBAR_MENU_GROUPS: MenuGroup[] = [
  {
    title: "Overview",
    items: [ { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" } ]
  },
  {
    title: "Member Management",
    items: [
      { label: "Member Panel", icon: Users, href: "/dashboard/members" },
      { label: "Pending Approvals", icon: Clock, href: "/dashboard/approvals" },
      { label: "Profile Update Approvals", icon: UserPen, href: "/dashboard/profile-approvals" },
      {
        label: "Trust Score & Badges",
        icon: Award,
        href: "#",
        subItems: [
          { label: "Trust Leaderboard", href: "/dashboard/trust-score" },
          { label: "Achievement Badges", href: "/dashboard/trust-score/badges" },
          { label: "Score Settings", href: "/dashboard/trust-score/config" }
        ]
      }
    ]
  },
  {
    title: "Transactions",
    items: [
      { label: "Deposit Transactions", icon: ArrowDownToLine, href: "/dashboard/transactions/deposits" },
      { label: "Withdrawal Transactions", icon: ArrowUpFromLine, href: "/dashboard/transactions/withdrawals" },
      { label: "Income Distribution", icon: PieChart, href: "/dashboard/transactions/income-distribution" },
      { label: "Charge Management", icon: Receipt, href: "/dashboard/transactions/charges" },
      { label: "Fees & Charge Setup", icon: SlidersHorizontal, href: "/dashboard/collection-setup" },
      { label: "Members Due List", icon: AlertTriangle, href: "/dashboard/due-list" },
      {
        label: "Transaction Approvals",
        icon: CheckCheck,
        href: "#",
        subItems: [
          { label: "Admin Submitted", href: "/dashboard/transaction-approvals" },
          { label: "Member Requests", href: "/dashboard/transaction-approvals?tab=member" }
        ]
      },
      { label: "Cash Closing", icon: Wallet, href: "/dashboard/cash-closing" },
      { label: "Transaction History", icon: History, href: "/dashboard/transactions" }
    ]
  },
   {
    title: "Finance & Accounting",
    items: [
      { label: "Loan Management", icon: HandCoins, href: "/dashboard/loans" },
      { label: "Chart of Accounts", icon: PieChart, href: "/dashboard/accounts" },
      { label: "Voucher Entry", icon: FilePlus2, href: "/dashboard/voucher-entry" },
      {
        label: "Financial Statements",
        icon: Scale,
        href: "#",
        subItems: [
          { label: "Trial Balance", href: "/dashboard/financials/trial-balance" },
          { label: "Balance Sheet", href: "/dashboard/financials/balance-sheet" },
          { label: "Profit & Loss", href: "/dashboard/financials/profit-loss" }
        ]
      },
      {
        label: "Reports",
        icon: Printer,
        href: "#",
        subItems: [
          { label: "Account Ledger", href: "/dashboard/account-ledger" },
          { label: "Member Ledger", href: "/dashboard/member-ledger" },
          { label: "Money Receipts", href: "/dashboard/receipts" },
          { label: "View Vouchers", href: "/dashboard/vouchers" }
        ]
      },
    ]
  },
  {
    title: "Operations & Management",
    items: [
      { label: "Meeting Management", icon: CalendarCheck, href: "/dashboard/meetings" },
      { label: "Project Management", icon: Briefcase, href: "/dashboard/projects" },
      { label: "Investment Management", icon: Gem, href: "/dashboard/investments" },
      {
        label: "Task Management",
        icon: CheckSquare,
        href: "#",
        subItems: [
          { label: "All Tasks", href: "/dashboard/tasks" },
          { label: "Reports", href: "/dashboard/tasks/reports" },
          { label: "Committees", href: "/dashboard/committees" }
        ]
      },
      { label: "Special Wishes", icon: Heart, href: "/dashboard/wishes" }
    ]
  },
  {
    title: "System & Settings",
    items: [
      { label: "User Control", icon: UserCog, href: "/dashboard/users" },
      {
        label: "Somiti Settings",
        icon: Settings,
        href: "#",
        subItems: [
          { label: "Organization Info", href: "/dashboard/settings/organization" },
          { label: "Landing Page Content", href: "/dashboard/settings/site-content" },
          { label: "Active Bank Accounts", href: "/dashboard/settings/bank" },
          { label: "Mail Server Setup", href: "/dashboard/settings/mail" },
          { label: "SMS Service API", href: "/dashboard/settings/sms" },
          { label: "Approval Limits", href: "/dashboard/settings/approval-limits" }
        ]
      },
      { label: "Cloud Backup", icon: Cloud, href: "/dashboard/backup" }
    ]
  }
]

// --- Helper ---
function checkIsActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard"
  if (href === "#") return false
  // Strip query strings when comparing.
  const path = pathname.split("?")[0]
  return path.startsWith(href)
}

// --- Main Content ---
interface SidebarContentProps {
  isExpanded: boolean
  setExpanded: (val: boolean) => void
  onNavigate?: () => void
}

function SidebarContent({ isExpanded, setExpanded, onNavigate }: SidebarContentProps) {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <aside
      className="relative flex h-screen flex-col border-r border-[var(--border-base)] bg-surface transition-[width] duration-300 ease-out"
      style={{ width: isExpanded ? "16.5rem" : "4.5rem" }}
      aria-label="Main Navigation"
    >
      {/* Brand Logo */}
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-[var(--border-base)] px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl brand-gradient text-white shadow-brand-glow">
          <Building2 className="h-5 w-5" />
        </div>
        {isExpanded && (
          <div className="flex flex-col overflow-hidden">
            <span className="whitespace-nowrap text-base font-bold leading-tight tracking-tight text-primary-ink font-[var(--font-heading)]">
              Somiti MS
            </span>
            <span className="whitespace-nowrap text-[10px] font-medium uppercase tracking-wider text-muted-ink">
              Management System
            </span>
          </div>
        )}
      </header>

      {/* Desktop Toggle Button */}
      <div className="absolute -right-3 top-[4.5rem] z-50 hidden lg:flex">
        <Button
          variant="outline"
          size="icon"
          className="h-6 w-6 rounded-full border-[var(--border-base)] bg-surface shadow-md hover:bg-subtle"
          onClick={() => setExpanded(!isExpanded)}
          aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isExpanded ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-3">
        <TooltipProvider>
          {SIDEBAR_MENU_GROUPS.map((group) => (
            <div key={group.title} className="mb-4">
              {/* Section Header */}
              {isExpanded ? (
                <p className="mb-2 px-3 t-overline text-faint-ink">{group.title}</p>
              ) : (
                <div className="my-3 flex justify-center">
                  <span className="h-px w-8 bg-[var(--border-strong)]" />
                </div>
              )}

              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = checkIsActive(pathname, item.href)
                  const hasSubs = item.subItems && item.subItems.length > 0
                  const label = item.label

                  // --- COLLAPSED VIEW ---
                  if (!isExpanded) {
                    return (
                      <Tooltip key={item.label}>
                        <TooltipTrigger
                          onClick={() => {
                            if (!hasSubs) {
                              onNavigate?.()
                              router.push(item.href)
                            }
                          }}
                          className={`relative flex w-full items-center justify-center rounded-lg p-2.5 transition-colors ${
                            isActive
                              ? "bg-brand-gradient-soft text-brand"
                              : "text-secondary-ink hover:bg-subtle hover:text-primary-ink"
                          }`}
                        >
                          {/* Active indicator bar */}
                          {isActive && (
                            <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full trust-gradient" />
                          )}
                          <item.icon className="h-[18px] w-[18px] shrink-0" />
                          {item.badge && (
                            <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--status-debit)] opacity-75" />
                              <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--status-debit)]" />
                            </span>
                          )}
                        </TooltipTrigger>
                        <TooltipContent side="right" sideOffset={12}>{label}</TooltipContent>
                      </Tooltip>
                    )
                  }

                  // --- EXPANDED VIEW ---
                  const linkContent = (
                    <div className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors no-underline ${
                      isActive
                        ? "bg-brand-gradient-soft text-brand"
                        : "text-secondary-ink hover:bg-subtle hover:text-primary-ink"
                    }`}>
                      {isActive && (
                        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full trust-gradient" />
                      )}
                      <div className="flex min-w-0 items-center gap-3">
                        <item.icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? "text-brand" : "text-muted-ink"}`} />
                        <span className="truncate">{label}</span>
                      </div>
                      <div className="ml-auto flex shrink-0 items-center gap-2">
                        {item.badge && (
                          <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-debit-soft px-1.5 text-[10px] font-bold text-debit">
                            {item.badge}
                          </span>
                        )}
                        {hasSubs && (
                          <ChevronDown className={`h-3.5 w-3.5 text-muted-ink transition-transform duration-200 ${isActive ? "rotate-180" : ""}`} />
                        )}
                      </div>
                    </div>
                  )

                  if (hasSubs) {
                    return (
                      <Accordion key={item.label} className="w-full">
                        <AccordionItem value={item.label} className="border-none">
                          <AccordionTrigger className="rounded-lg p-0 hover:!no-underline [&>svg]:hidden [&[data-state=open]>div]:bg-subtle">
                            {linkContent}
                          </AccordionTrigger>
                          <AccordionContent className="mt-1 space-y-0.5 overflow-hidden pb-0">
                            {item.subItems!.map((sub) => {
                              const subActive = checkIsActive(pathname, sub.href)
                              return (
                                <Link
                                  key={sub.href}
                                  href={sub.href}
                                  onClick={onNavigate}
                                  className={`flex items-center gap-3 rounded-md py-2 pl-10 pr-3 text-xs transition-colors hover:!no-underline ${
                                    subActive
                                      ? "font-semibold text-brand"
                                      : "text-muted-ink hover:bg-subtle hover:text-primary-ink"
                                  }`}
                                >
                                  <span className={`h-1.5 w-1.5 rounded-full ${subActive ? "trust-gradient" : "bg-[var(--border-strong)]"}`} />
                                  <span className="truncate">{sub.label}</span>
                                </Link>
                              )
                            })}
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    )
                  }

                  return (
                    <Link key={item.label} href={item.href} onClick={onNavigate} className="block no-underline hover:no-underline">
                      {linkContent}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </TooltipProvider>
      </nav>

      {/* Logout Button */}
      <footer className="mt-auto shrink-0 border-t border-[var(--border-base)] p-2.5">
        {isExpanded ? (
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-debit hover:bg-debit-soft hover:text-debit"
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            <span className="font-medium">Exit / Logout</span>
          </Button>
        ) : (
          <Tooltip>
            <TooltipTrigger
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex w-full items-center justify-center rounded-lg p-2.5 text-debit transition-colors hover:bg-debit-soft hover:text-debit"
            >
              <LogOut className="h-[18px] w-[18px] shrink-0" />
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={12}>Exit / Logout</TooltipContent>
          </Tooltip>
        )}
      </footer>
    </aside>
  )
}

// --- Main Export ---
export default function AppSidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [isExpanded, setExpanded] = useState(true)

  return (
    <>
      {/* Desktop: sticky keeps it in the flex flow side-by-side */}
      <div className="sticky top-0 z-30 hidden h-screen shrink-0 lg:flex">
        <SidebarContent isExpanded={isExpanded} setExpanded={setExpanded} />
      </div>

      {/* Mobile Sheet */}
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="left" className="w-[16.5rem] border-r-0 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation Menu</SheetTitle>
          </SheetHeader>
          <SidebarContent isExpanded={true} setExpanded={() => {}} onNavigate={onClose} />
        </SheetContent>
      </Sheet>
    </>
  )
}
