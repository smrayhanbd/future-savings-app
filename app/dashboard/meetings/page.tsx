import prisma from "@/lib/prisma"
import { createMeeting } from "@/app/actions/meeting"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { CalendarDays, MapPin, ClipboardList } from "lucide-react"

export const dynamic = 'force-dynamic'

export default async function MeetingsPage() {
  const meetings = await prisma.meeting.findMany({
    orderBy: { date: "desc" },
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Meeting Management</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Declare meetings and notify all members via SMS and Email.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Declare Meeting Form */}
        <Card className="lg:col-span-1 bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800">
          <CardHeader><CardTitle>Declare New Meeting</CardTitle></CardHeader>
          <CardContent>
            <form action={createMeeting} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Meeting Title *</Label>
                <Input id="title" name="title" required placeholder="Monthly General Meeting" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date & Time *</Label>
                <Input id="date" name="date" type="datetime-local" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Input id="location" name="location" required placeholder="Foundation Office, Room 101" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agenda">Agenda</Label>
                <Textarea id="agenda" name="agenda" rows={4} placeholder="Discuss monthly savings and upcoming projects..." />
              </div>
              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700">Declare & Notify Members</Button>
            </form>
          </CardContent>
        </Card>

        {/* Meetings List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Upcoming & Past Meetings</h2>
          {meetings.length === 0 ? (
            <Card className="bg-white dark:bg-slate-900 border-dashed border-slate-300 dark:border-slate-700">
              <CardContent className="py-12 text-center text-slate-500">No meetings declared yet.</CardContent>
            </Card>
          ) : (
            meetings.map((m) => (
              <Card key={m.id} className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mb-2">{m.title}</h3>
                  <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-300 mb-4">
                    <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-slate-400" /> {new Date(m.date).toLocaleString()}</span>
                    <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-slate-400" /> {m.location}</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg text-sm text-slate-600 dark:text-slate-300">
                    <span className="font-bold flex items-center gap-1.5 mb-1"><ClipboardList className="h-4 w-4" /> Agenda:</span>
                    {m.agenda}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}