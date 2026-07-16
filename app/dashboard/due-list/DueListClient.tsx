"use client"

import { useState } from "react"
import { sendDueReminders } from "@/app/actions/finance"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import { Mail, MessageSquare, Send, AlertTriangle, Wallet, TrendingDown, MoreHorizontal, Eye, Banknote, Download, FileText, Table as TableIcon, X } from "lucide-react"

interface DueMember {
  id: string
  fullName: string
  memberNo: string
  phone: string
  email: string | null
  totalExpected: number
  totalFines: number
  totalPaid: number
  totalDue: number
}

export default function DueListClient({ members }: { members: DueMember[] }) {
  const [loading, setLoading] = useState(false)
  const [ledgerMember, setLedgerMember] = useState<DueMember | null>(null)

  const handleSendReminders = async () => {
    if (!confirm(`Send SMS and Email reminders to ${members.length} members?`)) return
    setLoading(true)
    toast.info("Processing...", { description: "Sending SMS and Email reminders. This may take a minute." })
    
    try {
      const result = await sendDueReminders()
      if (result?.success) {
        toast.success("Reminders Sent!", { 
          description: `${result.smsCount} SMS, ${result.emailCount} Emails sent successfully.`
        })
      }
    } catch (error) {
      toast.error("Failed", { description: "Could not send reminders." })
    }
    setLoading(false)
  }

  // Export to CSV Logic
  const handleExportCSV = () => {
    const headers = ["Member No", "Full Name", "Phone", "Email", "Total Expected", "Late Fines", "Total Paid", "Net Due"]
    const rows = members.map(m => [
      m.memberNo,
      m.fullName,
      m.phone,
      m.email || "N/A",
      m.totalExpected,
      m.totalFines,
      m.totalPaid,
      m.totalDue
    ])
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n")
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", "due_list.csv")
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Export to PDF (Print) Logic
  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=700')
    if (!printWindow) return

    const tableRows = members.map(m => `
      <tr>
        <td>${m.memberNo}</td>
        <td>${m.fullName}</td>
        <td>${m.phone}</td>
        <td style="text-align: right;">৳ ${m.totalExpected.toLocaleString()}</td>
        <td style="text-align: right;">৳ ${m.totalFines.toLocaleString()}</td>
        <td style="text-align: right;">৳ ${m.totalPaid.toLocaleString()}</td>
        <td style="text-align: right; font-weight: bold;">৳ ${m.totalDue.toLocaleString()}</td>
      </tr>
    `).join('')

    printWindow.document.write(`
      <html>
        <head>
          <title>Due List - Future Savings Foundation</title>
          <style>
            body { font-family: sans-serif; padding: 20px; }
            h2 { margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f4f4f4; }
          </style>
        </head>
        <body>
          <h2>Future Savings Foundation - Due List</h2>
          <table>
            <thead>
              <tr>
                <th>Member No</th>
                <th>Full Name</th>
                <th>Phone</th>
                <th style="text-align: right;">Expected</th>
                <th style="text-align: right;">Fines</th>
                <th style="text-align: right;">Paid</th>
                <th style="text-align: right;">Net Due</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const totalDueAmount = members.reduce((acc, m) => acc + m.totalDue, 0)
  const totalFines = members.reduce((acc, m) => acc + m.totalFines, 0)

  const stats = [
    { label: "Members with Due", value: members.length, icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/50", border: "border-amber-200/50 dark:border-amber-900/50" },
    { label: "Total Due Amount", value: `৳ ${totalDueAmount.toLocaleString()}`, icon: Wallet, color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-950/50", border: "border-rose-200/50 dark:border-rose-900/50" },
    { label: "Total Late Fines", value: `৳ ${totalFines.toLocaleString()}`, icon: TrendingDown, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/50", border: "border-red-200/50 dark:border-red-900/50" },
  ]

  return (
    <div className="space-y-6">
      {/* Summary & Actions */}
      <div className="flex flex-col md:flex-row justify-between gap-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
          {stats.map((stat, index) => (
            <Card key={index} className={`bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border ${stat.border} ${stat.bg} shadow-sm rounded-2xl overflow-hidden`}>
              <CardContent className="p-4 flex flex-row items-center justify-between gap-2">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500 dark:text-slate-400">{stat.label}</span>
                  <h3 className={`text-lg font-extrabold tracking-tight ${stat.color}`}>{stat.value}</h3>
                </div>
                <div className={`p-2 rounded-lg bg-white/50 dark:bg-slate-900/50 border ${stat.border}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="flex items-end gap-2">
          {/* Export Dropdown Button */}
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 border border-slate-200 bg-white hover:bg-slate-100 h-12 px-4 cursor-pointer shadow-sm dark:bg-slate-900 dark:border-slate-800 dark:hover:bg-slate-800 outline-none" disabled={members.length === 0}>
              <Download className="mr-2 h-5 w-5" /> Export
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportCSV} className="cursor-pointer">
                <TableIcon className="mr-2 h-4 w-4" /> Export to CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF} className="cursor-pointer">
                <FileText className="mr-2 h-4 w-4" /> Export to PDF (Print)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button onClick={handleSendReminders} disabled={loading || members.length === 0} className="bg-indigo-600 hover:bg-indigo-700 h-12 px-6 shadow-md">
            <Send className="mr-2 h-5 w-5" /> Send All Reminders
          </Button>
        </div>
      </div>

      {/* Due List Table */}
      <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-200/50 dark:border-slate-800/50 hover:bg-transparent bg-amber-50/50 dark:bg-amber-950/10">
                <TableHead className="px-6 py-4 text-[11px] uppercase tracking-widest font-bold text-amber-700 dark:text-amber-400">Member</TableHead>
                <TableHead className="px-6 py-4 text-[11px] uppercase tracking-widest font-bold text-amber-700 dark:text-amber-400">Contact</TableHead>
                <TableHead className="px-6 py-4 text-right text-[11px] uppercase tracking-widest font-bold text-amber-700 dark:text-amber-400">Expected</TableHead>
                <TableHead className="px-6 py-4 text-right text-[11px] uppercase tracking-widest font-bold text-amber-700 dark:text-amber-400">Fines</TableHead>
                <TableHead className="px-6 py-4 text-right text-[11px] uppercase tracking-widest font-bold text-amber-700 dark:text-amber-400">Paid</TableHead>
                <TableHead className="px-6 py-4 text-right text-[11px] uppercase tracking-widest font-bold text-amber-700 dark:text-amber-400">Net Due</TableHead>
                <TableHead className="px-6 py-4 text-right text-[11px] uppercase tracking-widest font-bold text-amber-700 dark:text-amber-400">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16 text-slate-500">
                    <div className="flex flex-col items-center">
                      <Wallet className="h-12 w-12 text-emerald-400 mb-3" />
                      <p className="font-bold text-lg text-slate-900 dark:text-white">All Clear!</p>
                      <p>No members have pending dues.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                members.map((member) => (
                  <TableRow key={member.id} className="border-b border-slate-100 dark:border-slate-800/50 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <TableCell className="px-6 py-4">
                      <p className="font-semibold text-sm text-slate-900 dark:text-white">{member.fullName}</p>
                      <p className="font-mono text-[11px] text-indigo-500 dark:text-indigo-400 mt-0.5">{member.memberNo}</p>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-slate-400" /> {member.phone}
                        </span>
                        {member.email && (
                          <span className="text-xs text-slate-400 flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5" /> {member.email}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right text-sm text-slate-600 dark:text-slate-400">৳ {member.totalExpected.toLocaleString()}</TableCell>
                    <TableCell className="px-6 py-4 text-right text-sm text-red-600 font-medium">৳ {member.totalFines.toLocaleString()}</TableCell>
                    <TableCell className="px-6 py-4 text-right text-sm text-emerald-600 font-medium">৳ {member.totalPaid.toLocaleString()}</TableCell>
                    <TableCell className="px-6 py-4 text-right">
                      <span className="text-base font-extrabold text-rose-600 dark:text-rose-400">৳ {member.totalDue.toLocaleString()}</span>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right relative z-10">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 outline-none cursor-pointer">
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => setLedgerMember(member)}>
                            <Eye className="mr-2 h-4 w-4" /> View Due Ledger
                          </DropdownMenuItem>
                          <DropdownMenuItem className="p-0">
                            <a href={`/dashboard/collection-entry`} className="flex items-center w-full cursor-pointer p-2">
                              <Banknote className="mr-2 h-4 w-4" /> Collect Dues
                            </a>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="p-0">
                            <a href={`mailto:${member.email}`} className="flex items-center w-full cursor-pointer p-2">
                              <Mail className="mr-2 h-4 w-4" /> Send Email
                            </a>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="p-0">
                            <a href={`sms:${member.phone}`} className="flex items-center w-full cursor-pointer p-2">
                              <MessageSquare className="mr-2 h-4 w-4" /> Send SMS
                            </a>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Due Ledger Popup Modal */}
      <Dialog open={!!ledgerMember} onOpenChange={(open) => !open && setLedgerMember(null)}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-950 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Due Ledger: {ledgerMember?.fullName}</span>
              <button onClick={() => setLedgerMember(null)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </DialogTitle>
          </DialogHeader>
          {ledgerMember && (
            <div className="space-y-4 py-4">
              <div className="flex justify-between text-sm border-b pb-2">
                <span className="text-slate-500">Total Expected:</span>
                <span className="font-bold text-slate-900 dark:text-white">৳ {ledgerMember.totalExpected.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm border-b pb-2">
                <span className="text-slate-500">Late Fines Applied:</span>
                <span className="font-bold text-red-600">৳ {ledgerMember.totalFines.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm border-b pb-2">
                <span className="text-slate-500">Total Paid:</span>
                <span className="font-bold text-emerald-600">৳ {ledgerMember.totalPaid.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="font-bold text-slate-900 dark:text-white">Net Due Balance:</span>
                <span className="text-xl font-extrabold text-rose-600 dark:text-rose-400">৳ {ledgerMember.totalDue.toLocaleString()}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}