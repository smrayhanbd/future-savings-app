"use server"

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { recalculateTrustScore } from "@/lib/trustScore"

export async function addSavings(memberId: string, formData: FormData) {
  const amount = parseFloat(formData.get("amount") as string)
  const type = formData.get("type") as string
  const method = formData.get("method") as string

  const savings = await prisma.savings.create({
    data: {
      memberId,
      amount,
      type,
      method,
      date: new Date(),
    },
  })

  // Trust Score event hook (FRS §8.1). Before redirect(); never block on error.
  try {
    const eventType = type === "FINE" ? "FINE_ISSUED" : "DEPOSIT_COLLECTED"
    await recalculateTrustScore(memberId, eventType, {
      referenceId: savings.id,
      referenceType: type === "FINE" ? "fine" : "deposit",
    })
  } catch (e) {
    console.error("[trustScore] addSavings hook failed:", e)
  }

  revalidatePath(`/dashboard/members/${memberId}`)
  redirect(`/dashboard/members/${memberId}`)
}