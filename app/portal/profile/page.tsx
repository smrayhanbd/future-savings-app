import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  User, Phone, Mail, Home, Building, Banknote, CreditCard, 
  FileText, Users, CalendarDays, Heart, Globe, Droplet, Briefcase, 
  MapPin, ExternalLink, Scale, Hash 
} from "lucide-react"

export const dynamic = 'force-dynamic'

export default async function PortalProfilePage() {
  const session = await getServerSession(authOptions)

  // Security: Ensure only members can access this page
  if (!session?.user || session.user.role !== "MEMBER") {
    redirect("/")
  }

  const memberId = session.user.id

  // Fetch Member Data & All Related Info
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: {
      addresses: true,
      nominees: true,
      documents: true,
    },
  })

  if (!member) {
    redirect("/portal")
  }

  const currentAddress = member.addresses.find((a) => a.addressType === "CURRENT")
  const permanentAddress = member.addresses.find((a) => a.addressType === "PERMANENT")
  
  // Determine ID Type dynamically
  const idType = member.nidNumber ? "National ID" : member.passportNumber ? "Passport" : member.birthCertificateNo ? "Birth Certificate" : "ID"
  const idNumber = member.nidNumber || member.passportNumber || member.birthCertificateNo || "N/A"
  
  // Find the main ID document
  const idDoc = member.documents.find(d => d.documentType === idType)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">My Profile</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">View your registration details and submitted documents.</p>
      </div>

      {/* Profile Header Card */}
      <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm rounded-2xl overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-indigo-600 to-purple-600"></div>
        <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between -mt-12">
          <div className="flex items-center gap-4">
            {member.photoUrl ? (
              <img src={member.photoUrl} alt="Member" className="w-24 h-24 rounded-full object-cover ring-4 ring-white dark:ring-slate-900 shadow-xl" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-3xl font-bold text-indigo-600 ring-4 ring-white dark:ring-slate-900 shadow-xl">
                {member.fullName.charAt(0)}
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{member.fullName}</h2>
              <p className="text-sm font-mono text-slate-500 dark:text-slate-400">{member.memberNo} • {member.phone}</p>
              <Badge variant={member.status === "ACTIVE" ? "default" : "secondary"} className={`uppercase text-xs px-2.5 py-1 rounded-full mt-2 ${member.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-amber-500/10 text-amber-600 border border-amber-500/20"}`}>
                {member.status}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Column (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Personal Information */}
          <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="bg-blue-600 text-white rounded-t-2xl border-b border-slate-100 dark:border-slate-800 pb-3 px-5 py-3">
              <CardTitle className="flex items-center gap-2 text-sm text-white tracking-tight font-bold">
                <User className="h-4 w-4" /> Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3 pt-4 px-5">
              <InfoItem icon={CalendarDays} label="Date of Birth" value={member.dateOfBirth ? new Date(member.dateOfBirth).toLocaleDateString() : "N/A"} />
              <InfoItem icon={User} label="Gender" value={member.gender ? member.gender.charAt(0) + member.gender.slice(1).toLowerCase() : "N/A"} />
              <InfoItem icon={Heart} label="Marital Status" value={member.maritalStatus ? member.maritalStatus.charAt(0) + member.maritalStatus.slice(1).toLowerCase() : "N/A"} />
              <InfoItem icon={CalendarDays} label="Marriage Date" value={member.marriageDate ? new Date(member.marriageDate).toLocaleDateString() : "N/A"} />
              <InfoItem icon={Globe} label="Religion" value={member.religion || "N/A"} />
              <InfoItem icon={Globe} label="Nationality" value={member.nationality || "N/A"} />
              <InfoItem icon={Droplet} label="Blood Group" value={member.bloodGroup ? member.bloodGroup.replace("_POSITIVE", "+").replace("_NEGATIVE", "-") : "N/A"} />
              <InfoItem icon={Briefcase} label="Profession" value={member.profession || "N/A"} />
              <InfoItem icon={User} label="Father's Name" value={member.fatherName || "N/A"} />
              <InfoItem icon={User} label="Mother's Name" value={member.motherName || "N/A"} />
              <InfoItem icon={Heart} label="Spouse Name" value={member.spouseName || "N/A"} />
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="bg-green-600 text-white rounded-t-2xl border-b border-slate-100 dark:border-slate-800 pb-3 px-5 py-3">
              <CardTitle className="flex items-center gap-2 text-sm text-white tracking-tight font-bold">
                <Phone className="h-4 w-4" /> Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 pt-4 px-5">
              <InfoItem icon={Phone} label="Phone Number" value={member.phone} />
              <InfoItem icon={Mail} label="Email Address" value={member.email || "N/A"} />
              <InfoItem icon={Phone} label="Emergency Contact" value={member.emergencyPhone || "N/A"} />
              <InfoItem icon={User} label="Emergency Person" value={member.emergencyContactName || "N/A"} />
            </CardContent>
          </Card>

          {/* Residence Information */}
          <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="bg-gray-600 text-white rounded-t-2xl border-b border-slate-100 dark:border-slate-800 pb-3 px-5 py-3">
              <CardTitle className="flex items-center gap-2 text-sm text-white tracking-tight font-bold">
                <Home className="h-4 w-4" /> Residence Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 pt-4 px-5">
              <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800/50">
                <h4 className="text-[11px] font-bold uppercase text-slate-500 flex items-center gap-1.5 tracking-wider"><MapPin className="h-3 w-3" /> Current Address</h4>
                <AddressDisplay address={currentAddress} />
              </div>
              <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800/50">
                <h4 className="text-[11px] font-bold uppercase text-slate-500 flex items-center gap-1.5 tracking-wider"><Building className="h-3 w-3" /> Permanent Address</h4>
                <AddressDisplay address={permanentAddress} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (1/3 width) */}
        <div className="space-y-6">
          
          {/* Bank Details */}
          <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="bg-yellow-600 text-white rounded-t-2xl border-b border-slate-100 dark:border-slate-800 pb-3 px-5 py-3">
              <CardTitle className="flex items-center gap-2 text-sm text-white tracking-tight font-bold">
                <Banknote className="h-4 w-4" /> Bank Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4 px-5">
              <InfoItem vertical icon={User} label="Account Name" value={member.accountName || "N/A"} />
              <InfoItem vertical icon={CreditCard} label="Account Number" value={member.accountNumber || "N/A"} />
              <InfoItem vertical icon={Building} label="Bank Name" value={member.bankName || "N/A"} />
              <InfoItem vertical icon={MapPin} label="Branch" value={member.branch || "N/A"} />
              <InfoItem vertical icon={Hash} label="Routing Number" value={member.routingNumber || "N/A"} />
            </CardContent>
          </Card>

          {/* Documents */}
          <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="bg-blue-500 text-white rounded-t-2xl border-b border-slate-100 dark:border-slate-800 pb-3 px-5 py-3">
              <CardTitle className="flex items-center gap-2 text-sm text-white tracking-tight font-bold">
                <FileText className="h-4 w-4" /> Documents
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4 px-5">
              <div className="flex items-center justify-between p-3 border border-slate-200/50 dark:border-slate-800/50 rounded-xl bg-slate-50 dark:bg-slate-950">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                    <FileText className="h-4 w-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{idType}</p>
                    <p className="text-xs text-slate-500">{idNumber}</p>
                  </div>
                </div>
                {idDoc && (
                  <a href={idDoc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-500">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
              {member.documents.filter(d => d.documentType === "ADDITIONAL").map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 border border-slate-200/50 dark:border-slate-800/50 rounded-xl bg-slate-50 dark:bg-slate-950">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                      <FileText className="h-4 w-4 text-slate-500" />
                    </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{doc.name || "Additional Document"}</span>
                  </div>
                  <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-500">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Nominees Full Width */}
      <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-purple-600 text-white rounded-t-2xl border-b border-slate-100 dark:border-slate-800 pb-3 px-5 py-3">
          <CardTitle className="flex items-center gap-2 text-sm text-white tracking-tight font-bold">
            <Users className="h-4 w-4" /> Registered Nominees
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 px-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {member.nominees.map((nom) => (
              <div key={nom.id} className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-950 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  {nom.photoUrl ? (
                    <img src={nom.photoUrl} alt={nom.name} className="w-12 h-12 rounded-full object-cover ring-2 ring-slate-100 dark:ring-slate-800" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 font-bold">
                      {nom.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">{nom.name}</h3>
                    <p className="text-xs text-indigo-600 dark:text-indigo-400">{nom.relation}</p>
                  </div>
                </div>
                <div className="text-xs space-y-1 text-slate-500 dark:text-slate-400">
                  <p><span className="font-medium text-slate-700 dark:text-slate-300">Phone:</span> {nom.phone || "N/A"}</p>
                  <p><span className="font-medium text-slate-700 dark:text-slate-300">ID Type:</span> {nom.idType || "N/A"}</p>
                  <p><span className="font-medium text-slate-700 dark:text-slate-300">ID Number:</span> {nom.nidNumber || "N/A"}</p>
                </div>
                <div className="flex items-center justify-between mt-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900 text-[10px] px-2 py-0.5 rounded-full font-bold">
                    <Scale className="h-3 w-3 mr-1" /> {Number(nom.sharePercentage)}% Share
                  </Badge>
                  {nom.idDocumentUrl && (
                    <a href={nom.idDocumentUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-indigo-600 hover:underline flex items-center gap-1">
                      View ID Doc <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Reusable Info Item Component
function InfoItem({ icon: Icon, label, value, vertical }: { icon: any, label: string, value: string, vertical?: boolean }) {
  return (
    <div className={`flex ${vertical ? 'flex-col gap-1' : 'items-start gap-2.5'}`}>
      {!vertical && (
        <div className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800/50 mt-0.5">
          <Icon className="h-3 w-3 text-slate-500" />
        </div>
      )}
      <div>
        <p className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">{label}</p>
        <p className="text-[13px] text-slate-800 dark:text-slate-100 font-medium mt-0.5">{value}</p>
      </div>
    </div>
  )
}

// Reusable Address Display Component
function AddressDisplay({ address }: { address: any }) {
  if (!address) return <p className="text-xs text-slate-500 italic">Not provided</p>
  return (
    <div className="space-y-2 text-xs">
      <div>
        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Address</p>
        <p className="text-slate-700 dark:text-slate-200 mt-0.5">{address.village || "N/A"}</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Post Office</p>
          <p className="text-slate-700 dark:text-slate-200 mt-0.5">{address.postOffice || "N/A"}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">District</p>
          <p className="text-slate-700 dark:text-slate-200 mt-0.5">{address.district || "N/A"}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Post Code</p>
          <p className="text-slate-700 dark:text-slate-200 mt-0.5">{address.postalCode || "N/A"}</p>
        </div>
      </div>
    </div>
  )
}