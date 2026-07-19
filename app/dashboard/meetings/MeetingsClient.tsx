"use client"

// Meeting Management UI (rules 1, 3, 4, 6).
//
// Tabs split meetings into Upcoming and Past (rule 3). The Past tab defaults
// to a List View with search + filters (rule 4) and per-row action buttons:
// View Details and Mark Attendance (rule 3). The Upcoming tab hosts the
// Declare New Meeting form, where Meeting Type (Online/Offline) toggles the
// Location / Meeting Link fields (rule 1). A Super-Admin-only Permissions
// panel authorizes normal admins to submit attendance / upload minutes.

import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"
import {
  CalendarDays,
  Link2,
  MapPin,
  ClipboardList,
  Lock,
  FileText,
  Eye,
  CheckSquare,
  Search,
  Shield,
  Video,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"

import { createMeeting } from "@/app/actions/meeting"
import AttendancePanel from "./AttendancePanel"
import MinutesUploadButton from "./MinutesUploadButton"
import PermissionToggle from "./PermissionToggle"

interface Member {
  id: string
  fullName: string
  memberNo: string
}
interface Attendance {
  memberId: string
  status: "PRESENT" | "ABSENT" | "EXCUSED"
}
export interface MeetingSerialized {
  id: string
  title: string
  date: string
  type: string
  location: string | null
  link: string | null
  agenda: string
  createdAt: string
  attendanceLocked: boolean
  minutesUrl: string | null
  minutesFileName: string | null
  minutesLocked: boolean
  members: Member[]
  attendances: Attendance[]
}
interface AdminUser {
  id: string
  email: string
  role: string
  canMarkAttendance: boolean
  canUploadMinutes: boolean
}

export default function MeetingsClient({
  upcoming,
  past,
  isSuperAdmin,
  adminUsers,
}: {
  upcoming: MeetingSerialized[]
  past: MeetingSerialized[]
  isSuperAdmin: boolean
  adminUsers: AdminUser[]
}) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Meeting Management</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Declare meetings, notify members, and record attendance.</p>
      </div>

      {isSuperAdmin && <PermissionsPanel adminUsers={adminUsers} />}

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-6">
          <UpcomingTab meetings={upcoming} />
        </TabsContent>

        <TabsContent value="past" className="mt-6">
          <PastTab meetings={past} isSuperAdmin={isSuperAdmin} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ── 1. Declare New Meeting form (rule 1) + upcoming cards ────────────────────

function UpcomingTab({ meetings }: { meetings: MeetingSerialized[] }) {
  return (
    <div className="grid lg:grid-cols-3 gap-8">
      <Card className="lg:col-span-1 bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800">
        <CardHeader><CardTitle>Declare New Meeting</CardTitle></CardHeader>
        <CardContent>
          <DeclareMeetingForm />
        </CardContent>
      </Card>

      <div className="lg:col-span-2 space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Upcoming Meetings</h2>
        {meetings.length === 0 ? (
          <Card className="bg-white dark:bg-slate-900 border-dashed border-slate-300 dark:border-slate-700">
            <CardContent className="py-12 text-center text-slate-500">No upcoming meetings.</CardContent>
          </Card>
        ) : (
          meetings.map((m) => <MeetingCard key={m.id} meeting={m} />)
        )}
      </div>
    </div>
  )
}

function DeclareMeetingForm() {
  const [type, setType] = useState<"OFFLINE" | "ONLINE">("OFFLINE")
  return (
    <form action={createMeeting} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Meeting Title *</Label>
        <Input id="title" name="title" required placeholder="Monthly General Meeting" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="date">Date &amp; Time *</Label>
        <Input id="date" name="date" type="datetime-local" required />
      </div>

      {/* Rule 1: Meeting Type radio selector */}
      <div className="space-y-2">
        <Label>Meeting Type *</Label>
        <div className="grid grid-cols-2 gap-2">
          <TypeRadio
            active={type === "OFFLINE"}
            onClick={() => setType("OFFLINE")}
            icon={<MapPin className="w-4 h-4" />}
            label="Offline"
          />
          <TypeRadio
            active={type === "ONLINE"}
            onClick={() => setType("ONLINE")}
            icon={<Video className="w-4 h-4" />}
            label="Online"
          />
        </div>
        <input type="hidden" name="type" value={type} />
      </div>

      {/* Rule 1: conditional Location / Meeting Link */}
      {type === "OFFLINE" ? (
        <div className="space-y-2">
          <Label htmlFor="location">Location *</Label>
          <Input id="location" name="location" required placeholder="Foundation Office, Room 101" />
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="link">Meeting Link *</Label>
          <Input id="link" name="link" type="url" required placeholder="https://meet.example.com/abc-defg-hij" />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="agenda">Agenda</Label>
        <Textarea id="agenda" name="agenda" rows={4} placeholder="Discuss monthly savings and upcoming projects..." />
      </div>

      <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700">Declare &amp; Notify Members</Button>
    </form>
  )
}

function TypeRadio({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
          : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

// ── Meeting card (shared summary) ────────────────────────────────────────────

function MeetingCard({ meeting: m }: { meeting: MeetingSerialized }) {
  const isOnline = m.type === "ONLINE"
  return (
    <Card className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{m.title}</h3>
          <TypeBadge type={m.type} />
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-300 mt-2 mb-3">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 text-slate-400" /> {new Date(m.date).toLocaleString()}
          </span>
          {isOnline ? (
            <span className="flex items-center gap-1.5 min-w-0">
              <Link2 className="h-4 w-4 text-slate-400" />
              <a href={m.link ?? "#"} target="_blank" rel="noreferrer" className="truncate text-indigo-600 hover:underline">
                {m.link}
              </a>
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-slate-400" /> {m.location}
            </span>
          )}
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg text-sm text-slate-600 dark:text-slate-300">
          <span className="font-bold flex items-center gap-1.5 mb-1"><ClipboardList className="h-4 w-4" /> Agenda:</span>
          {m.agenda || "—"}
        </div>
      </CardContent>
    </Card>
  )
}

function TypeBadge({ type }: { type: string }) {
  const online = type === "ONLINE"
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
        online
          ? "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300"
          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
      }`}
    >
      {online ? "Online" : "Offline"}
    </span>
  )
}

// ── 3 & 4. Past Meetings — list view with search + filter ─────────────────────

function PastTab({ meetings, isSuperAdmin }: { meetings: MeetingSerialized[]; isSuperAdmin: boolean }) {
  const [q, setQ] = useState("")
  const [date, setDate] = useState("")
  const [type, setType] = useState<"ALL" | "ONLINE" | "OFFLINE">("ALL")

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return meetings.filter((m) => {
      if (needle && !m.title.toLowerCase().includes(needle)) return false
      if (type !== "ALL" && m.type !== type) return false
      if (date) {
        const md = new Date(m.date)
        const fd = new Date(date + "T00:00:00")
        const sameDay =
          md.getFullYear() === fd.getFullYear() &&
          md.getMonth() === fd.getMonth() &&
          md.getDate() === fd.getDate()
        if (!sameDay) return false
      }
      return true
    })
  }, [meetings, q, date, type])

  return (
    <div className="space-y-4">
      {/* Rule 4: search + filter row */}
      <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <CardContent className="p-4 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by meeting title…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="md:w-44" />
          <Select value={type} onValueChange={(v) => setType(v as "ALL" | "ONLINE" | "OFFLINE")}>
            <SelectTrigger className="md:w-44"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All types</SelectItem>
              <SelectItem value="ONLINE">Online</SelectItem>
              <SelectItem value="OFFLINE">Offline</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card className="bg-white dark:bg-slate-900 border-dashed border-slate-300 dark:border-slate-700">
          <CardContent className="py-12 text-center text-slate-500">No past meetings match your filters.</CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => (
            <PastMeetingRow key={m.id} meeting={m} isSuperAdmin={isSuperAdmin} />
          ))}
        </div>
      )}
    </div>
  )
}

function PastMeetingRow({ meeting: m, isSuperAdmin }: { meeting: MeetingSerialized; isSuperAdmin: boolean }) {
  // Rule 5: attendance editable unless locked (or always by Super Admin).
  const canEdit = isSuperAdmin || !m.attendanceLocked
  return (
    <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
      <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white truncate">{m.title}</h3>
            <TypeBadge type={m.type} />
            {m.attendanceLocked && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600">
                <Lock className="h-3 w-3" /> Attendance locked
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1 flex flex-wrap gap-3">
            <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> {new Date(m.date).toLocaleString()}</span>
            <span className="flex items-center gap-1">
              {m.type === "ONLINE" ? <Link2 className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
              {m.type === "ONLINE" ? "Online" : m.location ?? "—"}
            </span>
            {m.minutesUrl && (
              <span className="flex items-center gap-1 text-emerald-600">
                <FileText className="h-3.5 w-3.5" /> Minutes attached
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Rule 3: View Details */}
          <Dialog>
            <DialogTrigger
              render={
                <Button variant="outline" size="sm">
                  <Eye className="w-4 h-4 mr-1.5" /> View Details
                </Button>
              }
            />
            <DetailsDialog meeting={m} isSuperAdmin={isSuperAdmin} />
          </Dialog>

          {/* Rule 3: Mark Attendance */}
          <Dialog>
            <DialogTrigger
              render={
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                  <CheckSquare className="w-4 h-4 mr-1.5" /> Mark Attendance
                </Button>
              }
            />
            <DialogContent className="max-w-2xl bg-white dark:bg-slate-950 rounded-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  Attendance — {m.title}
                  {m.attendanceLocked && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                      <Lock className="h-3 w-3" /> Locked
                    </span>
                  )}
                </DialogTitle>
              </DialogHeader>
              {canEdit ? (
                <AttendancePanel
                  meetingId={m.id}
                  members={m.members}
                  existing={m.attendances}
                  locked={false}
                  canEdit={true}
                />
              ) : (
                <AttendancePanel
                  meetingId={m.id}
                  members={m.members}
                  existing={m.attendances}
                  locked={true}
                  canEdit={false}
                />
              )}
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  )
}

function DetailsDialog({
  meeting: m,
  isSuperAdmin,
}: {
  meeting: MeetingSerialized
  isSuperAdmin: boolean
}) {
  return (
    <DialogContent className="max-w-2xl bg-white dark:bg-slate-950 rounded-2xl">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {m.title}
          <TypeBadge type={m.type} />
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4 text-sm">
        <div className="flex flex-wrap gap-4 text-slate-600 dark:text-slate-300">
          <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-slate-400" /> {new Date(m.date).toLocaleString()}</span>
          {m.type === "ONLINE" ? (
            <span className="flex items-center gap-1.5 min-w-0">
              <Link2 className="h-4 w-4 text-slate-400" />
              <a href={m.link ?? "#"} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline truncate">{m.link}</a>
            </span>
          ) : (
            <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-slate-400" /> {m.location}</span>
          )}
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg text-slate-600 dark:text-slate-300">
          <span className="font-bold flex items-center gap-1.5 mb-1"><ClipboardList className="h-4 w-4" /> Agenda:</span>
          {m.agenda || "—"}
        </div>

        {/* Attendance summary */}
        <AttendanceSummary attendances={m.attendances} />

        {/* Rule 6: Meeting Minutes */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold flex items-center gap-1.5"><FileText className="h-4 w-4" /> Meeting Minutes</span>
            {m.minutesLocked && !isSuperAdmin && (
              <span className="inline-flex items-center gap-1 text-xs text-amber-600"><Lock className="h-3 w-3" /> Locked</span>
            )}
          </div>
          {m.minutesUrl ? (
            <div className="flex items-center justify-between gap-2">
              <a href={m.minutesUrl} target="_blank" rel="noreferrer" className="text-sm text-indigo-600 hover:underline truncate flex items-center gap-1.5">
                <FileText className="h-4 w-4" /> {m.minutesFileName ?? "Download"}
              </a>
              {isSuperAdmin && <MinutesUploadButton meetingId={m.id} replace label="Replace" />}
            </div>
          ) : (
            <MinutesUploadButton meetingId={m.id} replace={false} label="Upload Minutes" />
          )}
        </div>
      </div>
    </DialogContent>
  )
}

function AttendanceSummary({ attendances }: { attendances: Attendance[] }) {
  const present = attendances.filter((a) => a.status === "PRESENT").length
  const excused = attendances.filter((a) => a.status === "EXCUSED").length
  const absent = attendances.filter((a) => a.status === "ABSENT").length
  return (
    <div className="grid grid-cols-3 gap-2 text-center">
      <SummaryPill label="Present" value={present} tone="emerald" />
      <SummaryPill label="Excused" value={excused} tone="amber" />
      <SummaryPill label="Absent" value={absent} tone="red" />
    </div>
  )
}

function SummaryPill({ label, value, tone }: { label: string; value: number; tone: "emerald" | "amber" | "red" }) {
  const tones: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    red: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  }
  return (
    <div className={`rounded-lg py-2 ${tones[tone]}`}>
      <p className="text-lg font-bold leading-none">{value}</p>
      <p className="text-[11px] mt-1">{label}</p>
    </div>
  )
}

// ── Super Admin: Permissions panel (rules 5 & 6) ──────────────────────────────

function PermissionsPanel({ adminUsers }: { adminUsers: AdminUser[] }) {
  return (
    <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Shield className="h-4 w-4" /> Authorized Users</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-slate-500 mb-3">
 Grant these so normal admins can submit attendance or upload minutes once. After submission the record locks; only you can edit.
        </p>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {adminUsers.map((u) => (
            <div key={u.id} className="flex items-center justify-between py-2 gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{u.email}</p>
                <p className="text-[11px] text-slate-400">
                  {u.role === "SUPER_ADMIN" ? "Super Admin — full access" : "Admin"}
                </p>
              </div>
              {u.role === "SUPER_ADMIN" ? (
                <span className="text-[11px] text-slate-400 italic">No restrictions</span>
              ) : (
                <div className="flex items-center gap-4">
                  <PermissionToggle
                    userId={u.id}
                    permission="MEETING_ATTENDANCE_MARK"
                    label="Mark Attendance"
                    granted={u.canMarkAttendance}
                  />
                  <PermissionToggle
                    userId={u.id}
                    permission="MEETING_MINUTES_UPLOAD"
                    label="Upload Minutes"
                    granted={u.canUploadMinutes}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
