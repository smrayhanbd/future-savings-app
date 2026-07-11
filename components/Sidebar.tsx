"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, Wallet, FileText, Settings, CheckCircle, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { signOut } from "next-auth/react"

const menuItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Member Panel", href: "/dashboard/members", icon: Users },
  { name: "Approvals", href: "/dashboard/approvals", icon: CheckCircle },
  { name: "Finance & Accounts", href: "/dashboard/accounting", icon: Wallet },
  { name: "Reports", href: "/dashboard/reports", icon: FileText },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
]

export default function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname()

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose}></div>
      )}

      <aside className={cn(
        "fixed left-0 top-0 z-50 h-screen w-64 bg-white border-r border-gray-200 flex flex-col dark:bg-slate-950 dark:border-slate-800 transition-transform duration-300 lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200 dark:border-slate-800 shrink-0">
          <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">Somiti MS</span>
          <button onClick={onClose} className="lg:hidden text-slate-500 hover:text-slate-900 dark:hover:text-white">
            <LogOut className="h-5 w-5 rotate-180" />
          </button>
        </div>
        
        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 font-medium transition-colors",
                  isActive 
                    ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400" 
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            )
          })}
        </nav>
        
        {/* Footer */}
        <div className="border-t p-4 dark:border-slate-800 shrink-0">
          <button 
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex w-full items-center gap-3 px-3 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg font-medium transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>
    </>
  )
}