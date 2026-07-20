"use client"

import { useState, useMemo, useTransition } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"
import { setUserActive, deleteUser } from "@/app/actions/users"
import { formatDate } from "@/lib/accounting"
import { Search, Plus, UserCog, ShieldCheck, Trash2, Power, Eye } from "lucide-react"

interface UserRow {
  id: string
  email: string
  name: string | null
  phone: string | null
  role: string
  isActive: boolean
  lastLogin: string | null
  createdAt: string
  createdBy: string | null
}

interface Props {
  users: UserRow[]
  canManage: boolean
  currentUserId: string
}

export default function UsersClient({ users, canManage, currentUserId }: Props) {
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("ALL")

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== "ALL" && u.role !== roleFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        return (
          u.email.toLowerCase().includes(q) ||
          (u.name ?? "").toLowerCase().includes(q) ||
          (u.phone ?? "").toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [users, search, roleFilter])

  const stats = useMemo(
    () => ({
      total: users.length,
      active: users.filter((u) => u.isActive).length,
      superAdmins: users.filter((u) => u.role === "SUPER_ADMIN").length,
    }),
    [users]
  )

  const handleToggleActive = (u: UserRow) => {
    const verb = u.isActive ? "disable" : "enable"
    if (!confirm(`${verb.charAt(0).toUpperCase() + verb.slice(1)} ${u.email}?`)) return
    startTransition(async () => {
      const res = await setUserActive(u.id, !u.isActive)
      if (res.ok) {
        toast.success(`User ${verb}d`)
      } else {
        toast.error("Failed", { description: res.error })
      }
    })
  }

  const handleDelete = (u: UserRow) => {
    if (!confirm(`Permanently delete ${u.email}? This cannot be undone.`)) return
    startTransition(async () => {
      const res = await deleteUser(u.id)
      if (res.ok) toast.success("User deleted")
      else toast.error("Failed", { description: res.error })
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <UserCog className="h-7 w-7 text-indigo-600" />
            User Control
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Manage admin &amp; staff users, roles, permissions and login status.
          </p>
        </div>
        {canManage && (
          <Link href="/dashboard/users/new">
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="h-4 w-4 mr-2" /> Add User
            </Button>
          </Link>
        )}
      </div>

      {!canManage && (
        <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 rounded-2xl">
          <CardContent className="p-4 text-sm text-amber-700 dark:text-amber-400">
            You need Super Admin rights to create, edit, or disable users. You
            can view the list below.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-3">
        <MiniStat label="Total Users" value={stats.total} />
        <MiniStat label="Active" value={stats.active} tone="text-emerald-600" />
        <MiniStat label="Super Admins" value={stats.superAdmins} tone="text-indigo-600" />
      </div>

      <Card className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm rounded-2xl">
        <CardContent className="p-4 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search name, email, phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white dark:bg-slate-950"
            />
          </div>
          <Select value={roleFilter} onValueChange={(v) => { if (v) setRoleFilter(v) }}>
            <SelectTrigger className="w-40 bg-white dark:bg-slate-950">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Roles</SelectItem>
              <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
              <SelectItem value="ADMIN">Admin</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm rounded-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 dark:bg-slate-800/50 hover:bg-transparent">
              <TableHead className="text-[11px] uppercase tracking-widest font-bold text-slate-400">
                User
              </TableHead>
              <TableHead className="text-[11px] uppercase tracking-widest font-bold text-slate-400">
                Role
              </TableHead>
              <TableHead className="text-[11px] uppercase tracking-widest font-bold text-slate-400">
                Last Login
              </TableHead>
              <TableHead className="text-[11px] uppercase tracking-widest font-bold text-slate-400 text-center">
                Status
              </TableHead>
              <TableHead className="text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-16 text-slate-500">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((u) => (
                <TableRow
                  key={u.id}
                  className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center text-sm font-semibold">
                        {(u.name ?? u.email).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {u.name ?? "Unnamed"}
                          {u.id === currentUserId && (
                            <span className="ml-2 text-[10px] text-indigo-500">(you)</span>
                          )}
                        </p>
                        <p className="text-[11px] text-slate-400">{u.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {u.role === "SUPER_ADMIN" ? (
                      <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400">
                        <ShieldCheck className="h-3 w-3 mr-1" /> Super Admin
                      </Badge>
                    ) : (
                      <Badge variant="outline">Admin</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {u.lastLogin ? formatDate(u.lastLogin) : "Never"}
                  </TableCell>
                  <TableCell className="text-center">
                    {u.isActive ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-500/10 border border-slate-500/20 px-2 py-0.5 rounded-full">
                        Disabled
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/dashboard/users/${u.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="View / edit">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      {canManage && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            disabled={isPending || u.id === currentUserId}
                            onClick={() => handleToggleActive(u)}
                            title={u.isActive ? "Disable" : "Enable"}
                          >
                            <Power className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-rose-500 hover:bg-rose-50"
                            disabled={isPending || u.id === currentUserId}
                            onClick={() => handleDelete(u)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}

function MiniStat({
  label,
  value,
  tone = "text-slate-900 dark:text-white",
}: {
  label: string
  value: string | number
  tone?: string
}) {
  return (
    <Card className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl">
      <CardContent className="p-3">
        <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">{label}</p>
        <p className={`text-lg font-extrabold tabular-nums ${tone}`}>{value}</p>
      </CardContent>
    </Card>
  )
}
