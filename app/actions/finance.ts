"use server"

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function addCollection(formData: FormData) {
  const memberId = formData.get("memberId") as string
  const amount = parseFloat(formData.get("amount") as string)
  const type = formData.get("type") as string
  const method = formData.get("method") as string
  const date = formData.get("date") as string

  if (!memberId || !amount || !type || !method) {
    throw new Error("All fields are required")
  }

  // Generate Receipt Number (e.g., R0001)
  const collectionCount = await prisma.savings.count()
  const receiptNo = `R${String(collectionCount + 1).padStart(4, "0")}`

  await prisma.savings.create({
    data: {
      receiptNo,
      memberId,
      amount,
      type,
      method,
      date: new Date(date),
    },
  })

  revalidatePath("/dashboard/collection-entry")
  redirect("/dashboard/collection-entry")
}

export async function addWithdrawal(formData: FormData) {
  const memberId = formData.get("memberId") as string
  const amount = parseFloat(formData.get("amount") as string)
  const method = formData.get("method") as string
  const date = formData.get("date") as string
  const referenceNo = (formData.get("referenceNo") as string) || null

  if (!memberId || !amount || amount <= 0) {
    throw new Error("Invalid withdrawal data")
  }

  // Generate Voucher Number (e.g., W0001)
  const withdrawalCount = await prisma.savings.count({ where: { type: "WITHDRAWAL" } })
  const voucherNo = `W${String(withdrawalCount + 1).padStart(4, "0")}`

  await prisma.savings.create({
    data: {
      receiptNo: voucherNo, // Reusing receiptNo field for Voucher No
      memberId,
      amount,
      type: "WITHDRAWAL",
      method,
      date: new Date(date),
    },
  })

  revalidatePath("/dashboard/deposits")
  redirect("/dashboard/deposits")
}