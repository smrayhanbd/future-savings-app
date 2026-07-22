"use client"

import { useSession, signOut } from "next-auth/react"
import { useTheme } from "next-themes"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Menu, Moon, Sun, Bell, Search, User, Settings, LogOut, AlertCircle, ChevronDown, Building2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useMounted } from "@/lib/useMounted"
import LanguageToggle from "@/components/somiti/LanguageToggle"

/** A topbar notification row — the subset of the Notification model we render. */
export interface TopbarNotification {
  id: string
  title: string
  message: string
}

export default function Topbar({ onMenuClick, notifications = [] }: { onMenuClick: () => void, notifications?: TopbarNotification[] }) {
  const mounted = useMounted()
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()

  return (
    <header className="glass z-40 relative flex h-16 shrink-0 items-center justify-between gap-3 px-4 sm:px-6">
      {/* Left: mobile menu, org selector, search */}
      <div className="flex flex-1 items-center gap-3">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick} aria-label="Open navigation">
          <Menu className="h-5 w-5" />
        </Button>

        {/* Workspace / Somiti selector */}
        <DropdownMenu>
          <DropdownMenuTrigger className="hidden items-center gap-2.5 rounded-[10px] border border-[var(--border-base)] px-2.5 py-1.5 text-left transition-colors hover:bg-subtle lg:inline-flex">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg brand-gradient text-white shadow-brand-glow">
              <Building2 className="h-4 w-4" />
            </span>
            <span className="hidden flex-col leading-tight xl:flex">
              <span className="text-xs font-bold text-primary-ink">Somiti MS</span>
              <span className="text-[10px] text-muted-ink">Future Savings Foundation</span>
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-ink" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-60">
            <p className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-ink">Somiti MS</p>
            <DropdownMenuItem className="gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg brand-gradient text-white"><Building2 className="h-3.5 w-3.5" /></span>
              <span className="flex flex-col">
                <span className="text-sm font-semibold">Future Savings Foundation</span>
                <span className="text-[11px] text-muted-ink">Active workspace</span>
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Search */}
        <div className="relative w-full max-w-md hidden sm:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-ink" />
          <Input
            placeholder="Search members, ID, transactions…"
            className="h-9 rounded-[10px] border-[var(--border-base)] bg-[var(--control-bg)] pl-9 focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]"
          />
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {mounted && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="h-9 w-9 rounded-[10px] hover:bg-subtle"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
          </Button>
        )}

        <LanguageToggle compact />

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger className="relative inline-flex h-9 w-9 items-center justify-center rounded-[10px] text-secondary-ink transition-colors hover:bg-subtle hover:text-primary-ink outline-none cursor-pointer">
            <Bell className="h-[18px] w-[18px]" />
            {notifications.length > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--status-debit)] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--status-debit)]" />
              </span>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="flex items-center justify-between border-b border-[var(--border-base)] px-3 py-2">
              <p className="t-overline text-muted-ink">Notifications</p>
              {notifications.length > 0 && <span className="text-xs font-bold text-debit">{notifications.length} New</span>}
            </div>
            <div className="max-h-72 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="t-body py-8 text-center text-muted-ink">No new notifications.</p>
              ) : (
                notifications.map((notif) => (
                  <div key={notif.id} className="flex items-start gap-3 border-b border-[var(--border-base)] p-3 transition-colors last:border-0 hover:bg-subtle">
                    <div className="mt-0.5 rounded-full bg-warning-soft p-1.5">
                      <AlertCircle className="h-4 w-4 text-warning" />
                    </div>
                    <div className="flex-1">
                      <p className="t-subheading text-primary-ink">{notif.title}</p>
                      <p className="t-caption mt-0.5 text-muted-ink">{notif.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger className="relative rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] cursor-pointer">
            <Avatar className="h-9 w-9 ring-2 ring-[var(--border-base)] transition-shadow hover:ring-[var(--brand-primary)]">
              <AvatarFallback className="brand-gradient text-sm font-bold text-white">
                {session?.user?.email?.charAt(0).toUpperCase() || "A"}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="truncate text-xs font-bold text-muted-ink">{session?.user?.email || "Admin"}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2.5"><User className="h-4 w-4" /> Profile</DropdownMenuItem>
            <DropdownMenuItem className="gap-2.5"><Settings className="h-4 w-4" /> Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })} className="gap-2.5 text-debit focus:text-debit">
              <LogOut className="h-4 w-4" /> Exit / Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
