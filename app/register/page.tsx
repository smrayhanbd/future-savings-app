import Link from "next/link"
import RegisterForm from "./RegisterForm"
import { Building2, ShieldCheck, Lock, Receipt, TrendingUp, FileText } from "lucide-react"

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      
      {/* Left Side: Marketing & Trust Info (Fixed/Sticky on Desktop) */}
      {/* Changed width to w-1/4 to give the form more space */}
      <div className="hidden lg:flex w-1/4 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-10 flex-col justify-between text-white relative overflow-hidden sticky top-0 h-screen">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_center,_white,_transparent_70%)]"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-10">
            <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">Future Savings</span>
          </div>
          
          <h1 className="text-3xl font-extrabold leading-tight mb-4">
            Secure Your Financial Future Today.
          </h1>
          <p className="text-indigo-100 text-base leading-relaxed">
            Join our digital cooperative society. Manage your savings, track transactions, and build wealth together with trust and transparency.
          </p>
        </div>

        <div className="relative z-10 space-y-5">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-white/20 backdrop-blur-md"><ShieldCheck className="h-5 w-5" /></div>
            <div>
              <h3 className="font-bold text-base">Bank-Grade Security</h3>
              <p className="text-indigo-100 text-xs">Your data and transactions are encrypted and securely stored.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-white/20 backdrop-blur-md"><Receipt className="h-5 w-5" /></div>
            <div>
              <h3 className="font-bold text-base">Automated Receipts</h3>
              <p className="text-indigo-100 text-xs">Instantly generate digital receipts for every collection and withdrawal.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-white/20 backdrop-blur-md"><TrendingUp className="h-5 w-5" /></div>
            <div>
              <h3 className="font-bold text-base">Transparent Ledgers</h3>
              <p className="text-indigo-100 text-xs">Access your personal portal 24/7 to view balances and history.</p>
            </div>
          </div>
        </div>

        {/* Somiti Policy Link Added Here */}
        <div className="relative z-10 space-y-2">
          <Link href="/policy" className="flex items-center gap-2 text-sm text-indigo-100 hover:text-white transition-colors group">
            <FileText className="h-4 w-4" />
            Somiti Policy & Terms
            <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
          </Link>
          <div className="text-xs text-indigo-200 flex items-center gap-2">
            <Lock className="h-3 w-3" /> Powered by Supabase & Next.js
          </div>
        </div>
      </div>

      {/* Right Side: Form (Scrollable) */}
      <div className="flex-1 p-6 sm:p-10 lg:p-12 w-full">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Member Application Form</h2>
              <p className="text-slate-500 mt-1 text-sm">Please fill out all sections accurately. Your application will be reviewed by management.</p>
            </div>
            <Link href="/" className="text-sm font-medium text-indigo-600 hover:underline hidden sm:block">Back to Login</Link>
          </div>
          
          <RegisterForm />
        </div>
      </div>

    </div>
  )
}