"use server"

import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { revalidatePath } from "next/cache"
import {
  getCurrentUser,
  isSuperAdmin,
  hasPermission,
  requirePermission,
  PERMISSIONS,
  type CurrentUser,
} from "@/lib/permissions"
import { recalculateTrustScore } from "@/lib/trustScore"
import { nextTransactionNo } from "@/lib/transactions/voucher"
import { postTransactionEffects } from "@/lib/transactions/posting"
import {
  loadApprovalLimits,
  resolveLevelForAmount,
  userApprovalCeiling,
  computeMemberBalance,
  savingsTypeFor,
} from "@/lib/transactions/validation"
import type {
  TransactionType,
  TransactionSubType,
  PaymentMethod,
  TransactionBreakdown,
  TransactionAttachment,
  DistributionShare,
} from "@/lib/transactions/types"

export type ActionResult =
  | { ok: true; id?: string; voucherNo?: string }
  | { ok: false; error: string }

const PATHS = [
  "/dashboard/transactions",
  "/dashboard/transaction-approvals",
  "/dashboard/cash-closing",
  "/dashboard/accounts",
  "/dashboard/account-ledger",
  "/dashboard/member-ledger",
  "/dashboard/due-list",
  "/dashboard/members",
  "/dashboard/financials/trial-balance",
  "/dashboard/financials/balance-sheet",
  "/dashboard/financials/profit-loss",
]

function revalidateAll() {
  PATHS.forEach((p) => revalidatePath(p))
}

// ---------------------------------------------------------------------------
// CREATE — Maker step. Saves as DRAFT.
// ---------------------------------------------------------------------------
export interface CreateTransactionInput {
  transactionType: TransactionType
  subType: TransactionSubType
  memberId?: string | null
  amount: number
  paymentMethod?: PaymentMethod | null
  cashAccountId?: string | null
  referenceNo?: string | null
  breakdown?: TransactionBreakdown | null
  attachments?: TransactionAttachment[]
  remarks?: string | null
  // For income distribution — the per-member split.
  distribution?: DistributionShare[] | null
  // For portal-originated requests.
  memberRequestId?: string | null
}

export async function createTransaction(
  input: CreateTransactionInput
): Promise<ActionResult> {
  try {
    const user = await requirePermission(await getCurrentUser(), PERMISSIONS.TRANSACTION_CREATE)
    if (!input.amount || input.amount <= 0) {
      return { ok: false, error: "Amount must be greater than zero." }
    }
    if (input.transactionType !== "INCOME_DISTRIBUTION" && !input.memberId) {
      return { ok: false, error: "A member is required for this transaction." }
    }

    const { id, voucherNo } = await prisma.$transaction(async (tx) => {
      const no = await nextTransactionNo(tx, input.transactionType)
      const created = await tx.transaction.create({
        data: {
          voucherNo: no,
          transactionType: input.transactionType,
          subType: input.subType,
          category: "MEMBER",
          memberId: input.memberId || null,
          amount: input.amount,
          paymentMethod: input.paymentMethod || null,
          cashAccountId: input.cashAccountId || null,
          referenceNo: input.referenceNo || null,
          breakdown: (input.breakdown as Prisma.JsonObject) ?? undefined,
          attachments: (input.attachments ?? []) as unknown as Prisma.InputJsonValue,
          remarks: input.remarks || null,
          status: "DRAFT",
          memberSubmitted: false,
          memberRequestId: input.memberRequestId || null,
          // Audit — keep both a human label and the user id.
          createdBy: user.email,
          createdById: user.id,
        },
        select: { id: true, voucherNo: true },
      })
      return created
    })

    revalidateAll()
    return { ok: true, id, voucherNo }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

// ---------------------------------------------------------------------------
// SUBMIT — DRAFT → PENDING_APPROVAL. Resolves the approval tier by amount.
// ---------------------------------------------------------------------------
export async function submitTransaction(id: string): Promise<ActionResult> {
  try {
    const user = await requirePermission(await getCurrentUser(), PERMISSIONS.TRANSACTION_SUBMIT)

    const txn = await prisma.transaction.findUnique({
      where: { id },
      select: { status: true, amount: true, transactionType: true },
    })
    if (!txn) return { ok: false, error: "Transaction not found." }
    if (txn.status !== "DRAFT" && txn.status !== "RETURNED") {
      return { ok: false, error: `Cannot submit a ${txn.status} transaction.` }
    }

    const limits = await loadApprovalLimits()
    const approvalLevel = resolveLevelForAmount(Number(txn.amount), limits)

    await prisma.transaction.update({
      where: { id },
      data: {
        status: "PENDING_APPROVAL",
        approvalLevel,
        submittedBy: user.email,
        submittedById: user.id,
        submittedAt: new Date(),
        // Clear any prior return reason when re-submitting.
        returnReason: null,
      },
    })
    revalidateAll()
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

// ---------------------------------------------------------------------------
// APPROVE — the heart of the engine.
// ---------------------------------------------------------------------------
export async function approveTransaction(
  id: string,
  opts: { overrideReason?: string } = {}
): Promise<ActionResult> {
  try {
    const user = await requirePermission(await getCurrentUser(), PERMISSIONS.TRANSACTION_APPROVE)
    const result = await prisma.$transaction(async (tx) => {
      // ── 1. Re-fetch inside tx (concurrent-approval safety, spec §7C) ───────
      const txn = await tx.transaction.findUnique({
        where: { id },
        include: {
          member: { select: { id: true, status: true, fullName: true } },
          cashAccount: { select: { id: true, currentBalance: true, accountName: true } },
        },
      })
      if (!txn) throw new Error("Transaction not found.")
      if (txn.status !== "PENDING_APPROVAL") {
        throw new Error(`Only pending transactions can be approved (current: ${txn.status}).`)
      }

      // ── 2. Maker-Checker (spec §12) ────────────────────────────────────────
      const isMaker = txn.createdById === user.id
      if (isMaker) {
        if (isSuperAdmin(user) && opts.overrideReason?.trim()) {
          // Super Admin override — record the reason in the audit trail.
          await tx.transaction.update({
            where: { id },
            data: {
              remarks: [
                typeof txn.remarks === "string" ? txn.remarks : null,
                `[SUPER_ADMIN OVERRIDE by ${user.email}: ${opts.overrideReason.trim()}]`,
              ]
                .filter(Boolean)
                .join("\n"),
            },
          })
        } else {
          throw new Error(
            "Maker-Checker rule: you cannot approve a transaction you created. " +
              "Ask another authorised user to approve it."
          )
        }
      }

      // ── 3. Approval-limit check (spec §13) ─────────────────────────────────
      const limits = await loadApprovalLimits()
      if (limits.length > 0) {
        const granted = new Set<string>(
          (
            await tx.userPermission.findMany({
              where: { userId: user.id },
              select: { permission: true },
            })
          ).map((p) => p.permission)
        )
        const ceiling = userApprovalCeiling(user, granted, limits)
        if (Number(txn.amount) > ceiling) {
          const tier = limits.find(
            (l) => Number(txn.amount) >= l.minAmount && Number(txn.amount) <= l.maxAmount
          )
          throw new Error(
            `Your approval authority (up to ৳${ceiling.toLocaleString()}) is below this amount. ` +
              `This transaction requires ${tier?.label ?? "a higher authority"} approval.`
          )
        }
      }

      // ── 4. Member eligibility (withdrawals, spec §7A) ──────────────────────
      if (txn.transactionType === "WITHDRAWAL" && txn.memberId) {
        if (!txn.member) throw new Error("Linked member not found.")
        const m = txn.member
        const blockedStatuses = ["SUSPENDED", "CLOSED", "REJECTED", "DECEASED"]
        if (blockedStatuses.includes(m.status)) {
          throw new Error(
            `Member account is ${m.status}. Cannot approve withdrawal.`
          )
        }
        const bal = await computeMemberBalance(tx, m.id)
        if (bal.balance < Number(txn.amount)) {
          throw new Error(
            `Insufficient withdrawable balance. Available ৳${bal.balance.toLocaleString()}, ` +
              `requested ৳${Number(txn.amount).toLocaleString()}.`
          )
        }
        // Concurrent pending transaction check (spec §7A "no conflicting pending").
        const conflicting = await tx.transaction.findFirst({
          where: {
            memberId: m.id,
            transactionType: "WITHDRAWAL",
            status: "PENDING_APPROVAL",
            id: { not: id },
          },
          select: { voucherNo: true },
        })
        if (conflicting) {
          throw new Error(
            `Another pending withdrawal (${conflicting.voucherNo}) exists for this member. ` +
              `Resolve it first to prevent double-spending.`
          )
        }
      }

      // ── 5. Payment-source validation (spec §7B) ────────────────────────────
      if (txn.transactionType === "WITHDRAWAL" && txn.cashAccount) {
        const acc = txn.cashAccount
        if (Number(acc.currentBalance) < Number(txn.amount)) {
          throw new Error(
            `Insufficient funds in "${acc.accountName}" ` +
              `(balance ৳${Number(acc.currentBalance).toLocaleString()}).`
          )
        }
      }

      // ── 6. Post double-entry + Savings mirror (spec §17, both ledgers) ─────
      const posting = await postTransactionEffects(tx, {
        transactionId: txn.id,
        transactionType: txn.transactionType,
        amount: Number(txn.amount),
        memberId: txn.memberId,
        cashAccountId: txn.cashAccountId,
        referenceNo: txn.referenceNo,
        narration: `${txn.transactionType} — ${txn.voucherNo}`,
        savingsType: savingsTypeFor(txn.transactionType),
        savingsMethod: (txn.paymentMethod as string) || "CASH",
      })

      // ── 7. Mark the transaction APPROVED + link posting results ────────────
      const updated = await tx.transaction.update({
        where: { id },
        data: {
          status: "APPROVED",
          approvedBy: user.email,
          approvedById: user.id,
          approvedAt: new Date(),
          journalEntryId: posting.journalEntryId,
          savingsMirrorId: posting.savingsMirrorId,
        },
      })

      // ── 8. Mark linked portal request as APPROVED (if any) ─────────────────
      if (txn.memberRequestId) {
        await tx.memberRequest.update({
          where: { id: txn.memberRequestId },
          data: { status: "APPROVED" },
        })
      }

      return { updated, posting }
    }) // end $transaction

    // ── 9. Non-blocking side effects (trust score + notifications, spec §16) ─
    if (result.updated.memberId) {
      const eventType = trustEventForType(result.updated.transactionType as TransactionType)
      if (eventType) {
        recalculateTrustScore(result.updated.memberId, eventType, {
          createdBy: user.email,
          referenceId: result.updated.id,
          referenceType: "deposit",
        }).catch(() => {})
      }
      notifyMember(result.updated, user).catch(() => {})
    }

    revalidateAll()
    return { ok: true, id: result.updated.id }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

// ---------------------------------------------------------------------------
// RETURN / REJECT
// ---------------------------------------------------------------------------
export async function returnTransaction(id: string, reason: string): Promise<ActionResult> {
  try {
    const user = await requirePermission(await getCurrentUser(), PERMISSIONS.TRANSACTION_APPROVE)
    const txn = await prisma.transaction.findUnique({
      where: { id },
      select: { status: true },
    })
    if (!txn) return { ok: false, error: "Transaction not found." }
    if (txn.status !== "PENDING_APPROVAL") {
      return { ok: false, error: `Only pending transactions can be returned (current: ${txn.status}).` }
    }
    if (!reason?.trim()) return { ok: false, error: "A return reason is required." }

    await prisma.transaction.update({
      where: { id },
      data: {
        status: "RETURNED",
        returnReason: reason.trim(),
        returnedBy: user.email,
        returnedById: user.id,
        returnedAt: new Date(),
      },
    })
    revalidateAll()
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

export async function rejectTransaction(id: string, reason: string): Promise<ActionResult> {
  try {
    const user = await requirePermission(await getCurrentUser(), PERMISSIONS.TRANSACTION_APPROVE)
    const txn = await prisma.transaction.findUnique({
      where: { id },
      select: { status: true },
    })
    if (!txn) return { ok: false, error: "Transaction not found." }
    if (txn.status !== "PENDING_APPROVAL") {
      return { ok: false, error: `Only pending transactions can be rejected (current: ${txn.status}).` }
    }
    if (!reason?.trim()) return { ok: false, error: "A rejection reason is required." }

    await prisma.transaction.update({
      where: { id },
      data: {
        status: "REJECTED",
        rejectionReason: reason.trim(),
        rejectedBy: user.email,
        rejectedById: user.id,
        rejectedAt: new Date(),
      },
    })
    // Reject the linked member request too, if any.
    const linked = await prisma.transaction.findUnique({
      where: { id },
      select: { memberRequestId: true },
    })
    if (linked?.memberRequestId) {
      await prisma.memberRequest.update({
        where: { id: linked.memberRequestId },
        data: { status: "REJECTED" },
      })
    }
    revalidateAll()
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

// ---------------------------------------------------------------------------
// REVERSE — APPROVED → REVERSED via a new reversal transaction.
// Approved transactions are immutable (spec §29): we post a reversing voucher
// with sign −1 and link both rows.
// ---------------------------------------------------------------------------
export async function reverseTransaction(id: string, reason: string): Promise<ActionResult> {
  try {
    const user = await requirePermission(await getCurrentUser(), PERMISSIONS.TRANSACTION_REVERSE)
    if (!reason?.trim()) return { ok: false, error: "A reversal reason is required." }

    const result = await prisma.$transaction(async (tx) => {
      const original = await tx.transaction.findUnique({ where: { id } })
      if (!original) throw new Error("Transaction not found.")
      if (original.status !== "APPROVED") {
        throw new Error(`Only approved transactions can be reversed (current: ${original.status}).`)
      }
      if (original.reversalOfId) {
        throw new Error("This is already a reversal transaction; it cannot be reversed again.")
      }
      if (original.reversedById) {
        throw new Error("This transaction has already been reversed.")
      }

      const voucherNo = await nextTransactionNo(tx, original.transactionType as TransactionType)

      // Create the reversal transaction record first (without posting links).
      const reversal = await tx.transaction.create({
        data: {
          voucherNo,
          transactionType: original.transactionType,
          subType: original.subType,
          category: original.category,
          memberId: original.memberId,
          amount: original.amount,
          paymentMethod: original.paymentMethod,
          cashAccountId: original.cashAccountId,
          referenceNo: original.referenceNo,
          breakdown: original.breakdown as Prisma.JsonObject | undefined,
          attachments: original.attachments as Prisma.InputJsonValue,
          remarks: `REVERSAL of ${original.voucherNo}: ${reason.trim()}`,
          status: "APPROVED", // a reversal is itself an approved, posted voucher
          approvalLevel: original.approvalLevel,
          reversalOfId: original.id,
          reversalReason: reason.trim(),
          memberSubmitted: false,
          createdBy: user.email,
          createdById: user.id,
          approvedBy: user.email,
          approvedById: user.id,
          approvedAt: new Date(),
          reversedByUser: user.email,
          reversedByUserId: user.id,
          reversedAt: new Date(),
        },
      })

      // Post the reversing voucher (sign −1 swaps debit/credit, negates mirror).
      const posting = await postTransactionEffects(tx, {
        transactionId: reversal.id,
        transactionType: original.transactionType as TransactionType,
        amount: Number(original.amount),
        memberId: original.memberId,
        cashAccountId: original.cashAccountId,
        referenceNo: original.referenceNo,
        narration: `REVERSAL — ${original.voucherNo}`,
        savingsType: savingsTypeFor(original.transactionType as TransactionType),
        savingsMethod: (original.paymentMethod as string) || "CASH",
        sign: -1,
      })

      // Link the reversal's posting, and mark the original as reversed.
      await tx.transaction.update({
        where: { id: reversal.id },
        data: {
          journalEntryId: posting.journalEntryId,
          savingsMirrorId: posting.savingsMirrorId,
        },
      })
      await tx.transaction.update({
        where: { id: original.id },
        data: {
          status: "REVERSED",
          reversedById: reversal.id,
        },
      })
      return { reversal, original }
    })

    // Non-blocking trust score + notification.
    if (result.original.memberId) {
      notifyMemberReversed(result.original, user).catch(() => {})
    }

    revalidateAll()
    return { ok: true, id: result.reversal.id, voucherNo: result.reversal.voucherNo }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

// ---------------------------------------------------------------------------
// BULK APPROVE — validates each independently; failures stay pending (spec §11)
// ---------------------------------------------------------------------------
export async function bulkApproveTransactions(ids: string[]): Promise<{
  approved: string[]
  failed: { id: string; error: string }[]
}> {
  const approved: string[] = []
  const failed: { id: string; error: string }[] = []
  for (const id of ids) {
    const r = await approveTransaction(id)
    if (r.ok) approved.push(id)
    else failed.push({ id, error: r.error })
  }
  return { approved, failed }
}

// ---------------------------------------------------------------------------
// DELETE — only DRAFTs (approved are immutable, spec §29)
// ---------------------------------------------------------------------------
export async function deleteTransaction(id: string): Promise<ActionResult> {
  try {
    const user = await getCurrentUser()
    if (!user) return { ok: false, error: "You must be signed in." }
    const txn = await prisma.transaction.findUnique({
      where: { id },
      select: { status: true, createdById: true },
    })
    if (!txn) return { ok: false, error: "Transaction not found." }
    if (txn.status !== "DRAFT") {
      return {
        ok: false,
        error:
          "Only draft transactions can be deleted. Approved transactions must be reversed.",
      }
    }
    // Makers can delete their own drafts; super admin can delete any.
    if (txn.createdById !== user.id && !isSuperAdmin(user)) {
      return { ok: false, error: "You can only delete your own draft transactions." }
    }
    await prisma.transaction.delete({ where: { id } })
    revalidateAll()
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

// ---------------------------------------------------------------------------
// READ — audit trail / detail fetcher
// ---------------------------------------------------------------------------
export async function getTransactionAuditTrail(id: string) {
  const txn = await prisma.transaction.findUnique({
    where: { id },
    include: {
      member: { select: { id: true, memberNo: true, fullName: true, phone: true } },
      cashAccount: { select: { id: true, accountName: true, accountCode: true } },
      journalEntry: {
        include: {
          lines: { include: { account: { select: { accountName: true, accountCode: true } } } },
        },
      },
      memberRequest: { select: { id: true, type: true, reason: true } },
      reversalOf: { select: { id: true, voucherNo: true } },
      reversedBy: { select: { id: true, voucherNo: true } },
    },
  })
  return txn
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function trustEventForType(
  type: TransactionType
): "DEPOSIT_COLLECTED" | "FINE_ISSUED" | null {
  switch (type) {
    case "DEPOSIT":
      return "DEPOSIT_COLLECTED"
    case "CHARGE":
      return "FINE_ISSUED"
    default:
      return null
  }
}

async function notifyMember(
  txn: { id: string; memberId: string | null; transactionType: string; amount: Prisma.Decimal; voucherNo: string },
  _user: CurrentUser
): Promise<void> {
  if (!txn.memberId) return
  const template = notificationTemplateFor(txn.transactionType)
  if (!template) return
  await prisma.memberNotification.create({
    data: {
      memberId: txn.memberId,
      type: "TRANSACTION_APPROVED",
      title: template.title,
      message: template.message(Number(txn.amount), txn.voucherNo),
    },
  })
  // SMS / email hooks live in lib/sms.ts and lib/email.ts; wiring them here
  // keeps notifications fire-and-forget per the established convention.
}

async function notifyMemberReversed(
  txn: { id: string; memberId: string | null; voucherNo: string },
  _user: CurrentUser
): Promise<void> {
  if (!txn.memberId) return
  await prisma.memberNotification.create({
    data: {
      memberId: txn.memberId,
      type: "TRANSACTION_REVERSED",
      title: "Transaction Reversed",
      message: `Transaction ${txn.voucherNo} has been reversed. Please contact the Somiti office if you have questions.`,
    },
  })
}

function notificationTemplateFor(type: string): {
  title: string
  message: (amount: number, voucherNo: string) => string
} | null {
  switch (type) {
    case "DEPOSIT":
      return {
        title: "Deposit Successful",
        message: (a, v) =>
          `Your deposit of ৳${a.toLocaleString()} has been credited. Voucher ${v}.`,
      }
    case "WITHDRAWAL":
      return {
        title: "Withdrawal Approved",
        message: (a, v) =>
          `Your withdrawal of ৳${a.toLocaleString()} has been approved. Voucher ${v}.`,
      }
    case "CHARGE":
      return {
        title: "Charges Deducted",
        message: (a, v) =>
          `A charge of ৳${a.toLocaleString()} has been applied. Voucher ${v}.`,
      }
    case "INCOME_DISTRIBUTION":
      return {
        title: "Profit Credited",
        message: (a, v) =>
          `Profit of ৳${a.toLocaleString()} has been credited to your savings. Voucher ${v}.`,
      }
    default:
      return null
  }
}
