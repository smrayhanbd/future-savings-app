export const dynamic = 'force-dynamic';
import prisma from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { approveMember } from "@/app/actions/approval"
import { CheckCircle } from "lucide-react"

export default async function ApprovalsPage() {
  const pendingMembers = await prisma.member.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Pending Approvals</h1>
        <p className="text-slate-500 dark:text-slate-400">Review and approve new member applications.</p>
      </div>

      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader><CardTitle>Awaiting Approval ({pendingMembers.length})</CardTitle></CardHeader>
        <CardContent>
          {pendingMembers.length === 0 ? (
            <p className="text-sm text-slate-500 py-12 text-center">No pending applications. You are all caught up!</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member No</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-mono text-xs">{member.memberNo}</TableCell>
                    <TableCell className="font-medium">{member.fullName}</TableCell>
                    <TableCell>{member.phone}</TableCell>
                    <TableCell>{member.email || "N/A"}</TableCell>
                    <TableCell className="text-right">
                      <form action={approveMember.bind(null, member.id)}>
                        <Button type="submit" size="sm" className="bg-green-600 hover:bg-green-700">
                          <CheckCircle className="mr-2 h-4 w-4" /> Approve & Send Email
                        </Button>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}