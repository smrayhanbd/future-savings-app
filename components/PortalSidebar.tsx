"use client"

import React, { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import {
  LayoutDashboard, Wallet, HandCoins, FilePlus2, User,
  Inbox, Settings as SettingsIcon, LogOut, ChevronLeft, ChevronRight,
  Building2, ShieldCheck, type LucideIcon,
} from "lucide-react"

interface NavItem {
  label: string
  icon: LucideIcon
  href: string
  badge?: number
}

interface MenuGroup {
  title: string
  items: NavItem[]
}

// Build the navigation menu. A pending-requests count can be passed in to badge "My Requests".
function buildMenu(pendingRequests = 0): MenuGroup[] {
  return [
    {
      title: "Main",
      items: [{ label: "Dashboard", icon: LayoutDashboard, href: "/portal" }],
    },
    {
      title: "Finance",
      items: [
        { label: "My Savings", icon: Wallet, href: "/portal/savings" },
        { label: "My Loans", icon: HandCoins, href: "/portal/loans" },
        { label: "Apply for Loan", icon: FilePlus2, href: "/portal/loans/apply" },
        { label: "My Trust Score", icon: ShieldCheck, href: "/portal/trust-score" },
      ],
    },
    {
      title: "Account",
      items: [
        { label: "My Profile", icon: User, href: "/portal/profile" },
        { label: "My Requests", icon: Inbox, href: "/portal/requests", badge: pendingRequests || undefined },
        { label: "Settings", icon: SettingsIcon, href: "/portal/settings" },
      ],
    },
  ]
}

function checkIsActive(pathname: string, href: string): boolean {
  if (href === "/portal") return pathname === "/portal"
  return pathname === href || pathname.startsWith(href + "/")
}

interface SidebarContentProps {
  isExpanded: boolean
  setExpanded: (val: boolean) => void
  onNavigate?: () => void
  pendingRequests?: number
}

function SidebarContent({ isExpanded, setExpanded, onNavigate, pendingRequests = 0 }: SidebarContentProps) {
  const pathname = usePathname()
  const router = useRouter()
  const menu = buildMenu(pendingRequests)

  return (
    <aside
      className={`relative flex h-screen flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 transition-[width] duration-300 ease-in-out ${isExpanded ? "w-[16.5rem]" : "w-[4.5rem]"}`}
      aria-label="Member Portal Navigation"
    >
      {/* Brand */}
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-100 px-4 dark:border-slate-800/50">
        <Link href="/portal" className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg ring-1 ring-indigo-500/10">
            <Building2 className="h-5 w-5" />
          </div>
          {isExpanded && (
            <div className="flex flex-col overflow-hidden">
              <span className="text-base font-bold leading-tight tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
                Member Portal
              </span>
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider whitespace-nowrap">
                Future Savings
              </span>
            </div>
          )}
        </Link>
      </header>

      {/* Collapse toggle (desktop) */}
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

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2.5">
        <TooltipProvider>
          {menu.map((group) => (
            <div key={group.title} className="mb-4">
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

                  // Collapsed view
                  if (!isExpanded) {
                    return (
                      <Tooltip key={item.label}>
                        <TooltipTrigger
                          onClick={() => {
                            onNavigate?.()
                            router.push(item.href)
                          }}
                          className={`relative flex items-center justify-center w-full p-2 rounded-lg transition-colors no-underline ${isActive ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60"}`}
                        >
                          <item.icon className="h-[18px] w-[18px] shrink-0" />
                          {item.badge && (
                            <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                              <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
                            </span>
                          )}
                        </TooltipTrigger>
                        <TooltipContent side="right" sideOffset={12}>{item.label}</TooltipContent>
                      </Tooltip>
                    )
                  }

                  // Expanded view
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={onNavigate}
                      className="block no-underline hover:no-underline"
                    >
                      <div className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all w-full ${isActive ? "bg-indigo-50/80 text-indigo-600 shadow-sm dark:bg-indigo-950/30 dark:text-indigo-400" : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60"}`}>
                        <div className="flex items-center gap-3 min-w-0">
                          <item.icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? "text-indigo-600" : "text-slate-500"}`} />
                          <span className="truncate">{item.label}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-auto">
                          {item.badge ? (
                            <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-100 px-1.5 text-[10px] font-bold text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">
                              {item.badge}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </TooltipProvider>
      </nav>

      {/* Footer / logout */}
      <footer className="mt-auto shrink-0 border-t border-slate-100 p-2.5 dark:border-slate-800/50">
        {isExpanded ? (
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-rose-600/90 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400/90 dark:hover:bg-rose-950/30"
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            <span className="font-medium">Logout</span>
          </Button>
        ) : (
          <Tooltip>
            <TooltipTrigger
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex w-full items-center justify-center rounded-lg p-2.5 text-rose-600/90 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400/90 dark:hover:bg-rose-950/30"
            >
              <LogOut className="h-[18px] w-[18px] shrink-0" />
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={12}>Logout</TooltipContent>
          </Tooltip>
        )}
      </footer>
    </aside>
  )
}

export default function PortalSidebar({
  isOpen,
  onClose,
  pendingRequests = 0,
}: {
  isOpen: boolean
  onClose: () => void
  pendingRequests?: number
}) {
  const [isExpanded, setExpanded] = useState(true)

  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:flex sticky top-0 h-screen z-30 shrink-0">
        <SidebarContent isExpanded={isExpanded} setExpanded={setExpanded} pendingRequests={pendingRequests} />
      </div>

      {/* Mobile Sheet */}
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="left" className="w-[16.5rem] p-0 border-r-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Member Portal Navigation</SheetTitle>
          </SheetHeader>
          <SidebarContent isExpanded={true} setExpanded={() => {}} onNavigate={onClose} pendingRequests={pendingRequests} />
        </SheetContent>
      </Sheet>
    </>
  )
}
