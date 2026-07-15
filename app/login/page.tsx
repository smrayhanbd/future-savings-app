"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { Building2, ArrowLeft, Eye, EyeOff } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    if (res?.error) {
      setError("Invalid credentials. Please check your Email/Member ID and Password.")
      setLoading(false)
    } else if (res?.ok) {
      // The middleware (proxy.ts) will automatically intercept this 
      // and route the user to /dashboard (if Admin) or /portal (if Member)
      router.push("/dashboard") 
      router.refresh()
    }
  }

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
      {/* Left side - Branding & Gradient */}
      <div className="hidden flex-col justify-center bg-gradient-to-br from-slate-900 to-indigo-900 p-12 text-white lg:flex">
        <div className="mx-auto max-w-md">
          <Link href="/" className="flex items-center gap-3 mb-12 group">
            <div className="h-10 w-10 rounded-xl bg-indigo-500 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">Future Savings Foundation</span>
          </Link>
          
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Enterprise Somiti Management
          </h1>
          <p className="text-lg text-slate-300 mb-8">
            Securely access your dashboard to manage members, track savings, and view real-time financial reports.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                <Building2 className="h-4 w-4 text-indigo-400" />
              </div>
              <p className="text-slate-200">Admin Dashboard & Cashier Portal</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                <Building2 className="h-4 w-4 text-indigo-400" />
              </div>
              <p className="text-slate-200">Member Self-Service Portal</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                <Building2 className="h-4 w-4 text-indigo-400" />
              </div>
              <p className="text-slate-200">Real-time Accounting & Ledgers</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex items-center justify-center p-6 lg:p-12 bg-slate-50 dark:bg-slate-950">
        <div className="w-full max-w-sm">
          <div className="mb-6 lg:hidden">
            <Link href="/" className="flex items-center gap-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
              <ArrowLeft className="h-4 w-4" /> Back to Home
            </Link>
          </div>

          <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-slate-200 dark:border-slate-800 shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl text-center text-slate-900 dark:text-white">Sign In</CardTitle>
              <CardDescription className="text-center">Enter your credentials to access your account</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md border border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-700 dark:text-slate-300">Email or Member ID</Label>
                  <Input 
                    id="email" 
                    name="email" 
                    type="text" 
                    placeholder="admin@foundation.com or M0001" 
                    required 
                    className="bg-white dark:bg-slate-900" 
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-slate-700 dark:text-slate-300">Password</Label>
                    <Link href="/forgot-password" className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
                      Forgot password?
                    </Link>
                  </div>
                  {/* Password Input with Eye Icon */}
                  <div className="relative">
                    <Input 
                      id="password" 
                      name="password" 
                      type={showPassword ? "text" : "password"} 
                      required 
                      className="bg-white dark:bg-slate-900 pr-10" 
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-md"
                >
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
              
              <div className="mt-6 text-center text-sm">
                <p className="text-slate-500 dark:text-slate-400">Are you a new member?</p>
                <Link href="/register" className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 mt-1 inline-block">
                  Register for an account
                </Link>
              </div>
            </CardContent>
          </Card>
          
          <div className="mt-6 text-center hidden lg:block">
            <Link href="/" className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}