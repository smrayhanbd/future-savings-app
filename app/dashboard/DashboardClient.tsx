"use client"

import { useState } from "react"
import AppSidebar from "@/components/AppSidebar"
import Topbar from "@/components/Topbar"

export default function DashboardClient({ children, notifications }: { children: React.ReactNode, notifications: any[] }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      <AppSidebar isOpen={isMobileOpen} onClose={() => setIsMobileOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar onMenuClick={() => setIsMobileOpen(true)} notifications={notifications} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}