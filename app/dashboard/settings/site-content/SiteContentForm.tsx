"use client"

import { useState } from "react"
import { updateSiteContent } from "@/app/actions/site"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2, Save, ChevronDown, GripVertical } from "lucide-react"
import RichTextEditor from "@/components/RichTextEditor"

interface ArrayItem { [key: string]: string }

export default function SiteContentForm({ content }: { content: any }) {
  const [data, setData] = useState(content)

  const handleChange = (name: string, value: string) => {
    setData((prev: any) => ({ ...prev, [name]: value }))
  }

  const handleArrayChange = (arrayName: string, index: number, field: string, value: string) => {
    const newArray = [...data[arrayName]]
    newArray[index] = { ...newArray[index], [field]: value }
    setData((prev: any) => ({ ...prev, [arrayName]: newArray }))
  }

  const addArrayItem = (arrayName: string, fields: string[], index?: number) => {
    const newItem = fields.reduce((acc, f) => { acc[f] = ""; return acc }, {} as ArrayItem)
    const newArray = [...data[arrayName], newItem]
    setData((prev: any) => ({ ...prev, [arrayName]: newArray }))
    // Expand the newly added item
    setTimeout(() => {
      document.getElementById(`${arrayName}-header-${newArray.length - 1}`)?.scrollIntoView({ behavior: "smooth", block: "center" })
    }, 100)
  }

  const removeArrayItem = (arrayName: string, index: number) => {
    const newArray = data[arrayName].filter((_: any, i: number) => i !== index)
    setData((prev: any) => ({ ...prev, [arrayName]: newArray }))
  }

  return (
    <form action={(formData) => {
      formData.append("heroTitle", data.heroTitle || "")
      formData.append("heroSubtitle", data.heroSubtitle || "")
      formData.append("aboutTitle", data.aboutTitle || "")
      formData.append("aboutContent", data.aboutContent || "")
      formData.append("visionTitle", data.visionTitle || "")
      formData.append("visionContent", data.visionContent || "")
      formData.append("transparency", data.transparency || "")
      formData.append("policyContent", data.policyContent || "")

      formData.append("whyJoinUs", JSON.stringify(data.whyJoinUs))
      formData.append("howWeRun", JSON.stringify(data.howWeRun))
      formData.append("facilities", JSON.stringify(data.facilities))
      formData.append("management", JSON.stringify(data.management))
      formData.append("activities", JSON.stringify(data.activities))
      formData.append("projects", JSON.stringify(data.projects))
      
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

// Reusable List Editor Component with Accordion
function DynamicListEditor({ title, arrayName, items, fields, labels, onAdd, onRemove, onChange }: any) {
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
        {items.map((item: any, index: number) => {
          const isExpanded = expandedIndex === index
          const itemTitle = item[fields[0]] || `Item ${index + 1}`

          return (
            <div key={index} className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50/50 dark:bg-slate-900/50">
              {/* Accordion Header */}
              <div 
                id={`${arrayName}-header-${index}`}
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
                          <Input type="file" name={`${arrayName}_${index}_photoUrl`} accept="image/*" className="max-w-xs" />
                        </div>
                      ) : field === "description" || field === "bio" ? (
                        <RichTextEditor value={item[field] || ""} onChange={(val) => onChange(index, field, val)} />
                      ) : (
                        <Input value={item[field] || ""} onChange={(e) => onChange(index, field, e.target.value)} />
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