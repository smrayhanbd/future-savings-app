import prisma from "@/lib/prisma"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { 
  ArrowLeft, Edit, Printer, User, Phone, Mail, Home, Building, 
  Banknote, CreditCard, FileText, Users, Wallet, CalendarDays, 
  Heart, Globe, Droplet, Briefcase, MapPin, ExternalLink, Scale, Hash, 
  TrendingUp, TrendingDown, Landmark, AlertTriangle
} from "lucide-react"

export const dynamic = 'force-dynamic'

const formatEnum = (val: string | null | undefined) => {
  if (!val) return "N/A";
  if (val.includes("_POSITIVE")) return val.replace("_POSITIVE", "+");
  if (val.includes("_NEGATIVE")) return val.replace("_NEGATIVE", "-");
  return val.charAt(0) + val.slice(1).toLowerCase().replace("_", " ");
}

export default async function MemberProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const member = await prisma.member.findUnique({
    where: { id: id },
    include: {
      addresses: true,
      nominees: true,
      documents: true,
      savings: true, 
    },
  })

  if (!member) {
    notFound()
  }

  // 1. Calculate Financial Stats
  const totalDeposit = member.savings
    .filter(s => !["WITHDRAWAL", "FINE", "PENALTY", "LOAN_PAYMENT"].includes(s.type))
    .reduce((acc, s) => acc + Number(s.amount), 0);
    
  const totalWithdrawal = member.savings
    .filter(s => s.type === "WITHDRAWAL")
    .reduce((acc, s) => acc + Number(s.amount), 0);
    
  const loanAmount = 0; 
  
  const joinDate = new Date(member.membershipDate);
  const now = new Date();
  const monthsJoined = (now.getFullYear() - joinDate.getFullYear()) * 12 + (now.getMonth() - joinDate.getMonth());
  const expectedAmount = monthsJoined * 500;
  const dueBalance = Math.max(0, expectedAmount - totalDeposit);

  const currentAddress = member.addresses.find((a) => a.addressType === "CURRENT")
  const permanentAddress = member.addresses.find((a) => a.addressType === "PERMANENT")
  
  const idType = member.nidNumber ? "National ID" : member.passportNumber ? "Passport" : member.birthCertificateNo ? "Birth Certificate" : "ID"
  const idNumber = member.nidNumber || member.passportNumber || member.birthCertificateNo || "N/A"

  // Premium Stat Cards Config
  const stats = [
    { label: "Total Deposit", value: `৳ ${totalDeposit.toLocaleString()}`, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/50", border: "border-emerald-200/50 dark:border-emerald-900/50" },
    { label: "Withdrawal", value: `৳ ${totalWithdrawal.toLocaleString()}`, icon: TrendingDown, color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-950/50", border: "border-rose-200/50 dark:border-rose-900/50" },
    { label: "Loan Amount", value: `৳ ${loanAmount.toLocaleString()}`, icon: Landmark, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/50", border: "border-blue-200/50 dark:border-blue-900/50" },
    { label: "Due Balance", value: `৳ ${dueBalance.toLocaleString()}`, icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/50", border: "border-amber-200/50 dark:border-amber-900/50" },
  ]

  return (
    <div className="space-y-6">
      {/* Floating Transparent Action Bar */}
      <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 bg-transparent backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/50">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <Link href="/dashboard/members">
            <Button variant="outline" size="sm" className="rounded-xl shadow-sm hover:shadow-md transition-all bg-white/80 dark:bg-slate-900/80">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Members
            </Button>
          </Link>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="rounded-xl shadow-sm hover:shadow-md transition-all bg-white/80 dark:bg-slate-900/80"><Printer className="mr-2 h-4 w-4" /> Print</Button>
            <Link href={`/dashboard/members/${member.id}/edit`}>
              <Button size="sm" className="rounded-xl shadow-md hover:shadow-lg hover:bg-indigo-500 transition-all bg-indigo-600"><Edit className="mr-2 h-4 w-4" /> Edit Profile</Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Financial Summary Cards (Reduced padding) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className={`bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border ${stat.border} ${stat.bg} shadow-sm hover:shadow-lg hover:-translate-y-1 rounded-2xl overflow-hidden transition-all duration-300`}>
            <CardContent className="p-4 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-widest font-bold text-slate-500 dark:text-slate-400">
                  {stat.label}
                </span>
                <div className={`p-1.5 rounded-lg bg-white/50 dark:bg-slate-900/50 border ${stat.border}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </div>
              <h3 className={`text-xl font-bold tracking-tight ${stat.color}`}>
                {stat.value}
              </h3>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Layout Grid (Reduced gap to make cards shorter) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 items-start">
        
        {/* LEFT COLUMN: Profile & Nominees */}
        <div className="lg:col-span-1 space-y-5">
          {/* Removed sticky so it scrolls with the page */}
          <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl rounded-2xl overflow-hidden">
            <CardContent className="flex flex-col items-center text-center pt-6 pb-4 px-4">
              {member.photoUrl ? (
                <img src={member.photoUrl} alt="Member" className="w-24 h-24 rounded-full object-cover ring-4 ring-white dark:ring-slate-900 shadow-xl" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-3xl font-bold text-indigo-600 ring-4 ring-white dark:ring-slate-900 shadow-xl">
                  {member.fullName.charAt(0)}
                </div>
              )}
              <h2 className="mt-3 text-lg font-bold text-slate-900 dark:text-white tracking-tight">{member.fullName}</h2>
              <p className="text-xs font-mono text-slate-500 dark:text-slate-400">{member.memberNo}</p>
              <div className="mt-2">
                <Badge variant={member.status === "ACTIVE" ? "default" : "secondary"} className={`uppercase text-[10px] px-2.5 py-1 rounded-full ${member.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-amber-500/10 text-amber-600 border border-amber-500/20"}`}>
                  {member.status}
                </Badge>
              </div>
            </CardContent>
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                  <CalendarDays className="h-3.5 w-3.5 text-slate-500" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Joined</p>
                  <p className="text-slate-700 dark:text-slate-200 font-medium text-xs">{new Date(member.membershipDate).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                  <CreditCard className="h-3.5 w-3.5 text-slate-500" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{idType}</p>
                  <p className="text-slate-700 dark:text-slate-200 font-medium text-xs">{idNumber}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Nominees Section */}
          <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl rounded-2xl overflow-hidden flex flex-col">
            <CardHeader className="bg-green-600 text-white rounded-t-2xl border-b border-slate-100 dark:border-slate-800 pb-3 px-5 py-3">
              <CardTitle className="flex items-center gap-2 text-sm text-white tracking-tight">
                <Users className="h-4 w-4" /> Nominees
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4 px-5 flex-grow">
              {member.nominees.length > 0 ? (
                member.nominees.map((nom) => (
                  <div key={nom.id} className="flex items-start gap-3 pb-3 border-b border-slate-100 dark:border-slate-800 last:border-0 last:pb-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 -mx-2 p-2 rounded-xl transition-colors">
                    {nom.photoUrl ? (
                      <img src={nom.photoUrl} alt="Nominee" className="w-9 h-9 rounded-full object-cover ring-2 ring-white dark:ring-slate-800 shadow-sm" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 font-bold text-xs ring-2 ring-white dark:ring-slate-800">
                        {nom.name.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">{nom.name}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{nom.relation} | {nom.phone || "No Phone"}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900 text-[10px] px-2 py-0.5 rounded-full">
                          <Scale className="h-3 w-3 mr-1" /> {Number(nom.sharePercentage)}%
                        </Badge>
                        <span className="text-[10px] text-slate-400 uppercase font-medium tracking-wider">{nom.idType || "NID"}: {nom.nidNumber || "N/A"}</span>
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

        {/* RIGHT SIDE: Middle & Right Columns (3/4 width) */}
        <div className="lg:col-span-3 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          
          {/* MIDDLE COLUMN: Personal & Residence (Wider - 7/12) */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            
            {/* Personal Information */}
            <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl rounded-2xl overflow-hidden flex-grow flex flex-col">
              <CardHeader className="bg-blue-600 text-white rounded-t-2xl border-b border-slate-100 dark:border-slate-800 pb-3 px-5 py-3">
                <CardTitle className="flex items-center gap-2 text-sm text-white tracking-tight">
                  <User className="h-4 w-4" /> Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-x-5 gap-y-4 pt-4 px-5 flex-grow">
                <InfoItem icon={User} label="First Name" value={member.firstName} />
                <InfoItem icon={User} label="Last Name" value={member.lastName} />
                <InfoItem icon={User} label="Father's Name" value={member.fatherName} />
                <InfoItem icon={User} label="Mother's Name" value={member.motherName} />
                <InfoItem icon={Heart} label="Spouse Name" value={member.spouseName} />
                <InfoItem icon={CalendarDays} label="Date of Birth" value={member.dateOfBirth ? new Date(member.dateOfBirth).toLocaleDateString() : null} />
                <InfoItem icon={User} label="Gender" value={formatEnum(member.gender)} />
                <InfoItem icon={Heart} label="Marital Status" value={formatEnum(member.maritalStatus)} />
                <InfoItem icon={CalendarDays} label="Marriage Date" value={member.marriageDate ? new Date(member.marriageDate).toLocaleDateString() : null} />
                <InfoItem icon={Globe} label="Religion" value={member.religion} />
                <InfoItem icon={Globe} label="Nationality" value={member.nationality} />
                <InfoItem icon={Droplet} label="Blood Group" value={formatEnum(member.bloodGroup)} />
                <InfoItem icon={Briefcase} label="Profession" value={member.profession} />
              </CardContent>
            </Card>

            {/* Residence Information */}
            <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl rounded-2xl overflow-hidden flex-grow flex flex-col">
              <CardHeader className="bg-gray-600 text-white rounded-t-2xl border-b border-slate-100 dark:border-slate-800 pb-3 px-5 py-3">
                <CardTitle className="flex items-center gap-2 text-sm text-white tracking-tight">
                  <Home className="h-4 w-4" /> Residence Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 px-5 flex-grow">
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

          {/* RIGHT COLUMN: Contact, Documents, Bank (Smaller - 5/12) */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            
            {/* Group: Contact + Documents (to match Personal Info height) */}
            <div className="flex flex-col gap-5 flex-grow">
              {/* Contact Information */}
              <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl rounded-2xl overflow-hidden flex-grow flex flex-col">
                <CardHeader className="bg-green-600 text-white rounded-t-2xl border-b border-slate-100 dark:border-slate-800 pb-3 px-5 py-3">
                  <CardTitle className="flex items-center gap-2 text-sm text-white tracking-tight">
                    <Phone className="h-4 w-4" /> Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-x-5 gap-y-4 pt-4 px-5 flex-grow">
                  <InfoItem icon={Phone} label="Phone Number" value={member.phone} />
                  <InfoItem icon={Mail} label="Email Address" value={member.email} />
                  <InfoItem icon={Phone} label="Emergency Contact" value={member.emergencyPhone} />
                  <InfoItem icon={User} label="Emergency Person" value={member.emergencyContactName} />
                </CardContent>
              </Card>

              {/* Documents */}
              <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl rounded-2xl overflow-hidden flex-grow flex flex-col">
                <CardHeader className="bg-blue-500 text-white rounded-t-2xl border-b border-slate-100 dark:border-slate-800 pb-3 px-5 py-3">
                  <CardTitle className="flex items-center gap-2 text-sm text-white tracking-tight">
                    <FileText className="h-4 w-4" /> Documents
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-4 px-5 flex-grow">
                  {member.documents.length > 0 ? (
                    member.documents.map((doc) => (
                      <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" key={doc.id} className="flex items-center justify-between p-2.5 border border-slate-200/50 dark:border-slate-800/50 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:shadow-sm transition-all duration-200 group">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/30 transition-colors">
                            <FileText className="h-3.5 w-3.5 text-slate-500 group-hover:text-blue-500 transition-colors" />
                          </div>
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{doc.name || doc.documentType}</span>
                        </div>
                        <ExternalLink className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                      </a>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500 text-center py-4">No documents uploaded.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Bank Details (to match Residence Info height) */}
            <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl rounded-2xl overflow-hidden flex-grow flex flex-col">
              <CardHeader className="bg-yellow-600 text-white rounded-t-2xl border-b border-slate-100 dark:border-slate-800 pb-3 px-5 py-3">
                <CardTitle className="flex items-center gap-2 text-sm text-white tracking-tight">
                  <Banknote className="h-4 w-4" /> Bank Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4 px-5 flex-grow">
                <InfoItem vertical icon={User} label="Account Name" value={member.accountName} />
                <InfoItem vertical icon={CreditCard} label="Account Number" value={member.accountNumber} />
                <InfoItem vertical icon={Building} label="Bank Name" value={member.bankName} />
                <InfoItem vertical icon={MapPin} label="Branch" value={member.branch} />
                <InfoItem vertical icon={Hash} label="Routing Number" value={member.routingNumber} />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Full Width Financial Activity */}
        <div className="lg:col-span-4">
          <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl rounded-2xl overflow-hidden">
            <CardHeader className="bg-emerald-600 text-white rounded-t-2xl border-b border-slate-100 dark:border-slate-800 pb-3 px-5 py-3">
              <CardTitle className="flex items-center gap-2 text-sm text-white tracking-tight">
                <Wallet className="h-4 w-4" /> Recent Financial Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 px-5">
              {member.savings.length > 0 ? (
                <div className="space-y-2">
                  {member.savings.slice(0, 5).map((sav) => (
                    <div key={sav.id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Wallet className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-xs text-slate-900 dark:text-white">{sav.type}</p>
                          <p className="text-[11px] text-slate-500">{new Date(sav.date).toLocaleDateString()} via {sav.method}</p>
                        </div>
                      </div>
                      <span className="font-bold text-emerald-600 text-xs">+ ৳ {Number(sav.amount).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center py-6">No recent transactions.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// Premium Reusable Info Item Component (Reduced sizes)
function InfoItem({ icon: Icon, label, value, vertical }: { icon: any, label: string, value: string | null | undefined, vertical?: boolean }) {
  return (
    <div className={`flex ${vertical ? 'flex-col gap-1' : 'items-start gap-2.5'}`}>
      {!vertical && (
        <div className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800/50 mt-0.5">
          <Icon className="h-3 w-3 text-slate-500" />
        </div>
      )}
      <div>
        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{label}</p>
        <p className="text-xs text-slate-800 dark:text-slate-100 font-medium mt-0.5">{value || "N/A"}</p>
      </div>
    </div>
  )
}

// Premium Reusable Address Display Component (Updated Layout)
function AddressDisplay({ address }: { address: any }) {
  if (!address) return <p className="text-xs text-slate-500 italic">Not provided</p>;
  return (
    <div className="space-y-2 text-xs">
      {/* Address field full width */}
      <div>
        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Address</p>
        <p className="text-slate-700 dark:text-slate-200 mt-0.5">{address.village || "N/A"}</p>
      </div>
      {/* Post Office, District, Post Code side-by-side */}
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
  );
}