import prisma from "@/lib/prisma"
import { getOrganization } from "@/lib/organization"
import type { PaymentMethod } from "@/lib/transactions/types"
import type { ReceiptPayload } from "@/lib/pdf/receipt-payload"

/**
 * Build the serializable payload needed to render a money-receipt PDF for a
 * given transaction.
 *
 * Mirrors the data-loading in `app/dashboard/receipts/[transactionId]/page.tsx`
 * so the emailed PDF matches the on-screen voucher exactly. Only APPROVED
 * DEPOSIT / WITHDRAWAL transactions have a posted voucher — for anything else
 * we return `null`, which lets the caller (the approval email path) still send
 * the notification email without an attachment rather than failing the approval.
 *
 * Server-only: imports prisma.
 */
export async function buildReceiptPayload(
  transactionId: string
): Promise<ReceiptPayload | null> {
  const txn = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: {
      member: {
        select: { memberNo: true, fullName: true, phone: true },
      },
      cashAccount: { select: { accountName: true, accountCode: true } },
      journalEntry: { select: { voucherType: true } },
    },
  })

  // No receipt for non-printable transaction states/types.
  if (
    !txn ||
    txn.status !== "APPROVED" ||
    (txn.transactionType !== "DEPOSIT" && txn.transactionType !== "WITHDRAWAL")
  ) {
    return null
  }

  const breakdown = (txn.breakdown as { collectionTypeName?: string } | null) ?? null
  const purpose =
    breakdown?.collectionTypeName ??
    (txn.transactionType === "DEPOSIT" ? "Savings Deposit" : "Withdrawal")

  // Bank accounts shown on deposit receipts (the "for future deposits" block).
  const bankAccounts = await prisma.bankAccount.findMany({
    where: { isActive: true },
    select: {
      id: true,
      accountName: true,
      bankName: true,
      accountNumber: true,
      branch: true,
      paymentMethod: true,
      isDefault: true,
    },
    orderBy: [{ paymentMethod: "asc" }, { isDefault: "desc" }, { accountName: "asc" }],
  })

  const org = await getOrganization()

  return {
    org,
    txn: {
      id: txn.id,
      voucherNo: txn.voucherNo,
      transactionType: txn.transactionType as "DEPOSIT" | "WITHDRAWAL",
      amount: Number(txn.amount),
      paymentMethod: txn.paymentMethod as PaymentMethod | null,
      referenceNo: txn.referenceNo,
      remarks: txn.remarks,
      purpose,
      transactionDate: txn.transactionDate.toISOString(),
      approvedAt: txn.approvedAt?.toISOString() ?? null,
      approvedBy: txn.approvedBy,
      voucherType: (txn.journalEntry?.voucherType ?? "JOURNAL") as
        | "RECEIPT"
        | "PAYMENT"
        | "JOURNAL"
        | "CONTRA",
    },
    member: txn.member
      ? {
          memberNo: txn.member.memberNo,
          fullName: txn.member.fullName,
          phone: txn.member.phone,
        }
      : null,
    cashAccount: txn.cashAccount
      ? {
          accountName: txn.cashAccount.accountName,
          accountCode: txn.cashAccount.accountCode,
        }
      : null,
    bankAccounts: bankAccounts.map((b) => ({
      id: b.id,
      accountName: b.accountName,
      bankName: b.bankName,
      accountNumber: b.accountNumber,
      branch: b.branch,
      paymentMethod: b.paymentMethod as PaymentMethod,
      isDefault: b.isDefault,
    })),
  }
}
