import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Wallet, TrendingUp, AlertCircle } from "lucide-react"

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Overview</h1>
        <p className="text-slate-500 dark:text-slate-400">Welcome back to your Future Savings Foundation dashboard.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Members</CardTitle>
            <Users className="h-5 w-5 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 dark:text-white">0</div>
            <p className="text-xs text-slate-500 mt-1">Awaiting registration</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Savings</CardTitle>
            <Wallet className="h-5 w-5 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 dark:text-white">৳0.00</div>
            <p className="text-xs text-slate-500 mt-1">No transactions yet</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Investments</CardTitle>
            <TrendingUp className="h-5 w-5 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 dark:text-white">0</div>
            <p className="text-xs text-slate-500 mt-1">No active investments</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Pending Approvals</CardTitle>
            <AlertCircle className="h-5 w-5 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 dark:text-white">0</div>
            <p className="text-xs text-slate-500 mt-1">All caught up!</p>
          </CardContent>
        </Card>
      </div>

      {/* Empty State Example */}
      <Card className="border-dashed border-slate-300 dark:border-slate-700">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <Users className="h-6 w-6 text-slate-400" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">No members yet</h3>
          <p className="mb-4 max-w-sm text-sm text-slate-500 dark:text-slate-400">
            You haven&apos;t registered any members yet. Once you add members, their list and details will appear here.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}