"use server"

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function approveMember(memberId: string) {
  const member = await prisma.member.update({
    where: { id: memberId },
    data: { status: "ACTIVE" },
  })

  // Send Welcome Email
  if (member.email) {
    try {
      await resend.emails.send({
        from: "Future Savings Foundation <onboarding@resend.dev>", // Use your verified domain later
        to: member.email,
        subject: "Membership Approved!",
        html: `<p>Dear ${member.fullName},</p><p>Congratulations! Your membership has been approved by the management.</p><p>Your Member ID is: <strong>${member.memberNo}</strong></p>`
      })
    } catch (error) {
      console.error("Failed to send email:", error)
    }
  }

  // TODO: Add SMS API integration here later

  revalidatePath("/dashboard/approvals")
}