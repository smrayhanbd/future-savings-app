"use client"

import { useState } from "react"
import PortalSidebar from "@/components/PortalSidebar"
import PortalTopbar, { type PortalNotification } from "@/components/PortalTopbar"
import TrustRibbon from "@/components/somiti/TrustRibbon"

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

  // h-screen + overflow-hidden keeps only the main scroll area scrolling.
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-base">
      {/* Signature brand element — always at the very top */}
      <TrustRibbon />
      <div className="flex min-h-0 flex-1">
        <PortalSidebar
          isOpen={isMobileOpen}
          onClose={() => setIsMobileOpen(false)}
          pendingRequests={pendingRequests}
        />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <PortalTopbar
            onMenuClick={() => setIsMobileOpen(true)}
            memberName={memberName}
            memberNo={memberNo}
            photoUrl={photoUrl}
            notifications={notifications}
          />

          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">{children}</div>
          </main>
        </div>
      </div>
    </div>
  )
}
