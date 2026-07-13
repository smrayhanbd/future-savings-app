"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
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

// Lucide Icons
import {
  LayoutDashboard, Users, Clock, Archive, PieChart, Landmark, 
  ArrowDownUp, Receipt, Printer, CalendarCheck, Briefcase, Gem, 
  CheckSquare, Heart, UserCog, Settings, Cloud, LogOut, 
  ChevronLeft, ChevronRight, ChevronDown, Building2
} from "lucide-react"

// --- Types ---
interface NavItem {
  label: string
  icon: React.ElementType
  href: string
  badge?: number
  subItems?: { label: string; href: string }[]
}

interface MenuGroup {
  title: string
  items: NavItem[]
}

// --- Menu Data (Using /dashboard routes) ---
const sidebarMenuGroups: MenuGroup[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" }
    ]
  },
  {
    title: "Member Management",
    items: [
      { label: "Member Panel", icon: Users, href: "/dashboard/members" },
      { label: "Pending Approvals", icon: Clock, href: "/dashboard/approvals", badge: 3 },
      { label: "Old Member DB", icon: Archive, href: "/dashboard/old-members" }
    ]
  },
  {
    title: "Finance & Accounting",
    items: [
      { label: "Chart of Accounts", icon: PieChart, href: "/dashboard/accounts" },
      { label: "Deposits / Charges", icon: Landmark, href: "/dashboard/deposits" },
      { label: "Income Distribution", icon: ArrowDownUp, href: "/dashboard/income-distribution" },
      { label: "Apply Fees / Charges", icon: Receipt, href: "/dashboard/fees" },
      { 
        label: "Reports", 
        icon: Printer, 
        href: "#",
        subItems: [
          { label: "Account Ledger", href: "/dashboard/account-ledger" },
          { label: "Member Ledger", href: "/dashboard/member-ledger" },
          { label: "Money Receipts / Vouchers", href: "/dashboard/receipts" },
          { label: "Voucher Entry", href: "/dashboard/vouchers" }
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

// --- Reusable Sidebar Content Component ---
interface SidebarContentProps {
  isExpanded: boolean
  setExpanded: (val: boolean) => void
  onNavigate?: () => void
}

function SidebarContent({ isExpanded, setExpanded, onNavigate }: SidebarContentProps) {
  const pathname = usePathname()
  const [openGroups, setOpenGroups] = useState<string[]>(sidebarMenuGroups.map(g => g.title))
  const [openSubMenus, setOpenSubMenus] = useState<string>("")

  // Force all group accordions open when sidebar is collapsed to show all icons
  useEffect(() => {
    if (!isExpanded) {
      setOpenGroups(sidebarMenuGroups.map(g => g.title))
      setOpenSubMenus("") // Close inner sub-menus when collapsing
    }
  }, [isExpanded])

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard"
    return pathname.startsWith(href)
  }

  return (
    <div className={`relative flex flex-col h-screen bg-background border-r transition-all duration-300 ${isExpanded ? "w-64" : "w-16"}`}>
      {/* Brand Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-4 shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md shrink-0">
          <Building2 className="h-5 w-5" />
        </div>
        {isExpanded && (
          <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
            Somiti MS
          </span>
        )}
      </div>

      {/* Desktop Toggle Button */}
      <div className="absolute top-20 z-50 -right-3 hidden lg:flex">
        <Button 
          variant="outline" 
          size="icon" 
          className="h-6 w-6 rounded-full bg-background shadow-md border"
          onClick={() => setExpanded(!isExpanded)}
        >
          {isExpanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2">
        <TooltipProvider delayDuration={0}>
          <Accordion 
            type="multiple" 
            value={openGroups} 
            onValueChange={(val) => isExpanded && setOpenGroups(val)}
            className="space-y-2"
          >
            {sidebarMenuGroups.map((group, index) => (
              <AccordionItem key={index} value={group.title} className="border-none">
                
                {/* Group Title (Accordion Trigger) */}
                {isExpanded ? (
                  <AccordionTrigger className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:no-underline hover:bg-muted/50 px-3 py-2 rounded-lg group">
                    <span className="flex items-center gap-2">{group.title}</span>
                    <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </AccordionTrigger>
                ) : (
                  <div className="h-2" /> // Spacer for collapsed view
                )}

                <AccordionContent className="space-y-1 pt-1 overflow-hidden">
                  {group.items.map((item) => {
                    const active = isActive(item.href)
                    const hasSubs = item.subItems && item.subItems.length > 0

                    // --- COLLAPSED VIEW (Icons only) ---
                    if (!isExpanded) {
                      return (
                        <Tooltip key={item.label}>
                          <TooltipTrigger asChild>
                            <Link 
                              href={hasSubs ? "#" : item.href} 
                              onClick={hasSubs ? (e) => e.preventDefault() : onNavigate}
                              className={`relative flex items-center justify-center w-full p-2 rounded-lg transition-colors ${active ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400" : "text-slate-700 dark:text-slate-300 hover:bg-muted/50"}`}
                            >
                              <item.icon className="h-4 w-4 shrink-0" />
                              {item.badge && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />}
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="ml-2">{item.label}</TooltipContent>
                        </Tooltip>
                      )
                    }

                    // --- EXPANDED VIEW (Links + Sub-Accordions) ---
                    const linkContent = (
                      <div className={`relative flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors w-full ${active ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400" : "text-slate-700 dark:text-slate-300 hover:bg-muted/50"}`}>
                        <div className="flex items-center gap-3 whitespace-nowrap">
                          <item.icon className="h-4 w-4 shrink-0" />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && <Badge variant="destructive" className="h-5 px-1.5 text-xs">{item.badge}</Badge>}
                        {hasSubs && <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${openSubMenus === item.label ? "rotate-180" : ""}`} />}
                      </div>
                    )

                    return (
                      <div key={item.label}>
                        {hasSubs ? (
                          <Accordion value={openSubMenus} onValueChange={setOpenSubMenus} type="single">
                            <AccordionItem value={item.label} className="border-none">
                              <AccordionTrigger className="p-0 hover:no-underline rounded-lg">
                                {linkContent}
                              </AccordionTrigger>
                              <AccordionContent className="mt-1 space-y-1 pl-2 pt-0 overflow-hidden">
                                {item.subItems!.map((sub) => {
                                  const subActive = isActive(sub.href)
                                  return (
                                    <Link
                                      key={sub.href}
                                      href={sub.href}
                                      onClick={onNavigate}
                                      className={`flex items-center gap-3 rounded-lg py-2 text-sm pl-9 pr-3 transition-colors ${subActive ? "text-indigo-600 dark:text-indigo-400 font-medium" : "text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-muted/50"}`}
                                    >
                                      {sub.label}
                                    </Link>
                                  )
                                })}
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        ) : (
                          <Link href={item.href} onClick={onNavigate} className="block">
                            {linkContent}
                          </Link>
                        )}
                      </div>
                    )
                  })}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </TooltipProvider>
      </nav>

      {/* Logout Button */}
      <div className="mt-auto border-t p-2 shrink-0">
        {isExpanded ? (
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/40"
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>Exit / Logout</span>
          </Button>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="w-full text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/40"
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                <LogOut className="h-4 w-4 shrink-0" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="ml-2">Exit / Logout</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  )
}

// --- Main Export: Handles Desktop vs Mobile ---
export default function AppSidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [isExpanded, setExpanded] = useState(true)

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <div className="hidden lg:block">
        <SidebarContent isExpanded={isExpanded} setExpanded={setExpanded} />
      </div>

      {/* Mobile Sheet */}
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="left" className="p-0 w-64 border-r">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation Menu</SheetTitle>
          </SheetHeader>
          {/* Mobile is always expanded */}
          <SidebarContent isExpanded={true} setExpanded={() => {}} onNavigate={onClose} />
        </SheetContent>
      </Sheet>
    </>
  )
}