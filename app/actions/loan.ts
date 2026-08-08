"use server"

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { generateSchedule, expectedCloseFromSchedule, type InterestType, type RepaymentFreq } from "@/lib/loanSchedule"
import { Prisma } from "@prisma/client"
import { recalculateTrustScore } from "@/lib/trustScore"
import { spawnTask } from "@/lib/tasks/spawn"

const LOANS_PATH = "/dashboard/loans"

// Generate a sequential loan number like L0001.
async function nextLoanNo(): Promise<string> {
  const count = await prisma.loan.count()
  return `L${String(count + 1).padStart(4, "0")}`
}

// Generate a sequential repayment receipt number like RPN-0001.
async function nextRepaymentReceiptNo(): Promise<string> {
  const count = await prisma.loanRepayment.count()
  return `RPN-${String(count + 1).padStart(4, "0")}`
}

// =====================================================================
// LOAN PRODUCTS
// =====================================================================

export async function createLoanProduct(formData: FormData) {
  const name = (formData.get("name") as string)?.trim()
  const code = (formData.get("code") as string)?.trim() || null
  if (!name) throw new Error("Product name is required.")

  const data = {
    name,
    code,
    description: (formData.get("description") as string) || null,
    minAmount: safeDecimal(formData.get("minAmount"), 0),
    maxAmount: safeDecimal(formData.get("maxAmount"), 0),
    interestRate: safeDecimal(formData.get("interestRate"), 0),
    interestType: ((formData.get("interestType") as string) || "FLAT") as InterestType,
    repaymentFreq: ((formData.get("repaymentFreq") as string) || "MONTHLY") as RepaymentFreq,
    numberOfInstallments: parseInt((formData.get("numberOfInstallments") as string) || "12", 10),
    gracePeriod: parseInt((formData.get("gracePeriod") as string) || "0", 10),
    lateFinePerDay: parseOptionalDecimal(formData.get("lateFinePerDay")),
    processingFee: safeDecimal(formData.get("processingFee"), 0),
    allowEarlySettlement: formData.get("allowEarlySettlement") === "on",
    allowInterestWaiver: formData.get("allowInterestWaiver") === "on",
    allowReschedule: formData.get("allowReschedule") === "on",
    allowManualSchedule: formData.get("allowManualSchedule") === "on",
    isActive: formData.get("isActive") !== "off",
  }

  if (Number(data.maxAmount) > 0 && Number(data.maxAmount) < Number(data.minAmount)) {
    throw new Error("Max amount cannot be lower than min amount.")
  }

  try {
    await prisma.loanProduct.create({ data })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new Error("A product with this name or code already exists.")
    }
    throw e
  }

  revalidatePath("/dashboard/loans")
  redirect("/dashboard/loans")
}

export async function updateLoanProduct(id: string, formData: FormData) {
  const data = {
    name: (formData.get("name") as string)?.trim(),
    code: (formData.get("code") as string)?.trim() || null,
    description: (formData.get("description") as string) || null,
    minAmount: safeDecimal(formData.get("minAmount"), 0),
    maxAmount: safeDecimal(formData.get("maxAmount"), 0),
    interestRate: safeDecimal(formData.get("interestRate"), 0),
    interestType: ((formData.get("interestType") as string) || "FLAT") as InterestType,
    repaymentFreq: ((formData.get("repaymentFreq") as string) || "MONTHLY") as RepaymentFreq,
    numberOfInstallments: parseInt((formData.get("numberOfInstallments") as string) || "12", 10),
    gracePeriod: parseInt((formData.get("gracePeriod") as string) || "0", 10),
    lateFinePerDay: parseOptionalDecimal(formData.get("lateFinePerDay")),
    processingFee: safeDecimal(formData.get("processingFee"), 0),
    allowEarlySettlement: formData.get("allowEarlySettlement") === "on",
    allowInterestWaiver: formData.get("allowInterestWaiver") === "on",
    allowReschedule: formData.get("allowReschedule") === "on",
    allowManualSchedule: formData.get("allowManualSchedule") === "on",
  }

  try {
    await prisma.loanProduct.update({ where: { id }, data })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new Error("A product with this name or code already exists.")
    }
    throw e
  }

  revalidatePath("/dashboard/loans")
  redirect("/dashboard/loans")
}

export async function toggleLoanProductStatus(id: string, isActive: boolean) {
  await prisma.loanProduct.update({ where: { id }, data: { isActive } })
  revalidatePath(LOANS_PATH)
}

export async function deleteLoanProduct(id: string) {
  const loansCount = await prisma.loan.count({ where: { productId: id } })
  if (loansCount > 0) {
    throw new Error("Cannot delete: this product is used by existing loans. Deactivate it instead.")
  }
  await prisma.loanProduct.delete({ where: { id } })
  revalidatePath(LOANS_PATH)
}

// =====================================================================
// LOAN APPLICATION & DIRECT DISBURSE
// =====================================================================

interface ApplyArgs {
  memberId: string
  productId: string
  principal: number
  numberOfInstallments: number
  interestRate: number
  interestType: InterestType
  repaymentFreq: RepaymentFreq
  gracePeriod: number
  disburseDate: Date
  purpose?: string
  notes?: string
  guarantors?: { name: string; relation?: string; phone?: string; nidNumber?: string; address?: string; memberId?: string | null }[]
}

// Shared core: builds schedule + loan record. `status` decides if it is an application or active.
async function buildLoan(args: ApplyArgs, status: "PENDING" | "DISBURSED") {
  const member = await prisma.member.findUnique({ where: { id: args.memberId } })
  if (!member) throw new Error("Member not found.")
  if (member.status !== "ACTIVE") throw new Error("Loans can only be issued to ACTIVE members.")

  const product = await prisma.loanProduct.findUnique({ where: { id: args.productId } })
  if (!product) throw new Error("Loan product not found.")
  if (!product.isActive) throw new Error("Selected loan product is inactive.")

  const principal = args.principal
  if (principal <= 0) throw new Error("Principal amount must be greater than zero.")
  if (Number(product.minAmount) > 0 && principal < Number(product.minAmount)) {
    throw new Error(`Amount is below this product's minimum (৳ ${Number(product.minAmount)}).`)
  }
  if (Number(product.maxAmount) > 0 && principal > Number(product.maxAmount)) {
    throw new Error(`Amount exceeds this product's maximum (৳ ${Number(product.maxAmount)}).`)
  }

  const installments = args.numberOfInstallments || product.numberOfInstallments
  const rate = args.interestRate || Number(product.interestRate)
  const interestType = args.interestType || product.interestType
  const freq = args.repaymentFreq || product.repaymentFreq
  const grace = args.gracePeriod ?? product.gracePeriod ?? 0

  const schedule = generateSchedule({
    principal,
    annualRate: rate,
    interestType,
    repaymentFreq: freq,
    numberOfInstallments: installments,
    disburseDate: args.disburseDate,
    gracePeriod: grace,
  })

  const loanNo = await nextLoanNo()
  const closeDate = expectedCloseFromSchedule(schedule.rows)

  const loan = await prisma.loan.create({
    data: {
      loanNo,
      memberId: args.memberId,
      productId: args.productId,
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
      applicationDate: args.disburseDate,
      disbursedDate: status === "DISBURSED" ? args.disburseDate : null,
      expectedCloseDate: closeDate,
      status,
      purpose: args.purpose || null,
      notes: args.notes || null,
      outstandingBalance: status === "DISBURSED" ? schedule.totalPayable : 0,
      nextDueDate: status === "DISBURSED" ? schedule.rows[0]?.dueDate ?? null : null,
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
      guarantors: args.guarantors?.length
        ? {
            create: args.guarantors
              .filter((g) => g.name?.trim())
              .map((g) => ({
                name: g.name,
                relation: g.relation || null,
                phone: g.phone || null,
                nidNumber: g.nidNumber || null,
                address: g.address || null,
                memberId: g.memberId || null,
              })),
          }
        : undefined,
    },
    include: { schedule: true },
  })

  return loan
}

// Apply for a loan (creates a PENDING application awaiting approval).
export async function applyLoan(formData: FormData) {
  const args = parseLoanFormData(formData)
  await buildLoan(args, "PENDING")
  revalidatePath("/dashboard/loans")
  redirect("/dashboard/loans")
}

// Direct disbursement fast path: create a loan that is already DISBURSED.
export async function quickDisburseLoan(formData: FormData) {
  const args = parseLoanFormData(formData)
  await buildLoan(args, "DISBURSED")
  revalidatePath("/dashboard/loans")
  redirect("/dashboard/loans")
}

function parseLoanFormData(formData: FormData): ApplyArgs {
  const memberId = (formData.get("memberId") as string)?.trim()
  const productId = (formData.get("productId") as string)?.trim()
  if (!memberId) throw new Error("Member is required.")
  if (!productId) throw new Error("Loan product is required.")

  const principal = parseFloat((formData.get("principal") as string) || "0")
  const disburseRaw = formData.get("disburseDate") as string
  const disburseDate = disburseRaw ? new Date(disburseRaw) : new Date()

  // Optional guarantors (JSON array posted from the client)
  let guarantors: ApplyArgs["guarantors"] = []
  const guarantorJson = formData.get("guarantors") as string
  if (guarantorJson) {
    try {
      guarantors = JSON.parse(guarantorJson)
    } catch {
      guarantors = []
    }
  }

  return {
    memberId,
    productId,
    principal,
    numberOfInstallments: parseInt((formData.get("numberOfInstallments") as string) || "0", 10) || 0,
    interestRate: parseFloat((formData.get("interestRate") as string) || "0") || 0,
    interestType: ((formData.get("interestType") as string) || "FLAT") as InterestType,
    repaymentFreq: ((formData.get("repaymentFreq") as string) || "MONTHLY") as RepaymentFreq,
    gracePeriod: parseInt((formData.get("gracePeriod") as string) || "0", 10) || 0,
    disburseDate,
    purpose: (formData.get("purpose") as string) || undefined,
    notes: (formData.get("notes") as string) || undefined,
    guarantors,
  }
}

// =====================================================================
// LIFECYCLE ACTIONS
// =====================================================================

export async function approveLoan(id: string) {
  const loan = await prisma.loan.findUnique({ where: { id } })
  if (!loan) throw new Error("Loan not found.")
  if (loan.status !== "PENDING") throw new Error("Only pending loans can be approved.")

  await prisma.loan.update({
    where: { id },
    data: { status: "APPROVED", approvedDate: new Date() },
  })
  revalidatePath(`/dashboard/loans/${id}`)
  revalidatePath(LOANS_PATH)
}

export async function rejectLoan(id: string, reason?: string) {
  const loan = await prisma.loan.findUnique({ where: { id } })
  if (!loan) throw new Error("Loan not found.")
  if (!["PENDING", "APPROVED"].includes(loan.status)) {
    throw new Error("This loan can no longer be rejected.")
  }

  await prisma.loan.update({
    where: { id },
    data: {
      status: "REJECTED",
      notes: reason ? `${loan.notes ? loan.notes + "\n" : ""}[Rejected] ${reason}` : loan.notes,
    },
  })
  revalidatePath(`/dashboard/loans/${id}`)
  revalidatePath(LOANS_PATH)
}

export async function disburseLoan(id: string, method: string, date?: string) {
  const loan = await prisma.loan.findUnique({
    where: { id },
    include: { schedule: { orderBy: { installmentNo: "asc" } } },
  })
  if (!loan) throw new Error("Loan not found.")
  if (loan.status !== "APPROVED") throw new Error("Only approved loans can be disbursed.")

  const disbursedDate = date ? new Date(date) : new Date()
  const firstDue = loan.schedule[0]?.dueDate ?? null

  await prisma.loan.update({
    where: { id },
    data: {
      status: "DISBURSED",
      disbursedDate,
      disbursementMethod: method,
      outstandingBalance: loan.totalPayable,
      nextDueDate: firstDue,
    },
  })

  // Trust Score: disbursement activates the LOAN KPI and (on the member's first
  // loan) triggers weight redistribution (FRS §6.3, §8.2).
  try {
    await recalculateTrustScore(loan.memberId, "LOAN_DISBURSED", {
      referenceId: id,
      referenceType: "loan",
    })
  } catch (e) {
    console.error("[trustScore] disburseLoan hook failed:", e)
  }

  // Task auto-spawn: disbursement follow-up (idempotent — skipped if an open
  // task already links this loan + title). Non-blocking.
  await spawnTask({
    title: `Process disbursement documentation for ${loan.loanNo}`,
    description: `Loan ${loan.loanNo} has been disbursed. Collect signed agreement, update member file, and file supporting documents.`,
    priority: "HIGH",
    dueInDays: 3,
    loanId: id,
    relatedMemberId: loan.memberId,
    memberIds: [loan.memberId],
    createdByLabel: "LOAN_SYSTEM",
    checklist: ["Collect signed loan agreement", "Update member file", "File guarantor documents", "Notify member of first due date"],
  }).catch((e) => console.error("[tasks.spawn] loan disbursement hook failed:", e))

  revalidatePath(`/dashboard/loans/${id}`)
  revalidatePath(LOANS_PATH)
}

export async function writeOffLoan(id: string) {
  const loan = await prisma.loan.findUnique({ where: { id } })
  if (!loan) throw new Error("Loan not found.")
  if (!["DISBURSED", "DEFAULTED"].includes(loan.status)) {
    throw new Error("Only disbursed or defaulted loans can be written off.")
  }

  await prisma.loan.update({
    where: { id },
    data: { status: "WRITTEN_OFF", closedDate: new Date() },
  })

  // Trust Score: write-off re-evaluates the LOAN KPI (loan no longer counts as
  // active repayment discipline).
  try {
    await recalculateTrustScore(loan.memberId, "LOAN_CLOSED", {
      referenceId: id,
      referenceType: "loan",
    })
  } catch (e) {
    console.error("[trustScore] writeOffLoan hook failed:", e)
  }

  revalidatePath(`/dashboard/loans/${id}`)
  revalidatePath(LOANS_PATH)
}

// =====================================================================
// REPAYMENTS — the core. Dedicated table + Savings mirror.
// =====================================================================

interface RepaymentInput {
  principal: number
  interest: number
  fine: number
  method: string
  referenceNo?: string
  paymentDate?: string
  notes?: string
}

export async function recordRepayment(loanId: string, input: RepaymentInput) {
  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    include: { schedule: { orderBy: { installmentNo: "asc" } }, member: true },
  })
  if (!loan) throw new Error("Loan not found.")
  if (!["DISBURSED", "REPAID"].includes(loan.status)) {
    throw new Error("Repayments can only be recorded against disbursed loans.")
  }

  const principal = round2(input.principal || 0)
  const interest = round2(input.interest || 0)
  const fine = round2(input.fine || 0)
  const total = round2(principal + interest + fine)
  if (total <= 0) throw new Error("Repayment amount must be greater than zero.")

  const paymentDate = input.paymentDate ? new Date(input.paymentDate) : new Date()
  const receiptNo = await nextRepaymentReceiptNo()

  // Run as a transaction so the repayment, schedule update, loan balances,
  // and the Savings mirror all succeed or fail together.
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create the repayment record.
    const repayment = await tx.loanRepayment.create({
      data: {
        receiptNo,
        loanId,
        memberId: loan.memberId,
        principal,
        interest,
        fine,
        totalAmount: total,
        method: input.method,
        referenceNo: input.referenceNo || null,
        paymentDate,
        notes: input.notes || null,
      },
    })

    // 2. Mirror to Savings (unified ledger) as a LOAN_PAYMENT for this member.
    const mirror = await tx.savings.create({
      data: {
        memberId: loan.memberId,
        amount: total,
        type: "LOAN_PAYMENT",
        method: input.method,
        date: paymentDate,
      },
    })
    await tx.loanRepayment.update({
      where: { id: repayment.id },
      data: { savingsMirrorId: mirror.id },
    })

    // 3. Apply against the schedule: pay down the oldest unpaid installments.
    let remainingPrincipal = principal
    let remainingInterest = interest

    for (const inst of loan.schedule) {
      if (remainingPrincipal <= 0 && remainingInterest <= 0) break
      if (inst.status === "PAID" || inst.status === "WAIVED") continue

      const instPrincipal = Number(inst.principal)
      const instInterest = Number(inst.interest)

      // Track how much of THIS installment is now paid (principal + interest combined).
      const alreadyPaid = Number(inst.paidAmount || 0)
      const thisInstallmentRemaining = round2(Number(inst.installmentAmount) - alreadyPaid)
      const paymentForThis = Math.min(round2(remainingPrincipal + remainingInterest), thisInstallmentRemaining)

      // Split payment proportionally to principal/interest of the installment.
      const instTotal = Number(inst.installmentAmount) || instPrincipal + instInterest
      const principalShare = round2((instPrincipal / instTotal) * paymentForThis)
      const interestShare = round2(paymentForThis - principalShare)

      const principalApplied = Math.min(remainingPrincipal, principalShare)
      const interestApplied = Math.min(remainingInterest, interestShare)

      remainingPrincipal = round2(remainingPrincipal - principalApplied)
      remainingInterest = round2(remainingInterest - interestApplied)

      const newPaid = round2(alreadyPaid + principalApplied + interestApplied)
      const fullyPaid = newPaid + 0.01 >= Number(inst.installmentAmount)

      await tx.loanSchedule.update({
        where: { id: inst.id },
        data: {
          status: fullyPaid ? "PAID" : "PARTIAL",
          paidDate: paymentDate,
          paidAmount: newPaid,
        },
      })
    }

    // Determine the next due date from the first still-unpaid installment.
    const refreshed = await tx.loanSchedule.findMany({
      where: { loanId },
      orderBy: { installmentNo: "asc" },
    })
    const firstUnpaid = refreshed.find((s) => s.status !== "PAID" && s.status !== "WAIVED")
    const nextDueDate = firstUnpaid?.dueDate ?? null

    // 4. Update loan running balances.
    const newPrincipalPaid = round2(Number(loan.principalPaid) + principal)
    const newInterestPaid = round2(Number(loan.interestPaid) + interest)
    const newFinePaid = round2(Number(loan.finePaid) + fine)
    const newOutstanding = round2(Number(loan.outstandingBalance) - total)

    // 5. Auto-close when fully repaid.
    const allPaid = refreshed.every((s) => s.status === "PAID" || s.status === "WAIVED")
    const newStatus = allPaid || newOutstanding <= 0.01 ? ("REPAID" as const) : loan.status

    await tx.loan.update({
      where: { id: loanId },
      data: {
        principalPaid: newPrincipalPaid,
        interestPaid: newInterestPaid,
        finePaid: newFinePaid,
        outstandingBalance: Math.max(newOutstanding, 0),
        nextDueDate,
        status: newStatus === "REPAID" && allPaid ? "REPAID" : loan.status,
        closedDate: newStatus === "REPAID" ? new Date() : null,
      },
    })

    return repayment
  })

  // Trust Score: repayment updates the LOAN KPI on-time rate. Fires after the
  // transaction commits so it never blocks or rolls back the repayment.
  try {
    await recalculateTrustScore(loan.memberId, "LOAN_INSTALLMENT_PAID", {
      referenceId: loanId,
      referenceType: "loan",
    })
  } catch (e) {
    console.error("[trustScore] recordRepayment hook failed:", e)
  }

  revalidatePath(`/dashboard/loans/${loanId}`)
  revalidatePath(`/dashboard/members/${loan.memberId}`)
  revalidatePath(LOANS_PATH)
  return result
}

// Waive the interest portion of a specific installment (guarded by product flag).
export async function waiveInterest(loanId: string, installmentNo: number) {
  const loan = await prisma.loan.findUnique({ where: { id: loanId }, include: { product: true } })
  if (!loan) throw new Error("Loan not found.")
  if (!loan.product.allowInterestWaiver) {
    throw new Error("This loan product does not permit interest waivers.")
  }

  const inst = await prisma.loanSchedule.findFirst({ where: { loanId, installmentNo } })
  if (!inst) throw new Error("Installment not found.")
  if (inst.status === "PAID") throw new Error("Cannot waive interest on an already-paid installment.")

  await prisma.$transaction(async (tx) => {
    await tx.loanSchedule.update({
      where: { id: inst.id },
      data: { interest: 0, installmentAmount: Number(inst.principal), fine: 0 },
    })
    // Recompute the loan totals.
    const schedule = await tx.loanSchedule.findMany({ where: { loanId } })
    const totalInterest = schedule.reduce((a, s) => a + Number(s.interest), 0)
    const totalPayable = schedule.reduce((a, s) => a + Number(s.installmentAmount), 0)
    const outstanding = Math.max(round2(totalPayable - Number(loan.principalPaid) - Number(loan.interestPaid) - Number(loan.finePaid)), 0)
    await tx.loan.update({
      where: { id: loanId },
      data: { totalInterest, totalPayable: round2(totalPayable), outstandingBalance: outstanding },
    })
  })

  revalidatePath(`/dashboard/loans/${loanId}`)
}

// =====================================================================
// HELPERS
// =====================================================================

function safeDecimal(value: FormDataEntryValue | null, fallback: number): Prisma.Decimal {
  const n = parseFloat((value as string) || "")
  return new Prisma.Decimal(Number.isFinite(n) ? n : fallback)
}

function parseOptionalDecimal(value: FormDataEntryValue | null): Prisma.Decimal | null {
  if (!value) return null
  const n = parseFloat(value as string)
  return Number.isFinite(n) ? new Prisma.Decimal(n) : null
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}
