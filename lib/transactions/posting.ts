import { Prisma } from "@prisma/client"
import { nextVoucherNo } from "@/lib/accounting"
import { buildJournalSpecs, resolveAccountId } from "./rules"
import type { VoucherType } from "@/lib/accounting"

export interface PostInput {
  transactionId: string
  transactionType: "DEPOSIT" | "WITHDRAWAL" | "CHARGE" | "INCOME_DISTRIBUTION"
  amount: number
  memberId?: string | null
  cashAccountId: string | null
  referenceNo?: string | null
  narration: string
  /** Savings row type to mirror (e.g. MONTHLY / WITHDRAWAL / FINE / DONATION). */
  savingsType: string
  /** Savings row method (CASH / BKASH / BANK). */
  savingsMethod: string
  /** −1 for reversals (negates the member-facing mirror amount). */
  sign?: 1 | -1
}

export interface PostResult {
  journalEntryId: string
  journalVoucherNo: string
  savingsMirrorId: string | null
}

/**
 * Apply (or reverse) the financial effects of a transaction inside the
 * caller's `prisma.$transaction`. Writes BOTH:
 *
 *   1. the double-entry GL — JournalEntry + JournalLines + Account balances
 *   2. the member-facing Savings mirror row (the legacy ledger member
 *      balances are derived from — preserves existing UX, due lists, trust
 *      score hooks)
 *
 * This is the bridge the two parallel ledgers previously lacked. If anything
 * throws, the caller's whole transaction rolls back (spec §17).
 */
export async function postTransactionEffects(
  tx: Prisma.TransactionClient,
  input: PostInput
): Promise<PostResult> {
  const sign = input.sign ?? 1
  const specs = buildJournalSpecs(input.transactionType, {
    cashAccountId: input.cashAccountId,
    memberId: input.memberId,
    amount: input.amount,
  })

  // Resolve every account code → id up front so missing accounts fail BEFORE
  // we write anything. The "__CASH__" sentinel is replaced by the selected
  // cash/bank/wallet account.
  const resolvedLines: {
    accountId: string
    debit: number
    credit: number
    memo?: string
  }[] = []
  for (const spec of specs) {
    let accountId: string
    if (spec.accountCode === "__CASH__") {
      if (!input.cashAccountId) {
        throw new Error("A Cash / Bank / Mobile Wallet account is required.")
      }
      accountId = input.cashAccountId
    } else {
      accountId = await resolveAccountId(tx, spec.accountCode)
    }
    resolvedLines.push({
      accountId,
      // For reversals we swap debit/credit rather than negating amounts, which
      // keeps the journal readable and `Σdebit = Σcredit` invariant intact.
      debit: sign === -1 ? spec.credit : spec.debit,
      credit: sign === -1 ? spec.debit : spec.credit,
      memo: spec.memo,
    })
  }

  // Validate balance (≤ 0.005 tolerance, same convention as journal.ts).
  const totalDebit = resolvedLines.reduce((s, l) => s + l.debit, 0)
  const totalCredit = resolvedLines.reduce((s, l) => s + l.credit, 0)
  if (Math.abs(totalDebit - totalCredit) > 0.005) {
    throw new Error(
      `Voucher not balanced. Debits ${totalDebit.toFixed(2)} ≠ Credits ${totalCredit.toFixed(2)}.`
    )
  }

  // Voucher type: RECEIPT for inflows, PAYMENT for outflows, JOURNAL otherwise.
  const voucherType: VoucherType =
    input.transactionType === "DEPOSIT"
      ? "RECEIPT"
      : input.transactionType === "WITHDRAWAL"
      ? "PAYMENT"
      : "JOURNAL"

  // Create the JournalEntry + lines and apply balance effects in one tx.
  const voucherNo = await nextVoucherNo(voucherType)
  const entry = await tx.journalEntry.create({
    data: {
      voucherNo,
      voucherType,
      entryDate: new Date(),
      narration: input.narration,
      referenceNo: input.referenceNo || null,
      memberId: input.memberId || null,
      status: "POSTED", // posted immediately as part of approval
      totalDebit,
      totalCredit,
      lines: {
        create: resolvedLines.map((l) => ({
          accountId: l.accountId,
          debit: l.debit,
          credit: l.credit,
          memo: l.memo?.trim() || null,
        })),
      },
    },
  })

  // Apply account balance effects. (journal.ts keeps applyLineEffects private;
  // we re-implement the small, well-tested formula here so this can run inside
  // the caller's transaction without a circular import.)
  await applyLineEffects(tx, resolvedLines, 1)

  // Member-facing mirror row. This is what the existing member-ledger,
  // due-list, and trust-score code reads. Without it, member balances would
  // drift from the GL. The pattern mirrors loan.ts's recordRepayment.
  let savingsMirrorId: string | null = null
  if (input.memberId) {
    const mirrorAmount = sign * Number(input.amount)
    const mirror = await tx.savings.create({
      data: {
        memberId: input.memberId,
        amount: Math.abs(mirrorAmount),
        type: input.savingsType,
        method: input.savingsMethod,
        date: new Date(),
      },
    })
    savingsMirrorId = mirror.id
    // Note: for withdrawals (sign −1) the mirror is still a positive amount
    // row with type "WITHDRAWAL", which the existing balance math treats as
    // a subtraction (see deposits/page.tsx). So no sign flip is needed on
    // the Savings side for withdrawals.
  }

  return { journalEntryId: entry.id, journalVoucherNo: voucherNo, savingsMirrorId }
}

/**
 * Mutate `Account.currentBalance` for each line's account, grouped so each
 * account is updated once. Net effect follows the account's nature:
 *   DEBIT-natured  → increases on debit, decreases on credit
 *   CREDIT-natured → increases on credit, decreases on debit
 *
 * Identical to the private helper in app/actions/journal.ts; duplicated to
 * keep the modules decoupled while staying inside the same DB transaction.
 */
async function applyLineEffects(
  tx: Prisma.TransactionClient,
  lines: { accountId: string; debit: number; credit: number }[],
  sign: 1 | -1
): Promise<void> {
  const grouped = new Map<string, { debit: number; credit: number }>()
  for (const l of lines) {
    const g = grouped.get(l.accountId) ?? { debit: 0, credit: 0 }
    g.debit += Number(l.debit || 0)
    g.credit += Number(l.credit || 0)
    grouped.set(l.accountId, g)
  }
  for (const [accountId, { debit, credit }] of grouped) {
    const acc = await tx.account.findUnique({
      where: { id: accountId },
      select: { nature: true, currentBalance: true },
    })
    if (!acc) continue
    const net = acc.nature === "DEBIT" ? debit - credit : credit - debit
    const next = Number(acc.currentBalance) + sign * net
    await tx.account.update({
      where: { id: accountId },
      data: { currentBalance: next },
    })
  }
}
