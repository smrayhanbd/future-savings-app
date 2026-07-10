import prisma from "@/lib/prisma"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { ArrowLeft, ExternalLink, User, Phone, Home, FileText, Users as UsersIcon, Wallet, CalendarDays, CreditCard } from "lucide-react"

export const dynamic = 'force-dynamic'

export default async function MemberProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const member = await prisma.member.findUnique({
    where: { id: id },
    include: {
      addresses: true,
      nominees: true,
      documents: true,
      savings: {
        orderBy: { date: "desc" },
        take: 5,
      },
    },
  })

  if (!member) {
    notFound()
  }

  const currentAddress = member.addresses.find((a) => a.addressType === "CURRENT")
  const permanentAddress = member.addresses.find((a) => a.addressType === "PERMANENT")

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/members">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{member.fullName}</h1>
            <p className="text-sm font-mono text-slate-500 mt-1">Member ID: {member.memberNo}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={member.status === "ACTIVE" ? "default" : "secondary"} className={`uppercase text-xs ${member.status === "ACTIVE" ? "bg-emerald-600 text-white" : "bg-amber-500 text-white"}`}>
            {member.status}
          </Badge>
          <Button variant="outline"><FileText className="mr-2 h-4 w-4" /> Print Form</Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700"><User className="mr-2 h-4 w-4" /> Edit Profile</Button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* Left Column (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Personal Information */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="bg-slate-50 dark:bg-slate-900/50 rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-base"><User className="h-4 w-4" /> Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3 pt-6">
              <div className="space-y-1">
                <p className="text-xs uppercase font-bold text-slate-400 flex items-center gap-1.5"><CalendarDays className="h-3 w-3" /> Date of Birth</p>
                <p className="text-sm text-slate-700 dark:text-slate-200">{member.dateOfBirth ? new Date(member.dateOfBirth).toLocaleDateString() : "N/A"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase font-bold text-slate-400 flex items-center gap-1.5"><User className="h-3 w-3" /> Gender</p>
                <p className="text-sm text-slate-700 dark:text-slate-200">{member.gender || "N/A"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase font-bold text-slate-400 flex items-center gap-1.5"><User className="h-3 w-3" /> Religion</p>
                <p className="text-sm text-slate-700 dark:text-slate-200">{member.religion || "N/A"}</p>
              </div>
            </CardContent>
          </Card>

          {/* Contact & Family */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="bg-slate-50 dark:bg-slate-900/50 rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-base"><Phone className="h-4 w-4" /> Contact & Family</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3 pt-6">
              <div className="space-y-1">
                <p className="text-xs uppercase font-bold text-slate-400 flex items-center gap-1.5"><Phone className="h-3 w-3" /> Phone</p>
                <p className="text-sm text-slate-700 dark:text-slate-200">{member.phone}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase font-bold text-slate-400 flex items-center gap-1.5"><User className="h-3 w-3" /> Spouse Name</p>
                <p className="text-sm text-slate-700 dark:text-slate-200">{member.spouseName || "N/A"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase font-bold text-slate-400 flex items-center gap-1.5"><User className="h-3 w-3" /> Father's Name</p>
                <p className="text-sm text-slate-700 dark:text-slate-200">{member.fatherName || "N/A"}</p>
              </div>
            </CardContent>
          </Card>

          {/* Addresses */}
          <div className="grid gap-6 sm:grid-cols-2">
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="bg-slate-50 dark:bg-slate-900/50 rounded-t-lg">
                <CardTitle className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-base"><Home className="h-4 w-4" /> Current Address</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 text-sm text-slate-700 dark:text-slate-300 space-y-1">
                {currentAddress ? (
                  <>
                    <p>{currentAddress.village}</p>
                    <p>{currentAddress.postOffice}</p>
                    <p>{currentAddress.policeStation}</p>
                    <p>{currentAddress.district}, {currentAddress.division}</p>
                    <p>{currentAddress.postalCode}</p>
                  </>
                ) : <p className="text-slate-500">Not provided</p>}
              </CardContent>
            </Card>
            
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="bg-slate-50 dark:bg-slate-900/50 rounded-t-lg">
                <CardTitle className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-base"><Home className="h-4 w-4" /> Permanent Address</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 text-sm text-slate-700 dark:text-slate-300 space-y-1">
                {permanentAddress ? (
                  <>
                    <p>{permanentAddress.village}</p>
                    <p>{permanentAddress.postOffice}</p>
                    <p>{permanentAddress.policeStation}</p>
                    <p>{permanentAddress.district}, {permanentAddress.division}</p>
                    <p>{permanentAddress.postalCode}</p>
                  </>
                ) : <p className="text-slate-500">Not provided</p>}
              </CardContent>
            </Card>
          </div>

          {/* Bank Information */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="bg-slate-50 dark:bg-slate-900/50 rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-base"><CreditCard className="h-4 w-4" /> Bank Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 pt-6">
              <div className="space-y-1">
                <p className="text-xs uppercase font-bold text-slate-400">Account Name</p>
                <p className="text-sm text-slate-700 dark:text-slate-200">{member.accountName || "N/A"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase font-bold text-slate-400">Account Number</p>
                <p className="text-sm text-slate-700 dark:text-slate-200">{member.accountNumber || "N/A"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase font-bold text-slate-400">Bank Name</p>
                <p className="text-sm text-slate-700 dark:text-slate-200">{member.bankName || "N/A"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase font-bold text-slate-400">Branch</p>
                <p className="text-sm text-slate-700 dark:text-slate-200">{member.branch || "N/A"}</p>
              </div>
            </CardContent>
          </Card>

          {/* Recent Financial Activity */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="bg-slate-50 dark:bg-slate-900/50 rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-base"><Wallet className="h-4 w-4" /> Recent Financial Activity</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {member.savings.length > 0 ? (
                <div className="space-y-4">
                  {member.savings.map((sav) => (
                    <div key={sav.id} className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center">
                          <CreditCard className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-slate-900 dark:text-white">{sav.type}</p>
                          <p className="text-xs text-slate-500">{new Date(sav.date).toLocaleDateString()} via {sav.method}</p>
                        </div>
                      </div>
                      <span className="font-bold text-emerald-600">+ ৳ {Number(sav.amount).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center py-6">No recent transactions.</p>
              )}
            </CardContent>
          </Card>

        </div>

        {/* Right Column (1/3 width) */}
        <div className="space-y-6">
          
          {/* Profile Photo & Quick Info */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardContent className="flex flex-col items-center text-center pt-6">
              {member.photoUrl ? (
                <img src={member.photoUrl} alt="Member" className="w-32 h-32 rounded-full object-cover ring-4 ring-slate-100 dark:ring-slate-800" />
              ) : (
                <div className="w-32 h-32 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-4xl font-bold text-indigo-600 ring-4 ring-slate-100 dark:ring-slate-800">
                  {member.fullName.charAt(0)}
                </div>
              )}
              <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">{member.fullName}</h2>
              <p className="text-sm text-slate-500">{member.memberNo}</p>
              <div className="mt-4 w-full grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                <div>
                  <p className="text-xs text-slate-400 uppercase font-bold">Join Date</p>
                  <p className="text-sm font-medium">{new Date(member.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase font-bold">NID</p>
                  <p className="text-sm font-medium">{member.nidNumber || "N/A"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Identity Documents */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="bg-slate-50 dark:bg-slate-900/50 rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-base"><FileText className="h-4 w-4" /> Identity Documents</CardTitle>
            </CardHeader>
                        <CardContent className="pt-6 space-y-3">
              {member.documents.length > 0 ? (
                member.documents.map((doc) => (
                  <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" key={doc.id} className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-slate-400" />
                      <div>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 block">{doc.name || doc.documentType}</span>
                        <span className="text-xs text-slate-400">{doc.documentType}</span>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-indigo-600" />
                  </a>
                ))
              ) : (
                <p className="text-sm text-slate-500 text-center py-4">No documents uploaded.</p>
              )}
            </CardContent>
          </Card>

          {/* Registered Beneficiaries / Nominees */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="bg-slate-50 dark:bg-slate-900/50 rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-base"><UsersIcon className="h-4 w-4" /> Registered Beneficiaries</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {member.nominees.length > 0 ? (
                member.nominees.map((nom) => (
                  <div key={nom.id} className="flex items-start gap-3 border-b border-slate-100 dark:border-slate-800 pb-3 last:border-0 last:pb-0">
                    <div className="w-10 h-10 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center text-pink-600 font-bold shrink-0">
                      {nom.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-slate-900 dark:text-white">{nom.name}</p>
                      <p className="text-xs text-slate-500">{nom.relation}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900">
                          Share: {Number(nom.sharePercentage)}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 text-center py-4">No nominees registered.</p>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}