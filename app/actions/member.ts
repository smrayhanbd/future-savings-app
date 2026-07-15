"use server"

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { uploadImage } from "@/lib/cloudinary"
import { sendEmail } from "@/lib/email"
import { sendSMS } from "@/lib/sms"
import { z } from "zod"

// Enterprise Backend Validation Schema
const MemberSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  phone: z.string().regex(/^\d{11}$/, "Phone number must be exactly 11 digits"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  idType: z.string().min(1, "ID type is required"),
  idNumber: z.string().min(5, "ID number is required"),
  accountName: z.string().min(2, "Account name is required"),
  accountNumber: z.string().min(5, "Account number is required"),
  bankName: z.string().min(2, "Bank name is required"),
  c_village: z.string().min(2, "Current address is required"),
  c_district: z.string().min(2, "Current district is required"),
  p_village: z.string().min(2, "Permanent address is required"),
  p_district: z.string().min(2, "Permanent district is required"),
})

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
  const nomineesData: any[] = []
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
  let member: any;
  try {
    member = await prisma.$transaction(async (tx) => {
      const newMember = await tx.member.create({
        data: {
          memberNo, firstName, lastName, fullName, fatherName, motherName, spouseName,
          dateOfBirth: dob ? new Date(dob) : null,
          gender: gender as any, religion, nationality,
          bloodGroup: bloodGroup as any, profession,
          phone, emergencyPhone, emergencyContactName, email,
          maritalStatus: maritalStatus as any, marriageDate: marriageDate ? new Date(marriageDate) : null,
          nidNumber, passportNumber, birthCertificateNo,
          accountName, accountNumber, bankName, branch, routingNumber,
          photoUrl: memberPhotoUrl,
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

      return newMember; // Return the member object from the transaction
    })
  } catch (error: any) {
    if (error.code === 'P2002') {
      throw new Error("A member with this email already exists. Please use a different email.")
    }
    console.error("Failed to create member:", error)
    throw error; 
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
    return member // Return the member instead of redirecting
  } else {
    revalidatePath("/dashboard/approvals")
    redirect("/dashboard/approvals")
  }
}

// --- Public Registration Action ---
export async function registerMember(formData: FormData) {
  try {
    // Pass isPublic = true
    await addMember(formData, true) 
  } catch (error: any) {
    if (error?.code === 'P2002' || error?.message?.includes('already exists') || error?.message?.includes('Unique constraint')) {
      return { error: "A member with this email already exists. Please use a different email." }
    }
    console.error("Registration failed:", error)
    return { error: "Could not submit application. Please try again." }
  }
  
  // If successful, redirect
  redirect("/register/success")
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

  const nidNumber = idType === "National ID" ? idNumber : null
  const passportNumber = idType === "Passport" ? idNumber : null
  const birthCertificateNo = idType === "Birth Certificate" ? idNumber : null

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
  const nomineesData: any[] = []
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
          dateOfBirth: dob ? new Date(dob) : null,
          gender: gender as any, religion, nationality,
          bloodGroup: bloodGroup as any, profession,
          phone, emergencyPhone, emergencyContactName, email,
          maritalStatus: maritalStatus as any, marriageDate: marriageDate ? new Date(marriageDate) : null,
          nidNumber, passportNumber, birthCertificateNo,
          accountName, accountNumber, bankName, branch, routingNumber,
          photoUrl: memberPhotoUrl,
          status: ((formData.get("memberStatus") as string) || "ACTIVE").toUpperCase() as any, 
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
  } catch (error: any) {
    if (error.code === 'P2002') {
      throw new Error("A member with this email already exists. Please use a different email.")
    }
    console.error("Failed to update member:", error)
    throw error; 
  }

  revalidatePath(`/dashboard/members/${memberId}`)
  redirect(`/dashboard/members/${memberId}`)
}

// --- Update Member Status Action (Suspend/Activate) ---
export async function updateMemberStatus(memberId: string, status: "ACTIVE" | "SUSPENDED" | "INACTIVE") {
  await prisma.member.update({
    where: { id: memberId },
    data: { status },
  })
  
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