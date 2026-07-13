import prisma from "@/lib/prisma"
import ChartOfAccountsClient from "./ChartOfAccountsClient"

export const dynamic = 'force-dynamic'

export default async function ChartOfAccountsPage() {
  // Fetch all root accounts (no parent) and include their children recursively
  const dbAccounts = await prisma.account.findMany({
    where: { parentAccountId: null },
    include: {
      childAccounts: {
        include: {
          childAccounts: {
            include: {
              childAccounts: true // Supports up to 4 levels deep for the tree view
            }
          }
        }
      }
    },
    orderBy: { accountType: "asc" }
  })

  // Serialize dates for the client component
  const serializedAccounts = JSON.parse(JSON.stringify(dbAccounts))

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Chart of Accounts</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your ledger accounts, groups, and financial structure.</p>
      </div>
      <ChartOfAccountsClient accounts={serializedAccounts} />
    </div>
  )
}