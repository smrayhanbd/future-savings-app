"use client"

import { useState } from "react"
import AppSidebar from "@/components/AppSidebar"
import Topbar from "@/components/Topbar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <AppSidebar isOpen={isMobileOpen} onClose={() => setIsMobileOpen(false)} />
      {/* lg:pl-64 pushes content right on desktop to clear the fixed sidebar */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Topbar is restored here */}
        <Topbar onMenuClick={() => setIsMobileOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}