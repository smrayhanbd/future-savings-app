"use client"

import { Suspense } from "react"
import { resetPassword } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Lock, ArrowLeft } from "lucide-react"

function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <Card className="max-w-md w-full bg-white shadow-xl">
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-bold text-red-600 mb-2">Invalid Link</h3>
            <p className="text-sm text-slate-500 mb-4">The password reset link is missing a token. Please request a new link.</p>
            <Link href="/forgot-password"><Button variant="outline">Request New Link</Button></Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link href="/login" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900 mb-4">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Login
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Reset Password</h1>
        </div>

        <Card className="bg-white/80 backdrop-blur-xl border-slate-200 shadow-xl">
          <CardHeader>
            <CardDescription>Enter your new password below.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={resetPassword} className="space-y-4">
              <input type="hidden" name="token" value={token} />
              
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input id="password" name="password" type="password" required placeholder="Minimum 6 characters" className="pl-9" minLength={6} />
                </div>
              </div>
              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700">
                Update Password
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  )
}