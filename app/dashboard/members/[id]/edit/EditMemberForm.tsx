"use client"

import React, { useState } from "react"
import { updateMember } from "@/app/actions/member"
import Link from "next/link"
import {
    User, Calendar as CalendarIcon, Phone, Mail, MapPin, Home, Building,
    Banknote, CreditCard, FileText, Users, Upload, X, Plus, Trash2,
    CheckCircle, ChevronRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"

type Nominee = { id: string; dbId?: string; name: string; relation: string; share: string; phone: string; idType: "nid" | "birthCert" | "passport"; idNumber: string; idDocumentFile: File | null; photo: File | null; }
type AdditionalDocument = { id: string; name: string; file: File | null; }

type FormData = {
    memberStatus: "active" | "inactive"; memberNo: string; joinedDate: string; kycVerified: boolean;
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

function SectionCard({ color, children, title, icon }: { color: typeof sectionColors.personal, children: React.ReactNode, title: string, icon: React.ReactNode }) {
    return (
        <div className={`rounded-xl shadow-md border ${color.bg} ${color.border} border-t-4 ${color.topBorder} h-full flex flex-col`}>
            <div className={`${color.header} ${color.text} px-6 py-3 rounded-t-xl flex items-center gap-2 shrink-0`}>
                {icon}<h2 className="text-lg font-semibold">{title}</h2>
            </div>
            <div className="p-6 flex-grow">{children}</div>
        </div>
    )
}

function EnterpriseDatePicker({ value, onChange }: { value: string, onChange: (val: string) => void }) {
    return (
        <input 
            type="date" 
            value={value} 
            onChange={(e) => onChange(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
        />
    )
}

export default function EditMemberForm({ member }: { member: any }) {
    const currentAddr = member.addresses?.find((a: any) => a.addressType === "CURRENT") || {}
    const permanentAddr = member.addresses?.find((a: any) => a.addressType === "PERMANENT") || {}

    const [formData, setFormData] = useState<FormData>({
        // Member Status & KYC
        memberStatus: ((member.status?.toLowerCase() || "active") as any), 
        memberNo: member.memberNo || "", 
        joinedDate: member.membershipDate ? new Date(member.membershipDate).toISOString().split('T')[0] : "", 
        kycVerified: member.kycVerified || false, // <-- LOADING KYC STATUS HERE
        
        // Personal
        firstName: member.firstName || "", lastName: member.lastName || "", fatherName: member.fatherName || "", motherName: member.motherName || "", spouseName: member.spouseName || "",
        dateOfBirth: member.dateOfBirth ? new Date(member.dateOfBirth).toISOString().split('T')[0] : "", 
        gender: (member.gender || "male").toLowerCase() as any, religion: member.religion || "", nationality: member.nationality || "Bangladeshi",
        bloodGroup: member.bloodGroup || "", profession: member.profession || "", maritalStatus: (member.maritalStatus || "unmarried").toLowerCase() as any, marriageDate: member.marriageDate ? new Date(member.marriageDate).toISOString().split('T')[0] : "",
        
        // Contact
        phoneNumber: member.phone || "", emailAddress: member.email || "", emergencyContact: member.emergencyPhone || "", emergencyContactName: member.emergencyContactName || "",
        idType: member.nidNumber ? "National ID" : member.passportNumber ? "Passport" : "National ID", idNumber: member.nidNumber || member.passportNumber || member.birthCertificateNo || "", idDocumentFile: null, memberPhoto: null,
        
        // Bank
        accountName: member.accountName || "", accountNumber: member.accountNumber || "", bankName: member.bankName || "", branch: member.branch || "", routingNumber: member.routingNumber || "",
        
        // Addresses
        currentAddress: currentAddr.village || "", currentPostOffice: currentAddr.postOffice || "", currentDistrict: currentAddr.district || "", currentPostCode: currentAddr.postalCode || "",
        permanentAddress: permanentAddr.village || "", permanentPostOffice: permanentAddr.postOffice || "", permanentDistrict: permanentAddr.district || "", permanentPostCode: permanentAddr.postalCode || "",
        
        // Docs & Nominees
        additionalDocuments: [], 
        nominees: member.nominees?.map((n: any) => ({ id: `nom-${n.id}`, dbId: n.id, name: n.name, relation: n.relation, share: String(n.sharePercentage), phone: n.phone || "", idType: n.idType || "nid", idNumber: n.nidNumber || "", idDocumentFile: null, photo: null })) || [],
    })

    const [nomineeIdCounter, setNomineeIdCounter] = useState(formData.nominees.length + 1)
    const [showNomineeModal, setShowNomineeModal] = useState(false)
    const [editingNomineeId, setEditingNomineeId] = useState<string | null>(null)
    const [nomineeForm, setNomineeForm] = useState<Omit<Nominee, "id">>({ name: "", relation: "", share: "", phone: "", idType: "nid", idNumber: "", idDocumentFile: null, photo: null })
    const [additionalDocCounter, setAdditionalDocCounter] = useState(1)
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [submitAttempted, setSubmitAttempted] = useState(false)
    const [nomineeError, setNomineeError] = useState<string>("")

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target
        if (type === "checkbox") {
            const checked = (e.target as HTMLInputElement).checked
            setFormData((prev) => ({ ...prev, [name]: checked }))
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }))
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
        if (!nomineeForm.name || !nomineeForm.relation || !nomineeForm.share) { setNomineeError("Please fill in all required nominee fields."); return }
        const newNominee: Nominee = { id: `nom-${nomineeIdCounter}`, ...nomineeForm }
        setFormData((prev) => ({ ...prev, nominees: [...prev.nominees, newNominee] }))
        setNomineeIdCounter((prev) => prev + 1)
        setNomineeForm({ name: "", relation: "", share: "", phone: "", idType: "nid", idNumber: "", idDocumentFile: null, photo: null })
        setShowNomineeModal(false)
    }

    const editNominee = (id: string) => {
        const nominee = formData.nominees.find((n) => n.id === id)
        if (nominee) { setNomineeForm({ name: nominee.name, relation: nominee.relation, share: nominee.share, phone: nominee.phone, idType: nominee.idType, idNumber: nominee.idNumber, idDocumentFile: nominee.idDocumentFile, photo: nominee.photo }); setEditingNomineeId(id); setShowNomineeModal(true) }
    }

    const updateNominee = () => {
        if (!nomineeForm.name || !nomineeForm.relation || !nomineeForm.share) { setNomineeError("Please fill in all required nominee fields."); return }
        setFormData((prev) => ({ ...prev, nominees: prev.nominees.map((n) => n.id === editingNomineeId ? { ...n, ...nomineeForm } : n) }))
        setNomineeForm({ name: "", relation: "", share: "", phone: "", idType: "nid", idNumber: "", idDocumentFile: null, photo: null })
        setShowNomineeModal(false)
        setEditingNomineeId(null)
    }

    const deleteNominee = (id: string) => {
        if (confirm("Are you sure you want to remove this nominee?")) {
            setFormData((prev) => ({ ...prev, nominees: prev.nominees.filter((n) => n.id !== id) }))
        }
    }

    const resetNomineeForm = () => { setNomineeForm({ name: "", relation: "", share: "", phone: "", idType: "nid", idNumber: "", idDocumentFile: null, photo: null }); setEditingNomineeId(null) }

    const validateForm = () => {
        const newErrors: Record<string, string> = {}
        if (!formData.firstName) newErrors.firstName = "Required"
        if (!formData.lastName) newErrors.lastName = "Required"
        if (!formData.phoneNumber) newErrors.phoneNumber = "Required"
        if (!formData.idType) newErrors.idType = "Required"
        if (!formData.idNumber) newErrors.idNumber = "Required"
        setErrors(newErrors)
        return newErrors
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitAttempted(true)
        const formErrors = validateForm()
        if (Object.keys(formErrors).length === 0) {
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
            
            // Added the missing status fields here
            fd.append("joinedDate", formData.joinedDate)
            fd.append("memberStatus", formData.memberStatus)
            fd.append("kycVerified", formData.kycVerified ? "on" : "off")
            
            if (formData.memberPhoto) fd.append("memberPhoto", formData.memberPhoto)
            if (formData.idDocumentFile) fd.append("idDocument", formData.idDocumentFile)
            
            formData.additionalDocuments.forEach((doc, i) => { 
                if (doc.name) fd.append(`doc_${i}_name`, doc.name)
                if (doc.file) fd.append(`doc_${i}_file`, doc.file)
            })
            
            formData.nominees.forEach((nom, i) => {
                fd.append(`nom_${i}_name`, nom.name)
                fd.append(`nom_${i}_relation`, nom.relation)
                fd.append(`nom_${i}_share`, nom.share)
                fd.append(`nom_${i}_phone`, nom.phone || "")
                fd.append(`nom_${i}_idType`, nom.idType)
                fd.append(`nom_${i}_idNumber`, nom.idNumber)
                if (nom.dbId) fd.append(`nom_${i}_dbId`, nom.dbId)
                if (nom.idDocumentFile) fd.append(`nom_${i}_idDoc`, nom.idDocumentFile)
                if (nom.photo) fd.append(`nom_${i}_photo`, nom.photo)
            })
            
            await updateMember(member.id, fd)
        } else {
            alert("Please fill all required fields correctly before submitting.")
        }
    }

    const renderFileUpload = (file: File | null, onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void, onRemove: () => void, label: string, existingUrl?: string) => {
        return (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-indigo-600 transition-colors">
                {file ? (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-indigo-600" />
                            <span className="text-sm text-gray-700 truncate max-w-[150px]">{file.name}</span>
                        </div>
                        <button type="button" onClick={onRemove} className="text-red-500 hover:text-red-700"><X className="w-4 h-4" /></button>
                    </div>
                ) : existingUrl ? (
                    <div className="flex flex-col items-center justify-center">
                        <a href={existingUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 underline mb-2">View Current File</a>
                        <label className="cursor-pointer text-sm text-gray-500 hover:text-indigo-600">Replace File<input type="file" className="hidden" accept="image/*,.pdf" onChange={onFileChange} /></label>
                    </div>
                ) : (
                    <label className="flex flex-col items-center justify-center cursor-pointer">
                        <Upload className="w-8 h-8 text-gray-400 mb-1" />
                        <span className="text-sm text-gray-500">{label}</span>
                        <input type="file" className="hidden" accept="image/*,.pdf" onChange={onFileChange} />
                    </label>
                )}
            </div>
        )
    }

    return (
        <div className="w-full">
            <nav className="flex items-center text-sm text-gray-500 mb-4">
                <Link href="/dashboard" className="hover:text-indigo-600 transition-colors">Dashboard</Link>
                <ChevronRight className="h-4 w-4 mx-1 text-gray-400" />
                <Link href="/dashboard/members" className="hover:text-indigo-600 transition-colors">Member Panel</Link>
                <ChevronRight className="h-4 w-4 mx-1 text-gray-400" />
                <Link href={`/dashboard/members/${member.id}`} className="hover:text-indigo-600 transition-colors">Profile</Link>
                <ChevronRight className="h-4 w-4 mx-1 text-gray-400" />
                <span className="text-gray-900 dark:text-white font-medium">Edit Member</span>
            </nav>

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 bg-white rounded-xl shadow-md p-6 border-l-4 border-indigo-600">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Edit Member Details</h1>
                    <p className="text-gray-500 mt-1 text-sm">Update the fields below. Only uploaded files will replace existing ones.</p>
                </div>
                <div className="flex gap-2">
                    <Link href={`/dashboard/members/${member.id}`}><button type="button" className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium">Cancel</button></Link>
                    <button type="submit" form="memberForm" className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm font-medium shadow-md"><CheckCircle className="w-4 h-4" /> Save Changes</button>
                </div>
            </div>

            <form id="memberForm" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-6">
                <div className="lg:col-span-12 space-y-6">
                    
                    {/* Member Status Card */}
                    <Card className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                        <div className="flex flex-wrap items-center gap-6">
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-slate-300">
                                <span className="w-20">Status</span>
                                <select name="memberStatus" value={formData.memberStatus} onChange={handleInputChange} className="border border-gray-300 dark:border-slate-700 dark:bg-slate-950 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none">
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </label>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-slate-300">
                                <CalendarIcon className="w-4 h-4 text-gray-400" />
                                <span className="w-16">Joined</span>
                                <div className="w-40"><EnterpriseDatePicker value={formData.joinedDate} onChange={(val) => setFormData(prev => ({ ...prev, joinedDate: val }))} /></div>
                            </label>
                            {/* KYC Verified Checkbox - Bound to State */}
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-slate-300 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    name="kycVerified" 
                                    checked={formData.kycVerified} 
                                    onChange={(e) => setFormData({ ...formData, kycVerified: e.target.checked })} 
                                    className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500" 
                                />
                                KYC Verified
                            </label>
                        </div>
                    </Card>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-6 items-stretch">
                        {/* Personal Information */}
                        <SectionCard color={sectionColors.personal} title="Personal Information" icon={<User className="w-5 h-5" />}>
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">First Name <span className="text-red-500">*</span></label><input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} className={`w-full border ${errors.firstName && submitAttempted ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none`} /></div>
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Last Name <span className="text-red-500">*</span></label><input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} className={`w-full border ${errors.lastName && submitAttempted ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none`} /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Father's Name</label><input type="text" name="fatherName" value={formData.fatherName} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" /></div>
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Mother's Name</label><input type="text" name="motherName" value={formData.motherName} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" /></div>
                                </div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Spouse Name</label><input type="text" name="spouseName" value={formData.spouseName} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" /></div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label><EnterpriseDatePicker value={formData.dateOfBirth} onChange={(val) => setFormData(prev => ({ ...prev, dateOfBirth: val }))} /></div>
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Gender</label><select name="gender" value={formData.gender} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none">{genders.map((g) => <option key={g} value={g.toLowerCase()}>{g}</option>)}</select></div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Marital Status</label><select name="maritalStatus" value={formData.maritalStatus} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none">{maritalStatuses.map((m) => <option key={m} value={m.toLowerCase()}>{m}</option>)}</select></div>
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Marriage Date</label><EnterpriseDatePicker value={formData.marriageDate} onChange={(val) => setFormData(prev => ({ ...prev, marriageDate: val }))} /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Religion</label><select name="religion" value={formData.religion} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"><option value="">Select</option>{religions.map((r) => <option key={r} value={r}>{r}</option>)}</select></div>
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Nationality</label><input type="text" name="nationality" value={formData.nationality} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Blood Group</label><select name="bloodGroup" value={formData.bloodGroup} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"><option value="">Select</option>{bloodGroups.map((bg) => <option key={bg} value={bg}>{bg}</option>)}</select></div>
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Profession</label><input type="text" name="profession" value={formData.profession} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" /></div>
                                </div>
                            </div>
                        </SectionCard>

                        {/* Contact, Photo & ID */}
                        <SectionCard color={sectionColors.contact} title="Contact, Photo & ID" icon={<Phone className="w-5 h-5" />}>
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Member Photo</label>{renderFileUpload(formData.memberPhoto, (e) => handleFileChange(e, "memberPhoto"), () => setFormData((prev) => ({ ...prev, memberPhoto: null })), "Upload Member Photo", member.photoUrl)}</div>
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">ID Document</label>{renderFileUpload(formData.idDocumentFile, (e) => handleFileChange(e, "idDocumentFile"), () => setFormData((prev) => ({ ...prev, idDocumentFile: null })), "Upload ID Document", member.documents?.find((d:any) => d.documentType === formData.idType)?.fileUrl)}</div>
                                </div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone Number <span className="text-red-500">*</span></label><input type="tel" name="phoneNumber" value={formData.phoneNumber} onChange={handleInputChange} className={`w-full border ${errors.phoneNumber && submitAttempted ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none`} /></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label><input type="email" name="emailAddress" value={formData.emailAddress} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" /></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact</label><input type="tel" name="emergencyContact" value={formData.emergencyContact} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" /></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact Person Name</label><input type="text" name="emergencyContactName" value={formData.emergencyContactName} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" /></div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">ID Type <span className="text-red-500">*</span></label><select name="idType" value={formData.idType} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none">{idTypes.map((id) => <option key={id} value={id}>{id}</option>)}</select></div>
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">ID Number <span className="text-red-500">*</span></label><input type="text" name="idNumber" value={formData.idNumber} onChange={handleInputChange} className={`w-full border ${errors.idNumber && submitAttempted ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none`} /></div>
                                </div>
                            </div>
                        </SectionCard>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-6 items-stretch">
                        <SectionCard color={sectionColors.bank} title="Bank Information" icon={<CreditCard className="w-5 h-5" />}>
                            <div className="space-y-3">
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label><input type="text" name="accountName" value={formData.accountName} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" /></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label><input type="text" name="accountNumber" value={formData.accountNumber} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" /></div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label><input type="text" name="bankName" value={formData.bankName} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" /></div>
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Branch</label><input type="text" name="branch" value={formData.branch} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" /></div>
                                </div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Routing Number</label><input type="text" name="routingNumber" value={formData.routingNumber} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" /></div>
                            </div>
                        </SectionCard>

                        <SectionCard color={sectionColors.residence} title="Residence Information" icon={<Home className="w-5 h-5" />}>
                            <div className="space-y-4">
                                <div className="border-b border-gray-200 pb-3 space-y-2">
                                    <h3 className="text-sm font-medium text-gray-700">Current Residence</h3>
                                    <input type="text" name="currentAddress" value={formData.currentAddress} onChange={handleInputChange} placeholder="Address" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2" />
                                    <div className="grid grid-cols-3 gap-2">
                                        <input type="text" name="currentPostOffice" value={formData.currentPostOffice} onChange={handleInputChange} placeholder="Post Office" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                                        <input type="text" name="currentDistrict" value={formData.currentDistrict} onChange={handleInputChange} placeholder="District" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                                        <input type="text" name="currentPostCode" value={formData.currentPostCode} onChange={handleInputChange} placeholder="Post Code" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-gray-700">Permanent Residence</h3>
                                    <input type="text" name="permanentAddress" value={formData.permanentAddress} onChange={handleInputChange} placeholder="Address" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-2" />
                                    <div className="grid grid-cols-3 gap-2 mt-2">
                                        <input type="text" name="permanentPostOffice" value={formData.permanentPostOffice} onChange={handleInputChange} placeholder="Post Office" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                                        <input type="text" name="permanentDistrict" value={formData.permanentDistrict} onChange={handleInputChange} placeholder="District" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                                        <input type="text" name="permanentPostCode" value={formData.permanentPostCode} onChange={handleInputChange} placeholder="Post Code" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                                    </div>
                                </div>
                            </div>
                        </SectionCard>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-6 items-stretch">
                        <SectionCard color={sectionColors.docs} title="Additional Documents" icon={<FileText className="w-5 h-5" />}>
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-sm text-gray-500">Upload supporting documents</span>
                                <button type="button" onClick={addAdditionalDocument} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"><Plus className="w-4 h-4" /> Add Document</button>
                            </div>
                            {formData.additionalDocuments.length === 0 ? (
                                <div className="text-center py-8 text-gray-400"><FileText className="w-12 h-12 mx-auto mb-2 opacity-50" /><p>No additional documents added</p></div>
                            ) : (
                                <div className="space-y-3">
                                    {formData.additionalDocuments.map((doc) => (
                                        <div key={doc.id} className="flex flex-wrap items-end gap-3 border-b border-gray-200 pb-3">
                                            <div className="flex-1 min-w-[150px]">
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Document Name</label>
                                                <input type="text" value={doc.name} onChange={(e) => updateAdditionalDocument(doc.id, "name", e.target.value)} placeholder="e.g., TIN Certificate" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                                            </div>
                                            <div className="flex-1 min-w-[200px]">
                                                <label className="block text-sm font-medium text-gray-700 mb-1">File</label>
                                                {renderFileUpload(doc.file, (e) => updateAdditionalDocument(doc.id, "file", e.target.files?.[0] || null), () => updateAdditionalDocument(doc.id, "file", null), "Upload File")}
                                            </div>
                                            <button type="button" onClick={() => removeAdditionalDocument(doc.id)} className="text-red-500 p-1 mt-1"><Trash2 className="w-5 h-5" /></button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </SectionCard>

                        <SectionCard color={sectionColors.nominees} title="Registered Nominees" icon={<Users className="w-5 h-5" />}>
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-sm text-gray-500">Update nominees</span>
                                <button type="button" onClick={() => { resetNomineeForm(); setShowNomineeModal(true); setEditingNomineeId(null); }} className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"><Plus className="w-4 h-4" /> Add Nominee</button>
                            </div>
                            {formData.nominees.length === 0 ? (
                                <div className="text-center py-8 text-gray-400"><Users className="w-12 h-12 mx-auto mb-2 opacity-50" /><p>No nominees registered</p></div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {formData.nominees.map((nominee) => (
                                        <div key={nominee.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h4 className="font-medium text-gray-900">{nominee.name}</h4>
                                                    <p className="text-sm text-gray-500">{nominee.relation} ({nominee.share}%)</p>
                                                </div>
                                                <div className="flex gap-1">
                                                    <button type="button" onClick={() => editNominee(nominee.id)} className="text-gray-400 hover:text-indigo-600 p-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                                                    <button type="button" onClick={() => deleteNominee(nominee.id)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 className="w-4 h-4" /></button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </SectionCard>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                        <Link href={`/dashboard/members/${member.id}`}><button type="button" className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium">Cancel</button></Link>
                        <button type="submit" form="memberForm" className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm font-medium shadow-md"><CheckCircle className="w-4 h-4" /> Save Changes</button>
                    </div>
                </div>
            </form>

            {showNomineeModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-md w-full p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{editingNomineeId ? "Edit Nominee" : "Add Nominee"}</h3>
                            <button type="button" onClick={() => { setShowNomineeModal(false); resetNomineeForm(); }} className="text-gray-400"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="space-y-3">
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label><input type="text" name="name" value={nomineeForm.name} onChange={handleNomineeInputChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Relation *</label><input type="text" name="relation" value={nomineeForm.relation} onChange={handleNomineeInputChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Share % *</label><input type="text" name="share" value={nomineeForm.share} onChange={handleNomineeInputChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
                            </div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Nominee Phone</label><input type="tel" name="phone" value={nomineeForm.phone} onChange={handleNomineeInputChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">Nominee Photo</label>{renderFileUpload(nomineeForm.photo, (e) => handleNomineeFileChange(e, "photo"), () => setNomineeForm((prev) => ({ ...prev, photo: null })), "Upload Photo")}</div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">ID Type</label><select name="idType" value={nomineeForm.idType} onChange={handleNomineeInputChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"><option value="nid">National ID</option><option value="birthCert">Birth Certificate</option><option value="passport">Passport</option></select></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">ID Number</label><input type="text" name="idNumber" value={nomineeForm.idNumber} onChange={handleNomineeInputChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
                            </div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-1">ID Document (Upload)</label>{renderFileUpload(nomineeForm.idDocumentFile, (e) => handleNomineeFileChange(e, "idDocumentFile"), () => setNomineeForm((prev) => ({ ...prev, idDocumentFile: null })), "Upload Nominee ID Document")}</div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                            <button type="button" onClick={() => { setShowNomineeModal(false); resetNomineeForm(); }} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
                            <button type="button" onClick={editingNomineeId ? updateNominee : addNominee} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">{editingNomineeId ? "Update" : "Add"}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}