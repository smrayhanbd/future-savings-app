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
  const rawData = {
    firstName: formData.get("firstName") as string,
    lastName: formData.get("lastName") as string,
    fatherName: (formData.get("fatherName") as string) || null,
    motherName: (formData.get("motherName") as string) || null,
    spouseName: (formData.get("spouseName") as string) || null,
    dob: formData.get("dob") as string,
    gender: (formData.get("gender") as string) || undefined,
    religion: (formData.get("religion") as string) || null,
    nationality: (formData.get("nationality") as string) || "Bangladeshi",
    bloodGroup: formData.get("bloodGroup") as string || undefined,
    profession: (formData.get("profession") as string) || null,
    phone: formData.get("phone") as string,
    email: (formData.get("email") as string) || null,
    emergencyPhone: (formData.get("emergencyPhone") as string) || null,
    emergencyContactName: (formData.get("emergencyContactName") as string) || null,
    idType: formData.get("idType") as string,
    idNumber: (formData.get("idNumber") as string) || null,
    maritalStatus: formData.get("maritalStatus") as string || undefined,
    marriageDate: formData.get("marriageDate") as string,
    accountName: formData.get("accountName") as string,
    accountNumber: formData.get("accountNumber") as string,
    bankName: formData.get("bankName") as string,
    branch: (formData.get("branch") as string) || null,
    routingNumber: (formData.get("routingNumber") as string) || null,
    c_village: formData.get("c_village") as string,
    c_postOffice: (formData.get("c_postOffice") as string) || null,
    c_district: formData.get("c_district") as string,
    c_postalCode: (formData.get("c_postalCode") as string) || null,
    p_village: formData.get("p_village") as string,
    p_postOffice: (formData.get("p_postOffice") as string) || null,
    p_district: formData.get("p_district") as string,
    p_postalCode: (formData.get("p_postalCode") as string) || null,
  }

  // 2. Validate Data
  const validatedData = MemberSchema.parse(rawData)

  // 3. Map to Database Fields
  const nidNumber = validatedData.idType === "National ID" ? validatedData.idNumber : null
  const passportNumber = validatedData.idType === "Passport" ? validatedData.idNumber : null
  const birthCertificateNo = validatedData.idType === "Birth Certificate" ? validatedData.idNumber : null

  // 4. Handle File Uploads (Member Photo & ID Document)
  const memberPhotoFile = formData.get("memberPhoto") as File
  const memberPhotoUrl = memberPhotoFile?.size > 0 ? await uploadImage(memberPhotoFile) : null

  const idDocFile = formData.get("idDocument") as File
  const idDocUrl = idDocFile?.size > 0 ? await uploadImage(idDocFile) : null

  // 5. Generate Member No
  const memberCount = await prisma.member.count()
  const memberNo = `M${String(memberCount + 1).padStart(4, "0")}`

  // 6. Save to Database
  try {
    await prisma.$transaction(async (tx) => {
      const member = await tx.member.create({
        data: {
          memberNo, 
          firstName: validatedData.firstName, 
          lastName: validatedData.lastName, 
          fullName: `${validatedData.firstName} ${validatedData.lastName}`,
          fatherName: rawData.fatherName, 
          motherName: rawData.motherName, 
          spouseName: rawData.spouseName,
          dateOfBirth: validatedData.dob ? new Date(validatedData.dob) : null,
          gender: validatedData.gender as any, 
          religion: validatedData.religion, 
          nationality: validatedData.nationality,
          bloodGroup: validatedData.bloodGroup as any, 
          profession: validatedData.profession,
          phone: validatedData.phone, 
          emergencyPhone: rawData.emergencyPhone,
          emergencyContactName: rawData.emergencyContactName, 
          email: validatedData.email,
          maritalStatus: validatedData.maritalStatus as any, 
          marriageDate: validatedData.marriageDate ? new Date(validatedData.marriageDate) : null,
          nidNumber, passportNumber, birthCertificateNo,
          accountName: validatedData.accountName, 
          accountNumber: validatedData.accountNumber, 
          bankName: validatedData.bankName, 
          branch: rawData.branch, 
          routingNumber: rawData.routingNumber,
          photoUrl: memberPhotoUrl, // Save Member Photo URL
          status: "PENDING",
        },
      })

      if (validatedData.c_village || validatedData.c_district) {
        await tx.memberAddress.create({
          data: { memberId: member.id, addressType: "CURRENT", village: validatedData.c_village, postOffice: validatedData.c_postOffice, district: validatedData.c_district, postalCode: validatedData.c_postalCode }
        })
      }
      if (validatedData.p_village || validatedData.p_district) {
        await tx.memberAddress.create({
          data: { memberId: member.id, addressType: "PERMANENT", village: validatedData.p_village, postOffice: validatedData.p_postOffice, district: validatedData.p_district, postalCode: validatedData.p_postalCode }
        })
      }

      if (idDocUrl) {
        await tx.memberDocument.create({
          data: { memberId: member.id, documentType: validatedData.idType || "ID", name: "Member ID Document", fileName: idDocFile.name, fileUrl: idDocUrl }
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
        
        // Handle Nominee Photo & ID Doc
        const nomPhotoFile = formData.get(`nom_${i}_photo`) as File;
        const nomPhotoUrl = nomPhotoFile?.size > 0 ? await uploadImage(nomPhotoFile) : null;
        
        const nomIdDocFile = formData.get(`nom_${i}_idDoc`) as File;
        const nomIdDocUrl = nomIdDocFile?.size > 0 ? await uploadImage(nomIdDocFile) : null;

        await tx.memberNominee.create({
          data: {
            memberId: member.id, name: nomName, relation: nomRelation || "Unknown",
            phone: nomPhone, sharePercentage: nomShare ? parseFloat(nomShare) : 0,
            idType: nomIdType, nidNumber: nomIdNumber, idDocumentUrl: nomIdDocUrl,
            photoUrl: nomPhotoUrl, // Save Nominee Photo URL
          }
        })
        i++;
      }
    })
  } catch (error) {
    console.error("Failed to create member:", error)
    throw error; 
  }

  revalidatePath("/dashboard/approvals")
  redirect("/dashboard/approvals")
}