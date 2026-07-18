import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"
import PortalShell from "@/components/PortalShell"
import { getMemberNotifications, getMemberPendingRequestCount } from "@/app/actions/portal"

export const dynamic = "force-dynamic"

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)

  // Gate: only authenticated members may see the portal.
  if (!session?.user || session.user.role !== "MEMBER") {
    redirect("/")
  }

  const memberId = session.user.id

  // Fetch the member + pending request count + computed notifications in parallel.
  const [member, pendingRequests, notifications] = await Promise.all([
    prisma.member.findUnique({
      where: { id: memberId },
      select: { fullName: true, memberNo: true, photoUrl: true },
    }),
    getMemberPendingRequestCount(memberId).catch(() => 0),
    getMemberNotifications(memberId).catch(() => []),
  ])

  if (!member) {
    redirect("/")
  }

  return (
    <PortalShell
      memberName={member.fullName}
      memberNo={member.memberNo}
      photoUrl={member.photoUrl}
      notifications={notifications}
      pendingRequests={pendingRequests}
    >
      {children}
    </PortalShell>
  )
}
