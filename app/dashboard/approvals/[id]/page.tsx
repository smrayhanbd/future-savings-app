import prisma from "@/lib/prisma"
import { notFound } from "next/navigation"
import ApprovalForm from "./ApprovalForm"

export const dynamic = 'force-dynamic'

export default async function ReviewApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const member = await prisma.member.findUnique({
    where: { id },
    include: { addresses: true, nominees: true, documents: true }
  })

  if (!member) {
    notFound()
  }

  const serializedMember = JSON.parse(JSON.stringify(member))

  return <ApprovalForm member={serializedMember} />
}