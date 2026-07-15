import prisma from "@/lib/prisma"
import PolicyClient from "./PolicyClient"

export const dynamic = 'force-dynamic'

export default async function PolicyPage() {
  let content = await prisma.siteContent.findUnique({ where: { id: "singleton" } })
  
  if (!content) {
    content = { policyContent: "No policy content available yet. Please check back later." } as any
  }

  return <PolicyClient content={content.policyContent || ""} />
}