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
    // h-screen and overflow-hidden on the root prevents the whole window from scrolling
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-900">
      <AppSidebar isOpen={isMobileOpen} onClose={() => setIsMobileOpen(false)} />
      
      {/* Main Content Column */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar is shrink-0 so it never collapses */}
        <Topbar onMenuClick={() => setIsMobileOpen(true)} />
        
        {/* Only the main content area scrolls */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}