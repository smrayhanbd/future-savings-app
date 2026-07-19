"use server"

// Fines & Penalties management (FRS §5.5, §12.3).
//
// FineTypes are configurable categories with a penaltyPoints value that feeds
// the FINE KPI. Fines are issued against members; paying or waiving a fine
// reverses its penalty immediately via a Trust Score recalc.

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { recalculateTrustScore } from "@/lib/trustScore"
import { Prisma } from "@prisma/client"

const FINES_PATH = "/dashboard/fines"

// =====================================================================
// FINE TYPES (FRS §12.3)
// =====================================================================

export async function createFineType(formData: FormData) {
  const typeName = (formData.get("typeName") as string)?.trim()
  const penaltyPoints = parseInt((formData.get("penaltyPoints") as string) || "0", 10)
  if (!typeName) throw new Error("Fine type name is required.")
  if (!penaltyPoints || penaltyPoints <= 0) {
    throw new Error("Penalty points must be greater than zero.")
  }

  try {
    await prisma.fineType.create({ data: { typeName, penaltyPoints } })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new Error("A fine type with this name already exists.")
    }
    throw e
  }
  revalidatePath(FINES_PATH)
  redirect(FINES_PATH)
}

export async function toggleFineTypeStatus(id: string, isActive: boolean) {
  await prisma.fineType.update({ where: { id }, data: { isActive } })
  revalidatePath(FINES_PATH)
}

export async function deleteFineType(id: string) {
  // Guard: cannot delete a type that's referenced by existing fines.
  const inUse = await prisma.fine.count({ where: { fineTypeId: id } })
  if (inUse > 0) {
    throw new Error("Cannot delete: this fine type is used by existing fines. Deactivate it instead.")
  }
  await prisma.fineType.delete({ where: { id } })
  revalidatePath(FINES_PATH)
}

// =====================================================================
// FINES (issue / pay / waive) — FRS §5.5, §8.4
// =====================================================================

export async function issueFine(formData: FormData) {
  const memberId = formData.get("memberId") as string
  const fineTypeId = formData.get("fineTypeId") as string
  const amount = parseFloat((formData.get("amount") as string) || "0") || 0
  const notes = (formData.get("notes") as string) || null

  if (!memberId || !fineTypeId) {
    throw new Error("Member and fine type are required.")
  }

  const fineType = await prisma.fineType.findUnique({ where: { id: fineTypeId } })
  if (!fineType || !fineType.isActive) {
    throw new Error("Selected fine type is not active.")
  }

  const fine = await prisma.fine.create({
    data: {
      memberId,
      fineTypeId,
      amount,
      status: "ISSUED",
      notes,
      referenceType: "manual",
    },
  })

  // Optionally mirror to the unified ledger as a FINE Savings row, so the
  // existing reports/due-list keep showing the fine amount consistently.
  if (amount > 0) {
    const count = await prisma.savings.count()
    const receiptNo = `FN${String(count + 1).padStart(4, "0")}`
    const savings = await prisma.savings.create({
      data: {
        receiptNo,
        memberId,
        amount,
        type: "FINE",
        method: "CASH",
        date: new Date(),
      },
    })
    await prisma.fine.update({
      where: { id: fine.id },
      data: { referenceType: "savings", referenceId: savings.id },
    })
  }

  // Trust Score: an issued (unresolved) fine deducts from the FINE KPI.
  try {
    await recalculateTrustScore(memberId, "FINE_ISSUED", {
      referenceId: fine.id,
      referenceType: "fine",
    })
  } catch (e) {
    console.error("[trustScore] issueFine hook failed:", e)
  }

  revalidatePath(FINES_PATH)
  revalidatePath(`/dashboard/members/${memberId}`)
  redirect(FINES_PATH)
}

/** Mark a fine as paid — reverses its penalty (FRS §5.5). */
export async function payFine(fineId: string) {
  const fine = await prisma.fine.findUnique({ where: { id: fineId } })
  if (!fine) throw new Error("Fine not found.")
  if (fine.status !== "ISSUED") throw new Error("Only issued fines can be paid.")

  await prisma.fine.update({
    where: { id: fineId },
    data: { status: "PAID", resolvedDate: new Date() },
  })

  try {
    await recalculateTrustScore(fine.memberId, "FINE_PAID", {
      referenceId: fineId,
      referenceType: "fine",
    })
  } catch (e) {
    console.error("[trustScore] payFine hook failed:", e)
  }

  revalidatePath(FINES_PATH)
  revalidatePath(`/dashboard/members/${fine.memberId}`)
}

/** Waive a fine — reverses its penalty immediately (FRS §5.5 / §8.4). */
export async function waiveFine(fineId: string) {
  const fine = await prisma.fine.findUnique({ where: { id: fineId } })
  if (!fine) throw new Error("Fine not found.")
  if (fine.status !== "ISSUED") throw new Error("Only issued fines can be waived.")

  await prisma.fine.update({
    where: { id: fineId },
    data: { status: "WAIVED", resolvedDate: new Date() },
  })

  try {
    await recalculateTrustScore(fine.memberId, "FINE_WAIVED", {
      referenceId: fineId,
      referenceType: "fine",
    })
  } catch (e) {
    console.error("[trustScore] waiveFine hook failed:", e)
  }

  revalidatePath(FINES_PATH)
  revalidatePath(`/dashboard/members/${fine.memberId}`)
}
