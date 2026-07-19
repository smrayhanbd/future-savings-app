"use client"

import { useRouter } from "next/navigation"
import React, { useState, useMemo, useRef } from "react"
import { registerMember } from "@/app/actions/member"
import Link from "next/link"
import { toast } from "sonner"
import {
    User, Calendar as CalendarIcon, Phone, Mail, MapPin, Home, Building,
    Banknote, CreditCard, FileText, Users, Upload, X, Plus, Trash2,
    CheckCircle, Info, Circle
} from "lucide-react"

type Nominee = { id: string; name: string; relation: string; share: string; phone: string; idType: "nid" | "birthCert" | "passport"; idNumber: string; idDocumentFile: File | null; photo: File | null; }
type AdditionalDocument = { id: string; name: string; file: File | null; }

type FormData = {
    firstName: string; lastName: string; fatherName: string; motherName: string; spouseName: string;
    dateOfBirth: string; gender: "male" | "female" | "other"; religion: string; nationality: string;
    bloodGroup: string; profession: string; maritalStatus: "married" | "unmarried" | "divorced" | "widowed"; marriageDate: string;
    phoneNumber: string; emailAddress: string; emergencyContact: string; emergencyContactName: string;
    idType: string; idNumber: string; idDocumentFile: File | null; memberPhoto: File | null;
    accountName: string; accountNumber: string; bankName: string; branch: string; routingNumber: string;
    currentAddress: string; currentPostOffice: string; currentDistrict: string; currentPostCode: string;
    permanentAddress: string; permanentPostOffice: string; permanentDistrict: string; permanentPostCode: string;
    additionalDocuments: AdditionalDocument[]; nominees: Nominee[];
}

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
const religions = ["Islam", "Hinduism", "Christianity", "Buddhism", "Other"]
const genders = ["Male", "Female", "Other"]
const maritalStatuses = ["Married", "Unmarried", "Divorced", "Widowed"]
const idTypes = ["National ID", "Passport", "Birth Certificate", "Driving License"]

const sectionColors = {
    personal: { bg: "bg-blue-50 dark:bg-slate-900/40", border: "border-blue-200 dark:border-slate-700/50", header: "bg-blue-600", text: "text-white", topBorder: "border-t-blue-600" },
    contact: { bg: "bg-green-50 dark:bg-slate-900/40", border: "border-green-200 dark:border-slate-700/50", header: "bg-green-600", text: "text-white", topBorder: "border-t-green-600" },
    bank: { bg: "bg-yellow-50 dark:bg-slate-900/40", border: "border-yellow-200 dark:border-slate-700/50", header: "bg-yellow-600", text: "text-white", topBorder: "border-t-yellow-600" },
    residence: { bg: "bg-gray-50 dark:bg-slate-900/40", border: "border-gray-300 dark:border-slate-700/50", header: "bg-gray-600", text: "text-white", topBorder: "border-t-gray-600" },
    docs: { bg: "bg-blue-50 dark:bg-slate-900/40", border: "border-blue-200 dark:border-slate-700/50", header: "bg-blue-500", text: "text-white", topBorder: "border-t-blue-500" },
    nominees: { bg: "bg-green-50 dark:bg-slate-900/40", border: "border-green-200 dark:border-slate-700/50", header: "bg-green-500", text: "text-white", topBorder: "border-t-green-500" },
}

const inputClass = "w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:ring-indigo-500/30 dark:focus:border-indigo-500 outline-none bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors"
const labelClass = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
const subLabelClass = "block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1"

function SectionCard({ color, children, title, icon }: { color: typeof sectionColors.personal, children: React.ReactNode, title: string, icon: React.ReactNode }) {
    return (
        <div className={`rounded-xl shadow-md border ${color.bg} ${color.border} border-t-4 ${color.topBorder} h-full flex flex-col`}>
            <div className={`${color.header} ${color.text} px-5 py-3 rounded-t-xl flex items-center gap-2 shrink-0`}>
                {icon}<h2 className="text-lg font-semibold">{title}</h2>
            </div>
            <div className="p-5 flex-grow">{children}</div>
        </div>
    )
}

function EnterpriseDatePicker({ value, onChange }: { value: string, onChange: (val: string) => void }) {
    return (
        <input 
            type="date" 
            value={value} 
            onChange={(e) => onChange(e.target.value)}
            className={`${inputClass} [color-scheme:light dark:[color-scheme:dark]`}
        />
    )
}

export default function RegisterForm() {
    const [formData, setFormData] = useState<FormData>({
        firstName: "", lastName: "", fatherName: "", motherName: "", spouseName: "",
        dateOfBirth: "", gender: "male", religion: "", nationality: "Bangladeshi",
        bloodGroup: "", profession: "", maritalStatus: "unmarried", marriageDate: "",
        phoneNumber: "", emailAddress: "", emergencyContact: "", emergencyContactName: "",
        idType: "", idNumber: "", idDocumentFile: null, memberPhoto: null,
        accountName: "", accountNumber: "", bankName: "", branch: "", routingNumber: "",
        currentAddress: "", currentPostOffice: "", currentDistrict: "", currentPostCode: "",
        permanentAddress: "", permanentPostOffice: "", permanentDistrict: "", permanentPostCode: "",
        additionalDocuments: [], nominees: [],
    })

    const [nomineeIdCounter, setNomineeIdCounter] = useState(1)
    const [additionalDocCounter, setAdditionalDocCounter] = useState(1)
    const [showNomineeModal, setShowNomineeModal] = useState(false)
    const [nomineeForm, setNomineeForm] = useState<Omit<Nominee, "id">>({ name: "", relation: "", share: "", phone: "", idType: "nid", idNumber: "", idDocumentFile: null, photo: null })
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const [errors, setErrors] = useState<{ phoneNumber?: string; emailAddress?: string; idNumber?: string }>({})
    const phoneInputRef = useRef<HTMLInputElement>(null)
    const emailInputRef = useRef<HTMLInputElement>(null)
    const idNumberInputRef = useRef<HTMLInputElement>(null)

    const steps = useMemo(() => [
        { name: "Personal Information", complete: !!(formData.firstName && formData.lastName && formData.dateOfBirth && formData.gender) },
        { name: "Contact & ID", complete: !!(formData.phoneNumber && formData.emailAddress && formData.idType && formData.idNumber) },
        { name: "Bank Details", complete: !!(formData.accountName && formData.accountNumber && formData.bankName) },
        { name: "Address Info", complete: !!(formData.currentAddress && formData.currentDistrict && formData.permanentAddress && formData.permanentDistrict) },
        { name: "Documents", complete: !!formData.memberPhoto && !!formData.idDocumentFile },
        { name: "Nominees", complete: formData.nominees.length > 0 },
    ], [formData])

    const completedSteps = steps.filter(s => s.complete).length
    const progress = Math.round((completedSteps / steps.length) * 100)

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target
        setFormData((prev) => ({ ...prev, [name]: value }))
        // Clear any duplicate-field error once the user edits that field
        if (name === "phoneNumber" || name === "emailAddress" || name === "idNumber") {
            setErrors((prev) => ({ ...prev, [name]: undefined }))
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof Pick<FormData, "idDocumentFile" | "memberPhoto">) => setFormData((prev) => ({ ...prev, [field]: e.target.files?.[0] || null }))
    const handleNomineeInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setNomineeForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    const handleNomineeFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: "idDocumentFile" | "photo") => setNomineeForm((prev) => ({ ...prev, [field]: e.target.files?.[0] || null }))

    const addAdditionalDocument = () => {
        setFormData((prev) => ({ ...prev, additionalDocuments: [...prev.additionalDocuments, { id: `doc-${additionalDocCounter}`, name: "", file: null }] }))
        setAdditionalDocCounter((prev) => prev + 1)
    }
    const updateAdditionalDocument = (id: string, field: "name" | "file", value: string | File | null) => setFormData((prev) => ({ ...prev, additionalDocuments: prev.additionalDocuments.map((doc) => doc.id === id ? { ...doc, [field]: value } : doc) }))
    const removeAdditionalDocument = (id: string) => setFormData((prev) => ({ ...prev, additionalDocuments: prev.additionalDocuments.filter((doc) => doc.id !== id) }))

    const addNominee = () => {
        if (!nomineeForm.name || !nomineeForm.relation || !nomineeForm.share) { toast.error("Please fill in all required nominee fields."); return; }
        const newNominee: Nominee = { id: `nom-${nomineeIdCounter}`, ...nomineeForm }
        setFormData((prev) => ({ ...prev, nominees: [...prev.nominees, newNominee] }))
        setNomineeIdCounter((prev) => prev + 1)
        setNomineeForm({ name: "", relation: "", share: "", phone: "", idType: "nid", idNumber: "", idDocumentFile: null, photo: null })
        setShowNomineeModal(false)
    }

    const deleteNominee = (id: string) => {
        if (confirm("Are you sure you want to remove this nominee?")) {
            setFormData((prev) => ({ ...prev, nominees: prev.nominees.filter((n) => n.id !== id) }))
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        const fd = new FormData()
        fd.append("firstName", formData.firstName); fd.append("lastName", formData.lastName)
        fd.append("fatherName", formData.fatherName); fd.append("motherName", formData.motherName)
        fd.append("spouseName", formData.spouseName); fd.append("dob", formData.dateOfBirth)
        fd.append("gender", formData.gender ? formData.gender.toUpperCase() : "OTHER")
        fd.append("religion", formData.religion); fd.append("nationality", formData.nationality)
        fd.append("bloodGroup", formData.bloodGroup ? formData.bloodGroup.replace("+", "_POSITIVE").replace("-", "_NEGATIVE") : "")
        fd.append("profession", formData.profession)
        fd.append("maritalStatus", formData.maritalStatus ? formData.maritalStatus.toUpperCase() : "")
        fd.append("marriageDate", formData.marriageDate)
        fd.append("phone", formData.phoneNumber); fd.append("email", formData.emailAddress)
        fd.append("emergencyPhone", formData.emergencyContact)
        fd.append("emergencyContactName", formData.emergencyContactName)
        fd.append("idType", formData.idType); fd.append("idNumber", formData.idNumber)
        fd.append("accountName", formData.accountName); fd.append("accountNumber", formData.accountNumber)
        fd.append("bankName", formData.bankName); fd.append("branch", formData.branch)
        fd.append("routingNumber", formData.routingNumber)
        fd.append("c_village", formData.currentAddress); fd.append("c_postOffice", formData.currentPostOffice)
        fd.append("c_district", formData.currentDistrict); fd.append("c_postalCode", formData.currentPostCode)
        fd.append("p_village", formData.permanentAddress); fd.append("p_postOffice", formData.permanentPostOffice)
        fd.append("p_district", formData.permanentDistrict); fd.append("p_postalCode", formData.permanentPostCode)
        
        if (formData.memberPhoto) fd.append("memberPhoto", formData.memberPhoto)
        if (formData.idDocumentFile) fd.append("idDocument", formData.idDocumentFile)
        
        formData.additionalDocuments.forEach((doc, i) => { if (doc.name) fd.append(`doc_${i}_name`, doc.name); if (doc.file) fd.append(`doc_${i}_file`, doc.file); })
        
        formData.nominees.forEach((nom, i) => {
            fd.append(`nom_${i}_name`, nom.name); fd.append(`nom_${i}_relation`, nom.relation)
            fd.append(`nom_${i}_share`, nom.share); fd.append(`nom_${i}_phone`, nom.phone || "")
            fd.append(`nom_${i}_idType`, nom.idType); fd.append(`nom_${i}_idNumber`, nom.idNumber)
            if (nom.idDocumentFile) fd.append(`nom_${i}_idDoc`, nom.idDocumentFile)
            if (nom.photo) fd.append(`nom_${i}_photo`, nom.photo)
        })
        
        try {
            const result = await registerMember(fd) as
                | { success?: true }
                | { error: string; field?: "email" | "phone" | "both" | "idNumber" }

            // Check if the server returned an error object
            if (result && "error" in result && result.error) {
                // Determine which field(s) to flag from the server's `field` hint
                const field = result.field
                const fieldErrors: { phoneNumber?: string; emailAddress?: string; idNumber?: string } = {}
                if (field === "email" || field === "both") fieldErrors.emailAddress = result.error
                if (field === "phone" || field === "both") fieldErrors.phoneNumber = result.error
                if (field === "idNumber") fieldErrors.idNumber = result.error
                setErrors(fieldErrors)

                // Focus the first offending field (priority: email → phone → idNumber)
                const targetRef = fieldErrors.emailAddress
                    ? emailInputRef
                    : fieldErrors.phoneNumber
                        ? phoneInputRef
                        : fieldErrors.idNumber
                            ? idNumberInputRef
                            : null
                if (targetRef?.current) {
                    targetRef.current.focus()
                    targetRef.current.scrollIntoView({ behavior: "smooth", block: "center" })
                }

                toast.error("Registration Failed", {
                    description: result.error
                })
                setLoading(false)
            } else if (result && "success" in result && result.success) {
                // If successful, redirect to the success page
                router.push("/register/success")
            }
        } catch {
            // Catch any unexpected network errors
            toast.error("Registration Failed", {
                description: "An unexpected error occurred. Please try again."
            })
            setLoading(false)
        }
    }

    const renderFileUpload = (file: File | null, onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void, onRemove: () => void, label: string) => {
        return (
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-4 hover:border-indigo-600 dark:hover:border-indigo-500 transition-colors bg-white dark:bg-slate-950">
                {file ? (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            <span className="text-sm text-slate-700 dark:text-slate-200 truncate max-w-[150px]">{file.name}</span>
                        </div>
                        <button type="button" onClick={onRemove} className="text-red-500 hover:text-red-700"><X className="w-4 h-4" /></button>
                    </div>
                ) : (
                    <label className="flex flex-col items-center justify-center cursor-pointer">
                        <Upload className="w-8 h-8 text-slate-400 dark:text-slate-500 mb-1" />
                        <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
                        <input type="file" className="hidden" accept="image/*,.pdf" onChange={onFileChange} />
                    </label>
                )}
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-5 gap-x-6 gap-y-5">
            
            {/* Left & Middle: Form Sections (4/5 width - Wider) */}
            <div className="lg:col-span-4 space-y-5">
                
                {/* Instruction Guide */}
                <div className="p-5 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/50 rounded-xl text-sm text-indigo-800 dark:text-indigo-300 flex gap-4">
                    <Info className="h-5 w-5 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-bold mb-2">Registration Guide</p>
                        <ul className="list-disc list-inside space-y-1">
                            <li>Please use your exact name as it appears on your National ID (NID).</li>
                            <li>Ensure the phone number and email are active for portal login and notifications.</li>
                            <li>Upload a clear photo and a readable copy of your ID document.</li>
                            <li>Nominee share percentage must total exactly 100% if adding multiple nominees.</li>
                        </ul>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-5 items-stretch">
                    {/* Personal Information */}
                    <SectionCard color={sectionColors.personal} title="Personal Information" icon={<User className="w-5 h-5" />}>
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className={labelClass}>First Name <span className="text-red-500">*</span></label><input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} required placeholder="e.g., Md. Rahim" className={inputClass} /></div>
                                <div><label className={labelClass}>Last Name <span className="text-red-500">*</span></label><input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} required placeholder="e.g., Uddin" className={inputClass} /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className={labelClass}>Father&apos;s Name</label><input type="text" name="fatherName" value={formData.fatherName} onChange={handleInputChange} placeholder="e.g., Md. Karim" className={inputClass} /></div>
                                <div><label className={labelClass}>Mother&apos;s Name</label><input type="text" name="motherName" value={formData.motherName} onChange={handleInputChange} placeholder="e.g., Mrs. Ayesha" className={inputClass} /></div>
                            </div>
                            <div><label className={labelClass}>Spouse Name</label><input type="text" name="spouseName" value={formData.spouseName} onChange={handleInputChange} placeholder="e.g., Mrs. Salma" className={inputClass} /></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className={labelClass}>Date of Birth</label><EnterpriseDatePicker value={formData.dateOfBirth} onChange={(val) => setFormData(prev => ({ ...prev, dateOfBirth: val }))} /></div>
                                <div><label className={labelClass}>Gender</label><select name="gender" value={formData.gender} onChange={handleInputChange} className={inputClass}>{genders.map((g) => <option key={g} value={g.toLowerCase()}>{g}</option>)}</select></div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className={labelClass}>Marital Status</label><select name="maritalStatus" value={formData.maritalStatus} onChange={handleInputChange} className={inputClass}>{maritalStatuses.map((m) => <option key={m} value={m.toLowerCase()}>{m}</option>)}</select></div>
                                <div><label className={labelClass}>Marriage Date</label><EnterpriseDatePicker value={formData.marriageDate} onChange={(val) => setFormData(prev => ({ ...prev, marriageDate: val }))} /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className={labelClass}>Religion</label><select name="religion" value={formData.religion} onChange={handleInputChange} className={inputClass}><option value="">Select</option>{religions.map((r) => <option key={r} value={r}>{r}</option>)}</select></div>
                                <div><label className={labelClass}>Nationality</label><input type="text" name="nationality" value={formData.nationality} onChange={handleInputChange} placeholder="e.g., Bangladeshi" className={inputClass} /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className={labelClass}>Blood Group</label><select name="bloodGroup" value={formData.bloodGroup} onChange={handleInputChange} className={inputClass}><option value="">Select</option>{bloodGroups.map((bg) => <option key={bg} value={bg}>{bg}</option>)}</select></div>
                                <div><label className={labelClass}>Profession</label><input type="text" name="profession" value={formData.profession} onChange={handleInputChange} placeholder="e.g., Teacher" className={inputClass} /></div>
                            </div>
                        </div>
                    </SectionCard>

                    {/* Contact, Photo & ID */}
                    <SectionCard color={sectionColors.contact} title="Contact, Photo & ID" icon={<Phone className="w-5 h-5" />}>
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className={labelClass}>Member Photo</label>{renderFileUpload(formData.memberPhoto, (e) => handleFileChange(e, "memberPhoto"), () => setFormData((prev) => ({ ...prev, memberPhoto: null })), "Upload Photo")}</div>
                                <div><label className={labelClass}>ID Document</label>{renderFileUpload(formData.idDocumentFile, (e) => handleFileChange(e, "idDocumentFile"), () => setFormData((prev) => ({ ...prev, idDocumentFile: null })), "Upload Document")}</div>
                            </div>
                            <div>
                                <label className={labelClass}>Phone Number <span className="text-red-500">*</span></label>
                                <input ref={phoneInputRef} type="tel" name="phoneNumber" value={formData.phoneNumber} onChange={handleInputChange} required placeholder="e.g., 01712345678" className={errors.phoneNumber ? `${inputClass} border-red-500 focus:ring-red-500/20 focus:border-red-500` : inputClass} />
                                {errors.phoneNumber && <p className="text-red-500 text-xs mt-1">{errors.phoneNumber}</p>}
                            </div>
                            <div>
                                <label className={labelClass}>Email Address <span className="text-red-500">*</span></label>
                                <input ref={emailInputRef} type="email" name="emailAddress" value={formData.emailAddress} onChange={handleInputChange} required placeholder="e.g., rahim@example.com" className={errors.emailAddress ? `${inputClass} border-red-500 focus:ring-red-500/20 focus:border-red-500` : inputClass} />
                                {errors.emailAddress && <p className="text-red-500 text-xs mt-1">{errors.emailAddress}</p>}
                            </div>
                            <div><label className={labelClass}>Emergency Contact</label><input type="tel" name="emergencyContact" value={formData.emergencyContact} onChange={handleInputChange} placeholder="e.g., 01812345678" className={inputClass} /></div>
                            <div><label className={labelClass}>Emergency Contact Person Name</label><input type="text" name="emergencyContactName" value={formData.emergencyContactName} onChange={handleInputChange} placeholder="e.g., Brother" className={inputClass} /></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className={labelClass}>ID Type <span className="text-red-500">*</span></label><select name="idType" value={formData.idType} onChange={handleInputChange} required className={inputClass}><option value="">Select</option>{idTypes.map((id) => <option key={id} value={id}>{id}</option>)}</select></div>
                                <div>
                                    <label className={labelClass}>ID Number <span className="text-red-500">*</span></label>
                                    <input ref={idNumberInputRef} type="text" name="idNumber" value={formData.idNumber} onChange={handleInputChange} required placeholder="e.g., 1990123456789" className={errors.idNumber ? `${inputClass} border-red-500 focus:ring-red-500/20 focus:border-red-500` : inputClass} />
                                    {errors.idNumber && <p className="text-red-500 text-xs mt-1">{errors.idNumber}</p>}
                                </div>
                            </div>
                        </div>
                    </SectionCard>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-5 items-stretch">
                    <SectionCard color={sectionColors.bank} title="Bank Information" icon={<CreditCard className="w-5 h-5" />}>
                        <div className="space-y-3">
                            <div><label className={labelClass}>Account Name</label><input type="text" name="accountName" value={formData.accountName} onChange={handleInputChange} placeholder="e.g., Md. Rahim Uddin" className={inputClass} /></div>
                            <div><label className={labelClass}>Account Number</label><input type="text" name="accountNumber" value={formData.accountNumber} onChange={handleInputChange} placeholder="e.g., 1234567890123" className={inputClass} /></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className={labelClass}>Bank Name</label><input type="text" name="bankName" value={formData.bankName} onChange={handleInputChange} placeholder="e.g., Dutch-Bangla Bank" className={inputClass} /></div>
                                <div><label className={labelClass}>Branch</label><input type="text" name="branch" value={formData.branch} onChange={handleInputChange} placeholder="e.g., Motijheel" className={inputClass} /></div>
                            </div>
                            <div><label className={labelClass}>Routing Number</label><input type="text" name="routingNumber" value={formData.routingNumber} onChange={handleInputChange} placeholder="e.g., 090123456" className={inputClass} /></div>
                        </div>
                    </SectionCard>

                    <SectionCard color={sectionColors.residence} title="Residence Information" icon={<Home className="w-5 h-5" />}>
                        <div className="space-y-4">
                            <div className="border-b border-slate-200 dark:border-slate-700 pb-3 space-y-2">
                                <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Current Residence</h3>
                                <div>
                                    <label className={subLabelClass}>Address</label>
                                    <input type="text" name="currentAddress" value={formData.currentAddress} onChange={handleInputChange} placeholder="e.g., House 12, Road 5" className={inputClass} />
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div><label className={subLabelClass}>Post Office</label><input type="text" name="currentPostOffice" value={formData.currentPostOffice} onChange={handleInputChange} placeholder="e.g., Dhanmondi" className={inputClass} /></div>
                                    <div><label className={subLabelClass}>District</label><input type="text" name="currentDistrict" value={formData.currentDistrict} onChange={handleInputChange} placeholder="e.g., Dhaka" className={inputClass} /></div>
                                    <div><label className={subLabelClass}>Post Code</label><input type="text" name="currentPostCode" value={formData.currentPostCode} onChange={handleInputChange} placeholder="e.g., 1209" className={inputClass} /></div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Permanent Residence</h3>
                                <div>
                                    <label className={subLabelClass}>Address</label>
                                    <input type="text" name="permanentAddress" value={formData.permanentAddress} onChange={handleInputChange} placeholder="e.g., Village: Rampur" className={inputClass} />
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div><label className={subLabelClass}>Post Office</label><input type="text" name="permanentPostOffice" value={formData.permanentPostOffice} onChange={handleInputChange} placeholder="e.g., Sadar" className={inputClass} /></div>
                                    <div><label className={subLabelClass}>District</label><input type="text" name="permanentDistrict" value={formData.permanentDistrict} onChange={handleInputChange} placeholder="e.g., Faridpur" className={inputClass} /></div>
                                    <div><label className={subLabelClass}>Post Code</label><input type="text" name="permanentPostCode" value={formData.permanentPostCode} onChange={handleInputChange} placeholder="e.g., 7800" className={inputClass} /></div>
                                </div>
                            </div>
                        </div>
                    </SectionCard>
                </div>

                {/* Additional Documents Section (Full Width) */}
                <div className="grid grid-cols-1 gap-x-6 gap-y-5 items-stretch">
                    <SectionCard color={sectionColors.docs} title="Additional Documents" icon={<FileText className="w-5 h-5" />}>
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm text-slate-500 dark:text-slate-400">Upload supporting documents (e.g., TIN Certificate, Trade License)</span>
                            <button type="button" onClick={addAdditionalDocument} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"><Plus className="w-4 h-4" /> Add Document</button>
                        </div>
                        {formData.additionalDocuments.length === 0 ? (
                            <div className="text-center py-8 text-slate-400 dark:text-slate-500"><FileText className="w-12 h-12 mx-auto mb-2 opacity-50" /><p>No additional documents added</p></div>
                        ) : (
                            <div className="space-y-3">
                                {formData.additionalDocuments.map((doc) => (
                                    <div key={doc.id} className="flex flex-wrap items-end gap-3 border-b border-slate-200 dark:border-slate-700 pb-3">
                                        <div className="flex-1 min-w-[150px]">
                                            <label className={labelClass}>Document Name</label>
                                            <input type="text" value={doc.name} onChange={(e) => updateAdditionalDocument(doc.id, "name", e.target.value)} placeholder="e.g., TIN Certificate" className={inputClass} />
                                        </div>
                                        <div className="flex-1 min-w-[200px]">
                                            <label className={labelClass}>File</label>
                                            {renderFileUpload(doc.file, (e) => updateAdditionalDocument(doc.id, "file", e.target.files?.[0] || null), () => updateAdditionalDocument(doc.id, "file", null), "Upload File")}
                                        </div>
                                        <button type="button" onClick={() => removeAdditionalDocument(doc.id)} className="text-red-500 p-1 mt-1"><Trash2 className="w-5 h-5" /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </SectionCard>
                </div>

                {/* Nominees Section (Full Width - Same as Additional Docs) */}
                <div className="grid grid-cols-1 gap-x-6 gap-y-5 items-stretch">
                    <SectionCard color={sectionColors.nominees} title="Registered Nominees" icon={<Users className="w-5 h-5" />}>
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm text-slate-500 dark:text-slate-400">Add your nominees</span>
                            <button type="button" onClick={() => setShowNomineeModal(true)} className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"><Plus className="w-4 h-4" /> Add Nominee</button>
                        </div>
                        {formData.nominees.length === 0 ? (
                            <div className="text-center py-8 text-slate-400 dark:text-slate-500"><Users className="w-12 h-12 mx-auto mb-2 opacity-50" /><p>No nominees registered</p></div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {formData.nominees.map((nominee) => (
                                    <div key={nominee.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-950">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h4 className="font-medium text-slate-900 dark:text-white">{nominee.name}</h4>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">{nominee.relation} ({nominee.share}%)</p>
                                            </div>
                                            <button type="button" onClick={() => deleteNominee(nominee.id)} className="text-slate-400 hover:text-red-500 p-1"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </SectionCard>
                </div>

                <div className="mt-8 flex flex-col sm:flex-row sm:justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-700">
                    <Link href="/login" className="w-full sm:w-auto">
                        <button type="button" className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium">Cancel</button>
                    </Link>
                    <button type="submit" disabled={loading} className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium shadow-md disabled:opacity-50">
                        {loading ? "Submitting..." : <><CheckCircle className="w-4 h-4" /> Submit Application</>}
                    </button>
                </div>
            </div>

            {/* Right Column: Completion Status (1/5 width - Narrower) */}
            <div className="lg:col-span-1">
                <div className="sticky top-8 bg-white dark:bg-slate-900 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-6">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Completion Status</h3>
                    <div className="flex flex-col items-center justify-center mb-6">
                        <div className="relative w-24 h-24">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                <path className="text-slate-200 dark:text-slate-700" stroke="currentColor" strokeWidth="3" fill="none" d="M18 2.5a15.5 15.5 0 1 1 0 31 15.5 15.5 0 0 1 0-31" />
                                <path className="text-indigo-600 dark:text-indigo-400 transition-all duration-500" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" strokeDasharray={`${progress}, 100`} d="M18 2.5a15.5 15.5 0 1 1 0 31 15.5 15.5 0 0 1 0-31" />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-xl font-bold text-slate-900 dark:text-white">{progress}%</span>
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{completedSteps} of {steps.length} steps completed</p>
                    </div>
                    <div className="space-y-3">
                        {steps.map((step, index) => (
                            <div key={index} className="flex items-center gap-3">
                                {step.complete ? (
                                    <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                                ) : (
                                    <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600 shrink-0" />
                                )}
                                <span className={`text-sm ${step.complete ? 'text-slate-900 dark:text-white font-medium' : 'text-slate-500 dark:text-slate-400'}`}>{step.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {showNomineeModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Add Nominee</h3>
                            <button type="button" onClick={() => setShowNomineeModal(false)} className="text-slate-400 dark:text-slate-500"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="space-y-3">
                            <div><label className={labelClass}>Full Name *</label><input type="text" name="name" value={nomineeForm.name} onChange={handleNomineeInputChange} placeholder="e.g., Mrs. Salma" className={inputClass} /></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className={labelClass}>Relation *</label><input type="text" name="relation" value={nomineeForm.relation} onChange={handleNomineeInputChange} placeholder="e.g., Wife" className={inputClass} /></div>
                                <div><label className={labelClass}>Share % *</label><input type="text" name="share" value={nomineeForm.share} onChange={handleNomineeInputChange} placeholder="e.g., 100" className={inputClass} /></div>
                            </div>
                            <div><label className={labelClass}>Nominee Phone</label><input type="tel" name="phone" value={nomineeForm.phone} onChange={handleNomineeInputChange} placeholder="e.g., 01812345678" className={inputClass} /></div>
                            <div><label className={labelClass}>Nominee Photo</label>{renderFileUpload(nomineeForm.photo, (e) => handleNomineeFileChange(e, "photo"), () => setNomineeForm((prev) => ({ ...prev, photo: null })), "Upload Photo")}</div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className={labelClass}>ID Type</label><select name="idType" value={nomineeForm.idType} onChange={handleNomineeInputChange} className={inputClass}><option value="nid">National ID</option><option value="birthCert">Birth Certificate</option><option value="passport">Passport</option></select></div>
                                <div><label className={labelClass}>ID Number</label><input type="text" name="idNumber" value={nomineeForm.idNumber} onChange={handleNomineeInputChange} placeholder="e.g., 1990123456789" className={inputClass} /></div>
                            </div>
                            <div><label className={labelClass}>ID Document (Upload)</label>{renderFileUpload(nomineeForm.idDocumentFile, (e) => handleNomineeFileChange(e, "idDocumentFile"), () => setNomineeForm((prev) => ({ ...prev, idDocumentFile: null })), "Upload Nominee ID Document")}</div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <button type="button" onClick={() => setShowNomineeModal(false)} className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-200">Cancel</button>
                            <button type="button" onClick={addNominee} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">Add Nominee</button>
                        </div>
                    </div>
                </div>
            )}
        </form>
    )
}