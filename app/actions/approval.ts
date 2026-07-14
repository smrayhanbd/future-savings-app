"use server"

import bcrypt from "bcryptjs"
import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { uploadImage } from "@/lib/cloudinary"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function approveMember(memberId: string) {
  const member = await prisma.member.update({
    where: { id: memberId },
    data: { status: "ACTIVE" },
  })

  // 1. Generate Credentials
  const username = member.memberNo // Using Member ID as Username
  const tempPassword = Math.random().toString(36).slice(2, 10) // Random 8-char password
  const hashedPassword = await bcrypt.hash(tempPassword, 10)

  // 2. Save to MemberAccount table
  await prisma.memberAccount.create({
    data: {
      memberId: member.id,
      username: username,
      passwordHash: hashedPassword,
      emailVerified: false,
      isActive: true,
    }
  })

  // 3. Send Email with Credentials
  if (member.email) {
    try {
      await resend.emails.send({
        from: "Future Savings Foundation <onboarding@resend.dev>",
        to: member.email,
        subject: "Membership Approved! Welcome to the Portal",
        html: `
          <p>Dear ${member.fullName},</p>
          <p>Congratulations! Your membership has been approved by the management.</p>
          <p>Your Member ID is: <strong>${member.memberNo}</strong></p>
          <p>You can now log in to your Member Portal using the credentials below:</p>
          <p>
            <strong>Login URL:</strong> https://your-website.com<br/>
            <strong>Username:</strong> ${username}<br/>
            <strong>Temporary Password:</strong> ${tempPassword}
          </p>
          <p>Please change your password after logging in for the first time.</p>
        `
      })
    } catch (error) {
      console.error("Failed to send email:", error)
    }
  }

  revalidatePath("/dashboard/approvals")
  redirect("/dashboard/approvals")
}

// New Action: Reject and Delete Application
export async function rejectMember(memberId: string) {
  await prisma.member.delete({ where: { id: memberId } })
  
  revalidatePath("/dashboard/approvals")
  redirect("/dashboard/approvals")
}

// New Action: Review, Edit, and Approve
export async function approveApplication(memberId: string, formData: FormData) {
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

  // 3. Update Database & Set Status to ACTIVE
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
          status: "ACTIVE", // Approve the member
        },
      })

      // Update Additional Docs
      await tx.memberDocument.deleteMany({ where: { memberId, documentType: "ADDITIONAL" } })
      for (const doc of additionalDocsData) {
        await tx.memberDocument.create({
          data: { memberId, documentType: "ADDITIONAL", name: doc.name, fileName: doc.fileName, fileUrl: doc.fileUrl }
        });
      }

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

      // Update Nominees
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
    console.error("Failed to approve member:", error)
    throw error; 
  }

  // 1. Generate Credentials
  const finalMember = await prisma.member.findUnique({ where: { id: memberId } })
  
  if (finalMember) {
    // Check if account already exists to prevent errors
    const existingAccount = await prisma.memberAccount.findUnique({
      where: { username: finalMember.memberNo }
    })

    if (!existingAccount) {
      const username = finalMember.memberNo
      const tempPassword = Math.random().toString(36).slice(2, 10)
      const hashedPassword = await bcrypt.hash(tempPassword, 10)

      // 2. Save to MemberAccount table
      await prisma.memberAccount.create({
        data: {
          memberId: finalMember.id,
          username: username,
          passwordHash: hashedPassword,
          emailVerified: false,
          isActive: true,
        }
      })

      // 3. Send Email with Credentials
      if (finalMember.email) {
        try {
          await resend.emails.send({
            from: "Future Savings Foundation <onboarding@resend.dev>",
            to: finalMember.email,
            subject: "Membership Approved! Welcome to the Portal",
            html: `
              <p>Dear ${finalMember.fullName},</p>
              <p>Congratulations! Your membership has been approved by the management.</p>
              <p>Your Member ID is: <strong>${finalMember.memberNo}</strong></p>
              <p>You can now log in to your Member Portal using the credentials below:</p>
              <p>
                <strong>Login URL:</strong> http://localhost:3000<br/>
                <strong>Username:</strong> ${username}<br/>
                <strong>Temporary Password:</strong> ${tempPassword}
              </p>
              <p>Please change your password after logging in for the first time.</p>
            `
          })
        } catch (error) {
          console.error("Failed to send credentials email:", error)
        }
      }
    }
  }

  revalidatePath("/dashboard/approvals")
  redirect("/dashboard/approvals")
}