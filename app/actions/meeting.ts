"use server"

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { sendEmail } from "@/lib/email"
import { sendSMS } from "@/lib/sms"
import { recalculateTrustScore } from "@/lib/trustScore"

export async function createMeeting(formData: FormData) {
  const title = formData.get("title") as string
  const dateStr = formData.get("date") as string
  const location = formData.get("location") as string
  const agenda = formData.get("agenda") as string

  if (!title || !dateStr || !location) {
    throw new Error("Title, Date, and Location are required.")
  }

  const date = new Date(dateStr)

  // 1. Save Meeting to Database
  await prisma.meeting.create({
    data: { title, date, location, agenda },
  })

  // 2. Fetch all active members to notify them
  const members = await prisma.member.findMany({
    where: { status: "ACTIVE", phone: { not: "" } },
    select: { phone: true, email: true, fullName: true }
  })

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
  const msg = `Notice: ${title} on ${date.toLocaleDateString()} at ${location}. Agenda: ${agenda.substring(0, 50)}... Please attend. - Future Savings Foundation`

  // 3. Send SMS and Email to each member
  for (const member of members) {
    if (member.phone) {
      try {
        await sendSMS(member.phone, msg)
      } catch (err) {
        console.error(`SMS failed for ${member.phone}`)
      }
    }
    if (member.email) {
      try {
        await sendEmail(
          member.email,
          `Meeting Notice: ${title}`,
          `<p>Dear ${member.fullName},</p><p>A meeting has been scheduled:</p><p><strong>Title:</strong> ${title}<br/><strong>Date:</strong> ${date.toLocaleString()}<br/><strong>Location:</strong> ${location}</p><p><strong>Agenda:</strong> ${agenda}</p>`
        )
      } catch (err) {
        console.error(`Email failed for ${member.email}`)
      }
    }
  }

  revalidatePath("/dashboard/meetings")
  redirect("/dashboard/meetings")
}

// =====================================================================
// MEETING ATTENDANCE (FRS §5.4, §8.3)
// Marks each member PRESENT / ABSENT / EXCUSED for a meeting, then fires a
// Trust Score recalc per affected member so the ATTEND KPI updates live.
// =====================================================================

export interface AttendanceRow {
  memberId: string
  status: "PRESENT" | "ABSENT" | "EXCUSED"
}

export async function markAttendance(meetingId: string, rows: AttendanceRow[], markedBy?: string) {
  if (!meetingId || !rows.length) return

  // Upsert each attendance row (compound unique [meetingId, memberId]).
  await Promise.all(
    rows.map((row) =>
      prisma.meetingAttendance.upsert({
        where: { meetingId_memberId: { meetingId, memberId: row.memberId } },
        create: { meetingId, memberId: row.memberId, status: row.status, markedBy },
        update: { status: row.status, markedBy, markedAt: new Date() },
      })
    )
  )

  // Recalculate the ATTEND KPI for every affected member (non-blocking).
  const memberIds = Array.from(new Set(rows.map((r) => r.memberId)))
  for (const memberId of memberIds) {
    try {
      await recalculateTrustScore(memberId, "MEETING_ATTENDANCE_MARKED", {
        referenceId: meetingId,
        referenceType: "meeting",
      })
    } catch (e) {
      console.error(`[trustScore] attendance recalc failed for ${memberId}:`, e)
    }
  }

  revalidatePath("/dashboard/meetings")
}