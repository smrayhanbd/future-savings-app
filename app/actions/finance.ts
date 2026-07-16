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
// --- Charge Type Action ---
export async function createChargeType(formData: FormData) {
  const name = formData.get("name") as string
  if (!name) throw new Error("Name is required")

  await prisma.chargeType.create({
    data: { name }
  })

  revalidatePath("/dashboard/collection-setup")
  redirect("/dashboard/collection-setup")
}

// --- Updated Fee Setup Action ---
export async function createFeeSetup(formData: FormData) {
  const chargeTypeId = formData.get("name") as string
  const amount = parseFloat(formData.get("amount") as string)
  const effectiveDate = new Date(formData.get("effectiveDate") as string)
  const frequency = formData.get("frequency") as string
  const dueDay = parseInt(formData.get("dueDay") as string)
  
  // Updated to check for "YES" instead of "on"
  const hasFine = formData.get("hasFine") === "YES"
  const fineAmount = parseFloat(formData.get("fineAmount") as string) || 0
  
  // Removed boardApproved

  if (!chargeTypeId || !amount || !effectiveDate || !dueDay) {
    throw new Error("All fields marked with * are required.")
  }

  const chargeType = await prisma.chargeType.findUnique({ where: { id: chargeTypeId } })
  const chargeName = chargeType?.name || "Unknown Charge"

  await prisma.feeSetup.create({
    data: {
      name: chargeName,
      amount,
      effectiveDate,
      frequency,
      dueDay,
      hasFine,
      fineAmount: hasFine ? fineAmount : null,
      // boardApproved is removed, defaults to false in schema
      boardApproved: false, 
    },
  })

  revalidatePath("/dashboard/collection-setup")
  redirect("/dashboard/collection-setup")
}

import { sendEmail } from "@/lib/email"
import { sendSMS } from "@/lib/sms"
import { calculateDues } from "@/lib/dueCalculator"

export async function sendDueReminders() {
  const feeSetups = await prisma.feeSetup.findMany()
  const members = await prisma.member.findMany({
    where: { status: "ACTIVE" },
    include: { savings: true },
  })

  let smsCount = 0
  let emailCount = 0
  let failedCount = 0

  for (const member of members) {
    const dues = calculateDues(member.membershipDate || member.createdAt, feeSetups, member.savings)
    
    if (dues.totalDue > 0) {
      const msg = `Dear ${member.fullName}, your due balance is ৳ ${dues.totalDue.toLocaleString()}. Please clear your dues ASAP. - Future Savings Foundation`
      
      if (member.phone) {
        try {
          const smsRes = await sendSMS(member.phone, msg)
          if (smsRes.status === "OK") smsCount++
          else failedCount++
        } catch { failedCount++ }
      }
      
      if (member.email) {
        try {
          await sendEmail(
            member.email,
            "Payment Reminder - Future Savings Foundation",
            `<p>Dear ${member.fullName},</p><p>This is a gentle reminder that you have an outstanding due balance of <strong>৳ ${dues.totalDue.toLocaleString()}</strong>.</p><p>Please visit the office or your member portal to clear your dues.</p>`
          )
          emailCount++
        } catch { failedCount++ }
      }
    }
  }

  revalidatePath("/dashboard/due-list")
  return { success: true, smsCount, emailCount, failedCount }
}