import prisma from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { approveMember } from "@/app/actions/approval"
import Link from "next/link"
import { Eye } from "lucide-react"
import { CheckCircle, Clock, Phone, Mail, Hash, ShieldCheck, Users } from "lucide-react"

export const dynamic = 'force-dynamic'

export default async function ApprovalsPage() {
  const pendingMembers = await prisma.member.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Pending Approvals</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Review and approve new member applications waiting for confirmation.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/50 dark:border-amber-900/50 rounded-xl shadow-sm">
          <Clock className="h-5 w-5 text-amber-600" />
          <span className="text-sm font-bold text-amber-700 dark:text-amber-400">{pendingMembers.length} Awaiting</span>
        </div>
      </div>

      {/* Main Approvals Card */}
      <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200/50 dark:border-slate-800/50 px-6 py-5">
          <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-white tracking-tight">
            <Users className="h-5 w-5 text-indigo-500" /> Application Queue
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {pendingMembers.length === 0 ? (
            // Beautiful Empty State
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <div className="p-4 rounded-full bg-emerald-50 dark:bg-emerald-950/40 mb-6 ring-4 ring-white dark:ring-slate-900 shadow-lg">
                <CheckCircle className="h-12 w-12 text-emerald-500" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">You're all caught up!</h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-sm">There are no pending member applications right now. New requests will appear here for your approval.</p>
            </div>
          ) : (
            // Premium Table
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-slate-200/50 dark:border-slate-800/50 hover:bg-transparent">
                    <TableHead className="px-6 py-4 text-[11px] uppercase tracking-widest font-bold text-slate-400">Member</TableHead>
                    <TableHead className="px-6 py-4 text-[11px] uppercase tracking-widest font-bold text-slate-400">Contact</TableHead>
                    <TableHead className="px-6 py-4 text-right text-[11px] uppercase tracking-widest font-bold text-slate-400">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingMembers.map((member) => (
                    <TableRow key={member.id} className="border-b border-slate-100 dark:border-slate-800/50 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 font-bold text-sm ring-2 ring-white dark:ring-slate-900 shadow-sm">
                            {member.fullName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-slate-900 dark:text-white">{member.fullName}</p>
                            <p className="text-xs font-mono text-slate-500 mt-0.5 flex items-center gap-1"><Hash className="h-3 w-3" /> {member.memberNo}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="text-sm text-slate-700 dark:text-slate-200 flex items-center gap-2"><Phone className="h-3 w-3 text-slate-400" /> {member.phone}</p>
                          {member.email && <p className="text-xs text-slate-500 flex items-center gap-2"><Mail className="h-3 w-3 text-slate-400" /> {member.email}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right">
                        <Link href={`/dashboard/approvals/${member.id}`}>
                          <Button 
                            type="button" 
                            size="sm" 
                            className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm hover:shadow-md rounded-xl transition-all duration-200 group-hover:scale-105"
                          >
                            <Eye className="mr-2 h-4 w-4" /> View Application
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}