"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { signOut, useSession } from "next-auth/react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Menu, Moon, Sun, Bell, User, Settings as SettingsIcon, LogOut,
  AlertCircle, CalendarClock, CheckCircle2, ChevronRight,
} from "lucide-react"

export interface PortalNotification {
  id: string
  type: "due" | "meeting" | "request" | "info"
  title: string
  message: string
  href?: string
  createdAt?: string
}

// Map the current top-level portal route to a friendly page title shown in the topbar.
function usePageTitle(): string {
  const pathname = usePathname()
  if (pathname === "/portal") return "Dashboard"
  if (pathname.startsWith("/portal/savings")) return "My Savings"
  if (pathname.startsWith("/portal/loans/apply")) return "Apply for Loan"
  if (pathname.startsWith("/portal/loans/")) return "Loan Details"
  if (pathname.startsWith("/portal/loans")) return "My Loans"
  if (pathname.startsWith("/portal/trust-score")) return "My Trust Score"
  if (pathname.startsWith("/portal/requests")) return "My Requests"
  if (pathname.startsWith("/portal/profile")) return "My Profile"
  if (pathname.startsWith("/portal/settings")) return "Settings"
  return "Member Portal"
}

function notifIcon(type: PortalNotification["type"]) {
  switch (type) {
    case "due": return <AlertCircle className="h-4 w-4 text-rose-600" />
    case "meeting": return <CalendarClock className="h-4 w-4 text-indigo-600" />
    case "request": return <CheckCircle2 className="h-4 w-4 text-emerald-600" />
    default: return <Bell className="h-4 w-4 text-slate-500" />
  }
}

function notifBg(type: PortalNotification["type"]) {
  switch (type) {
    case "due": return "bg-rose-50 dark:bg-rose-950/40"
    case "meeting": return "bg-indigo-50 dark:bg-indigo-950/40"
    case "request": return "bg-emerald-50 dark:bg-emerald-950/40"
    default: return "bg-slate-100 dark:bg-slate-800"
  }
}

export default function PortalTopbar({
  onMenuClick,
  memberName,
  memberNo,
  photoUrl,
  notifications = [],
}: {
  onMenuClick: () => void
  memberName?: string | null
  memberNo?: string | null
  photoUrl?: string | null
  notifications?: PortalNotification[]
}) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const pageTitle = usePageTitle()
  useEffect(() => setMounted(true), [])

  const initials = (memberName || "M").trim().charAt(0).toUpperCase()
  const unread = notifications.length

  return (
    <header className="z-40 relative flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-xl px-4 sm:px-6 dark:border-slate-800 dark:bg-slate-950/80">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Button variant="ghost" size="icon" className="lg:hidden shrink-0" onClick={onMenuClick}>
          <Menu className="h-6 w-6" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white truncate">
            {pageTitle}
          </h1>
          <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 truncate">
            {memberNo ? `Member ID: ${memberNo}` : "Welcome back"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {mounted && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-9 w-9"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        )}

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger className="relative h-9 w-9 inline-flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 outline-none cursor-pointer">
            <Bell className="h-5 w-5 text-slate-600 dark:text-slate-300" />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-slate-950" />
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Notifications</p>
              {unread > 0 && <Badge className="bg-rose-500 text-white border-0">{unread} New</Badge>}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                  <Bell className="h-7 w-7 text-slate-300" />
                  <p className="text-sm text-slate-500">You&apos;re all caught up!</p>
                </div>
              ) : (
                notifications.map((n) => {
                  const inner = (
                    <div className="flex items-start gap-3 p-3 border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                      <div className={`p-1.5 rounded-full ${notifBg(n.type)} mt-0.5 shrink-0`}>
                        {notifIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{n.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{n.message}</p>
                      </div>
                    </div>
                  )
                  return n.href ? (
                    <Link key={n.id} href={n.href}>{inner}</Link>
                  ) : (
                    <div key={n.id}>{inner}</div>
                  )
                })
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Avatar / account menu */}
        <DropdownMenu>
          <DropdownMenuTrigger className="relative outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950 rounded-full cursor-pointer">
            <Avatar className="h-9 w-9 ring-2 ring-white dark:ring-slate-950 shadow-sm">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt={memberName || "Member"} className="h-full w-full object-cover rounded-full" />
              ) : null}
              <AvatarFallback className="bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300 font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{memberName || "Member"}</p>
                <p className="text-xs font-normal text-slate-500 mt-0.5">{memberNo || ""}</p>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              render={<Link href="/portal/profile" className="cursor-pointer" />}
            >
              <User className="mr-2 h-4 w-4" /> My Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              render={<Link href="/portal/settings" className="cursor-pointer" />}
            >
              <SettingsIcon className="mr-2 h-4 w-4" /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-rose-600 focus:text-rose-700 cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
