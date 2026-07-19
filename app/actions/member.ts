"use server"

import prisma from "@/lib/prisma"
import { Prisma, Gender, BloodGroup, MaritalStatus, MemberStatus } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { uploadImage } from "@/lib/cloudinary"
import { sendEmail } from "@/lib/email"
import { sendSMS } from "@/lib/sms"
import { recalculateTrustScore } from "@/lib/trustScore"

/** Nominee payload built from form data before being written via Prisma. */
interface NomineeInput {
  name: string
  relation: string
  phone: string
  sharePercentage: number
  idType: string
  nidNumber: string
  idDocumentUrl: string | null
  photoUrl: string | null
}

/** Narrow an unknown catch value to a Prisma-like error with `.code` / `.meta`. */
function prismaErrorMeta(e: unknown): { code?: string; target?: string[] } {
  if (e && typeof e === "object" && "code" in e) {
    const code = (e as { code: unknown }).code
    const meta = "meta" in e ? (e as { meta?: { target?: unknown } }).meta : undefined
    const target = Array.isArray(meta?.target) ? (meta!.target as string[]) : []
    return { code: typeof code === "string" ? code : undefined, target }
  }
  return {}
}

// --- Add Member Action ---
export async function addMember(formData: FormData, isPublic: boolean = false) {
  // 1. Extract Data
  const firstName = formData.get("firstName") as string
  const lastName = formData.get("lastName") as string
  const fullName = `${firstName} ${lastName}`
  const fatherName = (formData.get("fatherName") as string) || null
  const motherName = (formData.get("motherName") as string) || null
  const spouseName = (formData.get("spouseName") as string) || null
  const dob = formData.get("dob") as string
  const gender = (formData.get("gender") as string) || undefined
  const religion = (formData.get("religion") as string) || null
  const nationality = (formData.get("nationality") as string) || "Bangladeshi"
  const bloodGroup = formData.get("bloodGroup") as string || undefined
  const profession = (formData.get("profession") as string) || null
  const phone = formData.get("phone") as string
  const email = (formData.get("email") as string) || null
  const emergencyPhone = (formData.get("emergencyPhone") as string) || null
  const emergencyContactName = (formData.get("emergencyContactName") as string) || null
  const idType = formData.get("idType") as string
  const idNumber = (formData.get("idNumber") as string) || null
  const maritalStatus = formData.get("maritalStatus") as string || undefined
  const marriageDate = formData.get("marriageDate") as string
  const accountName = (formData.get("accountName") as string) || null
  const accountNumber = (formData.get("accountNumber") as string) || null
  const bankName = (formData.get("bankName") as string) || null
  const branch = (formData.get("branch") as string) || null
  const routingNumber = (formData.get("routingNumber") as string) || null
  const c_village = (formData.get("c_village") as string) || null
  const c_postOffice = (formData.get("c_postOffice") as string) || null
  const c_district = (formData.get("c_district") as string) || null
  const c_postalCode = (formData.get("c_postalCode") as string) || null
  const p_village = (formData.get("p_village") as string) || null
  const p_postOffice = (formData.get("p_postOffice") as string) || null
  const p_district = (formData.get("p_district") as string) || null
  const p_postalCode = (formData.get("p_postalCode") as string) || null

  const nidNumber = idType === "National ID" ? idNumber : null
  const passportNumber = idType === "Passport" ? idNumber : null
  const birthCertificateNo = idType === "Birth Certificate" ? idNumber : null

  // Referral: resolve the referrer's memberNo to an id (optional, best-effort).
  const referredByMemberNo = (formData.get("referredByMemberNo") as string)?.trim() || null
  const referredByMemberId = await resolveReferrer(referredByMemberNo)

  // 1b. Duplicate check BEFORE uploads/transaction.
  // `phone` is intentionally not @unique in the schema, so it is checked explicitly.
  // ID fields (nid/passport/birthCert) ARE @unique, but we pre-check them too so the
  // user gets a clear, field-targeted message instead of a generic DB error.
  const dupClauses = [
    ...(email ? [{ email }] : []),
    { phone },
    ...(nidNumber ? [{ nidNumber }] : []),
    ...(passportNumber ? [{ passportNumber }] : []),
    ...(birthCertificateNo ? [{ birthCertificateNo }] : []),
  ]
  const existing = dupClauses.length
    ? await prisma.member.findFirst({
        where: { OR: dupClauses },
        select: { email: true, phone: true, nidNumber: true, passportNumber: true, birthCertificateNo: true },
      })
    : null

  if (existing) {
    const emailClash = !!email && existing.email === email
    const phoneClash = existing.phone === phone
    const idClash =
      (!!nidNumber && existing.nidNumber === nidNumber) ||
      (!!passportNumber && existing.passportNumber === passportNumber) ||
      (!!birthCertificateNo && existing.birthCertificateNo === birthCertificateNo)

    if ((emailClash || phoneClash) && idClash) throw new Error("DUPLICATE_BOTH")
    if (emailClash && phoneClash) throw new Error("DUPLICATE_BOTH")
    if (emailClash) throw new Error("DUPLICATE_EMAIL")
    if (phoneClash) throw new Error("DUPLICATE_PHONE")
    if (idClash) throw new Error("DUPLICATE_ID")
  }

  // 2. Handle File Uploads OUTSIDE the transaction to prevent timeout
  const memberPhotoFile = formData.get("memberPhoto") as File
  const memberPhotoUrl = memberPhotoFile?.size > 0 ? await uploadImage(memberPhotoFile) : null

  const idDocFile = formData.get("idDocument") as File
  const idDocUrl = idDocFile?.size > 0 ? await uploadImage(idDocFile) : null

  // Upload Additional Docs
  const additionalDocsData: { name: string; fileName: string; fileUrl: string }[] = []
  let docIndex = 0
  while (true) {
    const docName = formData.get(`doc_${docIndex}_name`) as string
    const docFile = formData.get(`doc_${docIndex}_file`) as File
    if (!docName && !docFile) break

    if (docFile?.size > 0) {
      const docUrl = await uploadImage(docFile)
      if (docUrl) {
        additionalDocsData.push({ name: docName || "Additional Document", fileName: docFile.name, fileUrl: docUrl })
      }
    }
    docIndex++
  }

  // Upload Nominees Data
  const nomineesData: NomineeInput[] = []
  let i = 0
  while (true) {
    const nomName = formData.get(`nom_${i}_name`) as string
    if (!nomName) break

    const nomRelation = formData.get(`nom_${i}_relation`) as string
    const nomShare = formData.get(`nom_${i}_share`) as string
    const nomPhone = formData.get(`nom_${i}_phone`) as string
    const nomIdType = formData.get(`nom_${i}_idType`) as string
    const nomIdNumber = formData.get(`nom_${i}_idNumber`) as string

    const nomPhotoFile = formData.get(`nom_${i}_photo`) as File
    const nomPhotoUrl = nomPhotoFile?.size > 0 ? await uploadImage(nomPhotoFile) : null

    const nomIdDocFile = formData.get(`nom_${i}_idDoc`) as File
    const nomIdDocUrl = nomIdDocFile?.size > 0 ? await uploadImage(nomIdDocFile) : null

    nomineesData.push({
      name: nomName, relation: nomRelation || "Unknown",
      phone: nomPhone, sharePercentage: nomShare ? parseFloat(nomShare) : 0,
      idType: nomIdType, nidNumber: nomIdNumber, idDocumentUrl: nomIdDocUrl, photoUrl: nomPhotoUrl,
    })
    i++
  }

  // 3. Generate Member No
  const memberCount = await prisma.member.count()
  const memberNo = `M${String(memberCount + 1).padStart(4, "0")}`

  // 4. Save to Database (Fast transaction with no network uploads inside)
  let member: Prisma.MemberGetPayload<Record<string, never>>
  try {
    member = await prisma.$transaction(async (tx) => {
      const newMember = await tx.member.create({
        data: {
          memberNo, firstName, lastName, fullName, fatherName, motherName, spouseName,
          dateOfBirth: dob ? new Date(dob) : null,
          gender: gender as Gender, religion, nationality,
          bloodGroup: bloodGroup as BloodGroup, profession,
          phone, emergencyPhone, emergencyContactName, email,
          maritalStatus: maritalStatus as MaritalStatus, marriageDate: marriageDate ? new Date(marriageDate) : null,
          nidNumber, passportNumber, birthCertificateNo,
          accountName, accountNumber, bankName, branch, routingNumber,
          photoUrl: memberPhotoUrl,
          referredByMemberId,
          status: "PENDING",
        },
      })

      if (c_village || c_district) {
        await tx.memberAddress.create({
          data: { memberId: newMember.id, addressType: "CURRENT", village: c_village, postOffice: c_postOffice, district: c_district, postalCode: c_postalCode }
        })
      }
      if (p_village || p_district) {
        await tx.memberAddress.create({
          data: { memberId: newMember.id, addressType: "PERMANENT", village: p_village, postOffice: p_postOffice, district: p_district, postalCode: p_postalCode }
        })
      }

      if (idDocUrl) {
        await tx.memberDocument.create({
          data: { memberId: newMember.id, documentType: idType || "ID", name: "Member ID Document", fileName: idDocFile.name, fileUrl: idDocUrl }
        })
      }

      // Save Additional Docs
      for (const doc of additionalDocsData) {
        await tx.memberDocument.create({
          data: { memberId: newMember.id, documentType: "ADDITIONAL", name: doc.name, fileName: doc.fileName, fileUrl: doc.fileUrl }
        });
      }

      // Save Nominees
      for (const nom of nomineesData) {
        await tx.memberNominee.create({
          data: {
            memberId: newMember.id,
            ...nom
          }
        })
      }

      return newMember
    })
  } catch (error) {
    const { code, target } = prismaErrorMeta(error)
    if (code === 'P2002') {
      // Identify the actual unique field that collided (Prisma gives it in meta.target)
      if (target?.includes("phone")) throw new Error("DUPLICATE_PHONE")
      if (target?.includes("nidNumber") || target?.includes("passportNumber") || target?.includes("birthCertificateNo")) {
        throw new Error("DUPLICATE_ID")
      }
      // memberNo collisions (or any email-constraint race) default to a clear message
      throw new Error("DUPLICATE_EMAIL")
    }
    console.error("Failed to create member:", error)
    throw error
  }

  // 5. Handle Public Registration Notifications (Thank You)
  if (isPublic && member) {
    if (member.email) {
      try {
        await sendEmail(
          member.email,
          "Registration Received - Future Savings Foundation",
          `<p>Dear ${member.fullName},</p><p>Thank you for registering with Future Savings Foundation. Your application (ID: <strong>${member.memberNo}</strong>) is now pending approval by our management team.</p><p>We will notify you via SMS and Email once your account is approved and activated.</p>`
        )
      } catch (emailError) {
        console.error("Failed to send registration email:", emailError)
      }
    }
    
    if (member.phone) {
      try {
        const smsMsg = `Thank you for registering with Future Savings Foundation! Your application (ID: ${member.memberNo}) is pending approval. You will receive your login credentials once approved.`
        const smsRes = await sendSMS(member.phone, smsMsg)
        if (smsRes.status !== "OK") {
          await prisma.notification.create({
            data: {
              type: "SMS_ERROR",
              title: "Registration SMS Failed",
              message: `Failed to send registration SMS to ${member.fullName} (${member.phone}). Reason: ${smsRes.response}`
            }
          })
        }
      } catch (smsError) {
        console.error("Failed to send registration SMS:", smsError)
      }
    }
    return member
  } else {
    revalidatePath("/dashboard/approvals")
    redirect("/dashboard/approvals")
  }
}

// --- Public Registration Action ---
export async function registerMember(formData: FormData) {
  try {
    await addMember(formData, true)
  } catch (error) {
    const code = error instanceof Error ? error.message : ""
    if (code === "DUPLICATE_BOTH") {
      return {
        error: "A member with this email & phone number already exists. Please use a different email and phone number.",
        field: "both",
      }
    }
    if (code === "DUPLICATE_EMAIL") {
      return {
        error: "A member with this email already exists. Please use a different email.",
        field: "email",
      }
    }
    if (code === "DUPLICATE_PHONE") {
      return {
        error: "A member with this phone number already exists. Please use a different phone number.",
        field: "phone",
      }
    }
    if (code === "DUPLICATE_ID") {
      return {
        error: "A member with this ID number already exists. Please check your ID type and number, or contact support.",
        field: "idNumber",
      }
    }
    // Fallback: Prisma unique-constraint violation or legacy message
    if (prismaErrorMeta(error).code === 'P2002' || code.includes('already exists') || code.includes('Unique constraint')) {
      return {
        error: "A member with this email already exists. Please use a different email.",
        field: "email",
      }
    }
    console.error("Registration failed:", error)
    return { error: "Could not submit application. Please try again." }
  }

  return { success: true }
}

// --- Update Member Action ---
export async function updateMember(memberId: string, formData: FormData) {
  // 1. Extract Data
  const firstName = formData.get("firstName") as string
  const lastName = formData.get("lastName") as string
  const fullName = `${firstName} ${lastName}`
  const fatherName = (formData.get("fatherName") as string) || null
  const motherName = (formData.get("motherName") as string) || null
  const spouseName = (formData.get("spouseName") as string) || null
  const dob = formData.get("dob") as string
  const gender = (formData.get("gender") as string) || undefined
  const religion = (formData.get("religion") as string) || null
  const nationality = (formData.get("nationality") as string) || "Bangladeshi"
  const bloodGroup = formData.get("bloodGroup") as string || undefined
  const profession = (formData.get("profession") as string) || null
  const phone = formData.get("phone") as string
  const email = (formData.get("email") as string) || null
  const emergencyPhone = (formData.get("emergencyPhone") as string) || null
  const emergencyContactName = (formData.get("emergencyContactName") as string) || null
  const idType = formData.get("idType") as string
  const idNumber = (formData.get("idNumber") as string) || null
  const maritalStatus = formData.get("maritalStatus") as string || undefined
  const marriageDate = formData.get("marriageDate") as string
  const accountName = (formData.get("accountName") as string) || null
  const accountNumber = (formData.get("accountNumber") as string) || null
  const bankName = (formData.get("bankName") as string) || null
  const branch = (formData.get("branch") as string) || null
  const routingNumber = (formData.get("routingNumber") as string) || null
  const c_village = (formData.get("c_village") as string) || null
  const c_postOffice = (formData.get("c_postOffice") as string) || null
  const c_district = (formData.get("c_district") as string) || null
  const c_postalCode = (formData.get("c_postalCode") as string) || null
  const p_village = (formData.get("p_village") as string) || null
  const p_postOffice = (formData.get("p_postOffice") as string) || null
  const p_district = (formData.get("p_district") as string) || null
  const p_postalCode = (formData.get("p_postalCode") as string) || null

  // Extract Join Date (Membership Date)
  const joinedDate = formData.get("joinedDate") as string
  const kycVerified = formData.get("kycVerified") === "on"

  const nidNumber = idType === "National ID" ? idNumber : null
  const passportNumber = idType === "Passport" ? idNumber : null
  const birthCertificateNo = idType === "Birth Certificate" ? idNumber : null

  // Referral: resolve the referrer's memberNo to an id (optional, best-effort).
  const referredByMemberNo = (formData.get("referredByMemberNo") as string)?.trim() || null
  const referredByMemberId = await resolveReferrer(referredByMemberNo)

  // 2. Fetch existing to preserve files if not updated
  const existingMember = await prisma.member.findUnique({
    where: { id: memberId },
    include: { documents: true, nominees: true }
  })

  const memberPhotoFile = formData.get("memberPhoto") as File
  const memberPhotoUrl = memberPhotoFile?.size > 0 ? await uploadImage(memberPhotoFile) : existingMember?.photoUrl

  const idDocFile = formData.get("idDocument") as File
  const idDocUrl = idDocFile?.size > 0 ? await uploadImage(idDocFile) : existingMember?.documents.find(d => d.documentType === idType)?.fileUrl

  // Upload Additional Docs
  const additionalDocsData: { name: string; fileName: string; fileUrl: string }[] = []
  let docIndex = 0
  while (true) {
    const docName = formData.get(`doc_${docIndex}_name`) as string
    const docFile = formData.get(`doc_${docIndex}_file`) as File
    if (!docName && !docFile) break

    if (docFile?.size > 0) {
      const docUrl = await uploadImage(docFile)
      if (docUrl) {
        additionalDocsData.push({ name: docName || "Additional Document", fileName: docFile.name, fileUrl: docUrl })
      }
    }
    docIndex++
  }

  // Upload Nominees Data
  const nomineesData: NomineeInput[] = []
  let i = 0
  while (true) {
    const nomName = formData.get(`nom_${i}_name`) as string
    if (!nomName) break

    const nomRelation = formData.get(`nom_${i}_relation`) as string
    const nomShare = formData.get(`nom_${i}_share`) as string
    const nomPhone = formData.get(`nom_${i}_phone`) as string
    const nomIdType = formData.get(`nom_${i}_idType`) as string
    const nomIdNumber = formData.get(`nom_${i}_idNumber`) as string
    
    const nomDbId = formData.get(`nom_${i}_dbId`) as string
    const existingNom = existingMember?.nominees.find(n => n.id === nomDbId)
    
    const nomPhotoFile = formData.get(`nom_${i}_photo`) as File
    const nomPhotoUrl = nomPhotoFile?.size > 0 ? await uploadImage(nomPhotoFile) : existingNom?.photoUrl || null
    
    const nomIdDocFile = formData.get(`nom_${i}_idDoc`) as File
    const nomIdDocUrl = nomIdDocFile?.size > 0 ? await uploadImage(nomIdDocFile) : existingNom?.idDocumentUrl || null

    nomineesData.push({
      name: nomName, relation: nomRelation || "Unknown",
      phone: nomPhone, sharePercentage: nomShare ? parseFloat(nomShare) : 0,
      idType: nomIdType, nidNumber: nomIdNumber, idDocumentUrl: nomIdDocUrl, photoUrl: nomPhotoUrl,
    })
    i++
  }

  // 3. Update Database
  try {
    await prisma.$transaction(async (tx) => {
      await tx.member.update({
        where: { id: memberId },
        data: {
          firstName, lastName, fullName, fatherName, motherName, spouseName,
          // Save the joining date and KYC status here:
          membershipDate: joinedDate ? new Date(joinedDate) : undefined,
          kycVerified: kycVerified,
          dateOfBirth: dob ? new Date(dob) : null,
          // ... rest of the fields
          gender: gender as Gender, religion, nationality,
          bloodGroup: bloodGroup as BloodGroup, profession,
          phone, emergencyPhone, emergencyContactName, email,
          maritalStatus: maritalStatus as MaritalStatus, marriageDate: marriageDate ? new Date(marriageDate) : null,
          nidNumber, passportNumber, birthCertificateNo,
          accountName, accountNumber, bankName, branch, routingNumber,
          photoUrl: memberPhotoUrl,
          referredByMemberId,
          status: ((formData.get("memberStatus") as string) || "ACTIVE").toUpperCase() as MemberStatus,
        },
      })

      // Update Addresses
      await tx.memberAddress.deleteMany({ where: { memberId } })
      if (c_village || c_district) {
        await tx.memberAddress.create({ data: { memberId, addressType: "CURRENT", village: c_village, postOffice: c_postOffice, district: c_district, postalCode: c_postalCode } })
      }
      if (p_village || p_district) {
        await tx.memberAddress.create({ data: { memberId, addressType: "PERMANENT", village: p_village, postOffice: p_postOffice, district: p_district, postalCode: p_postalCode } })
      }

      // Update ID Doc
      if (idDocUrl) {
        await tx.memberDocument.deleteMany({ where: { memberId, documentType: idType } })
        await tx.memberDocument.create({ data: { memberId, documentType: idType || "ID", name: "Member ID Document", fileName: idDocFile?.name || "existing", fileUrl: idDocUrl } })
      }

      // Update Additional Docs
      await tx.memberDocument.deleteMany({ where: { memberId, documentType: "ADDITIONAL" } })
      for (const doc of additionalDocsData) {
        await tx.memberDocument.create({
          data: { memberId, documentType: "ADDITIONAL", name: doc.name, fileName: doc.fileName, fileUrl: doc.fileUrl }
        });
      }

      // Update Nominees
      await tx.memberNominee.deleteMany({ where: { memberId } })
      for (const nom of nomineesData) {
        await tx.memberNominee.create({
          data: {
            memberId, ...nom
          }
        })
      }
    })
  } catch (error) {
    if (prismaErrorMeta(error).code === 'P2002') {
      throw new Error("A member with this email already exists. Please use a different email.")
    }
    console.error("Failed to update member:", error)
    throw error
  }

  revalidatePath(`/dashboard/members/${memberId}`)
  redirect(`/dashboard/members/${memberId}`)
}

// --- Update Member Status Action (Suspend/Activate) ---
export async function updateMemberStatus(memberId: string, status: "ACTIVE" | "SUSPENDED" | "INACTIVE") {
  // Capture the prior status so we can emit the right Trust Score event.
  const before = await prisma.member.findUnique({
    where: { id: memberId },
    select: { status: true },
  })

  await prisma.member.update({
    where: { id: memberId },
    data: { status },
  })

  // Trust Score event hooks (FRS §8.6 / §9).
  // - Reactivation runs a full recalc and lifts suspension if score clears threshold.
  // - Manual suspension records the event in the audit log.
  try {
    if (status === "ACTIVE" && before?.status === "SUSPENDED") {
      await recalculateTrustScore(memberId, "MEMBER_REACTIVATED", {
        referenceType: "member",
        createdBy: "COMMITTEE",
      })
    } else if (status === "SUSPENDED") {
      await recalculateTrustScore(memberId, "MEMBER_SUSPENDED", {
        referenceType: "member",
        createdBy: "COMMITTEE",
      })
    }
  } catch (e) {
    console.error("[trustScore] updateMemberStatus hook failed:", e)
  }

  revalidatePath(`/dashboard/members/${memberId}`)
  revalidatePath("/dashboard/members")
}

// --- Delete Member Action ---
export async function deleteMember(memberId: string) {
  // Cascading delete will automatically remove addresses, nominees, documents, and savings
  await prisma.member.delete({
    where: { id: memberId },
  })

  revalidatePath("/dashboard/members")
}

// --- Toggle KYC Verification ---
export async function setMemberKyc(memberId: string, kycVerified: boolean) {
  await prisma.member.update({
    where: { id: memberId },
    data: { kycVerified },
  })

  revalidatePath(`/dashboard/members/${memberId}`)
  revalidatePath("/dashboard/members")
}

// --- Bulk Update Status (Activate / Suspend / Inactive) ---
export async function bulkUpdateMemberStatus(
  memberIds: string[],
  status: "ACTIVE" | "SUSPENDED" | "INACTIVE"
) {
  if (!memberIds.length) return

  await prisma.member.updateMany({
    where: { id: { in: memberIds } },
    data: { status },
  })

  revalidatePath("/dashboard/members")
}

// --- Bulk Delete Members ---
export async function bulkDeleteMembers(memberIds: string[]) {
  if (!memberIds.length) return

  // Cascade rules on the Member relations handle addresses/nominees/documents/savings.
  await prisma.member.deleteMany({
    where: { id: { in: memberIds } },
  })

  revalidatePath("/dashboard/members")
}

// --- Reject an Application (keep record as history with remark) ---
export async function rejectMemberWithRemark(memberId: string, remark: string) {
  await prisma.member.update({
    where: { id: memberId },
    data: {
      status: "REJECTED",
      remarks: remark?.trim() ? remark.trim() : "Application rejected by administrator.",
    },
  })

  revalidatePath("/dashboard/approvals")
  revalidatePath("/dashboard/members")
}

// =====================================================================
// Referral helper — resolves a referrer's memberNo to an id (FRS §5.6).
// Best-effort: a blank or unrecognized memberNo yields null (no referral link),
// so a typo never blocks member creation/editing.
// =====================================================================
async function resolveReferrer(memberNo: string | null): Promise<string | null> {
  if (!memberNo) return null
  const referrer = await prisma.member.findUnique({
    where: { memberNo },
    select: { id: true },
  })
  return referrer?.id ?? null
}
