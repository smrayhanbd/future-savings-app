"use client"

import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import ThemeToggle from "@/components/ThemeToggle"
import { Building2, LayoutDashboard, Wallet, User, LogOut, Settings } from "lucide-react"

const navItems = [
  { name: "Dashboard", href: "/portal", icon: LayoutDashboard },
  { name: "My Savings", href: "/portal/savings", icon: Wallet },
  { name: "My Profile", href: "/portal/profile", icon: User },
  { name: "Settings", href: "/portal/settings", icon: Settings }, // <-- ADD THIS
]

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col transition-colors duration-300">
      {/* Portal Top Navbar */}
      <header className="sticky top-0 z-40 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-300">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-slate-900 dark:text-white hidden sm:block">Member Portal</span>
          </div>

          <nav className="flex items-center gap-1 sm:gap-4">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link key={item.name} href={item.href}>
                  <Button variant={isActive ? "secondary" : "ghost"} size="sm" className="gap-2">
                    <item.icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{item.name}</span>
                  </Button>
                </Link>
              )
            })}
            <ThemeToggle />
          </nav>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-slate-900 dark:text-white">{session?.user?.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{session?.user?.email}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => signOut({ callbackUrl: "/" })} className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}