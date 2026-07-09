import prisma from "@/lib/prisma"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, ExternalLink } from "lucide-react"

export default async function MemberProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const member = await prisma.member.findUnique({
    where: { id: id },
    include: {
      addresses: true,
      nominees: true,
      documents: true,
    },
  })

  if (!member) {
    notFound()
  }

  const currentAddress = member.addresses.find((a) => a.addressType === "CURRENT")

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/members">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{member.fullName}</h1>
          <p className="text-sm font-mono text-slate-500">{member.memberNo}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Photo & Documents */}
        <div className="space-y-6">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle>Photo</CardTitle>
            </CardHeader>
            <CardContent>
              {member.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={member.photoUrl} alt="Member" className="rounded-lg w-full object-cover" />
              ) : (
                <div className="flex h-48 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400">
                  No Photo
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle>Documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {member.documents.length > 0 ? (
                member.documents.map((doc) => (
                  <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" key={doc.id}>
                    <Button variant="outline" className="w-full justify-between">
                      {doc.documentType} <ExternalLink className="h-4 w-4" />
                    </Button>
                  </a>
                ))
              ) : (
                <p className="text-sm text-slate-500">No documents uploaded.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Details */}
        <div className="space-y-6 md:col-span-2">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 text-sm">
              <div><span className="font-medium text-slate-500">Father's Name:</span> <br /> {member.fatherName || "N/A"}</div>
              <div><span className="font-medium text-slate-500">Mother's Name:</span> <br /> {member.motherName || "N/A"}</div>
              <div><span className="font-medium text-slate-500">Phone:</span> <br /> {member.phone}</div>
              <div><span className="font-medium text-slate-500">Email:</span> <br /> {member.email || "N/A"}</div>
              <div><span className="font-medium text-slate-500">NID Number:</span> <br /> {member.nidNumber || "N/A"}</div>
              <div><span className="font-medium text-slate-500">Gender:</span> <br /> {member.gender || "N/A"}</div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle>Current Address</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {currentAddress ? (
                <div className="space-y-1">
                  <p>{currentAddress.village}</p>
                  <p>{currentAddress.postOffice}</p>
                  <p>{currentAddress.policeStation}</p>
                  <p>{currentAddress.district}, {currentAddress.division}</p>
                  <p>{currentAddress.country}</p>
                </div>
              ) : (
                <p className="text-slate-500">No address provided.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle>Nominees</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {member.nominees.length > 0 ? (
                member.nominees.map((nom) => (
                  <div key={nom.id} className="border-b border-slate-100 dark:border-slate-800 pb-2">
                    <p className="font-medium">{nom.name}</p>
                    <p className="text-slate-500">Relation: {nom.relation} | Share: {Number(nom.sharePercentage)}%</p>
                    <p className="text-slate-500">Phone: {nom.phone || "N/A"}</p>
                  </div>
                ))
              ) : (
                <p className="text-slate-500">No nominees provided.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}