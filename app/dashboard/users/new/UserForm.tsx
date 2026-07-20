"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { createUser } from "@/app/actions/users"
import { Save, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface Props {
  mode: "create"
}

export default function UserForm({ mode }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [role, setRole] = useState("ADMIN")
  const [password, setPassword] = useState("")

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (password.length < 6) return toast.error("Password must be at least 6 characters")
    const formData = new FormData()
    formData.set("name", name)
    formData.set("email", email)
    formData.set("phone", phone)
    formData.set("role", role)
    formData.set("password", password)
    startTransition(async () => {
      const res = await createUser(formData)
      if (res.ok) {
        toast.success("User created")
        router.push("/dashboard/users")
      } else {
        toast.error("Failed", { description: res.error })
      }
    })
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link
          href="/dashboard/users"
          className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to users
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-2">
          Add User
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
          Create a new admin / staff account. They can sign in immediately with
          the password you set.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wider text-slate-500">
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Karim Ahmed"
                className="bg-white dark:bg-slate-950"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@somiti.com"
                className="bg-white dark:bg-slate-950"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+8801…"
                className="bg-white dark:bg-slate-950"
              />
            </div>
            <div className="space-y-2">
              <Label>Role *</Label>
              <Select value={role} onValueChange={(v) => { if (v) setRole(v) }}>
                <SelectTrigger className="bg-white dark:bg-slate-950">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Temporary Password *</Label>
              <Input
                id="password"
                type="text"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="bg-white dark:bg-slate-950"
              />
              <p className="text-[11px] text-slate-400">
                The user will be asked to change this at first login.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" type="button" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            <Save className="h-4 w-4 mr-2" /> Create User
          </Button>
        </div>
      </form>
    </div>
  )
}
