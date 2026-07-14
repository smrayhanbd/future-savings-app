"use server"

import prisma from "@/lib/prisma"
import { Resend } from "resend"
import bcrypt from "bcryptjs"
import { randomBytes } from "crypto"
import { redirect } from "next/navigation"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function requestPasswordReset(formData: FormData) {
  const email = formData.get("email") as string

  // 1. Check if user exists (Admin or Member)
  const admin = await prisma.user.findUnique({ where: { email } })
  const member = await prisma.member.findFirst({ where: { email } })

  if (!admin && !member) {
    // For security, don't reveal if email exists or not. Just redirect.
    redirect("/forgot-password?status=sent")
  }

  // 2. Generate Secure Token
  const token = randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + 3600000) // Expires in 1 hour

  // 3. Save token to database (delete old ones for this email first)
  await prisma.passwordReset.deleteMany({ where: { email } })
  await prisma.passwordReset.create({
    data: { email, token, expiresAt }
  })

  // 4. Send Email with Reset Link
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
  const resetUrl = `${baseUrl}/reset-password?token=${token}`

  // Log URL in development so you can test it without the real email
  if (process.env.NODE_ENV === "development") {
    console.log("--------------------------------------------------")
    console.log("PASSWORD RESET URL (DEV ONLY):")
    console.log(resetUrl)
    console.log("--------------------------------------------------")
  }

  try {
    await resend.emails.send({
      from: "Future Savings Foundation <onboarding@resend.dev>",
      to: email,
      subject: "Password Reset Request",
      html: `<p>You requested a password reset.</p><p>Click <a href="${resetUrl}">here</a> to reset your password. This link will expire in 1 hour.</p><p>If you did not request this, please ignore this email.</p>`
    })
  } catch (error) {
    console.error("Failed to send reset email:", error)
  }

  redirect("/forgot-password?status=sent")
}

export async function resetPassword(formData: FormData) {
  const token = formData.get("token") as string
  const password = formData.get("password") as string

  if (!token || !password || password.length < 6) {
    throw new Error("Invalid input. Password must be at least 6 characters.")
  }

  // 1. Verify Token
  const resetEntry = await prisma.passwordReset.findUnique({ where: { token } })

  if (!resetEntry || resetEntry.expiresAt < new Date()) {
    throw new Error("Invalid or expired token.")
  }

  // 2. Hash New Password
  const hashedPassword = await bcrypt.hash(password, 10)

  // 3. Update User or Member Account
  const admin = await prisma.user.findUnique({ where: { email: resetEntry.email } })
  if (admin) {
    await prisma.user.update({ where: { id: admin.id }, data: { password: hashedPassword } })
  } else {
    const member = await prisma.member.findFirst({ where: { email: resetEntry.email } })
    if (member) {
      await prisma.memberAccount.updateMany({ 
        where: { memberId: member.id }, 
        data: { passwordHash: hashedPassword } 
      })
    }
  }

  // 4. Delete used token
  await prisma.passwordReset.delete({ where: { id: resetEntry.id } })

  redirect("/login?status=reset")
}