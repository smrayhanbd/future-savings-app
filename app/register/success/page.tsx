import Link from "next/link"
import { CheckCircle } from "lucide-react"

export default function RegisterSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="h-8 w-8 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Application Submitted!</h1>
        <p className="text-slate-500 mb-8">
          Thank you for registering. Your application is now pending approval by our management team. 
          Once approved, you will receive an email with your portal login credentials.
        </p>
        <Link href="/" className="inline-flex items-center justify-center px-6 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
          Back to Login
        </Link>
      </div>
    </div>
  )
}