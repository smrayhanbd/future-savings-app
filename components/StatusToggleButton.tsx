"use client"

import { Button } from "@/components/ui/button"
import { PauseCircle, PlayCircle } from "lucide-react"
import { updateMemberStatus } from "@/app/actions/member"

export default function StatusToggleButton({ memberId, status }: { memberId: string, status: string }) {
  const isSuspended = status === "SUSPENDED" || status === "INACTIVE"

  const handleClick = () => {
    const newStatus = isSuspended ? "ACTIVE" : "SUSPENDED"
    const actionText = isSuspended ? "activate" : "suspend"
    
    if (confirm(`Are you sure you want to ${actionText} this member?`)) {
      updateMemberStatus(memberId, newStatus as any)
    }
  }

  return (
    <Button 
      onClick={handleClick} 
      variant={isSuspended ? "default" : "destructive"}
      className={isSuspended ? "bg-emerald-600 hover:bg-emerald-700" : ""}
    >
      {isSuspended ? <PlayCircle className="mr-2 h-4 w-4" /> : <PauseCircle className="mr-2 h-4 w-4" />}
      {isSuspended ? "Activate Member" : "Suspend Member"}
    </Button>
  )
}