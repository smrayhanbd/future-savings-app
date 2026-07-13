import prisma from "@/lib/prisma"
import { notFound } from "next/navigation"
import EditMemberForm from "./EditMemberForm"

export const dynamic = 'force-dynamic'

export default async function EditMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const member = await prisma.member.findUnique({
    where: { id },
    include: {
      addresses: true,
      nominees: true,
      documents: true,
    }
  })

  if (!member) {
    notFound()
  }

  // Serialize dates to strings for the client component state
  const serializedMember = JSON.parse(JSON.stringify(member))

  return <EditMemberForm member={serializedMember} />
}