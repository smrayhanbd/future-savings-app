"use server"

import { uploadImage } from "@/lib/cloudinary"
import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

/** A parsed site-content array item (why-join, how-we-run, facilities, etc.). */
interface SiteContentItem {
  title?: string
  description?: string
  photoUrl?: string
  [key: string]: unknown
}

export async function updateSiteContent(formData: FormData) {
  const heroTitle = formData.get("heroTitle") as string
  const heroSubtitle = formData.get("heroSubtitle") as string
  const aboutTitle = formData.get("aboutTitle") as string
  const aboutContent = formData.get("aboutContent") as string
  const visionTitle = formData.get("visionTitle") as string
  const visionContent = formData.get("visionContent") as string
  const transparency = formData.get("transparency") as string
  const policyContent = formData.get("policyContent") as string // <-- ADD THIS

  // Parse JSON arrays from hidden inputs
  const whyJoinUs = JSON.parse(formData.get("whyJoinUs") as string || "[]")
  const howWeRun = JSON.parse(formData.get("howWeRun") as string || "[]")
  const facilities = JSON.parse(formData.get("facilities") as string || "[]")
  const management = JSON.parse(formData.get("management") as string || "[]")
  const activities = JSON.parse(formData.get("activities") as string || "[]")
  const projects = JSON.parse(formData.get("projects") as string || "[]")

  // Helper function to handle file uploads for arrays
  const processArrayImages = async (arrayName: string, array: SiteContentItem[]) => {
    for (let i = 0; i < array.length; i++) {
      const file = formData.get(`${arrayName}_${i}_photoUrl`) as File
      if (file && file.size > 0) {
        const url = await uploadImage(file)
        if (url) array[i].photoUrl = url
      }
      // If no new file, it keeps the existing photoUrl from the JSON string
    }
    return array
  }

  // Process images for each category (mutates arrays in place)
  await processArrayImages("management", management)
  await processArrayImages("activities", activities)
  await processArrayImages("projects", projects)

  await prisma.siteContent.upsert({
    where: { id: "singleton" },
    update: {
      heroTitle, heroSubtitle, aboutTitle, aboutContent, visionTitle, visionContent, transparency,
      policyContent, // <-- ADD THIS
      whyJoinUs, howWeRun, facilities, management, activities, projects
    },
    create: {
      id: "singleton",
      heroTitle, heroSubtitle, aboutTitle, aboutContent, visionTitle, visionContent, transparency,
      policyContent, // <-- ADD THIS
      whyJoinUs, howWeRun, facilities, management, activities, projects
    }
  })

  revalidatePath("/")
  redirect("/dashboard/settings/site-content")
}