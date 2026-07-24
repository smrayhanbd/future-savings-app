"use client"

import React, { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import {
  LayoutDashboard, Wallet, HandCoins, FilePlus2, User,
  Inbox, Settings as SettingsIcon, LogOut, ChevronLeft, ChevronRight,
  Building2, ShieldCheck, CheckSquare, type LucideIcon,
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
        { label: "View Savings", icon: Wallet, href: "/portal/savings" },
        { label: "Manage Loans", icon: HandCoins, href: "/portal/loans" },
        { label: "View Trust Score", icon: ShieldCheck, href: "/portal/trust-score" },
      ],
    },
    {
      title: "Account",
      items: [
        { label: "My Profile", icon: User, href: "/portal/profile" },
        { label: "My Tasks", icon: CheckSquare, href: "/portal/tasks" },
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
      className="relative flex h-screen flex-col border-r border-[var(--border-base)] bg-surface transition-[width] duration-300 ease-out"
      style={{ width: isExpanded ? "16.5rem" : "4.5rem" }}
      aria-label="Member Portal Navigation"
    >
      {/* Brand */}
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-[var(--border-base)] px-4">
        <Link href="/portal" className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl brand-gradient text-white shadow-brand-glow">
            <Building2 className="h-5 w-5" />
          </div>
          {isExpanded && (
            <div className="flex flex-col overflow-hidden">
              <span className="whitespace-nowrap text-base font-bold leading-tight tracking-tight text-primary-ink font-[var(--font-heading)]">
                Member Portal
              </span>
              <span className="whitespace-nowrap text-[10px] font-medium uppercase tracking-wider text-muted-ink">
                Future Savings
              </span>
            </div>
          )}
        </Link>
      </header>

      {/* Collapse toggle (desktop) */}
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

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-3">
        <TooltipProvider>
          {menu.map((group) => (
            <div key={group.title} className="mb-4">
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

                  // Collapsed view
                  if (!isExpanded) {
                    return (
                      <Tooltip key={item.label}>
                        <TooltipTrigger
                          onClick={() => {
                            onNavigate?.()
                            router.push(item.href)
                          }}
                          className={`relative flex w-full items-center justify-center rounded-lg p-2.5 transition-colors ${
                            isActive
                              ? "bg-brand-gradient-soft text-brand"
                              : "text-secondary-ink hover:bg-subtle hover:text-primary-ink"
                          }`}
                        >
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
                      <div className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
                        isActive
                          ? "bg-brand-gradient-soft text-brand"
                          : "text-secondary-ink hover:bg-subtle hover:text-primary-ink"
                      }`}>
                        {isActive && (
                          <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full trust-gradient" />
                        )}
                        <div className="flex min-w-0 items-center gap-3">
                          <item.icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? "text-brand" : "text-muted-ink"}`} />
                          <span className="truncate">{item.label}</span>
                        </div>
                        {item.badge ? (
                          <span className="ml-auto inline-flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-debit-soft px-1.5 text-[10px] font-bold text-debit">
                            {item.badge}
                          </span>
                        ) : null}
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
      <footer className="mt-auto shrink-0 border-t border-[var(--border-base)] p-2.5">
        {isExpanded ? (
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-debit hover:bg-debit-soft hover:text-debit"
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            <span className="font-medium">Logout</span>
          </Button>
        ) : (
          <Tooltip>
            <TooltipTrigger
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex w-full items-center justify-center rounded-lg p-2.5 text-debit transition-colors hover:bg-debit-soft hover:text-debit"
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
      <div className="sticky top-0 z-30 hidden h-screen shrink-0 lg:flex">
        <SidebarContent isExpanded={isExpanded} setExpanded={setExpanded} pendingRequests={pendingRequests} />
      </div>

      {/* Mobile Sheet */}
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="left" className="w-[16.5rem] border-r-0 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Member Portal Navigation</SheetTitle>
          </SheetHeader>
          <SidebarContent isExpanded={true} setExpanded={() => {}} onNavigate={onClose} pendingRequests={pendingRequests} />
        </SheetContent>
      </Sheet>
    </>
  )
}
