"use server"

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { uploadImage } from "@/lib/cloudinary"
import { z } from "zod"

// Enterprise Backend Validation Schema
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
  
  // Added missing fields to schema
  dob: z.string().optional(),
  gender: z.string().optional(),
  religion: z.string().optional(),
  nationality: z.string().optional(),
  bloodGroup: z.string().optional(),
  profession: z.string().optional(),
  maritalStatus: z.string().optional(),
  marriageDate: z.string().optional(),
  c_postOffice: z.string().optional(),
  c_postalCode: z.string().optional(),
  p_postOffice: z.string().optional(),
  p_postalCode: z.string().optional(),
})

export async function addMember(formData: FormData) {
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

  // Map IDs
  const nidNumber = idType === "National ID" ? idNumber : null
  const passportNumber = idType === "Passport" ? idNumber : null
  const birthCertificateNo = idType === "Birth Certificate" ? idNumber : null

  // 2. Handle File Uploads OUTSIDE the transaction to prevent timeout
  const memberPhotoFile = formData.get("memberPhoto") as File
  const memberPhotoUrl = memberPhotoFile?.size > 0 ? await uploadImage(memberPhotoFile) : null

  const idDocFile = formData.get("idDocument") as File
  const idDocUrl = idDocFile?.size > 0 ? await uploadImage(idDocFile) : null

  // Upload Additional Docs
  const additionalDocsData: { name: string; fileName: string; fileUrl: string }[] = [];
  let docIndex = 0;
  while (true) {
    const docName = formData.get(`doc_${docIndex}_name`) as string;
    const docFile = formData.get(`doc_${docIndex}_file`) as File;
    if (!docName && !docFile) break;

    if (docFile?.size > 0) {
      const docUrl = await uploadImage(docFile);
      if (docUrl) {
        additionalDocsData.push({ name: docName || "Additional Document", fileName: docFile.name, fileUrl: docUrl });
      }
    }
    docIndex++;
  }

  // Upload Nominees Data
  const nomineesData: any[] = [];
  let i = 0;
  while (true) {
    const nomName = formData.get(`nom_${i}_name`) as string;
    if (!nomName) break;

    const nomRelation = formData.get(`nom_${i}_relation`) as string;
    const nomShare = formData.get(`nom_${i}_share`) as string;
    const nomPhone = formData.get(`nom_${i}_phone`) as string;
    const nomIdType = formData.get(`nom_${i}_idType`) as string;
    const nomIdNumber = formData.get(`nom_${i}_idNumber`) as string;
    
    const nomPhotoFile = formData.get(`nom_${i}_photo`) as File;
    const nomPhotoUrl = nomPhotoFile?.size > 0 ? await uploadImage(nomPhotoFile) : null;
    
    const nomIdDocFile = formData.get(`nom_${i}_idDoc`) as File;
    const nomIdDocUrl = nomIdDocFile?.size > 0 ? await uploadImage(nomIdDocFile) : null;

    nomineesData.push({
      name: nomName, relation: nomRelation || "Unknown",
      phone: nomPhone, sharePercentage: nomShare ? parseFloat(nomShare) : 0,
      idType: nomIdType, nidNumber: nomIdNumber, idDocumentUrl: nomIdDocUrl, photoUrl: nomPhotoUrl,
    });
    i++;
  }

  // 3. Generate Member No
  const memberCount = await prisma.member.count()
  const memberNo = `M${String(memberCount + 1).padStart(4, "0")}`

  // 4. Save to Database (Fast transaction with no network uploads inside)
  try {
    await prisma.$transaction(async (tx) => {
      const member = await tx.member.create({
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
          data: { memberId: member.id, addressType: "CURRENT", village: c_village, postOffice: c_postOffice, district: c_district, postalCode: c_postalCode }
        })
      }
      if (p_village || p_district) {
        await tx.memberAddress.create({
          data: { memberId: member.id, addressType: "PERMANENT", village: p_village, postOffice: p_postOffice, district: p_district, postalCode: p_postalCode }
        })
      }

      if (idDocUrl) {
        await tx.memberDocument.create({
          data: { memberId: member.id, documentType: idType || "ID", name: "Member ID Document", fileName: idDocFile.name, fileUrl: idDocUrl }
        })
      }

      // Save Additional Docs
      for (const doc of additionalDocsData) {
        await tx.memberDocument.create({
          data: { memberId: member.id, documentType: "ADDITIONAL", name: doc.name, fileName: doc.fileName, fileUrl: doc.fileUrl }
        });
      }

            // Save Additional Documents
      let docIndex = 0;
      while (true) {
        const docName = formData.get(`doc_${docIndex}_name`) as string;
        const docFile = formData.get(`doc_${docIndex}_file`) as File;
        if (!docName && !docFile) break;

        if (docFile?.size > 0) {
          const docUrl = await uploadImage(docFile);
          if (docUrl) {
            await tx.memberDocument.create({
              data: { 
                memberId: member.id, 
                documentType: "ADDITIONAL", 
                name: docName || "Additional Document", 
                fileName: docFile.name, 
                fileUrl: docUrl 
              }
            });
          }
        }
        docIndex++;
      }

      // Save Nominees
      for (const nom of nomineesData) {
        await tx.memberNominee.create({
          data: {
            memberId: member.id,
            ...nom
          }
        })
      }
    })
  } catch (error: any) {
    // Prisma error code P2002 means "Unique constraint failed"
    if (error.code === 'P2002') {
      throw new Error("A member with this email already exists. Please use a different email.")
    }
    console.error("Failed to create member:", error)
    throw error; 
  }

  revalidatePath("/dashboard/approvals")
  redirect("/dashboard/approvals")
}

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

  // Fetch existing member to preserve files if not updated
  const existingMember = await prisma.member.findUnique({
    where: { id: memberId },
    include: { documents: true, nominees: true }
  })

  // 2. Handle File Uploads (Only update if new files are provided)
  const memberPhotoFile = formData.get("memberPhoto") as File
  const memberPhotoUrl = memberPhotoFile?.size > 0 ? await uploadImage(memberPhotoFile) : existingMember?.photoUrl

  const idDocFile = formData.get("idDocument") as File
  const idDocUrl = idDocFile?.size > 0 ? await uploadImage(idDocFile) : existingMember?.documents.find(d => d.documentType === idType)?.fileUrl

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

      // Update ID Document
      if (idDocUrl) {
        await tx.memberDocument.deleteMany({ where: { memberId, documentType: idType } })
        await tx.memberDocument.create({ data: { memberId, documentType: idType || "ID", name: "Member ID Document", fileName: idDocFile?.name || "existing", fileUrl: idDocUrl } })
      }

      // Update Additional Documents (Delete old, create new if provided)
      await tx.memberDocument.deleteMany({ where: { memberId, documentType: "ADDITIONAL" } })
      let docIndex = 0;
      while (true) {
        const docName = formData.get(`doc_${docIndex}_name`) as string;
        const docFile = formData.get(`doc_${docIndex}_file`) as File;
        if (!docName && !docFile) break;

        if (docFile?.size > 0) {
          const docUrl = await uploadImage(docFile);
          if (docUrl) {
            await tx.memberDocument.create({ data: { memberId, documentType: "ADDITIONAL", name: docName || "Additional Document", fileName: docFile.name, fileUrl: docUrl } });
          }
        }
        docIndex++;
      }

      // Update Nominees (Delete old, create new)
      await tx.memberNominee.deleteMany({ where: { memberId } })
      let i = 0;
      while (true) {
        const nomName = formData.get(`nom_${i}_name`) as string;
        if (!nomName) break;

        const nomRelation = formData.get(`nom_${i}_relation`) as string;
        const nomShare = formData.get(`nom_${i}_share`) as string;
        const nomPhone = formData.get(`nom_${i}_phone`) as string;
        const nomIdType = formData.get(`nom_${i}_idType`) as string;
        const nomIdNumber = formData.get(`nom_${i}_idNumber`) as string;
        
        const nomDbId = formData.get(`nom_${i}_dbId`) as string;
        const existingNom = existingMember?.nominees.find(n => n.id === nomDbId);
        
        const nomPhotoFile = formData.get(`nom_${i}_photo`) as File;
        const nomPhotoUrl = nomPhotoFile?.size > 0 ? await uploadImage(nomPhotoFile) : existingNom?.photoUrl || null;
        
        const nomIdDocFile = formData.get(`nom_${i}_idDoc`) as File;
        const nomIdDocUrl = nomIdDocFile?.size > 0 ? await uploadImage(nomIdDocFile) : existingNom?.idDocumentUrl || null;

        await tx.memberNominee.create({
          data: {
            memberId, name: nomName, relation: nomRelation || "Unknown",
            phone: nomPhone, sharePercentage: nomShare ? parseFloat(nomShare) : 0,
            idType: nomIdType, nidNumber: nomIdNumber, idDocumentUrl: nomIdDocUrl, photoUrl: nomPhotoUrl,
          }
        })
        i++;
      }
    })
  } catch (error) {
    console.error("Failed to update member:", error)
    throw error; 
  }

  revalidatePath(`/dashboard/members/${memberId}`)
  redirect(`/dashboard/members/${memberId}`)
}

export async function registerMember(formData: FormData) {
  // 1. Extract Data (Same as addMember)
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

  // 2. Handle File Uploads OUTSIDE transaction
  const memberPhotoFile = formData.get("memberPhoto") as File
  const memberPhotoUrl = memberPhotoFile?.size > 0 ? await uploadImage(memberPhotoFile) : null
  const idDocFile = formData.get("idDocument") as File
  const idDocUrl = idDocFile?.size > 0 ? await uploadImage(idDocFile) : null

  // 3. Generate Member No
  const memberCount = await prisma.member.count()
  const memberNo = `M${String(memberCount + 1).padStart(4, "0")}`

  // 4. Save to Database
  try {
    await prisma.$transaction(async (tx) => {
      const member = await tx.member.create({
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
          status: "PENDING", // Always pending for public registration
        },
      })

      if (c_village || c_district) {
        await tx.memberAddress.create({ data: { memberId: member.id, addressType: "CURRENT", village: c_village, postOffice: c_postOffice, district: c_district, postalCode: c_postalCode } })
      }
      if (p_village || p_district) {
        await tx.memberAddress.create({ data: { memberId: member.id, addressType: "PERMANENT", village: p_village, postOffice: p_postOffice, district: p_district, postalCode: p_postalCode } })
      }

      if (idDocUrl) {
        await tx.memberDocument.create({ data: { memberId: member.id, documentType: idType || "ID", name: "Member ID Document", fileName: idDocFile.name, fileUrl: idDocUrl } })
      }

      // Save Nominees
      let i = 0;
      while (true) {
        const nomName = formData.get(`nom_${i}_name`) as string;
        if (!nomName) break;

        const nomRelation = formData.get(`nom_${i}_relation`) as string;
        const nomShare = formData.get(`nom_${i}_share`) as string;
        const nomPhone = formData.get(`nom_${i}_phone`) as string;
        const nomIdType = formData.get(`nom_${i}_idType`) as string;
        const nomIdNumber = formData.get(`nom_${i}_idNumber`) as string;
        
        const nomPhotoFile = formData.get(`nom_${i}_photo`) as File;
        const nomPhotoUrl = nomPhotoFile?.size > 0 ? await uploadImage(nomPhotoFile) : null;
        
        const nomIdDocFile = formData.get(`nom_${i}_idDoc`) as File;
        const nomIdDocUrl = nomIdDocFile?.size > 0 ? await uploadImage(nomIdDocFile) : null;

        await tx.memberNominee.create({
          data: {
            memberId: member.id, name: nomName, relation: nomRelation || "Unknown",
            phone: nomPhone, sharePercentage: nomShare ? parseFloat(nomShare) : 0,
            idType: nomIdType, nidNumber: nomIdNumber, idDocumentUrl: nomIdDocUrl, photoUrl: nomPhotoUrl,
          }
        })
        i++;
      }
    })
  } catch (error: any) {
    if (error.code === 'P2002') {
      throw new Error("A member with this email already exists. Please use a different email.")
    }
    console.error("Failed to register member:", error)
    throw error; 
  }

  redirect("/register/success")
}