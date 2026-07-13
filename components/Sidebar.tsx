"use client"

import React, { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { motion } from "framer-motion"

// Shadcn UI Components
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

// Lucide Icons
import {
  LayoutDashboard, Users, Clock, Archive, PieChart, FilePlus2, 
  FileText, ScrollText, Landmark, ArrowDownUp, Receipt, CreditCard, 
  Printer, CalendarCheck, Briefcase, Gem, CheckSquare, Heart, 
  UserCog, Settings, Cloud, LogOut, ChevronDown, Building2, Mail, MessageSquare
} from "lucide-react"

// --- Types ---
export interface NavItem {
  title: string
  href: string
  icon: React.ElementType
  badge?: string
  subItems?: NavItem[]
}

export interface MenuSection {
  title?: string
  items: NavItem[]
}

// --- Menu Data ---
const menuSections: MenuSection[] = [
  {
    title: "Overview",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ]
  },
  {
    title: "Member Management",
    items: [
      { title: "Member Panel", href: "/dashboard/members", icon: Users },
      { title: "Pending Approvals", href: "/dashboard/approvals", icon: Clock, badge: "3" },
      { title: "Old Member DB", href: "/dashboard/old-members", icon: Archive },
    ]
  },
  {
    title: "Finance & Accounting",
    items: [
      { title: "Chart of Accounts", href: "/dashboard/accounts", icon: PieChart },
      { title: "Voucher Entry", href: "/dashboard/vouchers", icon: FilePlus2 },
      { title: "Account Ledger Statements", href: "/dashboard/account-ledger", icon: FileText },
      { title: "Member Ledger Statements", href: "/dashboard/member-ledger", icon: ScrollText },
      { title: "Deposits / Charges Collection", href: "/dashboard/deposits", icon: Landmark },
      { title: "Income Distribution", href: "/dashboard/income-distribution", icon: ArrowDownUp },
      { title: "Apply Fees / Charges", href: "/dashboard/fees", icon: Receipt },
      { title: "Money Receipts / Payment Vouchers", href: "/dashboard/receipts", icon: CreditCard },
      { title: "Reports", href: "/dashboard/reports", icon: Printer },
    ]
  },
  {
    title: "Operations & Management",
    items: [
      { title: "Meeting Management", href: "/dashboard/meetings", icon: CalendarCheck },
      { title: "Project Management", href: "/dashboard/projects", icon: Briefcase },
      { title: "Investment Management", href: "/dashboard/investments", icon: Gem },
      { title: "Task Management", href: "/dashboard/tasks", icon: CheckSquare },
      { title: "Special Wishes", href: "/dashboard/wishes", icon: Heart },
    ]
  },
  {
    title: "System & Settings",
    items: [
      { title: "User Control", href: "/dashboard/users", icon: UserCog },
      { 
        title: "Somiti Settings", 
        href: "/dashboard/settings", 
        icon: Settings,
        subItems: [
          { title: "Organization Info", href: "/dashboard/settings/organization", icon: Building2 },
          { title: "Active Bank Accounts", href: "/dashboard/settings/banks", icon: Landmark },
          { title: "Mail Server Setup", href: "/dashboard/settings/mail", icon: Mail },
          { title: "SMS Service API Setup", href: "/dashboard/settings/sms", icon: MessageSquare },
        ]
      },
      { title: "Cloud Backup", href: "/dashboard/backup", icon: Cloud },
    ]
  }
]

export default function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname()
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard"
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose}></div>
      )}

      <aside className={`
        fixed left-0 top-0 z-50 h-screen w-64 flex-col border-r bg-background shadow-sm
        transition-transform duration-300 lg:translate-x-0 flex
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        {/* Brand Logo */}
        <div className="flex h-16 items-center justify-between gap-2 border-b px-6 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md">
              <Building2 className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              Somiti MS
            </span>
          </div>
          {/* Mobile Close Button */}
          <button onClick={onClose} className="lg:hidden text-slate-500 hover:text-slate-900 dark:hover:text-white">
            <LogOut className="h-5 w-5 rotate-180" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {menuSections.map((section, index) => (
            <div key={index} className="mb-4">
              {section.title && (
                <>
                  <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {section.title}
                  </p>
                  <Separator className="mb-3 bg-slate-200/60 dark:bg-slate-800/60" />
                </>
              )}
              
              <div className="space-y-1">
                {section.items.map((item) => {
                  const active = isActive(item.href)
                  
                  // If item has subItems, render Accordion
                  if (item.subItems && item.subItems.length > 0) {
                    return (
                      <Accordion key={item.title} type="single" collapsible className="px-0">
                        <AccordionItem value={item.title} className="border-none">
                          <AccordionTrigger className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/50 hover:no-underline">
                            <div className="flex items-center gap-3">
                              <item.icon className={`h-4 w-4 ${active ? "text-indigo-600 dark:text-indigo-400" : "text-muted-foreground"}`} />
                              <span className={active ? "text-indigo-600 dark:text-indigo-400" : "text-slate-700 dark:text-slate-300"}>
                                {item.title}
                              </span>
                            </div>
                            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
                          </AccordionTrigger>
                          <AccordionContent className="mt-1 space-y-1 pl-6 pt-0">
                            {item.subItems.map((sub) => {
                              const subActive = isActive(sub.href)
                              return (
                                <Link
                                  key={sub.href}
                                  href={sub.href}
                                  onClick={onClose}
                                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/50"
                                >
                                  <sub.icon className={`h-4 w-4 ${subActive ? "text-indigo-600 dark:text-indigo-400" : "text-muted-foreground"}`} />
                                  <span className={subActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-700 dark:text-slate-300"}>
                                    {sub.title}
                                  </span>
                                </Link>
                              )
                            })}
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    )
                  }

                  // Render standard Link
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className="relative flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/50"
                      onMouseEnter={() => setHoveredItem(item.href)}
                      onMouseLeave={() => setHoveredItem(null)}
                    >
                      <div className={`flex items-center gap-3 z-10 ${active ? "text-indigo-600 dark:text-indigo-400" : "text-slate-700 dark:text-slate-300"}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </div>
                      
                      {item.badge && (
                        <Badge variant="destructive" className="h-5 px-1.5 text-xs z-10">
                          {item.badge}
                        </Badge>
                      )}

                      {/* Framer Motion Active Indicator */}
                      {active && (
                        <motion.div
                          layoutId="sidebar-active-indicator"
                          className="absolute inset-0 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/50 dark:border-indigo-800/50"
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Logout Button */}
        <div className="mt-auto border-t p-4 shrink-0">
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/40"
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            <LogOut className="h-4 w-4" />
            Exit / Logout
          </Button>
        </div>
      </aside>
    </>
  )
}