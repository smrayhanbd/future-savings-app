"use client"

import { useState } from "react"
import { requestPasswordReset } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Mail, CheckCircle2, ArrowLeft } from "lucide-react"

export default function ForgotPasswordPage() {
  const searchParams = useSearchParams()
  const isSent = searchParams.get("status") === "sent"

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link href="/login" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900 mb-4">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Login
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Forgot Password</h1>
        </div>

        <Card className="bg-white/80 backdrop-blur-xl border-slate-200 shadow-xl">
          <CardContent className="p-6">
            {isSent ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Check your email</h3>
                <p className="text-sm text-slate-500">
                  If an account exists for that email, we have sent a password reset link. Please check your inbox (and spam folder).
                </p>
              </div>
            ) : (
              <form action={requestPasswordReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input id="email" name="email" type="email" required placeholder="you@example.com" className="pl-9" />
                  </div>
                  <p className="text-xs text-slate-500">We will send a reset link to this email.</p>
                </div>
                <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700">
                  Send Reset Link
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}