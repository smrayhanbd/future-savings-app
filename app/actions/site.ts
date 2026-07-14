"use server"

import { uploadImage } from "@/lib/cloudinary"
import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function updateSiteContent(formData: FormData) {
  const heroTitle = formData.get("heroTitle") as string
  const heroSubtitle = formData.get("heroSubtitle") as string
  const aboutTitle = formData.get("aboutTitle") as string
  const aboutContent = formData.get("aboutContent") as string
  const visionTitle = formData.get("visionTitle") as string
  const visionContent = formData.get("visionContent") as string
  const transparency = formData.get("transparency") as string

  // Parse JSON arrays from hidden inputs
  let whyJoinUs = JSON.parse(formData.get("whyJoinUs") as string || "[]")
  let howWeRun = JSON.parse(formData.get("howWeRun") as string || "[]")
  let facilities = JSON.parse(formData.get("facilities") as string || "[]")
  let management = JSON.parse(formData.get("management") as string || "[]")
  let activities = JSON.parse(formData.get("activities") as string || "[]")
  let projects = JSON.parse(formData.get("projects") as string || "[]")

  // Helper function to handle file uploads for arrays
  const processArrayImages = async (arrayName: string, array: any[]) => {
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

  // Process images for each category
  management = await processArrayImages("management", management)
  activities = await processArrayImages("activities", activities)
  projects = await processArrayImages("projects", projects)

  await prisma.siteContent.upsert({
    where: { id: "singleton" },
    update: {
      heroTitle, heroSubtitle, aboutTitle, aboutContent, visionTitle, visionContent, transparency,
      whyJoinUs, howWeRun, facilities, management, activities, projects
    },
    create: {
      id: "singleton",
      heroTitle, heroSubtitle, aboutTitle, aboutContent, visionTitle, visionContent, transparency,
      whyJoinUs, howWeRun, facilities, management, activities, projects
    }
  })

  revalidatePath("/")
  redirect("/dashboard/settings/site-content")
}