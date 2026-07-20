import prisma from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/permissions"
import { getOrganization } from "@/lib/organization"
import MoneyReceipt from "./MoneyReceipt"
import type { PaymentMethod } from "@/lib/transactions/types"

export const dynamic = "force-dynamic"

/**
 * Printable Money Receipt for a single APPROVED DEPOSIT or WITHDRAWAL.
 *
 * Dedicated route (not inline) so the URL is shareable and the print layout
 * doesn't clash with the admin chrome. Loads the transaction + member + posted
 * journal entry + org info + active bank accounts (the "deposit in future"
 * reference block).
 */
export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ transactionId: string }>
}) {
  const { transactionId } = await params
  const user = await getCurrentUser()
  if (!user) redirect("/")

  const [txn, org, bankAccounts] = await Promise.all([
    prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        member: {
          select: { id: true, memberNo: true, fullName: true, phone: true, photoUrl: true, gender: true },
        },
        cashAccount: { select: { id: true, accountName: true, accountCode: true } },
        journalEntry: {
          include: {
            lines: { include: { account: { select: { accountName: true, accountCode: true } } } },
          },
        },
      },
    }),
    getOrganization(),
    prisma.bankAccount.findMany({
      where: { isActive: true },
      include: { coaAccount: { select: { accountName: true, accountCode: true } } },
      orderBy: [{ paymentMethod: "asc" }, { isDefault: "desc" }, { accountName: "asc" }],
    }),
  ])

  if (!txn) notFound()

  // Only approved deposits & withdrawals have a posted voucher to render.
  if (txn.status !== "APPROVED" || (txn.transactionType !== "DEPOSIT" && txn.transactionType !== "WITHDRAWAL")) {
    notFound()
  }

  return (
    <MoneyReceipt
      txn={{
        id: txn.id,
        voucherNo: txn.voucherNo,
        transactionType: txn.transactionType as "DEPOSIT" | "WITHDRAWAL",
        subType: txn.subType,
        amount: Number(txn.amount),
        paymentMethod: txn.paymentMethod as PaymentMethod | null,
        referenceNo: txn.referenceNo,
        remarks: txn.remarks,
        breakdown: (txn.breakdown as Record<string, string> | null) ?? null,
        transactionDate: txn.transactionDate.toISOString(),
        approvedAt: txn.approvedAt?.toISOString() ?? null,
        approvedBy: txn.approvedBy,
      }}
      member={
        txn.member
          ? {
              id: txn.member.id,
              memberNo: txn.member.memberNo,
              fullName: txn.member.fullName,
              phone: txn.member.phone,
              photoUrl: txn.member.photoUrl,
              gender: txn.member.gender,
            }
          : null
      }
      cashAccount={
        txn.cashAccount
          ? {
              id: txn.cashAccount.id,
              accountName: txn.cashAccount.accountName,
              accountCode: txn.cashAccount.accountCode,
            }
          : null
      }
      journalEntry={
        txn.journalEntry
          ? {
              voucherNo: txn.journalEntry.voucherNo,
              voucherType: txn.journalEntry.voucherType as "RECEIPT" | "PAYMENT" | "JOURNAL" | "CONTRA",
              narration: txn.journalEntry.narration,
              totalDebit: Number(txn.journalEntry.totalDebit),
              totalCredit: Number(txn.journalEntry.totalCredit),
              lines: txn.journalEntry.lines.map((l) => ({
                id: l.id,
                accountCode: l.account.accountCode,
                accountName: l.account.accountName,
                debit: Number(l.debit),
                credit: Number(l.credit),
                memo: l.memo,
              })),
            }
          : null
      }
      org={org}
      bankAccounts={bankAccounts.map((b) => ({
        id: b.id,
        accountName: b.accountName,
        bankName: b.bankName,
        accountNumber: b.accountNumber,
        branch: b.branch,
        paymentMethod: b.paymentMethod as PaymentMethod,
        coaAccountName: b.coaAccount.accountName,
        isDefault: b.isDefault,
      }))}
    />
  )
}
