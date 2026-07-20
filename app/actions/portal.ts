"use server"

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import bcrypt from "bcryptjs"
import { Prisma } from "@prisma/client"
import { generateSchedule, expectedCloseFromSchedule, type InterestType, type RepaymentFreq } from "@/lib/loanSchedule"
import { uploadImage } from "@/lib/cloudinary"

export interface PortalNotificationItem {
  id: string
  type: "due" | "meeting" | "request" | "info"
  title: string
  message: string
  href?: string
  createdAt?: string
}

// Generate the next sequential loan number like L0001.
async function nextLoanNo(): Promise<string> {
  const count = await prisma.loan.count()
  return `L${String(count + 1).padStart(4, "0")}`
}

export async function changePassword(memberId: string, formData: FormData) {
  const currentPassword = formData.get("currentPassword") as string
  const newPassword = formData.get("newPassword") as string

  if (!currentPassword || !newPassword || newPassword.length < 6) {
    return { error: "New password must be at least 6 characters long." }
  }

  const account = await prisma.memberAccount.findFirst({ where: { memberId } })

  if (!account) {
    return { error: "Account not found." }
  }

  const passwordMatch = await bcrypt.compare(currentPassword, account.passwordHash)
  if (!passwordMatch) {
    return { error: "Your current password is incorrect." }
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10)

  await prisma.memberAccount.update({
    where: { id: account.id },
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

export async function submitProfileUpdateRequest(memberId: string, formData: FormData) {
  const payload: Record<string, string> = {}
  
  // Compare current data with submitted data to build a payload of changes
  const fields = ["firstName", "lastName", "phone", "email", "fatherName", "motherName", "spouseName", "occupation", "profession"]
  
  fields.forEach(field => {
    const value = formData.get(field) as string
    if (value) {
      payload[field] = value
    }
  })

  if (Object.keys(payload).length === 0) {
    return { error: "No changes detected to request." }
  }

  await prisma.profileUpdateRequest.create({
    data: {
      memberId,
      payload: payload,
      status: "PENDING",
    },
  })

  revalidatePath("/portal/profile")
  return { success: "Profile update request submitted to admin!" }
}

// =====================================================================
// MEMBER LOAN APPLICATION
// Creates a PENDING loan (with full schedule) for admin approval.
// Mirrors the admin buildLoan flow but is restricted to the signed-in member.
// =====================================================================
export async function applyMemberLoan(memberId: string, formData: FormData) {
  const member = await prisma.member.findUnique({ where: { id: memberId } })
  if (!member) throw new Error("Member not found.")
  if (member.status !== "ACTIVE") {
    throw new Error("Only active members can apply for loans.")
  }

  const productId = (formData.get("productId") as string)?.trim()
  if (!productId) throw new Error("Please select a loan product.")

  const product = await prisma.loanProduct.findUnique({ where: { id: productId } })
  if (!product) throw new Error("Loan product not found.")
  if (!product.isActive) throw new Error("Selected loan product is no longer available.")

  const principal = parseFloat((formData.get("principal") as string) || "0")
  if (!Number.isFinite(principal) || principal <= 0) {
    throw new Error("Please enter a valid principal amount.")
  }
  if (Number(product.minAmount) > 0 && principal < Number(product.minAmount)) {
    throw new Error(`Amount is below this product's minimum (৳ ${Number(product.minAmount).toLocaleString()}).`)
  }
  if (Number(product.maxAmount) > 0 && principal > Number(product.maxAmount)) {
    throw new Error(`Amount exceeds this product's maximum (৳ ${Number(product.maxAmount).toLocaleString()}).`)
  }

  // Allow member to override rate/tenure within the product's defaults; fall back to product values.
  const rate =
    parseFloat((formData.get("interestRate") as string) || "") || Number(product.interestRate)
  const installments =
    parseInt((formData.get("numberOfInstallments") as string) || "0", 10) || product.numberOfInstallments
  const interestType = (product.interestType as InterestType)
  const freq = (product.repaymentFreq as RepaymentFreq)
  const grace = product.gracePeriod ?? 0
  const purpose = ((formData.get("purpose") as string) || "").trim() || null
  const notes = ((formData.get("notes") as string) || "").trim() || null

  const disburseDate = new Date()

  const schedule = generateSchedule({
    principal,
    annualRate: rate,
    interestType,
    repaymentFreq: freq,
    numberOfInstallments: installments,
    disburseDate,
    gracePeriod: grace,
  })

  const loanNo = await nextLoanNo()
  const closeDate = expectedCloseFromSchedule(schedule.rows)

  // Optional guarantors posted as a JSON array from the client form.
  let guarantors: { name: string; relation?: string; phone?: string; nidNumber?: string; address?: string }[] = []
  const guarantorJson = formData.get("guarantors") as string
  if (guarantorJson) {
    try {
      guarantors = JSON.parse(guarantorJson)
    } catch {
      guarantors = []
    }
  }

  await prisma.loan.create({
    data: {
      loanNo,
      memberId,
      productId,
      principal,
      interestRate: rate,
      interestType,
      repaymentFreq: freq,
      numberOfInstallments: installments,
      totalInterest: schedule.totalInterest,
      totalPayable: schedule.totalPayable,
      installmentAmount: schedule.installmentAmount,
      processingFee: product.processingFee,
      gracePeriod: grace,
      lateFinePerDay: product.lateFinePerDay,
      applicationDate: disburseDate,
      status: "PENDING",
      purpose,
      notes,
      expectedCloseDate: closeDate,
      outstandingBalance: 0,
      schedule: {
        create: schedule.rows.map((row) => ({
          installmentNo: row.installmentNo,
          dueDate: row.dueDate,
          principal: row.principal,
          interest: row.interest,
          installmentAmount: row.installmentAmount,
          balanceAfter: row.balanceAfter,
        })),
      },
      guarantors: guarantors.filter((g) => g.name?.trim()).length
        ? {
            create: guarantors
              .filter((g) => g.name?.trim())
              .map((g) => ({
                name: g.name.trim(),
                relation: g.relation?.trim() || null,
                phone: g.phone?.trim() || null,
                nidNumber: g.nidNumber?.trim() || null,
                address: g.address?.trim() || null,
              })),
          }
        : undefined,
    },
  })

  revalidatePath("/portal/loans")
  revalidatePath("/portal/requests")
  redirect("/portal/loans")
}

// =====================================================================
// PROFILE PHOTO REQUEST
// Uploads the photo to Cloudinary and stores the URL in a pending
// ProfileUpdateRequest for admin approval.
// =====================================================================
export async function submitProfilePhotoRequest(memberId: string, file: File) {
  if (!file) return { error: "No file selected." }
  if (file.size > 5 * 1024 * 1024) return { error: "Image must be under 5 MB." }
  if (!file.type.startsWith("image/")) return { error: "Please upload an image file." }

  const photoUrl = await uploadImage(file)
  if (!photoUrl) return { error: "Failed to upload image. Please try again." }

  await prisma.profileUpdateRequest.create({
    data: {
      memberId,
      payload: { photoUrl } as Prisma.InputJsonValue,
      status: "PENDING",
    },
  })

  revalidatePath("/portal/profile")
  return { success: "Photo submitted! It will appear once an admin approves it." }
}

// =====================================================================
// COMPUTED NOTIFICATIONS
// Pulled live from data: upcoming meetings, overdue dues, recently
// resolved requests. No dedicated table required.
// =====================================================================
export async function getMemberNotifications(memberId: string): Promise<PortalNotificationItem[]> {
  const out: PortalNotificationItem[] = []

  // 1. Upcoming meetings (next 7 days).
  const now = new Date()
  const in7 = new Date()
  in7.setDate(in7.getDate() + 7)
  const meetings = await prisma.meeting.findMany({
    where: { date: { gte: now, lte: in7 } },
    orderBy: { date: "asc" },
    take: 3,
  })
  meetings.forEach((m) => {
    out.push({
      id: `meeting-${m.id}`,
      type: "meeting",
      title: m.title,
      message: `Upcoming on ${new Date(m.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} at ${m.location || "TBD"}`,
      href: "/portal",
      createdAt: m.createdAt.toISOString(),
    })
  })

  // 2. Overdue dues (any fee with an open balance).
  try {
    const [member, feeSetups] = await Promise.all([
      prisma.member.findUnique({
        where: { id: memberId },
        include: { savings: true },
      }),
      prisma.feeSetup.findMany(),
    ])
    if (member) {
      const { calculateDues } = await import("@/lib/dueCalculator")
      const joinDate = member.membershipDate || member.createdAt
      const dues = calculateDues(member.id, joinDate, feeSetups, member.savings)
      if (Number(dues.totalDue) > 0) {
        out.push({
          id: `due-${member.id}`,
          type: "due",
          title: "Outstanding Dues",
          message: `You have ৳ ${Number(dues.totalDue).toLocaleString()} in outstanding dues. Please clear them soon.`,
          href: "/portal/savings",
        })
      }
    }
  } catch {
    // due calculation is best-effort; never block the portal over it.
  }

  // 3. Recently resolved requests (last 14 days).
  const since = new Date()
  since.setDate(since.getDate() - 14)
  const [resolvedRequests, resolvedProfile] = await Promise.all([
    prisma.memberRequest.findMany({
      where: { memberId, status: { in: ["APPROVED", "REJECTED"] }, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    prisma.profileUpdateRequest.findMany({
      where: { memberId, status: { in: ["APPROVED", "REJECTED"] }, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 2,
    }),
  ])
  resolvedRequests.forEach((r) => {
    const kind = r.type === "WITHDRAWAL" ? "Withdrawal" : "Account closure"
    out.push({
      id: `req-${r.id}`,
      type: r.status === "APPROVED" ? "request" : "info",
      title: `${kind} ${r.status.charAt(0) + r.status.slice(1).toLowerCase()}`,
      message:
        r.status === "APPROVED"
          ? `Your ${kind.toLowerCase()} request was approved.`
          : `Your ${kind.toLowerCase()} request was rejected. Contact management for details.`,
      href: "/portal/requests",
      createdAt: r.createdAt.toISOString(),
    })
  })
  resolvedProfile.forEach((r) => {
    out.push({
      id: `profile-${r.id}`,
      type: r.status === "APPROVED" ? "request" : "info",
      title: `Profile update ${r.status.charAt(0) + r.status.slice(1).toLowerCase()}`,
      message:
        r.status === "APPROVED"
          ? "Your profile update request was approved."
          : "Your profile update request was rejected.",
      href: "/portal/requests",
      createdAt: r.createdAt.toISOString(),
    })
  })

  // 4. Trust Score notifications (FRS §14) — score changes, badge awards,
  // suspensions, etc. Surface the most recent few from the persistent table.
  try {
    const scoreNotes = await prisma.memberNotification.findMany({
      where: { memberId },
      orderBy: { createdAt: "desc" },
      take: 4,
    })
    scoreNotes.forEach((n: { id: string; type: string; title: string; message: string; createdAt: Date }) => {
      const tone =
        n.type === "SCORE_INCREASED" ||
        n.type === "ACHIEVEMENT_EARNED" ||
        n.type === "BADGE_UPGRADED" ||
        n.type === "REACTIVATED"
          ? "request"
          : n.type === "AUTO_SUSPENDED" ||
            n.type === "ACHIEVEMENT_LOST" ||
            n.type === "BADGE_DOWNGRADED"
          ? "due"
          : "info"
      out.push({
        id: `score-${n.id}`,
        type: tone as "due" | "meeting" | "request" | "info",
        title: n.title,
        message: n.message,
        href: "/portal/trust-score",
        createdAt: n.createdAt.toISOString(),
      })
    })
  } catch {
    // best-effort; never block the portal over it.
  }

  // Most relevant first; cap at 8.
  return out.slice(0, 8)
}

// Count of pending member-side requests, used to badge the "My Requests" nav item.
export async function getMemberPendingRequestCount(memberId: string): Promise<number> {
  const [member, profile] = await Promise.all([
    prisma.memberRequest.count({ where: { memberId, status: "PENDING" } }),
    prisma.profileUpdateRequest.count({ where: { memberId, status: "PENDING" } }),
  ])
  return member + profile
}

// =====================================================================
// ADMIN COMPANION: Approve / reject a ProfileUpdateRequest.
// Applies every whitelisted field in the payload to the member, including
// photoUrl (so the member photo-upload flow is end-to-end functional).
// These are intended to be wired into the admin approvals UI; they are
// safe, guarded, and idempotent.
// =====================================================================
const PROFILE_PAYLOAD_FIELDS: Record<string, string> = {
  firstName: "firstName",
  lastName: "lastName",
  phone: "phone",
  email: "email",
  fatherName: "fatherName",
  motherName: "motherName",
  spouseName: "spouseName",
  occupation: "occupation",
  profession: "profession",
  photoUrl: "photoUrl",
}

export async function approveProfileUpdateRequest(requestId: string) {
  const req = await prisma.profileUpdateRequest.findUnique({ where: { id: requestId } })
  if (!req) throw new Error("Request not found.")
  if (req.status !== "PENDING") throw new Error("This request has already been processed.")

  const payload = (req.payload || {}) as Record<string, unknown>
  const data: Record<string, unknown> = {}
  for (const [key, memberField] of Object.entries(PROFILE_PAYLOAD_FIELDS)) {
    const v = payload[key]
    if (typeof v === "string" && v.trim()) data[memberField] = v.trim()
  }

  // Recompute fullName if the name parts changed.
  if (data.firstName || data.lastName) {
    const member = await prisma.member.findUnique({ where: { id: req.memberId } })
    if (member) {
      const fn = (data.firstName as string) || member.firstName
      const ln = (data.lastName as string) || member.lastName
      data.fullName = `${fn} ${ln}`.trim()
    }
  }

  if (Object.keys(data).length > 0) {
    await prisma.member.update({ where: { id: req.memberId }, data })
  }
  await prisma.profileUpdateRequest.update({ where: { id: requestId }, data: { status: "APPROVED" } })

  revalidatePath(`/dashboard/members/${req.memberId}`)
  revalidatePath("/portal/profile")
}

export async function rejectProfileUpdateRequest(requestId: string) {
  const req = await prisma.profileUpdateRequest.findUnique({ where: { id: requestId } })
  if (!req) throw new Error("Request not found.")
  if (req.status !== "PENDING") throw new Error("This request has already been processed.")

  await prisma.profileUpdateRequest.update({ where: { id: requestId }, data: { status: "REJECTED" } })
  revalidatePath("/portal/profile")
}

// ---------------------------------------------------------------------------
// Withdrawal / Account-closure requests (MemberRequest table)
// Approval here marks the request; the actual money movement is created as a
// Transaction through the Transactions Module for proper Maker-Checker control.
// ---------------------------------------------------------------------------
export async function approveMemberRequest(
  requestId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const req = await prisma.memberRequest.findUnique({ where: { id: requestId } })
    if (!req) return { ok: false, error: "Request not found." }
    if (req.status !== "PENDING")
      return { ok: false, error: "This request has already been processed." }

    await prisma.memberRequest.update({
      where: { id: requestId },
      data: { status: "APPROVED" },
    })
    revalidatePath("/dashboard/transaction-approvals")
    revalidatePath("/portal/requests")
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

export async function rejectMemberRequest(
  requestId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const req = await prisma.memberRequest.findUnique({ where: { id: requestId } })
    if (!req) return { ok: false, error: "Request not found." }
    if (req.status !== "PENDING")
      return { ok: false, error: "This request has already been processed." }

    await prisma.memberRequest.update({
      where: { id: requestId },
      data: { status: "REJECTED" },
    })
    revalidatePath("/dashboard/transaction-approvals")
    revalidatePath("/portal/requests")
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}
