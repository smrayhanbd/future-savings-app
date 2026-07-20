"use client"

import { useTransition, useRef, useState } from "react"
import { updateOrganization } from "@/app/actions/organization"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import {
  Building2,
  ImagePlus,
  Mail,
  Phone,
  Globe,
  MapPin,
  Scale,
  Share2,
  Save,
} from "lucide-react"

interface FormState {
  name: string
  tagline: string
  description: string
  email: string
  phone: string
  website: string
  addressLine: string
  city: string
  district: string
  postalCode: string
  regNo: string
  licenseNo: string
  tradeLicenseNo: string
  establishedYear: string
  facebook: string
  whatsapp: string
  youtube: string
}

interface InitialData extends FormState {
  logo: string | null
}

export default function OrganizationForm({ initial }: { initial: InitialData }) {
  const [isPending, startTransition] = useTransition()
  const [previewLogo, setPreviewLogo] = useState<string | null>(initial.logo)
  // Single controlled state object for every text field — avoids the
  // uncontrolled→controlled flip that Base UI's InputPrimitive warns about
  // when defaultValue is used alongside re-renders.
  const [form, setForm] = useState<FormState>({
    name: initial.name,
    tagline: initial.tagline,
    description: initial.description,
    email: initial.email,
    phone: initial.phone,
    website: initial.website,
    addressLine: initial.addressLine,
    city: initial.city,
    district: initial.district,
    postalCode: initial.postalCode,
    regNo: initial.regNo,
    licenseNo: initial.licenseNo,
    tradeLicenseNo: initial.tradeLicenseNo,
    establishedYear: initial.establishedYear,
    facebook: initial.facebook,
    whatsapp: initial.whatsapp,
    youtube: initial.youtube,
  })
  const fileRef = useRef<HTMLInputElement>(null)

  const setField = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }))

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData()
    // Text fields from controlled state.
    ;(Object.keys(form) as (keyof FormState)[]).forEach((key) => {
      fd.append(key, form[key])
    })
    // Append the logo file if a new one was chosen.
    if (fileRef.current?.files?.[0]) {
      fd.append("logo", fileRef.current.files[0])
    }
    startTransition(async () => {
      try {
        await updateOrganization(fd)
        toast.success("Organization info saved")
      } catch (error) {
        // redirect() throws on success — only show error for actual failures.
        if (error instanceof Error && !error.message.includes("NEXT_REDIRECT")) {
          toast.error("Could not save", { description: error.message })
        }
      }
    })
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setPreviewLogo(URL.createObjectURL(file))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <Building2 className="h-7 w-7 text-indigo-600" />
          Organization Info
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
          This information appears on money receipts, vouchers, and member ledgers.
        </p>
      </div>

      {/* Identity */}
      <Card className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Identity
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="name">Organization Name *</Label>
            <Input id="name" value={form.name} onChange={setField("name")} required className="bg-white dark:bg-slate-950" />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Logo</Label>
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-900 shrink-0">
                {previewLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewLogo} alt="Logo preview" className="w-full h-full object-cover" />
                ) : (
                  <ImagePlus className="h-8 w-8 text-slate-300" />
                )}
              </div>
              <div className="space-y-2">
                <Input
                  ref={fileRef}
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="bg-white dark:bg-slate-950 max-w-xs"
                />
                <p className="text-xs text-slate-500">PNG or JPG. Square works best.</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tagline">Tagline / Slogan</Label>
            <Input id="tagline" value={form.tagline} onChange={setField("tagline")} placeholder="e.g. Save today, prosper tomorrow" className="bg-white dark:bg-slate-950" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">Short Description</Label>
            <Textarea id="description" value={form.description} onChange={setField("description")} rows={3} placeholder="A one-paragraph description of the somiti…" className="bg-white dark:bg-slate-950" />
          </div>
        </CardContent>
      </Card>

      {/* Contact + Address */}
      <Card className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <MapPin className="h-4 w-4" /> Contact & Address
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email"><Mail className="inline h-3.5 w-3.5 mr-1" />Email</Label>
            <Input id="email" type="email" value={form.email} onChange={setField("email")} placeholder="info@somiti.org" className="bg-white dark:bg-slate-950" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone"><Phone className="inline h-3.5 w-3.5 mr-1" />Phone</Label>
            <Input id="phone" value={form.phone} onChange={setField("phone")} placeholder="+8801XXXXXXXXX" className="bg-white dark:bg-slate-950" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website"><Globe className="inline h-3.5 w-3.5 mr-1" />Website</Label>
            <Input id="website" value={form.website} onChange={setField("website")} placeholder="https://somiti.org" className="bg-white dark:bg-slate-950" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="addressLine">Address Line</Label>
            <Input id="addressLine" value={form.addressLine} onChange={setField("addressLine")} placeholder="House 12, Road 5" className="bg-white dark:bg-slate-950" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City / Town</Label>
            <Input id="city" value={form.city} onChange={setField("city")} placeholder="Dhaka" className="bg-white dark:bg-slate-950" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="district">District</Label>
            <Input id="district" value={form.district} onChange={setField("district")} placeholder="Dhaka" className="bg-white dark:bg-slate-950" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="postalCode">Postal Code</Label>
            <Input id="postalCode" value={form.postalCode} onChange={setField("postalCode")} placeholder="1207" className="bg-white dark:bg-slate-950" />
          </div>
        </CardContent>
      </Card>

      {/* Legal / Registration */}
      <Card className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <Scale className="h-4 w-4" /> Legal / Registration
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="regNo">Registration No.</Label>
            <Input id="regNo" value={form.regNo} onChange={setField("regNo")} placeholder="Cooperative society reg. no." className="bg-white dark:bg-slate-950" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="licenseNo">License No.</Label>
            <Input id="licenseNo" value={form.licenseNo} onChange={setField("licenseNo")} placeholder="Operating license no." className="bg-white dark:bg-slate-950" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tradeLicenseNo">Trade License No.</Label>
            <Input id="tradeLicenseNo" value={form.tradeLicenseNo} onChange={setField("tradeLicenseNo")} className="bg-white dark:bg-slate-950" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="establishedYear">Established Year</Label>
            <Input id="establishedYear" value={form.establishedYear} onChange={setField("establishedYear")} placeholder="2018" className="bg-white dark:bg-slate-950" />
          </div>
        </CardContent>
      </Card>

      {/* Social */}
      <Card className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <Share2 className="h-4 w-4" /> Social Links
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="facebook">Facebook</Label>
            <Input id="facebook" value={form.facebook} onChange={setField("facebook")} placeholder="https://facebook.com/…" className="bg-white dark:bg-slate-950" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input id="whatsapp" value={form.whatsapp} onChange={setField("whatsapp")} placeholder="https://wa.me/8801…" className="bg-white dark:bg-slate-950" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="youtube">YouTube</Label>
            <Input id="youtube" value={form.youtube} onChange={setField("youtube")} placeholder="https://youtube.com/…" className="bg-white dark:bg-slate-950" />
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end gap-2 sticky bottom-4 z-10">
        <Button type="submit" disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700 shadow-lg">
          <Save className="h-4 w-4 mr-2" /> {isPending ? "Saving…" : "Save Organization Info"}
        </Button>
      </div>
    </form>
  )
}
