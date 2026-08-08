// Deep-import the CommonJS entry (`pdfkit/js/pdfkit.js`) rather than the
// package root. The root resolves to the ESM build (`pdfkit.es.js`) under
// Turbopack, whose `fontkit` dependency is compiled against an `@swc/helpers`
// export that no longer exists — that breaks the Next.js build. The CJS entry
// has no such transpilation layer and loads cleanly in a Node/server context.
//
// The deep CJS path ships no .d.ts, so the constructor is imported untyped and
// cast to the @types/pdfkit constructor shape. The document instance type is
// derived from the typed `"pdfkit"` module via InstanceType.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error — no type declarations for the deep CJS path.
import PDFDocumentConstructor from "pdfkit/js/pdfkit.js"
import type { OrgInfo } from "@/lib/organization"

/** Instance type of a pdfkit document, taken from the typed `"pdfkit"` module. */
type PDFDocument = InstanceType<typeof import("pdfkit")>
const PDFDocument = PDFDocumentConstructor as unknown as new (
  options?: Record<string, unknown>
) => PDFDocument

/**
 * Server-side Membership Application Form PDF generator.
 *
 * Produces a self-contained PDF Buffer that mirrors the official printed
 * membership form exactly as shown in the reference design:
 *
 *  ┌─────────────────────────────────────────────────────────────────┐
 *  │  Top decorative bands (navy / green / gold)                     │
 *  │  Letterhead: Logo + Org Name + Tagline + Address  │ Membership  │
 *  │                                                   │ No box      │
 *  ├─────────────────────────────────────────────────────────────────┤
 *  │ [Photo]  │  MEMBERSHIP APPLICATION FORM banner                  │
 *  │ ACTIVE   │  Name / Email / Emergency / DOB  (2×4 quick grid)    │
 *  │ KYC      │  ID   / Phone / Person  / Blood                      │
 *  ├──────────┴──────────────────────────────────────────────────────┤
 *  │ 1 PERSONAL INFO  │ 2 RESIDENCE INFO     │ 3 BANKING INFO        │
 *  │ (navy header)    │ (green header)       │ (navy header)         │
 *  │ Father's Name …  │ CURRENT ADDRESS      │ Bank Name             │
 *  │ 14 field list    │ PERMANENT ADDRESS    │ Branch / Acct / Rte   │
 *  ├──────────────────┴──────────────────────┴───────────────────────┤
 *  │ 4 NOMINEE INFORMATION  (green header, full width)               │
 *  │ NOMINEE 1—40%  │  NOMINEE 2—30%  │  NOMINEE 3—30%              │
 *  │ [photo] Name…  │  [photo] Name…  │  [photo] Name…              │
 *  ├─────────────────────────────────┬───────────────────────────────┤
 *  │ DECLARATION (navy bg)           │ NOMINEES SIGNATURE (green)    │
 *  │ italic text + applicant sig     │ 3 nominee name + sig lines    │
 *  ├────────────────┬────────────────┼────────────────┬──────────────┤
 *  │ AUTH SIGNATURE │   CHAIRMAN     │  OFFICIAL SEAL │   DATE       │
 *  └────────────────┴────────────────┴────────────────┴──────────────┘
 */

// ── Page geometry ────────────────────────────────────────────────────────────
// A4 portrait at 72 DPI (pdfkit default units are PDF points = 1/72 inch).
const PAGE_WIDTH  = 595.28
const PAGE_HEIGHT = 841.89
const MARGIN      = 36   // ~12.7 mm — tight margin to fit all content on one page

// ── Brand palette (exactly as in the reference PDF) ─────────────────────────
const NAVY          = "#0f2c5c"   // primary dark blue — headers, letterhead, section 1 & 3
const GREEN         = "#1f8a4c"   // secondary green — section 2 & 4, badges, address sub-headers
const GOLD          = "#c9a227"   // gold — top band, KYC badge
const INK           = "#111827"   // near-black body text
const MUTED         = "#6b7280"   // grey labels
const LINE          = "#e5e7eb"   // light borders
const SOFT_BG       = "#f8fafc"   // section card background
const SOFT_GREEN_BG = "#ecfdf5"   // address sub-header + nominee sub-header tint
const SOFT_NAVY_BG  = "#eef2ff"   // declaration box background

// ── Exported types ────────────────────────────────────────────────────────────

export interface MemberFormNominee {
  name: string
  relation: string
  phone?: string | null
  email?: string | null
  dateOfBirth?: Date | string | null
  nidNumber?: string | null
  idType?: string | null
  sharePercentage: number
  photoUrl?: string | null
  /** Nominee signature URL — route handler fetches this and passes it as a buffer. */
  signatureUrl?: string | null
  addressLine?: string | null
}

export interface MemberFormAddress {
  addressType: string   // "CURRENT" | "PERMANENT"
  village?: string | null
  postOffice?: string | null
  district?: string | null
  postalCode?: string | null
  country?: string | null
}

export interface MemberFormDocument {
  documentType: string
  name?: string | null
  fileUrl: string
}

export interface MemberFormPayload {
  // ── Identity ──
  id: string
  memberNo: string
  firstName: string
  lastName: string
  fullName: string
  fatherName?: string | null
  motherName?: string | null
  spouseName?: string | null
  dateOfBirth?: Date | string | null
  gender?: string | null
  maritalStatus?: string | null
  marriageDate?: Date | string | null
  religion?: string | null
  nationality?: string | null
  bloodGroup?: string | null
  profession?: string | null
  occupation?: string | null

  // ── Identity numbers ──
  nidNumber?: string | null
  passportNumber?: string | null
  birthCertificateNo?: string | null
  drivingLicense?: string | null

  // ── Contact ──
  phone: string
  email?: string | null
  emergencyPhone?: string | null
  emergencyContactName?: string | null

  // ── Banking ──
  accountName?: string | null
  accountNumber?: string | null
  bankName?: string | null
  branch?: string | null
  routingNumber?: string | null

  // ── Meta ──
  photoUrl?: string | null
  /** Member signature URL — route handler fetches this and passes as `signatureBuffer`. */
  signatureUrl?: string | null
  status: string
  kycVerified: boolean
  membershipDate?: Date | string | null
  createdAt: Date | string

  addresses: MemberFormAddress[]
  nominees: MemberFormNominee[]
  documents: MemberFormDocument[]
}

export interface MemberFormPdfInput {
  member: MemberFormPayload
  org: OrgInfo
  /** Optional pre-fetched org logo buffer (PNG/JPEG). Drawn in the letterhead. */
  logoBuffer?: Buffer | null
  /** Optional pre-fetched member photo buffer (PNG/JPEG). Placeholder silhouette when absent. */
  photoBuffer?: Buffer | null
  /** Optional pre-fetched member signature buffer (PNG/JPEG). Embedded in the declaration box. */
  signatureBuffer?: Buffer | null
  /** Optional pre-fetched nominee signature buffers, keyed by nominee index. */
  nomineeSignatureBuffers?: (Buffer | null)[]
  /** Optional pre-fetched nominee photo buffers, keyed by nominee index. */
  nomineePhotoBuffers?: (Buffer | null)[]
}

// ── Formatting helpers ────────────────────────────────────────────────────────

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—"
  const date = new Date(d)
  if (isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function fmtEnum(val: string | null | undefined): string {
  if (!val) return "—"
  const v = String(val)
  if (v.includes("_POSITIVE")) return v.replace("_POSITIVE", "+")
  if (v.includes("_NEGATIVE")) return v.replace("_NEGATIVE", "-")
  return v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, " ")
}

function orDash(v: string | null | undefined): string {
  if (v === null || v === undefined) return "—"
  const s = String(v).trim()
  return s === "" ? "—" : s
}

// ── Main generator ────────────────────────────────────────────────────────────

/**
 * Build the Membership Application Form PDF.
 * Returns a Promise<Buffer> that resolves with the complete PDF bytes.
 */
export async function generateMemberFormPdf(input: MemberFormPdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: [PAGE_WIDTH, PAGE_HEIGHT],
        // bottom: 0 disables pdfkit auto-page-break — all layout is manual
        // and verified to fit on a single A4 sheet.
        margins: { top: MARGIN, bottom: 0, left: MARGIN, right: MARGIN },
        info: {
          Title: `Membership Application Form — ${input.member.memberNo}`,
          Author: input.org.name,
          Subject: "Member Registration Form",
        },
      })

      const chunks: Buffer[] = []
      doc.on("data", (c: Buffer) => chunks.push(c))
      doc.on("end", () => resolve(Buffer.concat(chunks)))
      doc.on("error", reject)

      const { member, org } = input
      const contentWidth = PAGE_WIDTH - MARGIN * 2

      // ══════════════════════════════════════════════════════════════════════
      // SECTION A — Top decorative bands
      // Three horizontal stripes at the very top, matching the reference PDF.
      // ══════════════════════════════════════════════════════════════════════
      doc.rect(0, 0, PAGE_WIDTH, 14).fill(NAVY)
      doc.rect(0, 14, PAGE_WIDTH, 4).fill(GREEN)
      doc.rect(0, 18, PAGE_WIDTH, 2).fill(GOLD)

      let y = MARGIN + 22

      // ══════════════════════════════════════════════════════════════════════
      // SECTION B — Letterhead row
      // Left side: logo + org name + italic tagline + address/contact line.
      // Right side: "MEMBERSHIP NO." box with the member's ID in large type.
      // ══════════════════════════════════════════════════════════════════════
      const LOGO_SIZE = 42
      const memBoxW   = 130
      let textLeftX   = MARGIN
      // Width reserved for org text — leaves 130pt gap on the right for the
      // membership-number box plus 12pt gap between them.
      let LH_LEFT_W   = PAGE_WIDTH - MARGIN - memBoxW - 12 - MARGIN

      if (input.logoBuffer) {
        try {
          doc
            .roundedRect(MARGIN, y, LOGO_SIZE, LOGO_SIZE, 4)
            .strokeColor(LINE)
            .lineWidth(0.8)
            .stroke()
          doc.image(input.logoBuffer, MARGIN + 2, y + 2, {
            fit: [LOGO_SIZE - 4, LOGO_SIZE - 4],
            align: "center",
            valign: "center",
          })
          textLeftX  = MARGIN + LOGO_SIZE + 8
          LH_LEFT_W -= LOGO_SIZE + 8
        } catch {
          // Invalid logo buffer — fall back to text starting at MARGIN.
        }
      }

      // Org name — bold, navy, sized to stay on ONE line.
      const nameUpper   = org.name.toUpperCase()
      const nameFontSz  = nameUpper.length > 28 ? 13 : nameUpper.length > 22 ? 15 : 16
      doc
        .fillColor(NAVY)
        .font("Helvetica-Bold")
        .fontSize(nameFontSz)
        .text(nameUpper, textLeftX, y + 4, { width: LH_LEFT_W, lineBreak: false })

      // Italic tagline in green (e.g. "Save Today and Secure Tomorrow")
      if (org.tagline) {
        doc
          .fillColor(GREEN)
          .font("Helvetica-Oblique")
          .fontSize(9)
          .text(org.tagline, textLeftX, y + 22, { width: LH_LEFT_W })
      }

      // Address + contact line in muted grey beneath the tagline.
      const addrParts  = [org.addressLine, org.city, org.district, org.postalCode].filter(Boolean)
      const addrLine   = addrParts.length ? addrParts.join(", ") : null
      const contactBits: string[] = []
      if (org.phone) contactBits.push(`Phone: ${org.phone}`)
      if (org.email) contactBits.push(`Email: ${org.email}`)
      const subLine = [addrLine, contactBits.join("  ·  ")].filter(Boolean).join("\n")
      if (subLine) {
        doc
          .fillColor(MUTED)
          .font("Helvetica")
          .fontSize(7.5)
          .text(subLine, textLeftX, y + (org.tagline ? 36 : 22), {
            width: LH_LEFT_W,
            lineGap: 1,
          })
      }

      // Membership No box — right-aligned, sharp-cornered (matching reference).
      const memBoxH = 48
      const memBoxX = PAGE_WIDTH - MARGIN - memBoxW
      const memBoxY = y
      doc
        .rect(memBoxX, memBoxY, memBoxW, memBoxH)
        .fillColor("white")
        .strokeColor(LINE)
        .lineWidth(0.8)
        .fillAndStroke()
      // Green header band inside the box
      doc.rect(memBoxX, memBoxY, memBoxW, 16).fillColor(GREEN).fill()
      doc
        .fillColor("white")
        .font("Helvetica-Bold")
        .fontSize(7)
        .text("MEMBERSHIP NO.", memBoxX, memBoxY + 4, { width: memBoxW, align: "center" })
      // Member number in large bold ink
      doc
        .fillColor(INK)
        .font("Helvetica-Bold")
        .fontSize(20)
        .text(member.memberNo, memBoxX, memBoxY + 20, { width: memBoxW, align: "center" })

      y = Math.max(y + (org.tagline ? 58 : 42), memBoxY + memBoxH) + 10

      // Thin horizontal rule below letterhead
      doc
        .strokeColor(LINE)
        .lineWidth(0.8)
        .moveTo(MARGIN, y)
        .lineTo(PAGE_WIDTH - MARGIN, y)
        .stroke()
      y += 12

      // ══════════════════════════════════════════════════════════════════════
      // SECTION C — Photo + title banner + quick-info grid
      //
      // Left col:  Member photo (84×84 pt) with ACTIVE / KYC badges below.
      // Right col: Dark-navy "MEMBERSHIP APPLICATION FORM" banner, then a
      //            4-column × 2-row grid of key member facts.
      // ══════════════════════════════════════════════════════════════════════
      const PHOTO_SIZE = 84
      const photoX     = MARGIN
      const photoY     = y

      // Photo frame
      doc
        .roundedRect(photoX, photoY, PHOTO_SIZE, PHOTO_SIZE, 5)
        .strokeColor(LINE)
        .lineWidth(1)
        .stroke()
      if (input.photoBuffer) {
        try {
          doc.image(input.photoBuffer, photoX + 2, photoY + 2, {
            width:  PHOTO_SIZE - 4,
            height: PHOTO_SIZE - 4,
            fit:    [PHOTO_SIZE - 4, PHOTO_SIZE - 4],
            align:  "center",
            valign: "center",
          })
        } catch {
          drawSilhouette(doc, photoX, photoY, PHOTO_SIZE)
        }
      } else {
        drawSilhouette(doc, photoX, photoY, PHOTO_SIZE)
      }

      // ── Status badges directly below the photo ──
      const badgeY = photoY + PHOTO_SIZE + 6
      const badgeH = 16
      const activeW = 62
      const kycW    = 52

      // ACTIVE badge — green pill with vector checkmark
      doc.roundedRect(photoX, badgeY, activeW, badgeH, 8).fillColor(GREEN).fill()
      const ckCx = photoX + 9
      const ckCy = badgeY + badgeH / 2
      doc.circle(ckCx, ckCy, 5).fillColor("white").fill()
      doc
        .strokeColor(GREEN)
        .lineWidth(1.4)
        .lineCap("round")
        .moveTo(ckCx - 2.5, ckCy)
        .lineTo(ckCx - 0.8, ckCy + 2)
        .lineTo(ckCx + 2.5, ckCy - 2)
        .stroke()
      doc
        .fillColor("white")
        .font("Helvetica-Bold")
        .fontSize(7.5)
        .text((member.status || "ACTIVE").toUpperCase(), photoX + 16, badgeY + 4, {
          width: activeW - 16,
          align: "center",
        })

      // KYC badge — gold pill (only when kycVerified = true)
      if (member.kycVerified) {
        const kycX = photoX + activeW + 5
        doc.roundedRect(kycX, badgeY, kycW, badgeH, 8).fillColor(GOLD).fill()
        // Shield icon drawn as a filled path
        const sX = kycX + 9
        const sY = badgeY + badgeH / 2
        doc
          .fillColor("white")
          .moveTo(sX, sY - 5)
          .lineTo(sX + 3.5, sY - 3)
          .lineTo(sX + 3.5, sY + 1)
          .lineTo(sX, sY + 4.5)
          .lineTo(sX - 3.5, sY + 1)
          .lineTo(sX - 3.5, sY - 3)
          .closePath()
          .fill()
        // Checkmark inside the shield
        doc
          .strokeColor(GOLD)
          .lineWidth(1.1)
          .lineCap("round")
          .moveTo(sX - 1.8, sY)
          .lineTo(sX - 0.4, sY + 1.5)
          .lineTo(sX + 1.8, sY - 1.5)
          .stroke()
        doc
          .fillColor("#3b2f00")
          .font("Helvetica-Bold")
          .fontSize(7.5)
          .text("KYC", kycX + 16, badgeY + 4, { width: kycW - 16, align: "center" })
      }

      // ── Title banner (right of photo) ──
      const titleX = photoX + PHOTO_SIZE + 14
      const titleW = PAGE_WIDTH - MARGIN - titleX
      const titleH = 28

      doc.roundedRect(titleX, photoY, titleW, titleH, 14).fillColor(NAVY).fill()
      doc
        .fillColor("white")
        .font("Helvetica-Bold")
        .fontSize(13)
        .text("MEMBERSHIP APPLICATION FORM", titleX, photoY + 8, {
          width: titleW,
          align: "center",
        })

      // ── 4-column × 2-row quick-info grid beneath the title banner ──
      // Row 1: MEMBER NAME  |  MEMBER EMAIL  |  EMERGENCY CONTACT  |  DATE OF BIRTH
      // Row 2: MEMBER ID    |  PHONE NUMBER  |  EMERG. CONTACT PERSON | BLOOD GROUP
      const qiY    = photoY + titleH + 8
      const qiRowH = 18
      const qiColW = titleW / 4

      const quickInfo: [string, string][] = [
        ["MEMBER NAME",              orDash(member.fullName)],
        ["MEMBER EMAIL",             orDash(member.email)],
        ["EMERGENCY CONTACT",        orDash(member.emergencyPhone)],
        ["DATE OF BIRTH",            fmtDate(member.dateOfBirth)],
        ["MEMBER ID",                orDash(member.memberNo)],
        ["PHONE NUMBER",             orDash(member.phone)],
        ["EMERGENCY CONTACT PERSON", orDash(member.emergencyContactName)],
        ["BLOOD GROUP",              fmtEnum(member.bloodGroup)],
      ]

      quickInfo.forEach(([label, value], i) => {
        const col  = i % 4
        const row  = Math.floor(i / 4)
        const cellX = titleX + col * qiColW
        const cellY = qiY + row * qiRowH

        // Label — small bold muted caps
        doc
          .fillColor(MUTED)
          .font("Helvetica-Bold")
          .fontSize(6)
          .text(label, cellX + 2, cellY, { width: qiColW - 4 })
        // Value — slightly larger, dark ink
        doc
          .fillColor(INK)
          .font("Helvetica")
          .fontSize(8)
          .text(value, cellX + 2, cellY + 8, { width: qiColW - 4, ellipsis: true })
      })

      // Gold hairline divider below the quick-info grid
      doc
        .strokeColor(GOLD)
        .lineWidth(0.7)
        .moveTo(titleX, qiY + qiRowH * 2 + 2)
        .lineTo(titleX + titleW, qiY + qiRowH * 2 + 2)
        .stroke()

      // Advance y past the taller of (photo+badges) and (banner+grid)
      const photoBotY = badgeY + badgeH + 8
      const gridBotY  = qiY + qiRowH * 2 + 10
      y = Math.max(photoBotY, gridBotY) + 10

      // ══════════════════════════════════════════════════════════════════════
      // SECTION D — Three numbered section cards (Row 1)
      //
      //  ┌──────────────────┬──────────────────────┬──────────────────────┐
      //  │ 1 PERSONAL INFO  │ 2 RESIDENCE INFO      │ 3 BANKING INFO       │
      //  │  (navy header)   │  (green header)       │  (navy header)       │
      //  └──────────────────┴──────────────────────┴──────────────────────┘
      //
      // Each card has a colored header bar with a white numbered circle on
      // the left, a section title in white bold, and a body with label:value
      // lines in the card background color.
      // ══════════════════════════════════════════════════════════════════════
      const SEC_GAP  = 10
      const sectionW = (contentWidth - SEC_GAP * 2) / 3
      const secPadX  = 8
      const secPadY  = 8
      const secHdrH  = 20
      const FIELD_LH = 11   // line height for each label:value pair

      const currentAddr   = member.addresses.find((a) => a.addressType === "CURRENT")   || null
      const permanentAddr = member.addresses.find((a) => a.addressType === "PERMANENT") || null

      // ── Personal Information fields (14 rows) ──
      const personalFields: [string, string][] = [
        ["Father's Name",    orDash(member.fatherName)],
        ["Mother's Name",    orDash(member.motherName)],
        ["Spouse Name",      orDash(member.spouseName)],
        ["Date of Birth",    fmtDate(member.dateOfBirth)],
        ["Gender",           fmtEnum(member.gender)],
        ["Marital Status",   fmtEnum(member.maritalStatus)],
        ["Marriage Date",    fmtDate(member.marriageDate)],
        ["Nationality",      orDash(member.nationality)],
        ["Religion",         orDash(member.religion)],
        ["Blood Group",      fmtEnum(member.bloodGroup)],
        ["Profession",       orDash(member.profession)],
        ["National ID",      orDash(member.nidNumber)],
        ["Passport No",      orDash(member.passportNumber)],
        ["Driving License",  orDash(member.drivingLicense)],
      ]

      // ── Banking Information fields ──
      const bankFields: [string, string][] = [
        ["Bank Name",       orDash(member.bankName)],
        ["Branch",          orDash(member.branch)],
        ["Account Name",    orDash(member.accountName)],
        ["Account Number",  orDash(member.accountNumber)],
        ["Routing Number",  orDash(member.routingNumber)],
      ]

      // ── Residence section height = header + 2×(4 fields + sub-header) + padding
      // Each address block: sub-header pill (12pt) + 4 field lines × FIELD_LH
      const addrBlockH    = 12 + 4 * FIELD_LH + 4
      const residenceBodyH = addrBlockH * 2 + 6
      const residenceSectionH = secHdrH + residenceBodyH + secPadY * 2

      // ── Personal + banking heights (fields × line-height + padding) ──
      const personalSectionH = secHdrH + personalFields.length * FIELD_LH + secPadY * 2
      const bankSectionH     = secHdrH + bankFields.length * FIELD_LH + secPadY * 2

      const row1H = Math.max(personalSectionH, residenceSectionH, bankSectionH)

      // Draw all three row-1 sections
      const row1Configs = [
        { num: 1, title: "PERSONAL INFORMATION",  color: NAVY,  kind: "personal"  as const },
        { num: 2, title: "RESIDENCE INFORMATION", color: GREEN, kind: "residence" as const },
        { num: 3, title: "BANKING INFORMATION",   color: NAVY,  kind: "banking"   as const },
      ]

      row1Configs.forEach((cfg, i) => {
        const sx = MARGIN + i * (sectionW + SEC_GAP)
        drawSectionCard(doc, sx, y, sectionW, row1H, cfg.num, cfg.title, cfg.color)
        const innerX = sx + secPadX
        const innerY = y + secHdrH + secPadY
        const innerW = sectionW - secPadX * 2

        if (cfg.kind === "personal") {
          drawKeyValueList(doc, innerX, innerY, innerW, personalFields, FIELD_LH)
        } else if (cfg.kind === "residence") {
          drawAddressSection(doc, innerX, innerY, innerW, currentAddr, permanentAddr, FIELD_LH)
        } else if (cfg.kind === "banking") {
          drawKeyValueList(doc, innerX, innerY, innerW, bankFields, FIELD_LH)
        }
      })

      y += row1H + SEC_GAP

      // ══════════════════════════════════════════════════════════════════════
      // SECTION E — Nominee Information (Row 2 — full width)
      //
      //  ┌─────────────────────────────────────────────────────────────────┐
      //  │ 4 NOMINEE INFORMATION  (green header, full width)               │
      //  │  NOMINEE 1—40%    │   NOMINEE 2—30%   │   NOMINEE 3—30%        │
      //  │  [photo] fields…  │   [photo] fields… │   [photo] fields…      │
      //  └─────────────────────────────────────────────────────────────────┘
      //
      // Up to 3 nominees are placed side-by-side. Each nominee column has:
      //   • green sub-header with "NOMINEE N — X%" label
      //   • small photo box on the left (with "Nominee Photo" label)
      //   • Name / Relation / NID / Phone fields to the right of the photo
      // ══════════════════════════════════════════════════════════════════════
      const NOM_PHOTO_SIZE = 32
      const NOM_FIELD_LH   = 11
      // Height = section header + sub-header(12) + photo-or-fields area + padding
      const nomBodyH       = 14 + Math.max(NOM_PHOTO_SIZE, 4 * NOM_FIELD_LH) + 6
      const nomSectionH    = secHdrH + nomBodyH + secPadY * 2

      drawSectionCard(doc, MARGIN, y, contentWidth, nomSectionH, 4, "NOMINEE INFORMATION", GREEN)
      drawNomineeSection(
        doc,
        MARGIN + secPadX,
        y + secHdrH + secPadY,
        contentWidth - secPadX * 2,
        member.nominees,
        NOM_FIELD_LH,
        input.nomineePhotoBuffers || [],
      )

      y += nomSectionH + 14

      // ══════════════════════════════════════════════════════════════════════
      // SECTION F — Declaration (left) + Nominees Signature (right)
      //
      //  ┌─────────────────────────────┬─────────────────────────────────┐
      //  │ DECLARATION                 │ NOMINEES SIGNATURE              │
      //  │ (navy-tinted bg + border)   │ (white bg + green border)       │
      //  │ italic declaration text     │  1. Name   2. Name   3. Name    │
      //  │ _______________  date       │  [sig]     [sig]     [sig]      │
      //  │ Applicant Sig   ____        │  Signature Signature Signature  │
      //  └─────────────────────────────┴─────────────────────────────────┘
      // ══════════════════════════════════════════════════════════════════════
      const declH   = 100
      const declW   = contentWidth * 0.58
      const sigGap  = 8
      const nomSigW = contentWidth - declW - sigGap

      // ── Declaration box ──
      doc
        .roundedRect(MARGIN, y, declW, declH, 6)
        .fillColor(SOFT_NAVY_BG)
        .fill()
      doc
        .roundedRect(MARGIN, y, declW, declH, 6)
        .strokeColor(NAVY)
        .lineWidth(0.8)
        .stroke()

      // "DECLARATION" header
      doc
        .fillColor(NAVY)
        .font("Helvetica-Bold")
        .fontSize(9)
        .text("DECLARATION", MARGIN + 10, y + 8, { width: declW - 20 })

      // Italic declaration text
      doc
        .fillColor(INK)
        .font("Helvetica-Oblique")
        .fontSize(7.5)
        .text(
          `I hereby declare that all the information provided in this application form is true and correct to the best of my knowledge. I agree to abide by the rules, regulations and policies of ${org.name}.`,
          MARGIN + 10,
          y + 22,
          { width: declW - 20, lineGap: 2, height: 30 },
        )

      // Applicant signature area (below declaration text)
      const sigTopY    = y + 56
      const sigMaxW    = declW * 0.55
      const sigMaxH    = 22

      if (input.signatureBuffer) {
        try {
          doc.image(input.signatureBuffer, MARGIN + 10, sigTopY, {
            fit:    [sigMaxW, sigMaxH],
            valign: "bottom",
          })
        } catch {
          // Fall through to blank line
        }
      }

      // Underline for applicant signature
      const sigLineY = sigTopY + sigMaxH
      doc
        .strokeColor(INK)
        .lineWidth(0.8)
        .moveTo(MARGIN + 10, sigLineY)
        .lineTo(MARGIN + 10 + sigMaxW, sigLineY)
        .stroke()

      // "Applicant Signature" caption
      doc
        .fillColor(MUTED)
        .font("Helvetica")
        .fontSize(6.5)
        .text("Applicant Signature", MARGIN + 10, sigLineY + 3, {
          width: sigMaxW,
          align: "center",
        })

      // Date field — to the right inside the declaration box
      const dateX = MARGIN + declW * 0.68
      const dateW = declW - declW * 0.68 - 10
      doc
        .fillColor(INK)
        .font("Helvetica")
        .fontSize(8)
        .text(fmtDate(member.membershipDate || member.createdAt), dateX, sigTopY + 4, {
          width: dateW,
          align: "center",
        })
      doc
        .strokeColor(INK)
        .lineWidth(0.8)
        .moveTo(dateX, sigLineY)
        .lineTo(dateX + dateW, sigLineY)
        .stroke()
      doc
        .fillColor(MUTED)
        .font("Helvetica")
        .fontSize(6.5)
        .text("Date", dateX, sigLineY + 3, { width: dateW, align: "center" })

      // ── Nominees Signature box ──
      const nomSigX = MARGIN + declW + sigGap
      doc
        .roundedRect(nomSigX, y, nomSigW, declH, 6)
        .fillColor("white")
        .fill()
      doc
        .roundedRect(nomSigX, y, nomSigW, declH, 6)
        .strokeColor(GREEN)
        .lineWidth(1)
        .stroke()

      doc
        .fillColor(NAVY)
        .font("Helvetica-Bold")
        .fontSize(9)
        .text("NOMINEES SIGNATURE", nomSigX + 6, y + 6, { width: nomSigW - 12 })

      const nomineesForSig = member.nominees.slice(0, 3)
      if (nomineesForSig.length === 0) {
        doc
          .fillColor(MUTED)
          .font("Helvetica-Oblique")
          .fontSize(7.5)
          .text("No nominee registered.", nomSigX + 6, y + declH / 2 - 4, {
            width: nomSigW - 12,
            align: "center",
          })
      } else {
        const slotsTop = y + 22
        const slotsH   = declH - 28
        const slotGap  = 4
        const slotW    = (nomSigW - 12 - slotGap * (nomineesForSig.length - 1)) / nomineesForSig.length

        nomineesForSig.forEach((n, i) => {
          const sx = nomSigX + 6 + i * (slotW + slotGap)

          // Nominee name label at top of slot
          doc
            .fillColor(GREEN)
            .font("Helvetica-Bold")
            .fontSize(7)
            .text(`${i + 1}. ${n.name}`, sx, slotsTop, { width: slotW, ellipsis: true })

          // Signature image (if supplied)
          const sigImgMaxH  = slotsH - 20
          const nomSigBuf   = input.nomineeSignatureBuffers?.[i] || null
          if (nomSigBuf) {
            try {
              doc.image(nomSigBuf, sx, slotsTop + 10, {
                fit:    [slotW, sigImgMaxH],
                align:  "center",
                valign: "bottom",
              })
            } catch {
              // ignore bad buffer — blank line is used instead
            }
          }

          // Signature underline at bottom of slot
          const lineY = slotsTop + slotsH - 6
          doc
            .strokeColor(INK)
            .lineWidth(0.7)
            .moveTo(sx, lineY)
            .lineTo(sx + slotW, lineY)
            .stroke()
          doc
            .fillColor(MUTED)
            .font("Helvetica")
            .fontSize(6)
            .text("Signature", sx, lineY + 2, { width: slotW, align: "center" })
        })
      }

      y += declH + 16

      // ══════════════════════════════════════════════════════════════════════
      // SECTION G — Authorized Signatures row (4 equal zones)
      //
      //  ┌────────────────┬────────────────┬────────────────┬──────────────┐
      //  │ AUTHORIZED     │   CHAIRMAN     │  OFFICIAL      │   DATE       │
      //  │ SIGNATURE      │               │  SEAL (dotted) │  dd/mm/yyyy  │
      //  │ ______________ │ ______________ │  circle        │ ____________ │
      //  │(Auth Officer)  │  (Chairman)    │                │              │
      //  └────────────────┴────────────────┴────────────────┴──────────────┘
      // ══════════════════════════════════════════════════════════════════════
      const authH  = 52
      const zoneW  = contentWidth / 4

      const authZones: [string, string][] = [
        ["AUTHORIZED SIGNATURE", "(Authorized Officer)"],
        ["CHAIRMAN",             "(Chairman)"],
        ["OFFICIAL SEAL",        ""],
        ["DATE",                 fmtDate(member.membershipDate || member.createdAt)],
      ]

      authZones.forEach(([label, sublabel], i) => {
        const zx = MARGIN + i * zoneW

        // Dotted vertical divider between zones (not before the first one)
        if (i > 0) {
          doc
            .dash(1, { space: 2 })
            .strokeColor(LINE)
            .lineWidth(0.6)
            .moveTo(zx, y)
            .lineTo(zx, y + authH)
            .stroke()
          doc.undash()
        }

        if (label === "OFFICIAL SEAL") {
          // Dotted circle as seal placeholder (radius matches reference)
          const cx = zx + zoneW / 2
          const cy = y + authH / 2
          doc
            .dash(2, { space: 2 })
            .strokeColor(MUTED)
            .lineWidth(1)
            .circle(cx, cy, 24)
            .stroke()
          doc.undash()
          doc
            .fillColor(MUTED)
            .font("Helvetica-Bold")
            .fontSize(7)
            .text("OFFICIAL", cx - 24, cy - 7, { width: 48, align: "center" })
          doc
            .fillColor(MUTED)
            .font("Helvetica-Bold")
            .fontSize(7)
            .text("SEAL", cx - 18, cy + 1, { width: 36, align: "center" })
        } else {
          // Signature line
          const lineTop = y + authH - 20
          doc
            .strokeColor(INK)
            .lineWidth(0.8)
            .moveTo(zx + 10, lineTop)
            .lineTo(zx + zoneW - 10, lineTop)
            .stroke()

          // For the DATE zone, show the date value above the line
          if (label === "DATE" && sublabel) {
            doc
              .fillColor(INK)
              .font("Helvetica")
              .fontSize(8)
              .text(sublabel, zx + 10, lineTop - 12, { width: zoneW - 20, align: "center" })
          }

          // Bold label below line
          doc
            .fillColor(INK)
            .font("Helvetica-Bold")
            .fontSize(7.5)
            .text(label, zx + 10, lineTop + 4, { width: zoneW - 20, align: "center" })

          // Sub-label (e.g. "(Authorized Officer)", "(Chairman)")
          if (label !== "DATE" && sublabel) {
            doc
              .fillColor(MUTED)
              .font("Helvetica")
              .fontSize(6.5)
              .text(sublabel, zx + 10, lineTop + 14, { width: zoneW - 20, align: "center" })
          }
        }
      })

      doc.end()
    } catch (err) {
      reject(err)
    }
  })
}

// ════════════════════════════════════════════════════════════════════════════
// Drawing helpers
// ════════════════════════════════════════════════════════════════════════════

/**
 * Draw a numbered section card.
 *
 * Visual structure:
 *   ┌─────────────────────────────────┐
 *   │ ● N  SECTION TITLE              │  ← colored header band (secHdrH = 20pt)
 *   │  field-label: value             │  ← soft-grey body
 *   │  ...                            │
 *   └─────────────────────────────────┘
 *
 * @param num   Section number rendered in the white circle
 * @param color Header band fill color (NAVY or GREEN)
 */
function drawSectionCard(
  doc: PDFDocument,
  x: number,
  y: number,
  w: number,
  h: number,
  num: number,
  title: string,
  color: string,
) {
  const headerH = 20

  // Card background
  doc.roundedRect(x, y, w, h, 5).fillColor(SOFT_BG).fill()
  doc.roundedRect(x, y, w, h, 5).strokeColor(LINE).lineWidth(0.7).stroke()

  // Header band — full top portion filled with section color
  doc.roundedRect(x, y, w, headerH, 5).fillColor(color).fill()
  // Square off the bottom half of the header rounded corners
  doc.rect(x, y + headerH - 5, w, 5).fillColor(color).fill()

  // Numbered white circle on the left of the header
  const cR = 7
  const cX = x + 13
  const cY = y + headerH / 2
  doc.circle(cX, cY, cR).fillColor("white").fill()
  doc
    .fillColor(color)
    .font("Helvetica-Bold")
    .fontSize(8.5)
    .text(String(num), cX - cR, cY - 4.5, { width: cR * 2, align: "center" })

  // Section title in white bold
  doc
    .fillColor("white")
    .font("Helvetica-Bold")
    .fontSize(7.5)
    .text(title, cX + cR + 5, cY - 4, { width: w - (cX - x) - cR * 2 - 10 })
}

/**
 * Render a list of [label, value] pairs as "Label: Value" lines.
 * Labels are drawn in muted grey; values follow immediately in dark ink.
 */
function drawKeyValueList(
  doc: PDFDocument,
  x: number,
  y: number,
  w: number,
  items: [string, string][],
  lineH = 13,
) {
  items.forEach(([label, value], i) => {
    const ly = y + i * lineH
    // Label in muted grey, colon appended
    doc
      .fillColor(MUTED)
      .font("Helvetica")
      .fontSize(7)
      .text(label + " :", x, ly, { width: w, ellipsis: true, continued: true })
    // Value in dark ink right after the label
    doc
      .fillColor(INK)
      .font("Helvetica")
      .fontSize(7.5)
      .text(" " + value, { width: w, ellipsis: true })
  })
}

/**
 * Render the residence section with two address sub-blocks stacked vertically:
 *   CURRENT ADDRESS
 *   PERMANENT ADDRESS
 * Each sub-block has a soft-green label pill and four field rows.
 */
function drawAddressSection(
  doc: PDFDocument,
  x: number,
  y: number,
  w: number,
  current: MemberFormAddress | null,
  permanent: MemberFormAddress | null,
  lineH = 12,
) {
  const PILL_H     = 13
  const FIELDS     = 4
  const blockH     = PILL_H + FIELDS * lineH + 4

  const drawAddrBlock = (label: string, addr: MemberFormAddress | null, sy: number) => {
    // Sub-header pill — soft green background, green bold text
    doc.roundedRect(x, sy, w, PILL_H, 3).fillColor(SOFT_GREEN_BG).fill()
    doc
      .fillColor(GREEN)
      .font("Helvetica-Bold")
      .fontSize(6.5)
      .text(label, x + 4, sy + 3, { width: w - 8 })

    // Four standard address fields
    const fields: [string, string][] = [
      ["Address",     orDash(addr?.village)],
      ["Post Office", orDash(addr?.postOffice)],
      ["District",    orDash(addr?.district)],
      ["Post Code",   orDash(addr?.postalCode)],
    ]
    drawKeyValueList(doc, x, sy + PILL_H + 2, w, fields, lineH)
  }

  drawAddrBlock("CURRENT ADDRESS",   current,   y)
  drawAddrBlock("PERMANENT ADDRESS", permanent, y + blockH + 4)
}

/**
 * Render up to 3 nominee columns side-by-side inside the nominee section card.
 *
 * Each column layout:
 *   ┌─────────────────────────────────────┐
 *   │ NOMINEE N — XX%  (green sub-header) │
 *   │ [photo] │ Name:     …               │
 *   │ Nominee │ Relation: …               │
 *   │  Photo  │ NID:      …               │
 *   │         │ Phone:    …               │
 *   └─────────────────────────────────────┘
 */
function drawNomineeSection(
  doc: PDFDocument,
  x: number,
  y: number,
  w: number,
  nominees: MemberFormNominee[],
  lineH = 11,
  nomineePhotoBuffers: (Buffer | null)[] = [],
) {
  if (nominees.length === 0) {
    doc
      .fillColor(MUTED)
      .font("Helvetica-Oblique")
      .fontSize(7.5)
      .text("No nominee registered.", x, y, { width: w })
    return
  }

  const shown   = nominees.slice(0, 3)
  const colGap  = 8
  const colW    = (w - colGap * (shown.length - 1)) / shown.length
  const PHSZ    = 32   // nominee photo box size
  const PHG     = 6    // gap between photo and field text
  const SUB_H   = 14   // sub-header pill height

  shown.forEach((n, i) => {
    const cx = x + i * (colW + colGap)

    // Sub-header: "NOMINEE N — XX%"
    doc.roundedRect(cx, y, colW, SUB_H, 3).fillColor(SOFT_GREEN_BG).fill()
    doc
      .fillColor(GREEN)
      .font("Helvetica-Bold")
      .fontSize(7)
      .text(`NOMINEE ${i + 1} — ${n.sharePercentage}%`, cx + 4, y + 3, { width: colW - 8 })

    // Photo box (left side, below sub-header)
    const phY = y + SUB_H + 4
    doc
      .roundedRect(cx, phY, PHSZ, PHSZ, 3)
      .strokeColor(LINE)
      .lineWidth(0.6)
      .stroke()

    const phBuf = nomineePhotoBuffers[i] || null
    if (phBuf) {
      try {
        doc.image(phBuf, cx + 1, phY + 1, {
          fit:    [PHSZ - 2, PHSZ - 2],
          align:  "center",
          valign: "center",
        })
      } catch {
        drawSilhouette(doc, cx, phY, PHSZ)
      }
    } else {
      // "Nominee Photo" label placeholder
      doc
        .fillColor(MUTED)
        .font("Helvetica")
        .fontSize(5.5)
        .text("Nominee", cx, phY + PHSZ / 2 - 7, { width: PHSZ, align: "center" })
      doc
        .fillColor(MUTED)
        .font("Helvetica")
        .fontSize(5.5)
        .text("Photo", cx, phY + PHSZ / 2 - 1, { width: PHSZ, align: "center" })
    }

    // Nominee label "Nominee\n1\nPhoto" text in the box (match reference)
    // Already handled above — just draw the field data to the right.

    // Field data — right of photo
    const fdX = cx + PHSZ + PHG
    const fdW = colW - PHSZ - PHG
    const fields: [string, string][] = [
      ["Name",     orDash(n.name)],
      ["Relation", orDash(n.relation)],
      ["NID",      orDash(n.nidNumber)],
      ["Phone",    orDash(n.phone)],
    ]
    drawKeyValueList(doc, fdX, phY, fdW, fields, lineH)
  })
}

/**
 * Draw a simple body-silhouette placeholder when no member photo is available.
 * Uses only vector primitives (circle for head, rounded rect for torso).
 */
function drawSilhouette(doc: PDFDocument, x: number, y: number, size: number) {
  const cx    = x + size / 2
  const headR = size * 0.18
  const headY = y + size * 0.36
  doc.circle(cx, headY, headR).fillColor("#cbd5e1").fill()

  const torsoW = size * 0.58
  const torsoH = size * 0.46
  const torsoX = cx - torsoW / 2
  const torsoY = y + size * 0.56
  doc
    .roundedRect(torsoX, torsoY, torsoW, torsoH, torsoW / 2)
    .fillColor("#cbd5e1")
    .fill()

  doc
    .fillColor(MUTED)
    .font("Helvetica")
    .fontSize(6.5)
    .text("No Photo", x, y + size - 12, { width: size, align: "center" })
}
