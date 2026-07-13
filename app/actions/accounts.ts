"use server"

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function createAccount(formData: FormData) {
  const accountCode = formData.get("accountCode") as string
  const accountName = formData.get("accountName") as string
  const parentAccountId = (formData.get("parentAccountId") as string) || null
  const accountType = formData.get("accountType") as string
  const category = (formData.get("category") as string) || null
  const nature = formData.get("nature") as string
  const openingBalance = parseFloat(formData.get("openingBalance") as string) || 0
  const currency = (formData.get("currency") as string) || "BDT"
  const description = (formData.get("description") as string) || null
  
  const isBank = formData.get("isBank") === "on"
  const isCash = formData.get("isCash") === "on"
  const allowPosting = formData.get("allowPosting") === "on"
  const allowJournal = formData.get("allowJournal") === "on"
  const status = formData.get("status") as string

  // Basic validation to prevent duplicates
  const exists = await prisma.account.findUnique({ where: { accountCode } })
  if (exists) {
    throw new Error("Account Code already exists!")
  }

  await prisma.account.create({
    data: {
      accountCode, accountName, parentAccountId, accountType: accountType as any,
      category, nature: nature as any, openingBalance, currentBalance: openingBalance,
      currency, description, isBank, isCash, allowPosting, allowJournal, status: status as any,
    }
  })

  revalidatePath("/dashboard/accounts")
  redirect("/dashboard/accounts")
}

export async function deleteAccount(accountId: string) {
  // In a real ERP, we'd check for transactions here before deleting
  await prisma.account.delete({ where: { id: accountId } })
  revalidatePath("/dashboard/accounts")
}