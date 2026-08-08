import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getOrganization } from "@/lib/organization"
import {
  generateMemberFormPdf,
  type MemberFormPayload,
  type MemberFormActivity,
} from "@/lib/pdf/memberFormPdf"

export const dynamic = "force-dynamic"

/**
 * GET /api/members/[id]/print-form
 *
 * Generates a full-page Membership Application Form PDF for the given member
 * and returns it with `Content-Type: application/pdf`. The response uses
 * `Content-Disposition: inline` so the browser opens the PDF in a new tab,
 * ready to print or save — matching the "Print" button on the member profile.
 *
 * The PDF is generated on-demand from live DB data, so it always reflects the
 * current member record (no stale cached files).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const member = await prisma.member.findUnique({
    where: { id },
    include: {
      addresses: true,
      nominees: true,
      documents: true,
      savings: {
        orderBy: { date: "desc" },
        take: 6,
        select: { id: true, type: true, amount: true, method: true, date: true, receiptNo: true },
      },
    },
  })

  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 })
  }

  const org = await getOrganization()

  // Assemble the payload expected by the PDF generator.
  // Decimals are converted to numbers; dates are passed through as-is (the
  // PDF helper accepts Date | string | null and formats them).
  const payload: MemberFormPayload = {
    id: member.id,
    memberNo: member.memberNo,
    firstName: member.firstName,
    lastName: member.lastName,
    fullName: member.fullName,
    fatherName: member.fatherName,
    motherName: member.motherName,
    spouseName: member.spouseName,
    dateOfBirth: member.dateOfBirth,
    gender: member.gender,
    maritalStatus: member.maritalStatus,
    marriageDate: member.marriageDate,
    religion: member.religion,
    nationality: member.nationality,
    bloodGroup: member.bloodGroup,
    profession: member.profession,
    occupation: member.profession,
    nidNumber: member.nidNumber,
    passportNumber: member.passportNumber,
    birthCertificateNo: member.birthCertificateNo,
    drivingLicense: null,
    phone: member.phone,
    email: member.email,
    emergencyPhone: member.emergencyPhone,
    emergencyContactName: member.emergencyContactName,
    accountName: member.accountName,
    accountNumber: member.accountNumber,
    bankName: member.bankName,
    branch: member.branch,
    routingNumber: member.routingNumber,
    photoUrl: member.photoUrl,
    status: member.status,
    kycVerified: member.kycVerified,
    membershipDate: member.membershipDate,
    createdAt: member.createdAt,
    addresses: member.addresses.map((a) => ({
      addressType: a.addressType,
      village: a.village,
      postOffice: a.postOffice,
      district: a.district,
      postalCode: a.postalCode,
      country: a.country,
    })),
    nominees: member.nominees.map((n) => ({
      name: n.name,
      relation: n.relation,
      phone: n.phone,
      email: n.email,
      dateOfBirth: n.dateOfBirth,
      nidNumber: n.nidNumber,
      idType: n.idType,
      sharePercentage: Number(n.sharePercentage),
      photoUrl: n.photoUrl,
      signatureUrl: n.signatureUrl,
    })),
    documents: member.documents.map((d) => ({
      documentType: d.documentType,
      name: d.name,
      fileUrl: d.fileUrl,
    })),
    recentActivity: member.savings.map((s) => ({
      date: s.date,
      type: s.type,
      amount: Number(s.amount),
      method: s.method,
      receiptNo: s.receiptNo,
    })),
  }

  // Helper: fetch an image URL into a Buffer (time-boxed, returns null on failure).
  // Used for the member photo, member signature, and nominee signatures.
  async function fetchImageBuffer(url: string): Promise<Buffer | null> {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)
      const res = await fetch(url, { signal: controller.signal })
      clearTimeout(timeout)
      if (!res.ok) return null
      const ct = res.headers.get("content-type") || ""
      if (!ct.startsWith("image/")) return null
      const buf = Buffer.from(await res.arrayBuffer())
      return buf.length > 100 ? buf : null
    } catch {
      return null
    }
  }

  // Fetch org logo + member photo + signature in parallel.
  const [logoBuffer, photoBuffer, signatureBuffer] = await Promise.all([
    org.logo ? fetchImageBuffer(org.logo) : Promise.resolve(null),
    member.photoUrl ? fetchImageBuffer(member.photoUrl) : Promise.resolve(null),
    member.signatureUrl ? fetchImageBuffer(member.signatureUrl) : Promise.resolve(null),
  ])

  // Fetch nominee signatures + photos (up to 3) — keyed by nominee index.
  const nomineeSignatureBuffers: (Buffer | null)[] = []
  const nomineePhotoBuffers: (Buffer | null)[] = []
  for (const n of member.nominees.slice(0, 3)) {
    nomineeSignatureBuffers.push(n.signatureUrl ? await fetchImageBuffer(n.signatureUrl) : null)
    nomineePhotoBuffers.push(n.photoUrl ? await fetchImageBuffer(n.photoUrl) : null)
  }

  const pdf = await generateMemberFormPdf({
    member: payload,
    org,
    logoBuffer,
    photoBuffer,
    signatureBuffer,
    nomineeSignatureBuffers,
    nomineePhotoBuffers,
  })

  return new NextResponse(pdf as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      // Inline so the browser opens it in a new tab; the filename is a hint
      // for "Save As..." / "Download".
      "Content-Disposition": `inline; filename="member-${member.memberNo}-form.pdf"`,
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  })
}
