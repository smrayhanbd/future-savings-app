import prisma from "@/lib/prisma"
import LandingPageClient from "@/components/LandingPageClient"

export const dynamic = 'force-dynamic'

export default async function LandingPage() {
  // Fetch dynamic content
  let content = await prisma.siteContent.findUnique({ where: { id: "singleton" } })

  // Fallback defaults if admin hasn't set content yet
  if (!content) {
    content = {
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
      whyJoinUs: [{ title: "Financial Growth", description: "Access to low-interest loans and high-yield savings." }],
      howWeRun: [{ title: "Monthly Meetings", description: "Transparent decision making." }]
    } as any
  }

  // Pass the content to the Client Component
  return <LandingPageClient content={content} />
}