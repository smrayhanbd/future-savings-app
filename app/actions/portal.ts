"use server"

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import bcrypt from "bcryptjs"
import { Prisma, Gender, MaritalStatus, BloodGroup } from "@prisma/client"
import { generateSchedule, expectedCloseFromSchedule, type InterestType, type RepaymentFreq } from "@/lib/loanSchedule"
import { uploadImage } from "@/lib/cloudinary"
import { spawnTask } from "@/lib/tasks/spawn"
import { createAdminNotification } from "@/app/actions/notifications"

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

  const request = await prisma.memberRequest.create({
    data: {
      memberId,
      type: "WITHDRAWAL",
      amount,
      method,
      notes,
      status: "PENDING",
    },
  })

  // Task auto-spawn: review the withdrawal request (idempotent). Non-blocking.
  await spawnTask({
    title: `Review withdrawal request: ${amount} BDT`,
    description: `Member submitted a ${method ?? ""} withdrawal request of ${amount} BDT.${notes ? ` Notes: ${notes}` : ""} Review and approve or reject in the Transaction Approvals queue.`,
    priority: "HIGH",
    dueInDays: 2,
    memberRequestId: request.id,
    relatedMemberId: memberId,
    createdByLabel: "MEMBER_REQUEST_SYSTEM",
  }).catch(() => undefined)

  // Notify admins of the new withdrawal request. Best-effort, non-throwing.
  await createAdminNotification({
    type: "MEMBER_REQUEST",
    title: "New withdrawal request",
    message: `A member requested a ${method ?? ""} withdrawal of ৳ ${amount.toLocaleString()}.${notes ? ` Notes: ${notes}` : ""}`,
    link: "/dashboard/transaction-approvals?tab=member",
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

  const request = await prisma.memberRequest.create({
    data: {
      memberId,
      type: "CLOSING",
      reason,
      status: "PENDING",
    },
  })

  // Task auto-spawn: review the account-closing request. Non-blocking.
  await spawnTask({
    title: `Review account-closing request`,
    description: `A member requested account closure.${reason ? ` Reason: ${reason}` : ""} Verify outstanding balances, settle dues, and process the closure.`,
    priority: "HIGH",
    dueInDays: 5,
    memberRequestId: request.id,
    relatedMemberId: memberId,
    createdByLabel: "MEMBER_REQUEST_SYSTEM",
    checklist: ["Verify outstanding balances", "Settle outstanding dues", "Process account closure", "Notify member of outcome"],
  }).catch(() => undefined)

  // Notify admins of the new account-closing request. Best-effort, non-throwing.
  await createAdminNotification({
    type: "MEMBER_REQUEST",
    title: "New account-closure request",
    message: `A member requested account closure.${reason ? ` Reason: ${reason}` : ""}`,
    link: "/dashboard/transaction-approvals?tab=member",
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

  // Notify admins of the new profile-update request. Best-effort, non-throwing.
  await createAdminNotification({
    type: "PROFILE_REQUEST",
    title: "New profile update request",
    message: `A member requested changes to their profile (${Object.keys(payload).join(", ")}).`,
    link: "/dashboard/profile-approvals",
  })

  revalidatePath("/portal/profile")
  return { success: "Profile update request submitted to admin!" }
}

// =====================================================================
// FULL PROFILE UPDATE REQUEST (member portal edit page)
// Mirrors the admin MemberForm field contract: personal, contact,
// identity, bank, current/permanent addresses, and nominees.
// Files are uploaded to Cloudinary at submit time and stored as URLs in
// the pending payload so the JSON column stays serializable. On admin
// approval, `approveProfileUpdateRequest` replays the payload against the
// member record using the same write logic as `updateMember`.
// =====================================================================
function formDataString(formData: FormData, key: string): string {
  const v = formData.get(key)
  return v == null ? "" : String(v)
}

export async function submitFullProfileUpdateRequest(memberId: string, formData: FormData) {
  // --- Personal ---
  const firstName = formDataString(formData, "firstName").trim()
  const lastName = formDataString(formData, "lastName").trim()
  if (!firstName || !lastName) {
    return { error: "First name and last name are required." }
  }

  const personal = {
    firstName,
    lastName,
    fatherName: formDataString(formData, "fatherName").trim() || null,
    motherName: formDataString(formData, "motherName").trim() || null,
    spouseName: formDataString(formData, "spouseName").trim() || null,
    dateOfBirth: formDataString(formData, "dob").trim() || null,
    gender: formDataString(formData, "gender").trim() || null, // uppercase enum
    maritalStatus: formDataString(formData, "maritalStatus").trim() || null,
    marriageDate: formDataString(formData, "marriageDate").trim() || null,
    religion: formDataString(formData, "religion").trim() || null,
    nationality: formDataString(formData, "nationality").trim() || null,
    bloodGroup: formDataString(formData, "bloodGroup").trim() || null, // A_POSITIVE etc.
    profession: formDataString(formData, "profession").trim() || null,
  }

  // --- Contact & identity ---
  const phone = formDataString(formData, "phone").trim()
  if (!phone) return { error: "Phone number is required." }

  const contact = {
    phone,
    email: formDataString(formData, "email").trim() || null,
    emergencyPhone: formDataString(formData, "emergencyPhone").trim() || null,
    emergencyContactName: formDataString(formData, "emergencyContactName").trim() || null,
    idType: formDataString(formData, "idType").trim() || null,
    idNumber: formDataString(formData, "idNumber").trim() || null,
  }

  // --- Bank ---
  const bank = {
    accountName: formDataString(formData, "accountName").trim() || null,
    accountNumber: formDataString(formData, "accountNumber").trim() || null,
    bankName: formDataString(formData, "bankName").trim() || null,
    branch: formDataString(formData, "branch").trim() || null,
    routingNumber: formDataString(formData, "routingNumber").trim() || null,
  }

  // --- Addresses ---
  const currentAddress = {
    addressType: "CURRENT",
    village: formDataString(formData, "c_village").trim() || null,
    postOffice: formDataString(formData, "c_postOffice").trim() || null,
    district: formDataString(formData, "c_district").trim() || null,
    postalCode: formDataString(formData, "c_postalCode").trim() || null,
  }
  const permanentAddress = {
    addressType: "PERMANENT",
    village: formDataString(formData, "p_village").trim() || null,
    postOffice: formDataString(formData, "p_postOffice").trim() || null,
    district: formDataString(formData, "p_district").trim() || null,
    postalCode: formDataString(formData, "p_postalCode").trim() || null,
  }

  // --- Nominees (nom_*_* indexed) ---
  const nominees: Array<{
    name: string; relation: string; share: number; phone: string | null
    idType: string | null; idNumber: string | null
    photoUrl: string | null; idDocumentUrl: string | null; dbId?: string
  }> = []
  let i = 0
  while (true) {
    const name = formDataString(formData, `nom_${i}_name`)
    if (!name) break
    const relation = formDataString(formData, `nom_${i}_relation`) || "Unknown"
    const shareRaw = formDataString(formData, `nom_${i}_share`)
    const dbId = formDataString(formData, `nom_${i}_dbId`) || undefined

    const photoFile = formData.get(`nom_${i}_photo`) as File | null
    const photoUrl = photoFile && photoFile.size > 0
      ? (await uploadImage(photoFile).catch(() => null))
      : null

    const idDocFile = formData.get(`nom_${i}_idDoc`) as File | null
    const idDocumentUrl = idDocFile && idDocFile.size > 0
      ? (await uploadImage(idDocFile).catch(() => null))
      : null

    nominees.push({
      name: name.trim(),
      relation,
      share: shareRaw ? parseFloat(shareRaw) : 0,
      phone: formDataString(formData, `nom_${i}_phone`).trim() || null,
      idType: formDataString(formData, `nom_${i}_idType`).trim() || null,
      idNumber: formDataString(formData, `nom_${i}_idNumber`).trim() || null,
      photoUrl,
      idDocumentUrl,
      ...(dbId ? { dbId } : {}),
    })
    i++
  }

  // Validate nominee shares total 100% if any present.
  if (nominees.length > 0) {
    const total = nominees.reduce((acc, n) => acc + (Number.isFinite(n.share) ? n.share : 0), 0)
    if (Math.round(total) !== 100) {
      return { error: `Total nominee shares must equal 100%. Currently at ${total}%.` }
    }
  }

  // --- Files (member photo, ID document) ---
  const memberPhotoFile = formData.get("memberPhoto") as File | null
  const memberPhotoUrl = memberPhotoFile && memberPhotoFile.size > 0
    ? (await uploadImage(memberPhotoFile).catch(() => null))
    : null

  const idDocFile = formData.get("idDocument") as File | null
  const idDocumentUrl = idDocFile && idDocFile.size > 0
    ? (await uploadImage(idDocFile).catch(() => null))
    : null

  const payload = {
    personal,
    contact,
    bank,
    currentAddress,
    permanentAddress,
    nominees,
    ...(memberPhotoUrl ? { memberPhotoUrl } : {}),
    ...(idDocumentUrl ? { idDocumentUrl } : {}),
  }

  await prisma.profileUpdateRequest.create({
    data: {
      memberId,
      payload: payload as Prisma.InputJsonValue,
      status: "PENDING",
    },
  })

  // Notify admins of the new full profile-update request. Best-effort.
  await createAdminNotification({
    type: "PROFILE_REQUEST",
    title: "New profile update request",
    message: `A member submitted a full profile update for approval (personal details, contact, bank, address, nominees).`,
    link: "/dashboard/profile-approvals",
  })

  revalidatePath("/portal/profile")
  revalidatePath("/portal/requests")
  revalidatePath("/dashboard/profile-approvals")
  return { success: "Profile update request submitted to admin for approval!" }
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

  const loan = await prisma.loan.create({
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

  // Task auto-spawn: review the member's loan application. Non-blocking.
  await spawnTask({
    title: `Review loan application: ${loanNo}`,
    description: `A member applied for a loan of ৳ ${principal.toLocaleString()} (${installments} installments @ ${rate}%). Review and approve or reject.`,
    priority: "HIGH",
    dueInDays: 2,
    loanId: loan.id,
    relatedMemberId: memberId,
    createdByLabel: "LOAN_SYSTEM",
  }).catch(() => undefined)

  // Notify admins of the new loan application. Best-effort, non-throwing.
  await createAdminNotification({
    type: "LOAN_REQUEST",
    title: "New loan application",
    message: `Loan ${loanNo}: a member applied for ৳ ${principal.toLocaleString()} over ${installments} installments at ${rate}%.`,
    link: "/dashboard/loans",
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

  // Notify admins of the new photo-update request. Best-effort.
  await createAdminNotification({
    type: "PROFILE_REQUEST",
    title: "New profile photo request",
    message: `A member submitted a new profile photo for approval.`,
    link: "/dashboard/profile-approvals",
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
//
// Two payload shapes are supported:
//  1. Legacy flat string map (from the old modal) — e.g.
//     { firstName, phone, photoUrl, … }. Whitelisted via PROFILE_PAYLOAD_FIELDS.
//  2. Full structured payload (from the portal edit page) —
//     { personal, contact, bank, currentAddress, permanentAddress,
//       nominees, memberPhotoUrl?, idDocumentUrl? } — replayed against
//     the member record using the same write logic as `updateMember`.
//
// Safe, guarded, and idempotent: re-running on an already-processed
// request is blocked by the status check.
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

// Helpers to safely coerce JSON payload values into the Prisma types
// `updateMember` expects. Enums arrive uppercase; dates arrive as
// "YYYY-MM-DD" strings.
function strOrNull(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null
}
function enumOrNull<T extends string>(v: unknown, valid: readonly T[]): T | null {
  const s = typeof v === "string" ? v.trim().toUpperCase() : ""
  return (valid as readonly string[]).includes(s) ? (s as T) : null
}
function dateOrNull(v: unknown): Date | null {
  const s = typeof v === "string" ? v.trim() : ""
  if (!s) return null
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

// Apply the structured (full) payload — mirrors `updateMember` writes.
// The payload comes from a Prisma `Json` column, so it is loosely typed as
// `Record<string, unknown>`; each field is coerced via the str/enum/date helpers above.
type StructuredPayload = Record<string, unknown> & {
  personal?: Record<string, unknown>
  contact?: Record<string, unknown>
  bank?: Record<string, unknown>
  currentAddress?: Record<string, unknown>
  permanentAddress?: Record<string, unknown>
  nominees?: unknown[]
  memberPhotoUrl?: unknown
  idDocumentUrl?: unknown
}

async function applyStructuredProfileUpdate(
  tx: Prisma.TransactionClient,
  memberId: string,
  payload: StructuredPayload
) {
  const { personal, contact, bank, currentAddress, permanentAddress, nominees } = payload

  // Fetch existing member so we can preserve untouched fields and resolve idType.
  const existing = await tx.member.findUnique({ where: { id: memberId } })
  if (!existing) throw new Error("Member not found.")

  const firstName = strOrNull(personal?.firstName) ?? existing.firstName
  const lastName = strOrNull(personal?.lastName) ?? existing.lastName
  const fullName = `${firstName} ${lastName}`.trim()

  // Identity: map idType/idNumber to the matching column.
  const idType = strOrNull(contact?.idType)
  const idNumber = strOrNull(contact?.idNumber)
  const nidNumber = idType === "National ID" ? idNumber : null
  const passportNumber = idType === "Passport" ? idNumber : null
  const birthCertificateNo = idType === "Birth Certificate" ? idNumber : null

  await tx.member.update({
    where: { id: memberId },
    data: {
      firstName,
      lastName,
      fullName,
      fatherName: personal?.fatherName !== undefined ? strOrNull(personal.fatherName) : undefined,
      motherName: personal?.motherName !== undefined ? strOrNull(personal.motherName) : undefined,
      spouseName: personal?.spouseName !== undefined ? strOrNull(personal.spouseName) : undefined,
      dateOfBirth: personal?.dateOfBirth !== undefined ? dateOrNull(personal.dateOfBirth) : undefined,
      gender: personal?.gender !== undefined ? enumOrNull(personal.gender, Object.values(Gender) as readonly Gender[]) ?? undefined : undefined,
      religion: personal?.religion !== undefined ? strOrNull(personal.religion) ?? null : undefined,
      nationality: personal?.nationality !== undefined ? strOrNull(personal.nationality) ?? "Bangladeshi" : undefined,
      bloodGroup: personal?.bloodGroup !== undefined
        ? enumOrNull(personal.bloodGroup, Object.values(BloodGroup) as readonly BloodGroup[]) ?? undefined
        : undefined,
      profession: personal?.profession !== undefined ? strOrNull(personal.profession) ?? null : undefined,
      maritalStatus: personal?.maritalStatus !== undefined ? enumOrNull(personal.maritalStatus, Object.values(MaritalStatus) as readonly MaritalStatus[]) ?? undefined : undefined,
      marriageDate: personal?.marriageDate !== undefined ? dateOrNull(personal.marriageDate) : undefined,
      phone: strOrNull(contact?.phone) ?? existing.phone,
      email: contact?.email !== undefined ? strOrNull(contact.email) : undefined,
      emergencyPhone: contact?.emergencyPhone !== undefined ? strOrNull(contact.emergencyPhone) : undefined,
      emergencyContactName: contact?.emergencyContactName !== undefined ? strOrNull(contact.emergencyContactName) : undefined,
      nidNumber: nidNumber !== null ? nidNumber : undefined,
      passportNumber: passportNumber !== null ? passportNumber : undefined,
      birthCertificateNo: birthCertificateNo !== null ? birthCertificateNo : undefined,
      accountName: bank?.accountName !== undefined ? strOrNull(bank.accountName) : undefined,
      accountNumber: bank?.accountNumber !== undefined ? strOrNull(bank.accountNumber) : undefined,
      bankName: bank?.bankName !== undefined ? strOrNull(bank.bankName) : undefined,
      branch: bank?.branch !== undefined ? strOrNull(bank.branch) : undefined,
      routingNumber: bank?.routingNumber !== undefined ? strOrNull(bank.routingNumber) : undefined,
      ...(typeof payload.memberPhotoUrl === "string" && payload.memberPhotoUrl
        ? { photoUrl: payload.memberPhotoUrl }
        : {}),
    },
  })

  // Replace addresses (only when the edit included address data).
  if (currentAddress || permanentAddress) {
    await tx.memberAddress.deleteMany({ where: { memberId } })
    if (currentAddress && (currentAddress.village || currentAddress.district)) {
      await tx.memberAddress.create({
        data: {
          memberId,
          addressType: "CURRENT",
          village: strOrNull(currentAddress.village),
          postOffice: strOrNull(currentAddress.postOffice),
          district: strOrNull(currentAddress.district),
          postalCode: strOrNull(currentAddress.postalCode),
        },
      })
    }
    if (permanentAddress && (permanentAddress.village || permanentAddress.district)) {
      await tx.memberAddress.create({
        data: {
          memberId,
          addressType: "PERMANENT",
          village: strOrNull(permanentAddress.village),
          postOffice: strOrNull(permanentAddress.postOffice),
          district: strOrNull(permanentAddress.district),
          postalCode: strOrNull(permanentAddress.postalCode),
        },
      })
    }
  }

  // Replace ID document if a new URL was uploaded.
  if (typeof payload.idDocumentUrl === "string" && payload.idDocumentUrl && idType) {
    await tx.memberDocument.deleteMany({ where: { memberId, documentType: idType } })
    await tx.memberDocument.create({
      data: {
        memberId,
        documentType: idType,
        name: "Member ID Document",
        fileName: "id-document",
        fileUrl: payload.idDocumentUrl,
      },
    })
  }

  // Replace nominees if the payload included a nominee array.
  if (Array.isArray(nominees)) {
    const existingNominees = await tx.memberNominee.findMany({ where: { memberId } })
    await tx.memberNominee.deleteMany({ where: { memberId } })
    for (const raw of nominees) {
      const n = (raw || {}) as Record<string, unknown>
      const dbId = typeof n.dbId === "string" ? n.dbId : undefined
      const existingNom = dbId ? existingNominees.find((x) => x.id === dbId) : undefined
      await tx.memberNominee.create({
        data: {
          memberId,
          name: strOrNull(n.name) ?? "Unknown",
          relation: strOrNull(n.relation) ?? "Unknown",
          sharePercentage: Number.isFinite(n.share) ? Number(n.share) : 0,
          phone: strOrNull(n.phone),
          idType: strOrNull(n.idType),
          nidNumber: strOrNull(n.idNumber),
          // Preserve previously-uploaded file URLs if the member didn't supply new ones.
          photoUrl: typeof n.photoUrl === "string" && n.photoUrl ? n.photoUrl : existingNom?.photoUrl ?? null,
          idDocumentUrl: typeof n.idDocumentUrl === "string" && n.idDocumentUrl ? n.idDocumentUrl : existingNom?.idDocumentUrl ?? null,
        },
      })
    }
  }
}

export async function approveProfileUpdateRequest(
  requestId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const req = await prisma.profileUpdateRequest.findUnique({ where: { id: requestId } })
    if (!req) return { ok: false, error: "Request not found." }
    if (req.status !== "PENDING")
      return { ok: false, error: "This request has already been processed." }

    const payload = (req.payload || {}) as Record<string, unknown>
    const isStructured = Boolean(
      payload && (payload.personal || payload.contact || payload.bank || payload.nominees)
    )

    if (isStructured) {
      await prisma.$transaction((tx) =>
        applyStructuredProfileUpdate(tx, req.memberId, payload as StructuredPayload)
      )
    } else {
      // Legacy flat payload: whitelist-map onto member fields.
      const data: Record<string, unknown> = {}
      for (const [key, memberField] of Object.entries(PROFILE_PAYLOAD_FIELDS)) {
        const v = payload[key]
        if (typeof v === "string" && v.trim()) data[memberField] = v.trim()
      }
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
    }

    await prisma.profileUpdateRequest.update({ where: { id: requestId }, data: { status: "APPROVED" } })

    revalidatePath(`/dashboard/members/${req.memberId}`)
    revalidatePath("/portal/profile")
    revalidatePath("/portal/requests")
    revalidatePath("/dashboard/profile-approvals")
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

export async function rejectProfileUpdateRequest(
  requestId: string,
  reason?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const req = await prisma.profileUpdateRequest.findUnique({ where: { id: requestId } })
    if (!req) return { ok: false, error: "Request not found." }
    if (req.status !== "PENDING")
      return { ok: false, error: "This request has already been processed." }

    const trimmed = reason?.trim()
    await prisma.profileUpdateRequest.update({
      where: { id: requestId },
      data: {
        status: "REJECTED",
        ...(trimmed ? { payload: { ...(req.payload as object | null ?? {}), rejectReason: trimmed } } : {}),
      },
    })

    revalidatePath("/portal/profile")
    revalidatePath("/portal/requests")
    revalidatePath("/dashboard/profile-approvals")
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
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
