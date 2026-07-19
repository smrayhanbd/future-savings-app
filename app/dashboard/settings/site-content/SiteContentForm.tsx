"use client"

import { useState } from "react"
import { updateSiteContent } from "@/app/actions/site"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2, Save, ChevronDown } from "lucide-react"
import RichTextEditor from "@/components/RichTextEditor"

/** A single dynamic-list row (management, projects, activities, facilities). */
interface ContentItem {
  name?: string
  role?: string
  title?: string
  status?: string
  date?: string
  description?: string
  bio?: string
  photoUrl?: string
  _file?: File | null
  [key: string]: unknown
}

/** Full site-content document held in form state. */
interface SiteContentData {
  heroTitle: string
  heroSubtitle: string
  aboutTitle: string
  aboutContent: string
  visionTitle: string
  visionContent: string
  transparency: string
  policyContent: string
  whyJoinUs: ContentItem[]
  howWeRun: ContentItem[]
  facilities: ContentItem[]
  management: ContentItem[]
  activities: ContentItem[]
  projects: ContentItem[]
  [key: string]: unknown
}

export default function SiteContentForm({ content }: { content: SiteContentData }) {
  const [data, setData] = useState<SiteContentData>(content)

  const handleChange = (name: string, value: string) => {
    setData((prev) => ({ ...prev, [name]: value }))
  }

  const handleArrayChange = (arrayName: string, index: number, field: string, value: unknown) => {
    const newArray = [...(data[arrayName] as ContentItem[])]
    newArray[index] = { ...newArray[index], [field]: value }
    setData((prev) => ({ ...prev, [arrayName]: newArray }))
  }

  const addArrayItem = (arrayName: string, fields: string[]) => {
    const newItem = fields.reduce((acc, f) => { acc[f] = ""; return acc }, {} as ContentItem)
    const newArray = [...(data[arrayName] as ContentItem[]), newItem]
    setData((prev) => ({ ...prev, [arrayName]: newArray }))
  }

  const removeArrayItem = (arrayName: string, index: number) => {
    const newArray = (data[arrayName] as ContentItem[]).filter((_, i) => i !== index)
    setData((prev) => ({ ...prev, [arrayName]: newArray }))
  }

  // Helper to remove the temporary _file object before saving JSON
  const cleanArray = (arr?: ContentItem[]) => (arr ?? []).map(({ _file, ...rest }) => rest)

  return (
    <form action={(formData) => {
      // Append text fields
      formData.append("heroTitle", data.heroTitle || "")
      formData.append("heroSubtitle", data.heroSubtitle || "")
      formData.append("aboutTitle", data.aboutTitle || "")
      formData.append("aboutContent", data.aboutContent || "")
      formData.append("visionTitle", data.visionTitle || "")
      formData.append("visionContent", data.visionContent || "")
      formData.append("transparency", data.transparency || "")
      formData.append("policyContent", data.policyContent || "")

      // Append clean JSON arrays (without the File objects)
      formData.append("whyJoinUs", JSON.stringify(cleanArray(data.whyJoinUs)))
      formData.append("howWeRun", JSON.stringify(cleanArray(data.howWeRun)))
      formData.append("facilities", JSON.stringify(cleanArray(data.facilities)))
      formData.append("management", JSON.stringify(cleanArray(data.management)))
      formData.append("activities", JSON.stringify(cleanArray(data.activities)))
      formData.append("projects", JSON.stringify(cleanArray(data.projects)))

      // Manually append File objects from state
      const appendFiles = (arrayName: string, arr: ContentItem[]) => {
        arr.forEach((item, i) => {
          if (item._file) {
            formData.append(`${arrayName}_${i}_photoUrl`, item._file)
          }
        })
      }
      appendFiles("management", data.management)
      appendFiles("projects", data.projects)
      appendFiles("activities", data.activities)
      
      updateSiteContent(formData)
    }} className="space-y-8 pb-20">

      {/* Hero & About Section */}
      <Card className="shadow-sm rounded-xl border-slate-200">
        <CardHeader><CardTitle>Hero & About Sections</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Hero Title</Label>
            <Input value={data.heroTitle} onChange={(e) => handleChange("heroTitle", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Hero Subtitle</Label>
            <RichTextEditor value={data.heroSubtitle} onChange={(val) => handleChange("heroSubtitle", val)} />
          </div>
          <div className="space-y-2">
            <Label>About Title</Label>
            <Input value={data.aboutTitle} onChange={(e) => handleChange("aboutTitle", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>About Content</Label>
            <RichTextEditor value={data.aboutContent} onChange={(val) => handleChange("aboutContent", val)} />
          </div>
          <div className="space-y-2">
            <Label>Vision Title</Label>
            <Input value={data.visionTitle} onChange={(e) => handleChange("visionTitle", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Vision Content</Label>
            <RichTextEditor value={data.visionContent} onChange={(val) => handleChange("visionContent", val)} />
          </div>
        </CardContent>
      </Card>

      {/* Transparency & Policy */}
      <Card className="shadow-sm rounded-xl border-slate-200">
        <CardHeader><CardTitle>Transparency & Policy</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Transparency Text</Label>
            <RichTextEditor value={data.transparency} onChange={(val) => handleChange("transparency", val)} />
          </div>
          <div className="space-y-2">
            <Label>Somiti Policy Content</Label>
            <RichTextEditor value={data.policyContent || ""} onChange={(val) => handleChange("policyContent", val)} />
          </div>
        </CardContent>
      </Card>

      {/* Dynamic Lists */}
      <DynamicListEditor title="Management Committee" arrayName="management" items={data.management} fields={["name", "role", "photoUrl", "bio"]} labels={["Name", "Role", "Photo", "Short Bio"]} onAdd={(f) => addArrayItem("management", f)} onRemove={(i) => removeArrayItem("management", i)} onChange={(i, f, v) => handleArrayChange("management", i, f, v)} />

      <DynamicListEditor title="Projects" arrayName="projects" items={data.projects} fields={["title", "status", "photoUrl", "description"]} labels={["Project Title", "Status (e.g. Ongoing)", "Project Photo", "Description"]} onAdd={(f) => addArrayItem("projects", f)} onRemove={(i) => removeArrayItem("projects", i)} onChange={(i, f, v) => handleArrayChange("projects", i, f, v)} />

      <DynamicListEditor title="Recent Activities" arrayName="activities" items={data.activities} fields={["title", "date", "photoUrl", "description"]} labels={["Activity Title", "Date", "Activity Photo", "Description"]} onAdd={(f) => addArrayItem("activities", f)} onRemove={(i) => removeArrayItem("activities", i)} onChange={(i, f, v) => handleArrayChange("activities", i, f, v)} />

      <DynamicListEditor title="Facilities / Why Join Us" arrayName="facilities" items={data.facilities} fields={["title", "description"]} labels={["Facility Title", "Description"]} onAdd={(f) => addArrayItem("facilities", f)} onRemove={(i) => removeArrayItem("facilities", i)} onChange={(i, f, v) => handleArrayChange("facilities", i, f, v)} />

      {/* Floating Save Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button type="submit" size="lg" className="bg-indigo-600 hover:bg-indigo-700 shadow-2xl rounded-full h-14 w-14 p-0 flex items-center justify-center">
          <Save className="h-6 w-6" />
        </Button>
      </div>
    </form>
  )
}

interface DynamicListEditorProps {
  title: string
  arrayName: string
  items?: ContentItem[]
  fields: string[]
  labels: string[]
  onAdd: (fields: string[]) => void
  onRemove: (index: number) => void
  onChange: (index: number, field: string, value: unknown) => void
}

// Reusable List Editor Component with Accordion and State-Managed Files
function DynamicListEditor({ title, items = [], fields, labels, onAdd, onRemove, onChange }: DynamicListEditorProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0)

  const handleAdd = () => {
    onAdd(fields)
    setExpandedIndex(items.length) // Expand the new item
  }

  return (
    <Card className="shadow-sm rounded-xl border-slate-200">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <Button type="button" size="sm" variant="outline" onClick={handleAdd}><Plus className="h-4 w-4 mr-1" /> Add Item</Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 && <p className="text-sm text-slate-500 text-center py-4">No items added yet.</p>}
        {items.map((item, index) => {
          const isExpanded = expandedIndex === index
          const itemTitle = (item[fields[0]] as string) || `Item ${index + 1}`

          return (
            <div key={index} className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50/50 dark:bg-slate-900/50">
              {/* Accordion Header */}
              <div 
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                onClick={() => setExpandedIndex(isExpanded ? null : index)}
              >
                <div className="flex items-center gap-2">
                  <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  <span className="font-medium text-sm text-slate-700 dark:text-slate-200">{itemTitle}</span>
                </div>
                <Button 
                  type="button" 
                  size="icon" 
                  variant="ghost" 
                  className="h-7 w-7 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                  onClick={(e) => { e.stopPropagation(); onRemove(index) }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Accordion Content */}
              {isExpanded && (
                <div className="p-4 pt-2 space-y-3 border-t border-slate-200 dark:border-slate-700">
                  {fields.map((field: string, fIndex: number) => (
                    <div key={field} className="space-y-1">
                      <Label className="text-xs uppercase text-slate-500">{labels[fIndex]}</Label>
                      
                      {field === "photoUrl" ? (
                        <div className="flex items-center gap-4 mt-1">
                          {item.photoUrl && <img src={item.photoUrl} alt="Preview" className="w-16 h-16 object-cover rounded-md border border-slate-200" />}
                          <Input 
                            type="file" 
                            accept="image/*" 
                            className="max-w-xs"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null
                              if (file) {
                                // Store file object in state and create a preview URL
                                onChange(index, "photoUrl", URL.createObjectURL(file))
                                onChange(index, "_file", file)
                              } else {
                                onChange(index, "photoUrl", "")
                                onChange(index, "_file", null)
                              }
                            }}
                          />
                        </div>
                      ) : field === "description" || field === "bio" ? (
                        <RichTextEditor value={(item[field] as string) || ""} onChange={(val) => onChange(index, field, val)} />
                      ) : (
                        <Input value={(item[field] as string) || ""} onChange={(e) => onChange(index, field, e.target.value)} />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}