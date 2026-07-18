"use client"

import { useState } from "react"
import PortalSidebar from "@/components/PortalSidebar"
import PortalTopbar, { type PortalNotification } from "@/components/PortalTopbar"

export default function PortalShell({
  children,
  memberName,
  memberNo,
  photoUrl,
  notifications = [],
  pendingRequests = 0,
}: {
  children: React.ReactNode
  memberName?: string | null
  memberNo?: string | null
  photoUrl?: string | null
  notifications?: PortalNotification[]
  pendingRequests?: number
}) {
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  return (
    // h-screen + overflow-hidden prevents the whole window from scrolling; only main scrolls.
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-900">
      <PortalSidebar
        isOpen={isMobileOpen}
        onClose={() => setIsMobileOpen(false)}
        pendingRequests={pendingRequests}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <PortalTopbar
          onMenuClick={() => setIsMobileOpen(true)}
          memberName={memberName}
          memberNo={memberNo}
          photoUrl={photoUrl}
          notifications={notifications}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto w-full">{children}</div>
        </main>
      </div>
    </div>
  )
}
