"use client"

import { useState } from "react"
import { updateSiteContent } from "@/app/actions/site"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2, Save } from "lucide-react"

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

  const addArrayItem = (arrayName: string, fields: string[]) => {
    const newItem = fields.reduce((acc, f) => { acc[f] = ""; return acc }, {} as ArrayItem)
    setData((prev: any) => ({ ...prev, [arrayName]: [...prev[arrayName], newItem] }))
  }

  const removeArrayItem = (arrayName: string, index: number) => {
    const newArray = data[arrayName].filter((_: any, i: number) => i !== index)
    setData((prev: any) => ({ ...prev, [arrayName]: newArray }))
  }

  return (
    <form action={(formData) => {
      // Append text fields explicitly
      formData.append("heroTitle", data.heroTitle || "")
      formData.append("heroSubtitle", data.heroSubtitle || "")
      formData.append("aboutTitle", data.aboutTitle || "")
      formData.append("aboutContent", data.aboutContent || "")
      formData.append("visionTitle", data.visionTitle || "")
      formData.append("visionContent", data.visionContent || "")
      formData.append("transparency", data.transparency || "")

      // Append JSON arrays
      formData.append("whyJoinUs", JSON.stringify(data.whyJoinUs))
      formData.append("howWeRun", JSON.stringify(data.howWeRun))
      formData.append("facilities", JSON.stringify(data.facilities))
      formData.append("management", JSON.stringify(data.management))
      formData.append("activities", JSON.stringify(data.activities))
      formData.append("projects", JSON.stringify(data.projects))
      
      updateSiteContent(formData)
    }} className="space-y-8">

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
            <Textarea value={data.heroSubtitle} onChange={(e) => handleChange("heroSubtitle", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>About Title</Label>
            <Input value={data.aboutTitle} onChange={(e) => handleChange("aboutTitle", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>About Content</Label>
            <Textarea rows={5} value={data.aboutContent} onChange={(e) => handleChange("aboutContent", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Vision Title</Label>
            <Input value={data.visionTitle} onChange={(e) => handleChange("visionTitle", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Vision Content</Label>
            <Textarea rows={3} value={data.visionContent} onChange={(e) => handleChange("visionContent", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Transparency */}
      <Card className="shadow-sm rounded-xl border-slate-200">
        <CardHeader><CardTitle>Transparency & Reporting</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Label>Transparency Text</Label>
          <Textarea rows={3} value={data.transparency} onChange={(e) => handleChange("transparency", e.target.value)} />
        </CardContent>
      </Card>

      {/* Dynamic Lists */}
      {/* Management Committee */}
      <DynamicListEditor
        title="Management Committee"
        arrayName="management"
        items={data.management}
        fields={["name", "role", "photoUrl", "bio"]}
        labels={["Name", "Role", "Photo", "Short Bio"]}
        onAdd={() => addArrayItem("management", ["name", "role", "photoUrl", "bio"])}
        onRemove={(i) => removeArrayItem("management", i)}
        onChange={(i, f, v) => handleArrayChange("management", i, f, v)}
      />

      {/* Projects */}
      <DynamicListEditor
        title="Projects"
        arrayName="projects"
        items={data.projects}
        fields={["title", "status", "photoUrl", "description"]}
        labels={["Project Title", "Status (e.g. Ongoing)", "Project Photo", "Description"]}
        onAdd={() => addArrayItem("projects", ["title", "status", "photoUrl", "description"])}
        onRemove={(i) => removeArrayItem("projects", i)}
        onChange={(i, f, v) => handleArrayChange("projects", i, f, v)}
      />

      {/* Activities */}
      <DynamicListEditor
        title="Recent Activities"
        arrayName="activities"
        items={data.activities}
        fields={["title", "date", "photoUrl", "description"]}
        labels={["Activity Title", "Date", "Activity Photo", "Description"]}
        onAdd={() => addArrayItem("activities", ["title", "date", "photoUrl", "description"])}
        onRemove={(i) => removeArrayItem("activities", i)}
        onChange={(i, f, v) => handleArrayChange("activities", i, f, v)}
      />

      {/* Facilities */}
      <DynamicListEditor
        title="Facilities / Why Join Us"
        arrayName="facilities"
        items={data.facilities}
        fields={["title", "description"]}
        labels={["Facility Title", "Description"]}
        onAdd={() => addArrayItem("facilities", ["title", "description"])}
        onRemove={(i) => removeArrayItem("facilities", i)}
        onChange={(i, f, v) => handleArrayChange("facilities", i, f, v)}
      />

      <div className="sticky bottom-4 flex justify-end">
        <Button type="submit" size="lg" className="bg-indigo-600 hover:bg-indigo-700 shadow-xl rounded-xl">
          <Save className="mr-2 h-5 w-5" /> Save All Content
        </Button>
      </div>
    </form>
  )
}

// Reusable List Editor Component
function DynamicListEditor({ title, arrayName, items, fields, labels, onAdd, onRemove, onChange }: any) {
  return (
    <Card className="shadow-sm rounded-xl border-slate-200">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <Button type="button" size="sm" variant="outline" onClick={onAdd}><Plus className="h-4 w-4 mr-1" /> Add Item</Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {items.length === 0 && <p className="text-sm text-slate-500 text-center py-4">No items added yet.</p>}
        {items.map((item: any, index: number) => (
          <div key={index} className="p-4 border border-slate-200 rounded-lg space-y-3 relative bg-slate-50">
            <Button type="button" size="icon" variant="ghost" className="absolute top-2 right-2 text-red-500 hover:bg-red-50" onClick={() => onRemove(index)}>
              <Trash2 className="h-4 w-4" />
            </Button>
            {fields.map((field: string, fIndex: number) => (
              <div key={field} className="space-y-1">
                <Label className="text-xs uppercase text-slate-500">{labels[fIndex]}</Label>
                
                {field === "photoUrl" ? (
                  // File Input for Images
                  <div className="flex items-center gap-4 mt-1">
                    {item.photoUrl && (
                      <img src={item.photoUrl} alt="Preview" className="w-16 h-16 object-cover rounded-md border border-slate-200" />
                    )}
                    <Input 
                      type="file" 
                      name={`${arrayName}_${index}_photoUrl`} 
                      accept="image/*" 
                      className="max-w-xs"
                    />
                  </div>
                ) : field === "description" || field === "bio" ? (
                  // Textarea for long text
                  <Textarea value={item[field] || ""} onChange={(e) => onChange(index, field, e.target.value)} />
                ) : (
                  // Standard Input
                  <Input value={item[field] || ""} onChange={(e) => onChange(index, field, e.target.value)} />
                )}
                
              </div>
            ))}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}