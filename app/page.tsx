import prisma from "@/lib/prisma"
import LandingPageClient, { type LandingContent } from "@/components/LandingPageClient"

export const dynamic = 'force-dynamic'

export default async function LandingPage() {
  // Fetch dynamic content
  const content = await prisma.siteContent.findUnique({ where: { id: "singleton" } })

  // Fallback defaults if admin hasn't set content yet. Only the fields the
  // landing page renders are required, so we project down to LandingContent.
  const fallback: LandingContent = {
    heroTitle: "The Modern Way to Manage Your Somiti",
    heroSubtitle: "Digitize your cooperative society. Automate collections, track ledgers in real-time, manage members effortlessly, and build financial trust with complete transparency.",
    aboutTitle: "About Our Somiti",
    aboutContent: "We are a community-driven cooperative society dedicated to empowering our members financially. Founded on principles of trust and mutual support, we provide a secure platform for savings, loans, and investments.",
    visionTitle: "Our Vision & Mission",
    visionContent: "To build a financially resilient community where every member has access to transparent, secure, and modern financial services, fostering growth and prosperity for all.",
    transparency: "100% Transparency in Somiti Management. All transactions are recorded in real-time ledgers. Members have 24/7 access to their balances, and automated receipts ensure accountability for every Taka.",
    facilities: [{ title: "Secure Savings", description: "Bank-grade security for your daily and monthly savings." }],
    management: [{ name: "Md. Rahim", role: "President", bio: "Dedicated to community growth.", photoUrl: "" }],
    activities: [{ title: "Annual Picnic", date: "Dec 2023", description: "A wonderful community gathering." }],
    projects: [{ title: "Land Purchase", status: "Ongoing", description: "Buying land for future community center." }],
  }

  // Pass the content to the Client Component. The Prisma Json fields are
  // structurally arrays of items but typed as JsonValue, so cast through the
  // landing-content shape (the fields are only ever read, never mutated).
  const landingContent: LandingContent = (content as unknown as LandingContent) ?? fallback

  return <LandingPageClient content={landingContent} />
}