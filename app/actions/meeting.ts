"use server"

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { sendEmail } from "@/lib/email"
import { sendSMS } from "@/lib/sms"

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
    where: { status: "ACTIVE", NOT: { phone: null } },
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