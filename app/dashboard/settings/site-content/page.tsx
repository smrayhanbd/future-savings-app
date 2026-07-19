import prisma from "@/lib/prisma"
import SiteContentForm from "./SiteContentForm"

export const dynamic = 'force-dynamic'

export default async function ManageSiteContentPage() {
  let content = await prisma.siteContent.findUnique({ where: { id: "singleton" } })

  // Fallback to empty structure if no content exists yet
  if (!content) {
    content = {
      id: "singleton",
      heroTitle: "", heroSubtitle: "", aboutTitle: "", aboutContent: "",
      visionTitle: "", visionContent: "", transparency: "", policyContent: "",
      whyJoinUs: [], howWeRun: [], facilities: [], management: [], activities: [], projects: [],
      updatedAt: new Date()
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Landing Page Content</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Manage all text, lists, and sections of your public website.</p>
      </div>
      <SiteContentForm content={JSON.parse(JSON.stringify(content))} />
    </div>
  )
}