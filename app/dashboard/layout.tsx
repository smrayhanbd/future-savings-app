import prisma from "@/lib/prisma"
import DashboardClient from "./DashboardClient"

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Fetch unread notifications for the Topbar
  const notifications = await prisma.notification.findMany({
    where: { isRead: false },
    orderBy: { createdAt: "desc" },
    take: 5
  })

  return <DashboardClient notifications={JSON.parse(JSON.stringify(notifications))}>{children}</DashboardClient>
}