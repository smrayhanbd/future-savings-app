"use server"

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { uploadImage } from "@/lib/cloudinary"

export async function addMember(formData: FormData) {
  // 1. Personal Info
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

  // 2. Contact & Family
  const phone = formData.get("phone") as string
  const email = (formData.get("email") as string) || null
  const emergencyPhone = (formData.get("emergencyPhone") as string) || null
  const maritalStatus = formData.get("maritalStatus") as string || undefined
  const marriageDate = formData.get("marriageDate") as string

  // 3. ID Info
  const idType = formData.get("idType") as string
  const idNumber = (formData.get("idNumber") as string) || null
  const nidNumber = idType === "National ID" ? idNumber : null
  const passportNumber = idType === "Passport" ? idNumber : null
  const birthCertificateNo = idType === "Birth Certificate" ? idNumber : null

  // 4. Bank Info
  const accountName = (formData.get("accountName") as string) || null
  const accountNumber = (formData.get("accountNumber") as string) || null
  const bankName = (formData.get("bankName") as string) || null
  const branch = (formData.get("branch") as string) || null
  const routingNumber = (formData.get("routingNumber") as string) || null

  // 5. Address
  const c_village = (formData.get("c_village") as string) || null
  const c_postOffice = (formData.get("c_postOffice") as string) || null
  const c_district = (formData.get("c_district") as string) || null
  const c_postalCode = (formData.get("c_postalCode") as string) || null
  
  const p_village = (formData.get("p_village") as string) || null
  const p_postOffice = (formData.get("p_postOffice") as string) || null
  const p_district = (formData.get("p_district") as string) || null
  const p_postalCode = (formData.get("p_postalCode") as string) || null

  // 6. Files Uploads
  const idDocFile = formData.get("idDocument") as File
  const idDocUrl = idDocFile?.size > 0 ? await uploadImage(idDocFile) : null

  // 7. Generate Member No
  const memberCount = await prisma.member.count()
  const memberNo = `M${String(memberCount + 1).padStart(4, "0")}`

  // 8. Save to Database
  try {
    await prisma.$transaction(async (tx) => {
      const member = await tx.member.create({
        data: {
          memberNo, firstName, lastName, fullName,
          fatherName, motherName, spouseName,
          dateOfBirth: dob ? new Date(dob) : null,
          gender: gender as any, religion, nationality,
          bloodGroup: bloodGroup as any, profession,
          phone, emergencyPhone, email,
          maritalStatus: maritalStatus as any, marriageDate: marriageDate ? new Date(marriageDate) : null,
          nidNumber, passportNumber, birthCertificateNo,
          accountName, accountNumber, bankName, branch, routingNumber,
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

      // Save ID Document
      if (idDocUrl) {
        await tx.memberDocument.create({
          data: { memberId: member.id, documentType: idType || "ID", name: "Member ID Document", fileName: idDocFile.name, fileUrl: idDocUrl }
        })
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
              data: { memberId: member.id, documentType: "ADDITIONAL", name: docName || "Additional Document", fileName: docFile.name, fileUrl: docUrl }
            });
          }
        }
        docIndex++;
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
        const nomIdDocFile = formData.get(`nom_${i}_idDoc`) as File;
        
        const nomIdDocUrl = nomIdDocFile?.size > 0 ? await uploadImage(nomIdDocFile) : null;

        await tx.memberNominee.create({
          data: {
            memberId: member.id, name: nomName, relation: nomRelation || "Unknown",
            phone: nomPhone, sharePercentage: nomShare ? parseFloat(nomShare) : 0,
            idType: nomIdType, nidNumber: nomIdNumber, idDocumentUrl: nomIdDocUrl,
          }
        })
        i++;
      }
    })
  } catch (error) {
    console.error("Failed to create member:", error)
  }

  revalidatePath("/dashboard/approvals")
  redirect("/dashboard/approvals")
}