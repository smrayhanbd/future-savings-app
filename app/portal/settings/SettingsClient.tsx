"use client"

import { useState } from "react"
import { changePassword, submitClosingRequest } from "@/app/actions/portal"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Lock, AlertTriangle, ShieldCheck } from "lucide-react"

export default function SettingsClient({ memberId, hasPendingClose }: { memberId: string, hasPendingClose: boolean }) {
  const [pwdLoading, setPwdLoading] = useState(false)
  const [closeLoading, setCloseLoading] = useState(false)

  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setPwdLoading(true)
    const formData = new FormData(e.currentTarget)
    
    try {
      const result = await changePassword(memberId, formData)
      if (result?.error) {
        toast.error("Error", { description: result.error })
      } else if (result?.success) {
        toast.success("Success", { description: result.success })
        e.currentTarget.reset()
      }
    } catch (err) {
      toast.error("Error", { description: "Something went wrong." })
    }
    setPwdLoading(false)
  }

  const handleClosingSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!confirm("Are you absolutely sure you want to request account closure? This action cannot be undone.")) return
    
    setCloseLoading(true)
    const formData = new FormData(e.currentTarget)
    
    try {
      const result = await submitClosingRequest(memberId, formData)
      if (result?.error) {
        toast.error("Error", { description: result.error })
        setCloseLoading(false)
      }
    } catch (err) {
      toast.error("Error", { description: "Something went wrong." })
      setCloseLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your account security and preferences.</p>
      </div>

      {/* Security Section */}
      <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200/50 dark:border-slate-800/50 px-6 py-4">
          <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-white">
            <Lock className="h-5 w-5 text-indigo-500" /> Change Password
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input id="currentPassword" name="currentPassword" type="password" required className="bg-white dark:bg-slate-950" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input id="newPassword" name="newPassword" type="password" required className="bg-white dark:bg-slate-950" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input id="confirmPassword" name="confirmPassword" type="password" required className="bg-white dark:bg-slate-950" />
            </div>
            <Button type="submit" disabled={pwdLoading} className="bg-indigo-600 hover:bg-indigo-700">
              {pwdLoading ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="bg-red-50/50 dark:bg-red-950/10 border border-red-200 dark:border-red-900/50 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-red-100/50 dark:bg-red-950/20 border-b border-red-200 dark:border-red-900/50 px-6 py-4">
          <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertTriangle className="h-5 w-5" /> Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {hasPendingClose ? (
            <div className="flex items-center gap-3 p-4 bg-white dark:bg-slate-950 border border-amber-200 dark:border-amber-900 rounded-xl">
              <ShieldCheck className="h-6 w-6 text-amber-500 shrink-0" />
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Account Closure Request Pending</p>
                <p className="text-sm text-slate-500">Your request to close this account is currently being reviewed by management. Please wait for their response.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleClosingSubmit} className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="reason" className="text-red-700 dark:text-red-400">Reason for Closing Account</Label>
                <Textarea id="reason" name="reason" required placeholder="Please explain why you want to close your account..." className="bg-white dark:bg-slate-950 border-red-200 dark:border-red-900/50 focus-visible:ring-red-500" />
              </div>
              <Button type="submit" variant="destructive" disabled={closeLoading}>
                {closeLoading ? "Submitting..." : "Submit Closing Request"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}