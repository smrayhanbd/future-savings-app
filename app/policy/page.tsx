import prisma from "@/lib/prisma"
import PolicyClient from "./PolicyClient"

export const dynamic = 'force-dynamic'

export default async function PolicyPage() {
  const content = await prisma.siteContent.findUnique({ where: { id: "singleton" } })
  const policyContent = content?.policyContent || "No policy content available yet. Please check back later."

  return <PolicyClient content={policyContent} />
}