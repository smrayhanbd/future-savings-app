"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import {
  Heart, Cake, HeartHandshake, CalendarPlus, Sparkles, Send,
  Plus, Pencil, Trash2, CalendarClock, CheckCircle2, XCircle,
  Mail, MessageSquare, Loader2, PartyPopper
} from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

import {
  addFestival, updateFestival, deleteFestival, toggleFestivalStatus, sendWishesNow,
} from "@/app/actions/wishes"
import type { WishLogWithDetails } from "@/app/actions/wishes"

// =============== Types ===============

type Festival = {
  id: string
  name: string
  month: number
  day: number
  message: string | null
  isActive: boolean
}

type UpcomingWish = {
  type: "BIRTHDAY" | "MARRIAGE" | "JOINING" | "FESTIVAL"
  date: string
  title: string
  daysUntil: number
  recipient?: { id: string; fullName: string; phone: string; email?: string | null }
  festival?: { id: string; name: string; message?: string | null }
}

interface WishesClientProps {
  initialFestivals: Festival[]
  upcomingWishes: UpcomingWish[]
  initialStats: {
    totalSent: number
    todaySent: number
    todayFailed: number
    memberCount: number
    festivalCount: number
  }
  initialLogs: WishLogWithDetails[]
  totalLogs: number
}

// =============== Constants ===============

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

function getDaysInMonth(month: number): number {
  return new Date(2024, month, 0).getDate()
}

const WISH_TYPE_META = {
  BIRTHDAY: { label: "Birthday", icon: Cake, color: "text-pink-600 dark:text-pink-400", bg: "bg-pink-50 dark:bg-pink-950/40", badge: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300" },
  MARRIAGE: { label: "Anniversary", icon: HeartHandshake, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/40", badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300" },
  JOINING: { label: "Joining Day", icon: CalendarPlus, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-950/40", badge: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" },
  FESTIVAL: { label: "Festival", icon: PartyPopper, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/40", badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
} as const

// =============== Main Component ===============

export default function WishesClient({
  initialFestivals, upcomingWishes, initialStats, initialLogs, totalLogs,
}: WishesClientProps) {
  const [festivals, setFestivals] = useState<Festival[]>(initialFestivals)
  const stats = initialStats
  const logs = initialLogs
  const [isSending, startSend] = useTransition()

  // Festival dialog state
  const [festivalDialogOpen, setFestivalDialogOpen] = useState(false)
  const [editingFestival, setEditingFestival] = useState<Festival | null>(null)

  async function handleSendNow() {
    startSend(async () => {
      try {
        const result = await sendWishesNow()
        toast.success(
          `Wishes dispatched! ${result.sent} sent, ${result.failed} failed, ${result.skipped} skipped.`
        )
        // Refresh stats + logs from server
        window.location.reload()
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        toast.error(`Failed to send wishes: ${message}`)
      }
    })
  }

  function openAddFestival() {
    setEditingFestival(null)
    setFestivalDialogOpen(true)
  }

  function openEditFestival(f: Festival) {
    setEditingFestival(f)
    setFestivalDialogOpen(true)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Heart className="h-8 w-8 text-rose-500" />
            Special Wishes
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Automatically send birthday, anniversary, joining day & festival wishes to members every year.
          </p>
        </div>
        <Button
          onClick={handleSendNow}
          disabled={isSending}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          Send Today&apos;s Wishes Now
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Sparkles className="h-5 w-5" />}
          label="Total Wishes Sent"
          value={stats.totalSent}
          colorClass="bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400"
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Sent Today"
          value={stats.todaySent}
          colorClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
        />
        <StatCard
          icon={<XCircle className="h-5 w-5" />}
          label="Failed Today"
          value={stats.todayFailed}
          colorClass="bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
        />
        <StatCard
          icon={<PartyPopper className="h-5 w-5" />}
          label="Active Festivals"
          value={stats.festivalCount}
          colorClass="bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="festivals">Festivals</TabsTrigger>
          <TabsTrigger value="logs">Send Logs</TabsTrigger>
        </TabsList>

        {/* ===== OVERVIEW ===== */}
        <TabsContent value="overview" className="space-y-6">
          {/* Automation Info Card */}
          <Card className="border-indigo-200 dark:border-indigo-900 bg-gradient-to-br from-indigo-50/50 to-violet-50/50 dark:from-indigo-950/20 dark:to-violet-950/20">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">How Automation Works</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    The system checks daily for members whose <strong>Birthday</strong>, <strong>Marriage Anniversary</strong>,
                    or <strong>Joining Anniversary</strong> falls on that date, and sends personalized wishes via SMS and Email.
                    Festivals are also sent automatically to all active members on their scheduled date.
                  </p>
                  <div className="rounded-lg bg-white/60 dark:bg-slate-900/40 p-3 mt-3">
                    <p className="text-xs font-mono text-slate-600 dark:text-slate-400 break-all">
                      📅 Cron Endpoint: <code className="text-indigo-600 dark:text-indigo-400">/api/wishes/send</code>
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Call this endpoint daily at 9:00 AM (or your preferred time) using Vercel Cron, GitHub Actions, or any external scheduler.
                      Add <code className="text-indigo-600 dark:text-indigo-400">CRON_SECRET</code> env var to secure it.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Wishes */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-slate-400" />
              Upcoming Wishes (Next 30 Days)
            </h2>
            {upcomingWishes.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center text-slate-500">
                  No upcoming wishes in the next 30 days.
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingWishes.slice(0, 12).map((wish, i) => {
                  const meta = WISH_TYPE_META[wish.type]
                  const Icon = meta.icon
                  return (
                    <Card key={i} className="overflow-hidden border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${meta.bg}`}>
                            <Icon className={`h-5 w-5 ${meta.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="secondary" className={`text-[10px] ${meta.badge} border-0`}>
                                {meta.label}
                              </Badge>
                              <span className="text-[11px] text-slate-400">
                                {wish.daysUntil === 0 ? "Today" : wish.daysUntil === 1 ? "Tomorrow" : `in ${wish.daysUntil} days`}
                              </span>
                            </div>
                            <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                              {wish.title}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {new Date(wish.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>

          {/* Event Source Breakdown */}
          <div className="grid sm:grid-cols-3 gap-4">
            <EventSourceCard
              icon={<Cake className="h-5 w-5" />}
              title="Birthdays"
              count={upcomingWishes.filter(w => w.type === "BIRTHDAY").length}
              description="From member date of birth"
              colorClass="bg-pink-50 text-pink-600 dark:bg-pink-950/40 dark:text-pink-400"
            />
            <EventSourceCard
              icon={<HeartHandshake className="h-5 w-5" />}
              title="Anniversaries"
              count={upcomingWishes.filter(w => w.type === "MARRIAGE").length}
              description="From member marriage date"
              colorClass="bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
            />
            <EventSourceCard
              icon={<CalendarPlus className="h-5 w-5" />}
              title="Joining Days"
              count={upcomingWishes.filter(w => w.type === "JOINING").length}
              description="From member joining date"
              colorClass="bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400"
            />
          </div>
        </TabsContent>

        {/* ===== FESTIVALS ===== */}
        <TabsContent value="festivals" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Festival Calendar</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Manage festivals. Wishes are sent to all active members automatically on the scheduled date.
              </p>
            </div>
            <Button onClick={openAddFestival} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Festival
            </Button>
          </div>

          {festivals.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <PartyPopper className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 mb-4">No festivals configured yet.</p>
                <Button onClick={openAddFestival} className="bg-indigo-600 hover:bg-indigo-700">
                  <Plus className="h-4 w-4 mr-2" /> Add Your First Festival
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {festivals.map((f) => (
                <FestivalCard
                  key={f.id}
                  festival={f}
                  onEdit={() => openEditFestival(f)}
                  onDelete={async () => {
                    if (!confirm(`Delete "${f.name}"?`)) return
                    try {
                      await deleteFestival(f.id)
                      setFestivals(prev => prev.filter(x => x.id !== f.id))
                      toast.success("Festival deleted")
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : String(err))
                    }
                  }}
                  onToggle={async () => {
                    try {
                      await toggleFestivalStatus(f.id)
                      setFestivals(prev => prev.map(x => x.id === f.id ? { ...x, isActive: !x.isActive } : x))
                      toast.success(`${f.name} ${f.isActive ? "disabled" : "enabled"}`)
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : String(err))
                    }
                  }}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ===== LOGS ===== */}
        <TabsContent value="logs" className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Send History</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Log of all wishes sent via SMS and Email. Showing {logs.length} of {totalLogs} records.
            </p>
          </div>

          {logs.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-slate-500">
                No wishes have been sent yet. Click &quot;Send Today&apos;s Wishes Now&quot; to dispatch.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="min-w-[200px]">Message</TableHead>
                      <TableHead>Sent At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => {
                      const meta = WISH_TYPE_META[log.type as keyof typeof WISH_TYPE_META] || WISH_TYPE_META.FESTIVAL
                      const Icon = meta.icon
                      return (
                        <TableRow key={log.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Icon className={`h-4 w-4 ${meta.color}`} />
                              <span className="text-sm font-medium">{meta.label}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {log.member ? (
                              <div>
                                <p className="text-sm font-medium text-slate-900 dark:text-white">{log.member.fullName}</p>
                                <p className="text-xs text-slate-400">{log.member.memberNo}</p>
                              </div>
                            ) : log.festival ? (
                              <span className="text-sm text-amber-600 dark:text-amber-400 font-medium">{log.festival.name}</span>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {log.channel === "SMS" ? (
                              <Badge variant="outline" className="text-blue-600 border-blue-200 dark:text-blue-400 dark:border-blue-900">
                                <MessageSquare className="h-3 w-3 mr-1" /> SMS
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-purple-600 border-purple-200 dark:text-purple-400 dark:border-purple-900">
                                <Mail className="h-3 w-3 mr-1" /> Email
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {log.status === "SENT" ? (
                              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-0">
                                <CheckCircle2 className="h-3 w-3 mr-1" /> Sent
                              </Badge>
                            ) : (
                              <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border-0">
                                <XCircle className="h-3 w-3 mr-1" /> Failed
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[280px]">
                            <p className="text-xs text-slate-600 dark:text-slate-400 truncate" title={log.message}>
                              {log.message}
                            </p>
                            {log.error && (
                              <p className="text-[10px] text-rose-500 truncate mt-0.5" title={log.error}>
                                {log.error}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                            {new Date(log.sentAt).toLocaleString("en-US", {
                              month: "short", day: "numeric", year: "numeric",
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Festival Dialog */}
      <FestivalDialog
        open={festivalDialogOpen}
        onOpenChange={setFestivalDialogOpen}
        festival={editingFestival}
        onSaved={(updated) => {
          setFestivals(prev => {
            const exists = prev.find(f => f.id === updated.id)
            if (exists) return prev.map(f => f.id === updated.id ? updated : f)
            return [...prev, updated].sort((a, b) => a.month - b.month || a.day - b.day)
          })
          setFestivalDialogOpen(false)
        }}
      />
    </div>
  )
}

// =============== Sub-Components ===============

function StatCard({ icon, label, value, colorClass }: {
  icon: React.ReactNode
  label: string
  value: number
  colorClass: string
}) {
  return (
    <Card className="border-slate-200 dark:border-slate-800">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${colorClass}`}>
            {icon}
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function EventSourceCard({ icon, title, count, description, colorClass }: {
  icon: React.ReactNode
  title: string
  count: number
  description: string
  colorClass: string
}) {
  return (
    <Card className="border-slate-200 dark:border-slate-800">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-2">
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${colorClass}`}>
            {icon}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
            <p className="text-xs text-slate-500">{description}</p>
          </div>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          <span className="font-bold text-slate-900 dark:text-white">{count}</span> upcoming
        </p>
      </CardContent>
    </Card>
  )
}

function FestivalCard({ festival, onEdit, onDelete, onToggle }: {
  festival: Festival
  onEdit: () => void
  onDelete: () => void
  onToggle: () => void
}) {
  return (
    <Card className={`${!festival.isActive ? "opacity-60" : ""} border-slate-200 dark:border-slate-800`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
              <PartyPopper className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white">{festival.name}</p>
              <p className="text-xs text-slate-500">
                {MONTHS[festival.month - 1]} {festival.day}
              </p>
            </div>
          </div>
          <Switch checked={festival.isActive} onCheckedChange={onToggle} />
        </div>

        {festival.message && (
          <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-md mb-3 line-clamp-2">
            &ldquo;{festival.message}&rdquo;
          </p>
        )}

        <div className="flex items-center justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" onClick={onDelete} className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function FestivalDialog({ open, onOpenChange, festival, onSaved }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  festival: Festival | null
  onSaved: (festival: Festival) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState(festival?.name || "")
  const [month, setMonth] = useState(festival?.month?.toString() || "1")
  const [day, setDay] = useState(festival?.day?.toString() || "1")
  const [message, setMessage] = useState(festival?.message || "")

  // Reset fields when dialog opens with new data
  const [lastFestivalId, setLastFestivalId] = useState<string | null>(null)
  if (open && festival?.id !== lastFestivalId) {
    setLastFestivalId(festival?.id || null)
    setName(festival?.name || "")
    setMonth(festival?.month?.toString() || "1")
    setDay(festival?.day?.toString() || "1")
    setMessage(festival?.message || "")
  }
  if (open && !festival && lastFestivalId !== null) {
    setLastFestivalId(null)
    setName("")
    setMonth("1")
    setDay("1")
    setMessage("")
  }

  const monthNum = parseInt(month)
  const daysInMonth = getDaysInMonth(monthNum)
  const dayNum = parseInt(day)
  const validDay = dayNum > daysInMonth ? daysInMonth.toString() : day

  function handleSubmit(formData: FormData) {
    formData.set("day", validDay)
    startTransition(async () => {
      try {
        if (festival) {
          await updateFestival(festival.id, formData)
          toast.success("Festival updated")
          onSaved({
            id: festival.id,
            name,
            month: monthNum,
            day: parseInt(validDay),
            message: message || null,
            isActive: festival.isActive,
          })
        } else {
          await addFestival(formData)
          toast.success("Festival added")
          onSaved({
            id: "temp-" + Date.now(),
            name,
            month: monthNum,
            day: parseInt(validDay),
            message: message || null,
            isActive: true,
          })
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : String(err))
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{festival ? "Edit Festival" : "Add Festival"}</DialogTitle>
          <DialogDescription>
            Wishes will be sent to all active members on this date every year.
            Use <code className="text-xs">{"${name}"}</code> for festival name and <code className="text-xs">{"${org}"}</code> for org name in the message.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="f-name">Festival Name *</Label>
            <Input
              id="f-name" name="name" required
              value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Eid Ul Fitr, Durga Puja, Pohela Boishakh"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Month *</Label>
              <Select value={month} onValueChange={(v) => { const sv = v || "1"; setMonth(sv); if (parseInt(day) > getDaysInMonth(parseInt(sv))) setDay("1") }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="month" value={month} />
            </div>
            <div className="space-y-2">
              <Label>Day *</Label>
              <Select value={validDay} onValueChange={(v) => setDay(v || "1")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: daysInMonth }, (_, i) => (
                    <SelectItem key={i} value={(i + 1).toString()}>{i + 1}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="day" value={validDay} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="f-message">Custom Message (optional)</Label>
            <Textarea
              id="f-message" name="message" rows={3}
              value={message} onChange={(e) => setMessage(e.target.value)}
              placeholder="Eid Mubarak ${name}! Wishing you joy and prosperity from ${org}. (Leave empty for default)"
            />
            <p className="text-xs text-slate-500">
              Leave empty to use the default greeting.
            </p>
          </div>

          {festival && (
            <div className="flex items-center gap-2">
              <Label htmlFor="f-active" className="text-sm">Active</Label>
              <Switch id="f-active" name="isActive" defaultChecked={festival.isActive} />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700">
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {festival ? "Update" : "Add"} Festival
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
