"use client"

import React, { useState, memo } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { signOut } from "next-auth/react"

// Shadcn UI Components
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Separator } from "@/components/ui/separator"

// Lucide Icons
import {
  LayoutDashboard, Users, Clock, PieChart, Landmark, 
  ArrowDownUp, Receipt, Printer, CalendarCheck, Briefcase, Gem, 
  CheckSquare, Heart, UserCog, Settings, Cloud, LogOut, 
  ChevronLeft, ChevronRight, ChevronDown, Building2, 
  Banknote, SlidersHorizontal, FilePlus2, type LucideIcon
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
      { label: "Pending Approvals", icon: Clock, href: "/dashboard/approvals", badge: 3 }
      // "Old Member DB" removed here
    ]
  },
  {
    title: "Finance & Accounting",
    items: [
      { label: "Collection Entry", icon: Banknote, href: "/dashboard/collection-entry" },
      { label: "Withdrawal Entry", icon: Landmark, href: "/dashboard/deposits" }, // Moved up
      { label: "Income Distribution", icon: ArrowDownUp, href: "/dashboard/income-distribution" }, // Moved up
      { label: "Apply Fees / Charges", icon: Receipt, href: "/dashboard/fees" }, // Moved up
      { label: "Fees & Charge Setup", icon: SlidersHorizontal, href: "/dashboard/collection-setup" }, // Renamed
      { label: "Chart of Accounts", icon: PieChart, href: "/dashboard/accounts" },
      { label: "Voucher Entry", icon: FilePlus2, href: "/dashboard/voucher-entry" },
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
      }
    ]
  },
  {
    title: "Operations & Management",
    items: [
      { label: "Meeting Management", icon: CalendarCheck, href: "/dashboard/meetings" },
      { label: "Project Management", icon: Briefcase, href: "/dashboard/projects" },
      { label: "Investment Management", icon: Gem, href: "/dashboard/investments" },
      { label: "Task Management", icon: CheckSquare, href: "/dashboard/tasks" },
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
          { label: "Active Bank Accounts", href: "/dashboard/settings/bank" },
          { label: "Mail Server Setup", href: "/dashboard/settings/mail" },
          { label: "SMS Service API", href: "/dashboard/settings/sms" }
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
  return pathname.startsWith(href)
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
      className={`relative flex h-screen flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 transition-[width] duration-300 ease-in-out ${isExpanded ? "w-[16.5rem]" : "w-[4.5rem]"}`}
      aria-label="Main Navigation"
    >
      {/* Brand Logo */}
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-100 px-4 dark:border-slate-800/50">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg ring-1 ring-indigo-500/10">
          <Building2 className="h-5 w-5" />
        </div>
        {isExpanded && (
          <div className="flex flex-col overflow-hidden">
            <span className="text-base font-bold leading-tight tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
              Somiti MS
            </span>
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider whitespace-nowrap">
              Management System
            </span>
          </div>
        )}
      </header>

      {/* Desktop Toggle Button */}
      <div className="absolute top-[4.5rem] z-50 -right-3 hidden lg:flex">
        <Button
          variant="outline"
          size="icon"
          className="h-6 w-6 rounded-full border-slate-200 bg-white shadow-md hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
          onClick={() => setExpanded(!isExpanded)}
        >
          {isExpanded ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {/* Navigation - Using native overflow-y-auto to guarantee scrolling works perfectly */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2.5">
        <TooltipProvider>
          {SIDEBAR_MENU_GROUPS.map((group) => (
            <div key={group.title} className="mb-4">
              
              {/* Section Header */}
              {isExpanded ? (
                <>
                  <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                    {group.title}
                  </p>
                  <Separator className="mb-3 bg-slate-200/60 dark:bg-slate-800/60" />
                </>
              ) : (
                <div className="my-3 flex justify-center">
                  <Separator className="w-8 bg-slate-200 dark:bg-slate-700" />
                </div>
              )}

              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = checkIsActive(pathname, item.href)
                  const hasSubs = item.subItems && item.subItems.length > 0

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
                          className={`relative flex items-center justify-center w-full p-2 rounded-lg transition-colors no-underline ${isActive ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60"}`}
                        >
                          <item.icon className="h-[18px] w-[18px] shrink-0" />
                          {item.badge && (
                            <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                            </span>
                          )}
                        </TooltipTrigger>
                        <TooltipContent side="right" sideOffset={12}>{item.label}</TooltipContent>
                      </Tooltip>
                    )
                  }

                  // --- EXPANDED VIEW ---
                  const linkContent = (
                    <div className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all w-full no-underline ${isActive ? "bg-indigo-50/80 text-indigo-600 shadow-sm dark:bg-indigo-950/30 dark:text-indigo-400" : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60"}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <item.icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? "text-indigo-600" : "text-slate-500"}`} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-auto">
                        {item.badge && (
                          <Badge variant="secondary" className="h-5 min-w-[1.25rem] px-1.5 text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0">
                            {item.badge}
                          </Badge>
                        )}
                        {hasSubs && (
                          <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${isActive ? "rotate-180" : ""}`} />
                        )}
                      </div>
                    </div>
                  )

                  if (hasSubs) {
                    return (
                      <Accordion key={item.label} className="w-full">
                        <AccordionItem value={item.label} className="border-none">
                          <AccordionTrigger className="p-0 hover:!no-underline !no-underline rounded-lg [&>svg]:hidden [&[data-state=open]>div]:bg-slate-50 dark:[&[data-state=open]>div]:bg-slate-800/40">
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
                                  className={`flex items-center gap-3 rounded-md py-2 pl-10 pr-3 text-xs transition-all !no-underline hover:!no-underline ${subActive ? "font-semibold text-indigo-600 dark:text-indigo-400" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/30"}`}
                                >
                                  <span className={`h-1.5 w-1.5 rounded-full ${subActive ? "bg-indigo-500" : "bg-slate-300 dark:bg-slate-600"}`} />
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
                    <Link key={item.label} href={item.href} onClick={onNavigate} className="block no-underline hover:no-underline decoration-none">
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
      <footer className="mt-auto shrink-0 border-t border-slate-100 p-2.5 dark:border-slate-800/50">
        {isExpanded ? (
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-red-600/90 hover:bg-red-50 hover:text-red-700 dark:text-red-400/90 dark:hover:bg-red-950/30"
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            <span className="font-medium">Exit / Logout</span>
          </Button>
        ) : (
          <Tooltip>
            <TooltipTrigger
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex w-full items-center justify-center rounded-lg p-2.5 text-red-600/90 hover:bg-red-50 hover:text-red-700 dark:text-red-400/90 dark:hover:bg-red-950/30"
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
      <div className="hidden lg:flex sticky top-0 h-screen z-30 shrink-0">
        <SidebarContent isExpanded={isExpanded} setExpanded={setExpanded} />
      </div>

      {/* Mobile Sheet */}
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="left" className="w-[16.5rem] p-0 border-r-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation Menu</SheetTitle>
          </SheetHeader>
          <SidebarContent isExpanded={true} setExpanded={() => {}} onNavigate={onClose} />
        </SheetContent>
      </Sheet>
    </>
  )
}