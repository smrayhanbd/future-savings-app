import prisma from "@/lib/prisma"
import Link from "next/link"
import CollectionForm from "./CollectionForm"

export const dynamic = 'force-dynamic'

export default async function CollectionEntryPage() {
  const members = await prisma.member.findMany({
    where: { status: "ACTIVE" },
    orderBy: { firstName: "asc" },
    select: { id: true, fullName: true, memberNo: true, phone: true }
  })

  return (
    <div className="space-y-6">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/50">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <div className="flex items-center text-xs text-gray-500 mb-1">
              <Link href="/dashboard" className="hover:text-indigo-600">Dashboard</Link>
              <span className="mx-1">/</span>
              <span className="text-gray-900 dark:text-white">Collection Entry</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Collection Entry</h1>
          </div>
        </div>
      </div>

      <CollectionForm members={members} />
    </div>
  )
}