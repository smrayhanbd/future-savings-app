"use client"

import { useState } from "react"
import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import ThemeToggle from "@/components/ThemeToggle"
import { Building2, LayoutDashboard, Wallet, User, LogOut, Menu, Settings } from "lucide-react"

const navItems = [
  { name: "Dashboard", href: "/portal", icon: LayoutDashboard },
  { name: "My Savings", href: "/portal/savings", icon: Wallet },
  { name: "My Profile", href: "/portal/profile", icon: User },
  { name: "Settings", href: "/portal/settings", icon: Settings },
]

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col transition-colors duration-300">
      <header className="sticky top-0 z-40 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-300">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Mobile Menu (Left Slider) */}
          <div className="lg:hidden flex items-center gap-2">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 h-10 w-10 p-0 cursor-pointer outline-none">
                <Menu className="h-6 w-6" />
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0 bg-white dark:bg-slate-950">
                <div className="h-16 flex items-center px-4 border-b border-slate-200 dark:border-slate-800">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mr-2">
                    <Building2 className="h-5 w-5 text-white" />
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white">Member Portal</span>
                </div>
                <nav className="p-4 space-y-2">
                  {navItems.map((item) => {
                    const isActive = pathname === item.href
                    return (
                      <Link key={item.name} href={item.href} onClick={() => setOpen(false)}>
                        <Button variant={isActive ? "secondary" : "ghost"} className="w-full justify-start gap-2">
                          <item.icon className="h-4 w-4" /> {item.name}
                        </Button>
                      </Link>
                    )
                  })}
                </nav>
              </SheetContent>
            </Sheet>
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-white" />
            </div>
          </div>

          {/* Desktop Logo */}
          <div className="hidden lg:flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-slate-900 dark:text-white">Member Portal</span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link key={item.name} href={item.href}>
                  <Button variant={isActive ? "secondary" : "ghost"} size="sm" className="gap-2">
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Button>
                </Link>
              )
            })}
            <ThemeToggle />
          </nav>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-slate-900 dark:text-white">{session?.user?.name}</p>
            </div>
            <div className="lg:hidden">
              <ThemeToggle />
            </div>
            <Button variant="ghost" size="icon" onClick={() => signOut({ callbackUrl: "/" })} className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}