"use server"

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import bcrypt from "bcryptjs"

export async function changePassword(memberId: string, formData: FormData) {
  const currentPassword = formData.get("currentPassword") as string
  const newPassword = formData.get("newPassword") as string

  if (!currentPassword || !newPassword || newPassword.length < 6) {
    return { error: "New password must be at least 6 characters long." }
  }

  const account = await prisma.memberAccount.findUnique({ where: { memberId } })

  if (!account) {
    return { error: "Account not found." }
  }

  const passwordMatch = await bcrypt.compare(currentPassword, account.passwordHash)
  if (!passwordMatch) {
    return { error: "Your current password is incorrect." }
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10)

  await prisma.memberAccount.update({
    where: { memberId },
    data: { passwordHash: hashedPassword },
  })

  revalidatePath("/portal/settings")
  return { success: "Password updated successfully!" }
}

export async function submitWithdrawalRequest(memberId: string, formData: FormData) {
  const amount = parseFloat(formData.get("amount") as string)
  const method = formData.get("method") as string
  const notes = (formData.get("notes") as string) || null

  if (!amount || amount <= 0) {
    return { error: "Please enter a valid amount." }
  }

  await prisma.memberRequest.create({
    data: {
      memberId,
      type: "WITHDRAWAL",
      amount,
      method,
      notes,
      status: "PENDING",
    },
  })

  revalidatePath("/portal/savings")
  redirect("/portal/savings")
}

export async function submitClosingRequest(memberId: string, formData: FormData) {
  const reason = (formData.get("reason") as string) || null

  // Check if there's already a pending closing request
  const existing = await prisma.memberRequest.findFirst({
    where: { memberId, type: "CLOSING", status: "PENDING" }
  })

  if (existing) {
    return { error: "You already have a pending account closing request." }
  }

  await prisma.memberRequest.create({
    data: {
      memberId,
      type: "CLOSING",
      reason,
      status: "PENDING",
    },
  })

  revalidatePath("/portal/settings")
  redirect("/portal/settings")
}