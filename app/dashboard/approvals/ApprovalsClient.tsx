"use client"

import React from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Eye, Phone, Mail, Hash, CheckCircle, Clock, XCircle, Users, RotateCcw, FileText } from "lucide-react"

interface ApprovalMember {
  id: string
  fullName: string
  memberNo: string
  phone: string
  email: string | null
  remarks: string | null
  createdAt: string
}

interface Props {
  pending: ApprovalMember[]
  approved: ApprovalMember[]
  rejected: ApprovalMember[]
}

function MemberTable({
  members,
  emptyTitle,
  emptyMessage,
  hrefBase,
  actionLabel,
  actionIcon,
  showRemarks = false,
}: {
  members: ApprovalMember[]
  emptyTitle: string
  emptyMessage: string
  hrefBase: string
  actionLabel: string
  actionIcon: React.ReactNode
  showRemarks?: boolean
}) {
  if (members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-6">
        <div className="p-4 rounded-full bg-emerald-50 dark:bg-emerald-950/40 mb-6 ring-4 ring-white dark:ring-slate-900 shadow-lg">
          <CheckCircle className="h-12 w-12 text-emerald-500" />
        </div>
        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">{emptyTitle}</h3>
        <p className="text-slate-500 dark:text-slate-400 max-w-sm">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-slate-200/50 dark:border-slate-800/50 hover:bg-transparent">
            <TableHead className="px-6 py-4 text-[11px] uppercase tracking-widest font-bold text-slate-400">Member</TableHead>
            <TableHead className="px-6 py-4 text-[11px] uppercase tracking-widest font-bold text-slate-400">Contact</TableHead>
            <TableHead className="px-6 py-4 text-[11px] uppercase tracking-widest font-bold text-slate-400">Submitted</TableHead>
            {showRemarks && (
              <TableHead className="px-6 py-4 text-[11px] uppercase tracking-widest font-bold text-slate-400">Reason</TableHead>
            )}
            <TableHead className="px-6 py-4 text-right text-[11px] uppercase tracking-widest font-bold text-slate-400">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map(member => (
            <TableRow key={member.id} className="border-b border-slate-100 dark:border-slate-800/50 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
              <TableCell className="px-6 py-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-bold text-sm ring-2 ring-white dark:ring-slate-900 shadow-sm">
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
              <TableCell className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
                {new Date(member.createdAt).toLocaleDateString()}
              </TableCell>
              {showRemarks && (
                <TableCell className="px-6 py-4 max-w-xs">
                  <p className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-rose-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{member.remarks || "No reason provided."}</span>
                  </p>
                </TableCell>
              )}
              <TableCell className="px-6 py-4 text-right">
                <Link href={`${hrefBase}${member.id}`}>
                  <Button
                    type="button"
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm hover:shadow-md rounded-xl transition-all duration-200 group-hover:scale-105"
                  >
                    {actionIcon} {actionLabel}
                  </Button>
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export default function ApprovalsClient({ pending, approved, rejected }: Props) {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Pending Approvals</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Review, approve, and reject member applications.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/50 dark:border-amber-900/50 rounded-xl shadow-sm">
          <Clock className="h-5 w-5 text-amber-600" />
          <span className="text-sm font-bold text-amber-700 dark:text-amber-400">{pending.length} Awaiting</span>
        </div>
      </div>

      <Tabs defaultValue="pending">
        <TabsList className="bg-slate-100 dark:bg-slate-800/60">
          <TabsTrigger value="pending" className="gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Pending
            <span className="ml-1 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 text-[10px] font-bold rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
              {pending.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="approved" className="gap-1.5">
            <CheckCircle className="w-3.5 h-3.5" /> Approved
            <span className="ml-1 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 text-[10px] font-bold rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              {approved.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="rejected" className="gap-1.5">
            <XCircle className="w-3.5 h-3.5" /> Rejected
            <span className="ml-1 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 text-[10px] font-bold rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400">
              {rejected.length}
            </span>
          </TabsTrigger>
        </TabsList>

        {/* Pending */}
        <TabsContent value="pending">
          <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl rounded-2xl overflow-hidden">
            <CardHeader className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200/50 dark:border-slate-800/50 px-6 py-5">
              <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-white tracking-tight">
                <Users className="h-5 w-5 text-indigo-500" /> Application Queue
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <MemberTable
                members={pending}
                emptyTitle="You're all caught up!"
                emptyMessage="There are no pending member applications right now. New requests will appear here for your approval."
                hrefBase="/dashboard/approvals/"
                actionLabel="View Application"
                actionIcon={<Eye className="mr-2 h-4 w-4" />}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Approved */}
        <TabsContent value="approved">
          <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl rounded-2xl overflow-hidden">
            <CardHeader className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200/50 dark:border-slate-800/50 px-6 py-5">
              <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-white tracking-tight">
                <CheckCircle className="h-5 w-5 text-emerald-500" /> Recently Approved
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <MemberTable
                members={approved}
                emptyTitle="No approved members yet"
                emptyMessage="Approved members will appear here for your reference."
                hrefBase="/dashboard/members/"
                actionLabel="View Profile"
                actionIcon={<Eye className="mr-2 h-4 w-4" />}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rejected */}
        <TabsContent value="rejected">
          <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl rounded-2xl overflow-hidden">
            <CardHeader className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200/50 dark:border-slate-800/50 px-6 py-5">
              <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-white tracking-tight">
                <XCircle className="h-5 w-5 text-rose-500" /> Rejected Applications
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <MemberTable
                members={rejected}
                emptyTitle="No rejected applications"
                emptyMessage="Rejected applications are retained here for audit history."
                hrefBase="/dashboard/members/"
                actionLabel="View Profile"
                actionIcon={<RotateCcw className="mr-2 h-4 w-4" />}
                showRemarks
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
