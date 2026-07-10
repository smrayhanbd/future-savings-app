"use server"

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function addSavings(memberId: string, formData: FormData) {
  const amount = parseFloat(formData.get("amount") as string)
  const type = formData.get("type") as string
  const method = formData.get("method") as string

  await prisma.savings.create({
    data: {
      memberId,
      amount,
      type,
      method,
      date: new Date(),
    },
  })

  revalidatePath(`/dashboard/members/${memberId}`)
  redirect(`/dashboard/members/${memberId}`)
}