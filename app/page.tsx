"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError("Invalid email or password");
      setLoading(false);
    } else if (res?.ok) {
      router.push("/dashboard");
    }
  };

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
      {/* Left side - Branding & Gradient */}
      <div className="hidden flex-col justify-center bg-gradient-to-br from-slate-900 to-indigo-900 p-12 text-white lg:flex">
        <div className="mx-auto max-w-md">
          <h1 className="text-4xl font-bold tracking-tight">Future Savings Foundation</h1>
          <p className="mt-4 text-lg text-slate-300">
            Enterprise-grade management for Savings Societies, Cooperatives, and Microfinance Organizations.
          </p>
          <div className="mt-8 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400">✓</div>
              <p className="text-slate-200">Secure & Automated Double-Entry Accounting</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400">✓</div>
              <p className="text-slate-200">Member Management & KYC Verification</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400">✓</div>
              <p className="text-slate-200">SMS, Email & Receipt Automation</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex items-center justify-center p-6 lg:p-12 bg-slate-50 dark:bg-slate-950">
        <Card className="w-full max-w-sm shadow-xl border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-2xl">Sign in to your account</CardTitle>
            <CardDescription>Enter your credentials to access the admin dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md border border-red-200">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Admin Email</Label>
                <Input id="email" name="email" type="email" placeholder="admin@foundation.com" required className="bg-white dark:bg-slate-900" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link href="/forgot-password" className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
                    Forgot password?
                  </Link>
                </div>
                <Input id="password" name="password" type="password" required className="bg-white dark:bg-slate-900" />
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700">
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
            <p className="mt-4 text-center text-xs text-slate-500">
              Protected by enterprise-grade security. © 2024 Future Savings Foundation.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}