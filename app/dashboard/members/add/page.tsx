"use client";

import React, { useState, useEffect, useMemo } from "react";
import { addMember } from "@/app/actions/member";
import Link from "next/link";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
    User,
    Calendar as CalendarIcon,
    Phone,
    Mail,
    MapPin,
    Home,
    Building,
    Banknote,
    CreditCard,
    FileText,
    Users,
    Upload,
    X,
    Plus,
    Trash2,
    CheckCircle,
    AlertCircle,
    ChevronRight,
    Circle,
} from "lucide-react";

// ... [Types and Constants remain the same] ...
type Nominee = {
    id: string;
    name: string;
    relation: string;
    share: string;
    idType: "nid" | "birthCert" | "passport";
    idNumber: string;
    idDocumentFile: File | null;
};

type AdditionalDocument = {
    id: string;
    name: string;
    file: File | null;
};

type FormData = {
    memberStatus: "active" | "inactive";
    memberNo: string;
    joinedDate: string;
    kycVerified: boolean;
    firstName: string;
    lastName: string;
    fatherName: string;
    motherName: string;
    spouseName: string;
    dateOfBirth: string;
    gender: "male" | "female" | "other";
    religion: string;
    nationality: string;
    bloodGroup: string;
    profession: string;
    phoneNumber: string;
    emailAddress: string;
    emergencyContact: string;
    idType: string;
    idNumber: string;
    idDocumentFile: File | null;
    maritalStatus: "married" | "unmarried" | "divorced" | "widowed";
    marriageDate: string;
    accountName: string;
    accountNumber: string;
    bankName: string;
    branch: string;
    routingNumber: string;
    currentAddress: string;
    currentPostOffice: string;
    currentDistrict: string;
    currentPostCode: string;
    permanentAddress: string;
    permanentPostOffice: string;
    permanentDistrict: string;
    permanentPostCode: string;
    additionalDocuments: AdditionalDocument[];
    nominees: Nominee[];
};

const initialFormData: FormData = {
    memberStatus: "active",
    memberNo: "",
    joinedDate: "",
    kycVerified: false,
    firstName: "",
    lastName: "",
    fatherName: "",
    motherName: "",
    spouseName: "",
    dateOfBirth: "",
    gender: "male",
    religion: "",
    nationality: "Bangladeshi",
    bloodGroup: "",
    profession: "",
    phoneNumber: "",
    emailAddress: "",
    emergencyContact: "",
    idType: "",
    idNumber: "",
    idDocumentFile: null,
    maritalStatus: "unmarried",
    marriageDate: "",
    accountName: "",
    accountNumber: "",
    bankName: "",
    branch: "",
    routingNumber: "",
    currentAddress: "",
    currentPostOffice: "",
    currentDistrict: "",
    currentPostCode: "",
    permanentAddress: "",
    permanentPostOffice: "",
    permanentDistrict: "",
    permanentPostCode: "",
    additionalDocuments: [],
    nominees: [],
};

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const religions = ["Islam", "Hinduism", "Christianity", "Buddhism", "Other"];
const genders = ["Male", "Female", "Other"];
const maritalStatuses = ["Married", "Unmarried", "Divorced", "Widowed"];
const districts = ["Dhaka", "Sylhet", "Chittagong", "Rajshahi", "Khulna", "Barisal", "Rangpur", "Mymensingh"];
const banks = ["Dutch-Bangla Bank", "BRAC Bank", "City Bank", "Eastern Bank", "Dhaka Bank", "Islami Bank", "Standard Chartered", "HSBC"];
const idTypes = ["National ID", "Passport", "Birth Certificate", "Driving License"];

const requiredFields: (keyof FormData)[] = [
    "firstName", "lastName", "dateOfBirth", "gender",
    "phoneNumber", "emailAddress", "idType", "idNumber",
    "maritalStatus", "accountName", "accountNumber", "bankName",
    "currentAddress", "currentDistrict", "permanentAddress", "permanentDistrict",
];

const sectionColors = {
    personal: { bg: "bg-blue-50", border: "border-blue-200", header: "bg-blue-600", text: "text-white", topBorder: "border-t-blue-600" },
    contact: { bg: "bg-green-50", border: "border-green-200", header: "bg-green-600", text: "text-white", topBorder: "border-t-green-600" },
    bank: { bg: "bg-yellow-50", border: "border-yellow-200", header: "bg-yellow-600", text: "text-white", topBorder: "border-t-yellow-600" },
    residence: { bg: "bg-gray-50", border: "border-gray-300", header: "bg-gray-600", text: "text-white", topBorder: "border-t-gray-600" },
    docs: { bg: "bg-blue-50", border: "border-blue-200", header: "bg-blue-500", text: "text-white", topBorder: "border-t-blue-500" },
    nominees: { bg: "bg-green-50", border: "border-green-200", header: "bg-green-500", text: "text-white", topBorder: "border-t-green-500" },
};

function SectionCard({ color, children, title, icon }: { color: typeof sectionColors.personal, children: React.ReactNode, title: string, icon: React.ReactNode }) {
    return (
        <div className={`rounded-xl shadow-md border ${color.bg} ${color.border} border-t-4 ${color.topBorder} h-full`}>
            <div className={`${color.header} ${color.text} px-6 py-3 rounded-t-xl flex items-center gap-2`}>
                {icon}
                <h2 className="text-lg font-semibold">{title}</h2>
            </div>
            <div className="p-6">{children}</div>
        </div>
    );
}

// Enterprise Date Picker Component with Year/Month Dropdowns
// Fast Native Date Picker
function EnterpriseDatePicker({ value, onChange, hasError }: { value: string, onChange: (val: string) => void, hasError?: boolean }) {
    return (
        <input 
            type="date" 
            value={value} 
            onChange={(e) => onChange(e.target.value)}
            className={`w-full border ${hasError ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white`}
        />
    );
}
export default function MemberAddPage() {
    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [nomineeIdCounter, setNomineeIdCounter] = useState(1);
    const [showNomineeModal, setShowNomineeModal] = useState(false);
    const [editingNomineeId, setEditingNomineeId] = useState<string | null>(null);
    const [nomineeForm, setNomineeForm] = useState<Omit<Nominee, "id">>({
        name: "", relation: "", share: "", idType: "nid", idNumber: "", idDocumentFile: null,
    });
    const [additionalDocCounter, setAdditionalDocCounter] = useState(1);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitAttempted, setSubmitAttempted] = useState(false);
    const [nomineeError, setNomineeError] = useState<string>("");

    // Dynamic Steps Tracker
    const steps = useMemo(() => [
        { name: "Personal Information", complete: !!(formData.firstName && formData.lastName && formData.dateOfBirth && formData.gender) },
        { name: "Contact & ID", complete: !!(formData.phoneNumber && formData.emailAddress && formData.idType && formData.idNumber) },
        { name: "Bank Details", complete: !!(formData.accountName && formData.accountNumber && formData.bankName) },
        { name: "Address Info", complete: !!(formData.currentAddress && formData.currentDistrict && formData.permanentAddress && formData.permanentDistrict) },
        { name: "Documents", complete: !!formData.idDocumentFile },
        { name: "Nominees", complete: formData.nominees.length > 0 },
    ], [formData]);

    const completedSteps = steps.filter(s => s.complete).length;
    const progress = Math.round((completedSteps / steps.length) * 100);

    // Validation functions
    const validateMobile = (phone: string) => {
        const digits = phone.replace(/\D/g, "");
        return digits.length === 11;
    };

    const validateEmail = (email: string) => {
        if (!email) return true;
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    };

    const validateIdNumber = (idType: string, idNumber: string) => {
        if (!idNumber) return false;
        const digits = idNumber.replace(/\D/g, "");
        if (idType === "National ID") return digits.length === 10 || digits.length === 13 || digits.length === 17;
        if (idType === "Passport") return idNumber.length >= 6;
        if (idType === "Birth Certificate") return digits.length === 17;
        if (idType === "Driving License") return idNumber.length > 5;
        return true;
    };

    const validateNomineeShares = (nominees: Nominee[]): string | null => {
        if (nominees.length === 0) return null;
        let total = 0;
        for (const n of nominees) {
            const s = parseFloat(n.share);
            if (isNaN(s) || s <= 0) return `Share for "${n.name}" must be a positive number.`;
            total += s;
        }
        if (total > 100) return `Total nominee shares (${total}%) exceed 100%. Please adjust.`;
        return null;
    };

    useEffect(() => {
        const err = validateNomineeShares(formData.nominees);
        setNomineeError(err || "");
    }, [formData.nominees]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (type === "checkbox") {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData((prev) => ({ ...prev, [name]: checked }));
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }));
        }
        if (errors[name]) {
            setErrors((prev) => { const n = { ...prev }; delete n[name]; return n; });
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof Pick<FormData, "idDocumentFile">) => {
        const file = e.target.files?.[0] || null;
        setFormData((prev) => ({ ...prev, [field]: file }));
    };

    const addAdditionalDocument = () => {
        setFormData((prev) => ({ ...prev, additionalDocuments: [...prev.additionalDocuments, { id: `doc-${additionalDocCounter}`, name: "", file: null }] }));
        setAdditionalDocCounter((prev) => prev + 1);
    };

    const updateAdditionalDocument = (id: string, field: "name" | "file", value: string | File | null) => {
        setFormData((prev) => ({ ...prev, additionalDocuments: prev.additionalDocuments.map((doc) => doc.id === id ? { ...doc, [field]: value } : doc) }));
    };

    const removeAdditionalDocument = (id: string) => {
        setFormData((prev) => ({ ...prev, additionalDocuments: prev.additionalDocuments.filter((doc) => doc.id !== id) }));
    };

    const handleNomineeInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setNomineeForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleNomineeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setNomineeForm((prev) => ({ ...prev, idDocumentFile: file }));
    };

    const checkNomineeShare = (newNominees: Nominee[], editingId: string | null): boolean => {
        const nomineesToCheck = editingId
            ? newNominees.map(n => n.id === editingId ? { ...n, share: nomineeForm.share } : n)
            : [...newNominees, { ...nomineeForm, id: `temp-${Date.now()}` } as Nominee];
        const error = validateNomineeShares(nomineesToCheck);
        if (error) { alert(error); return false; }
        return true;
    };

    const addNominee = () => {
        if (!nomineeForm.name || !nomineeForm.relation || !nomineeForm.share) { alert("Please fill in all required nominee fields."); return; }
        if (!checkNomineeShare(formData.nominees, null)) return;
        const newNominee: Nominee = { id: `nom-${nomineeIdCounter}`, ...nomineeForm };
        setFormData((prev) => ({ ...prev, nominees: [...prev.nominees, newNominee] }));
        setNomineeIdCounter((prev) => prev + 1);
        resetNomineeForm();
        setShowNomineeModal(false);
    };

    const editNominee = (id: string) => {
        const nominee = formData.nominees.find((n) => n.id === id);
        if (nominee) {
            setNomineeForm({ name: nominee.name, relation: nominee.relation, share: nominee.share, idType: nominee.idType, idNumber: nominee.idNumber, idDocumentFile: nominee.idDocumentFile });
            setEditingNomineeId(id);
            setShowNomineeModal(true);
        }
    };

    const updateNominee = () => {
        if (!nomineeForm.name || !nomineeForm.relation || !nomineeForm.share) { alert("Please fill in all required nominee fields."); return; }
        if (!checkNomineeShare(formData.nominees, editingNomineeId)) return;
        setFormData((prev) => ({ ...prev, nominees: prev.nominees.map((n) => n.id === editingNomineeId ? { ...n, ...nomineeForm } : n) }));
        resetNomineeForm();
        setShowNomineeModal(false);
        setEditingNomineeId(null);
    };

    const deleteNominee = (id: string) => {
        if (confirm("Are you sure you want to remove this nominee?")) {
            const newNominees = formData.nominees.filter((n) => n.id !== id);
            const err = validateNomineeShares(newNominees);
            if (err) { alert(err); return; }
            setFormData((prev) => ({ ...prev, nominees: newNominees }));
        }
    };

    const resetNomineeForm = () => {
        setNomineeForm({ name: "", relation: "", share: "", idType: "nid", idNumber: "", idDocumentFile: null });
        setEditingNomineeId(null);
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        requiredFields.forEach((field) => {
            const value = formData[field];
            if (!value || value === "") newErrors[field] = "This field is required";
        });

        if (formData.phoneNumber && !validateMobile(formData.phoneNumber)) newErrors.phoneNumber = "Must be exactly 11 digits (e.g., 01712345678)";
        if (formData.emergencyContact && !validateMobile(formData.emergencyContact)) newErrors.emergencyContact = "Must be exactly 11 digits";
        if (formData.emailAddress && !validateEmail(formData.emailAddress)) newErrors.emailAddress = "Invalid email format";
        
        if (formData.idType && formData.idNumber && !validateIdNumber(formData.idType, formData.idNumber)) {
            if (formData.idType === "National ID") newErrors.idNumber = "NID must be 10, 13, or 17 digits";
            else if (formData.idType === "Birth Certificate") newErrors.idNumber = "Birth Cert must be 17 digits";
            else newErrors.idNumber = "Invalid ID number format";
        }

        if (formData.nominees.length > 0) {
            let total = 0;
            for (const n of formData.nominees) total += parseFloat(n.share) || 0;
            if (total !== 100) newErrors.nominees = `Total nominee shares must equal exactly 100%. Currently at ${total}%.`;
        }

        setErrors(newErrors);
        return newErrors;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitAttempted(true);
        
        const formErrors = validateForm();
        
        if (Object.keys(formErrors).length === 0) {
            const fd = new FormData();
            fd.append("firstName", formData.firstName);
            fd.append("lastName", formData.lastName);
            fd.append("fatherName", formData.fatherName);
            fd.append("motherName", formData.motherName);
            fd.append("spouseName", formData.spouseName);
            fd.append("dob", formData.dateOfBirth);
            fd.append("gender", formData.gender ? formData.gender.toUpperCase() : "OTHER");
            fd.append("religion", formData.religion);
            fd.append("nationality", formData.nationality);
            fd.append("bloodGroup", formData.bloodGroup ? formData.bloodGroup.replace("+", "_POSITIVE").replace("-", "_NEGATIVE") : "");
            fd.append("profession", formData.profession);
            
            fd.append("phone", formData.phoneNumber);
            fd.append("email", formData.emailAddress);
            fd.append("emergencyPhone", formData.emergencyContact);
            
            fd.append("idType", formData.idType);
            fd.append("idNumber", formData.idNumber);
            
            fd.append("maritalStatus", formData.maritalStatus ? formData.maritalStatus.toUpperCase() : "");
            fd.append("marriageDate", formData.marriageDate);
            
            fd.append("accountName", formData.accountName);
            fd.append("accountNumber", formData.accountNumber);
            fd.append("bankName", formData.bankName);
            fd.append("branch", formData.branch);
            fd.append("routingNumber", formData.routingNumber);
            
            fd.append("c_village", formData.currentAddress);
            fd.append("c_postOffice", formData.currentPostOffice);
            fd.append("c_district", formData.currentDistrict);
            fd.append("c_postalCode", formData.currentPostCode);
            
            fd.append("p_village", formData.permanentAddress);
            fd.append("p_postOffice", formData.permanentPostOffice);
            fd.append("p_district", formData.permanentDistrict);
            fd.append("p_postalCode", formData.permanentPostCode);
            
            if (formData.idDocumentFile) fd.append("idDocument", formData.idDocumentFile);
            
            formData.additionalDocuments.forEach((doc, i) => {
                if (doc.name) fd.append(`doc_${i}_name`, doc.name);
                if (doc.file) fd.append(`doc_${i}_file`, doc.file);
            });
            
            formData.nominees.forEach((nom, i) => {
                fd.append(`nom_${i}_name`, nom.name);
                fd.append(`nom_${i}_relation`, nom.relation);
                fd.append(`nom_${i}_share`, nom.share);
                fd.append(`nom_${i}_phone`, nom.phone || "");
                fd.append(`nom_${i}_idType`, nom.idType);
                fd.append(`nom_${i}_idNumber`, nom.idNumber);
                if (nom.idDocumentFile) fd.append(`nom_${i}_idDoc`, nom.idDocumentFile);
            });
            
            await addMember(fd);
        } else {
            if (formErrors.nominees) alert(formErrors.nominees);
            else alert("Please fill all required fields correctly before submitting.");
        }
    };

    const renderFileUpload = (file: File | null, onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void, onRemove: () => void, label: string) => {
        return (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-indigo-600 transition-colors">
                {file ? (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-indigo-600" />
                            <span className="text-sm text-gray-700 truncate max-w-[150px]">{file.name}</span>
                            <span className="text-xs text-gray-400">({(file.size / 1024).toFixed(1)} KB)</span>
                        </div>
                        <button type="button" onClick={onRemove} className="text-red-500 hover:text-red-700 transition-colors"><X className="w-4 h-4" /></button>
                    </div>
                ) : (
                    <label className="flex flex-col items-center justify-center cursor-pointer">
                        <Upload className="w-8 h-8 text-gray-400 mb-1" />
                        <span className="text-sm text-gray-500">{label}</span>
                        <span className="text-xs text-gray-400">Click to upload</span>
                        <input type="file" className="hidden" accept="image/*,.pdf" onChange={onFileChange} />
                    </label>
                )}
            </div>
        );
    };

    return (
        <div className="w-full">
            {/* Breadcrumbs */}
            <nav className="flex items-center text-sm text-gray-500 mb-4">
                <Link href="/dashboard" className="hover:text-indigo-600 transition-colors">Dashboard</Link>
                <ChevronRight className="h-4 w-4 mx-1 text-gray-400" />
                <Link href="/dashboard/members" className="hover:text-indigo-600 transition-colors">Member Panel</Link>
                <ChevronRight className="h-4 w-4 mx-1 text-gray-400" />
                <span className="text-gray-900 dark:text-white font-medium">Add Member</span>
            </nav>

            {/* Top Header with Save/Cancel */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 bg-white rounded-xl shadow-md p-6 border-l-4 border-indigo-600">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Add New Member</h1>
                    <p className="text-gray-500 mt-1 text-sm">Complete all required fields to register a new member. Progress is tracked on the right.</p>
                </div>
                <div className="flex gap-2">
                    <Link href="/dashboard/members">
                        <button type="button" className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium">
                            Cancel
                        </button>
                    </Link>
                    <button type="submit" form="memberForm" className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm font-medium shadow-md">
                        <CheckCircle className="w-4 h-4" /> Save Member
                    </button>
                </div>
            </div>

            {/* Layout Grid: 4 columns on desktop (Form takes 3, Tracker takes 1) */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                
                {/* Left Column: Form (Takes 3/4 width) */}
                <div className="lg:col-span-3 space-y-6">
                    <form id="memberForm" onSubmit={handleSubmit} className="space-y-6">
                        {/* Member Status Card */}
                        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                            <div className="flex flex-wrap items-center gap-6">
                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                        <span className="w-20">Status</span>
                                        <select name="memberStatus" value={formData.memberStatus} onChange={handleInputChange} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none">
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                        </select>
                                    </label>
                                </div>
                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                        <CalendarIcon className="w-4 h-4 text-gray-400" />
                                        <span className="w-16">Joined</span>
                                        <div className="w-40">
                                            <EnterpriseDatePicker value={formData.joinedDate} onChange={(val) => setFormData(prev => ({ ...prev, joinedDate: val }))} />
                                        </div>
                                    </label>
                                </div>
                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                        <input type="checkbox" name="kycVerified" checked={formData.kycVerified} onChange={handleInputChange} className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500" />
                                        KYC Verified
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Personal & Contact Side-by-Side */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Personal Information */}
                            <SectionCard color={sectionColors.personal} title="Personal Information" icon={<User className="w-5 h-5" />}>
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">First Name <span className="text-red-500">*</span></label>
                                            <input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} placeholder="Ariful" className={`w-full border ${errors.firstName && submitAttempted ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none`} />
                                            {errors.firstName && submitAttempted && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.firstName}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name <span className="text-red-500">*</span></label>
                                            <input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} placeholder="Chowdhury" className={`w-full border ${errors.lastName && submitAttempted ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none`} />
                                            {errors.lastName && submitAttempted && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.lastName}</p>}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Father's Name</label>
                                        <input type="text" name="fatherName" value={formData.fatherName} onChange={handleInputChange} placeholder="Father's full name" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Mother's Name</label>
                                        <input type="text" name="motherName" value={formData.motherName} onChange={handleInputChange} placeholder="Mother's full name" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Spouse Name</label>
                                        <input type="text" name="spouseName" value={formData.spouseName} onChange={handleInputChange} placeholder="Spouse's full name" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" />
                                    </div>
                                                                        <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth <span className="text-red-500">*</span></label>
                                        <EnterpriseDatePicker value={formData.dateOfBirth} onChange={(val) => setFormData(prev => ({ ...prev, dateOfBirth: val }))} hasError={!!errors.dateOfBirth && submitAttempted} />
                                        {errors.dateOfBirth && submitAttempted && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.dateOfBirth}</p>}
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Gender <span className="text-red-500">*</span></label>
                                            <select name="gender" value={formData.gender} onChange={handleInputChange} className={`w-full border ${errors.gender && submitAttempted ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none`}>
                                                {genders.map((g) => <option key={g} value={g.toLowerCase()}>{g}</option>)}
                                            </select>
                                            {errors.gender && submitAttempted && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.gender}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Religion</label>
                                            <select name="religion" value={formData.religion} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none">
                                                <option value="">Select</option>
                                                {religions.map((r) => <option key={r} value={r}>{r}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Nationality</label>
                                            <input type="text" name="nationality" value={formData.nationality} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group</label>
                                            <select name="bloodGroup" value={formData.bloodGroup} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none">
                                                <option value="">Select</option>
                                                {bloodGroups.map((bg) => <option key={bg} value={bg}>{bg}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Profession</label>
                                        <input type="text" name="profession" value={formData.profession} onChange={handleInputChange} placeholder="e.g. Business, Engineer" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" />
                                    </div>
                                </div>
                            </SectionCard>

                            {/* Contact & Family */}
                            <SectionCard color={sectionColors.contact} title="Contact & Family Records" icon={<Phone className="w-5 h-5" />}>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number <span className="text-red-500">*</span></label>
                                        <input type="tel" name="phoneNumber" value={formData.phoneNumber} onChange={handleInputChange} placeholder="01712345678" className={`w-full border ${errors.phoneNumber && submitAttempted ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none`} />
                                        {errors.phoneNumber && submitAttempted && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.phoneNumber}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Address <span className="text-red-500">*</span></label>
                                        <input type="email" name="emailAddress" value={formData.emailAddress} onChange={handleInputChange} placeholder="member@example.com" className={`w-full border ${errors.emailAddress && submitAttempted ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none`} />
                                        {errors.emailAddress && submitAttempted && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.emailAddress}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact</label>
                                        <input type="tel" name="emergencyContact" value={formData.emergencyContact} onChange={handleInputChange} placeholder="01812345678" className={`w-full border ${errors.emergencyContact && submitAttempted ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none`} />
                                        {errors.emergencyContact && submitAttempted && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.emergencyContact}</p>}
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">ID Type <span className="text-red-500">*</span></label>
                                            <select name="idType" value={formData.idType} onChange={handleInputChange} className={`w-full border ${errors.idType && submitAttempted ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none`}>
                                                <option value="">Select</option>
                                                {idTypes.map((id) => <option key={id} value={id}>{id}</option>)}
                                            </select>
                                            {errors.idType && submitAttempted && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.idType}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">ID Number <span className="text-red-500">*</span></label>
                                            <input type="text" name="idNumber" value={formData.idNumber} onChange={handleInputChange} placeholder="Enter ID" className={`w-full border ${errors.idNumber && submitAttempted ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none`} />
                                            {errors.idNumber && submitAttempted && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.idNumber}</p>}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">ID Document (Upload)</label>
                                        {renderFileUpload(formData.idDocumentFile, (e) => handleFileChange(e, "idDocumentFile"), () => setFormData((prev) => ({ ...prev, idDocumentFile: null })), "Upload ID Document")}
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Marital Status <span className="text-red-500">*</span></label>
                                            <select name="maritalStatus" value={formData.maritalStatus} onChange={handleInputChange} className={`w-full border ${errors.maritalStatus && submitAttempted ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none`}>
                                                {maritalStatuses.map((m) => <option key={m} value={m.toLowerCase()}>{m}</option>)}
                                            </select>
                                            {errors.maritalStatus && submitAttempted && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.maritalStatus}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Marriage Date</label>
                                            <EnterpriseDatePicker value={formData.marriageDate} onChange={(val) => setFormData(prev => ({ ...prev, marriageDate: val }))} />
                                        </div>
                                    </div>
                                </div>
                            </SectionCard>
                        </div>

                        {/* Bank & Residence Side-by-Side */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Bank Information */}
                            <SectionCard color={sectionColors.bank} title="Bank Information" icon={<CreditCard className="w-5 h-5" />}>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Account Name <span className="text-red-500">*</span></label>
                                        <input type="text" name="accountName" value={formData.accountName} onChange={handleInputChange} placeholder="Full name as per bank" className={`w-full border ${errors.accountName && submitAttempted ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none`} />
                                        {errors.accountName && submitAttempted && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.accountName}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Account Number <span className="text-red-500">*</span></label>
                                        <input type="text" name="accountNumber" value={formData.accountNumber} onChange={handleInputChange} placeholder="Enter account number" className={`w-full border ${errors.accountNumber && submitAttempted ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none`} />
                                        {errors.accountNumber && submitAttempted && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.accountNumber}</p>}
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name <span className="text-red-500">*</span></label>
                                            <select name="bankName" value={formData.bankName} onChange={handleInputChange} className={`w-full border ${errors.bankName && submitAttempted ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none`}>
                                                <option value="">Select Bank</option>
                                                {banks.map((b) => <option key={b} value={b}>{b}</option>)}
                                            </select>
                                            {errors.bankName && submitAttempted && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.bankName}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                                            <input type="text" name="branch" value={formData.branch} onChange={handleInputChange} placeholder="Branch name" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Routing Number</label>
                                        <input type="text" name="routingNumber" value={formData.routingNumber} onChange={handleInputChange} placeholder="Routing number" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" />
                                    </div>
                                </div>
                            </SectionCard>

                            {/* Residence Information */}
                            <SectionCard color={sectionColors.residence} title="Residence Information" icon={<Home className="w-5 h-5" />}>
                                <div className="space-y-3">
                                    <div className="border-b border-gray-200 pb-3">
                                        <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1"><MapPin className="w-4 h-4 text-gray-500" /> Current Residence</h3>
                                        <div className="space-y-2">
                                            <input type="text" name="currentAddress" value={formData.currentAddress} onChange={handleInputChange} placeholder="Address" className={`w-full border ${errors.currentAddress && submitAttempted ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none`} />
                                            {errors.currentAddress && submitAttempted && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.currentAddress}</p>}
                                            <div className="grid grid-cols-3 gap-2">
                                                <input type="text" name="currentPostOffice" value={formData.currentPostOffice} onChange={handleInputChange} placeholder="Post Office" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" />
                                                <select name="currentDistrict" value={formData.currentDistrict} onChange={handleInputChange} className={`w-full border ${errors.currentDistrict && submitAttempted ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none`}>
                                                    <option value="">District</option>
                                                    {districts.map((d) => <option key={d} value={d}>{d}</option>)}
                                                </select>
                                                {errors.currentDistrict && submitAttempted && <p className="text-red-500 text-xs col-span-3 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.currentDistrict}</p>}
                                                <input type="text" name="currentPostCode" value={formData.currentPostCode} onChange={handleInputChange} placeholder="Post Code" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" />
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1"><Building className="w-4 h-4 text-gray-500" /> Permanent Residence</h3>
                                        <div className="space-y-2">
                                            <input type="text" name="permanentAddress" value={formData.permanentAddress} onChange={handleInputChange} placeholder="Address" className={`w-full border ${errors.permanentAddress && submitAttempted ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none`} />
                                            {errors.permanentAddress && submitAttempted && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.permanentAddress}</p>}
                                            <div className="grid grid-cols-3 gap-2">
                                                <input type="text" name="permanentPostOffice" value={formData.permanentPostOffice} onChange={handleInputChange} placeholder="Post Office" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" />
                                                <select name="permanentDistrict" value={formData.permanentDistrict} onChange={handleInputChange} className={`w-full border ${errors.permanentDistrict && submitAttempted ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none`}>
                                                    <option value="">District</option>
                                                    {districts.map((d) => <option key={d} value={d}>{d}</option>)}
                                                </select>
                                                {errors.permanentDistrict && submitAttempted && <p className="text-red-500 text-xs col-span-3 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.permanentDistrict}</p>}
                                                <input type="text" name="permanentPostCode" value={formData.permanentPostCode} onChange={handleInputChange} placeholder="Post Code" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </SectionCard>
                        </div>

                        {/* Additional Docs & Nominees Side-by-Side */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Additional Documents */}
                            <SectionCard color={sectionColors.docs} title="Additional Documents" icon={<FileText className="w-5 h-5" />}>
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-sm text-gray-500">Upload supporting documents</span>
                                    <button type="button" onClick={addAdditionalDocument} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"><Plus className="w-4 h-4" /> Add Document</button>
                                </div>
                                {formData.additionalDocuments.length === 0 ? (
                                    <div className="text-center py-8 text-gray-400">
                                        <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                        <p>No additional documents added</p>
                                        <p className="text-sm">Click "Add Document" to upload a file (e.g., TIN Certificate)</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {formData.additionalDocuments.map((doc) => (
                                            <div key={doc.id} className="flex flex-wrap items-end gap-3 border-b border-gray-200 pb-3">
                                                <div className="flex-1 min-w-[150px]">
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Document Name</label>
                                                    <input type="text" value={doc.name} onChange={(e) => updateAdditionalDocument(doc.id, "name", e.target.value)} placeholder="e.g. TIN Certificate" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" />
                                                </div>
                                                <div className="flex-1 min-w-[200px]">
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">File</label>
                                                    {renderFileUpload(doc.file, (e) => updateAdditionalDocument(doc.id, "file", e.target.files?.[0] || null), () => updateAdditionalDocument(doc.id, "file", null), "Upload File")}
                                                </div>
                                                <button type="button" onClick={() => removeAdditionalDocument(doc.id)} className="text-red-500 hover:text-red-700 transition-colors p-1 mt-1"><Trash2 className="w-5 h-5" /></button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </SectionCard>

                            {/* Nominees */}
                            <SectionCard color={sectionColors.nominees} title="Registered Nominees" icon={<Users className="w-5 h-5" />}>
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <span className="text-sm text-gray-500">Nominee share validation is enforced</span>
                                        {nomineeError && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {nomineeError}</p>}
                                    </div>
                                    <button type="button" onClick={() => { resetNomineeForm(); setShowNomineeModal(true); setEditingNomineeId(null); }} className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors"><Plus className="w-4 h-4" /> Add Nominee</button>
                                </div>
                                {formData.nominees.length === 0 ? (
                                    <div className="text-center py-8 text-gray-400">
                                        <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                        <p>No nominees registered yet</p>
                                        <p className="text-sm">Click "Add Nominee" to register one</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {formData.nominees.map((nominee) => (
                                            <div key={nominee.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <h4 className="font-medium text-gray-900">{nominee.name}</h4>
                                                        <p className="text-sm text-gray-500">{nominee.relation}</p>
                                                        <div className="flex flex-wrap items-center gap-2 mt-1 text-sm">
                                                            <span className="text-indigo-600 font-medium">{nominee.share}% Share</span>
                                                            <span className="text-gray-300">|</span>
                                                            <span className="text-gray-400 text-xs">{nominee.idType === "nid" ? "NID" : nominee.idType === "birthCert" ? "Birth Cert" : "Passport"}: {nominee.idNumber}</span>
                                                            {nominee.idDocumentFile && (
                                                                <>
                                                                    <span className="text-gray-300">|</span>
                                                                    <span className="text-xs text-green-600 flex items-center gap-1"><FileText className="w-3 h-3" /> Document uploaded</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button type="button" onClick={() => editNominee(nominee.id)} className="text-gray-400 hover:text-indigo-600 transition-colors p-1">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                        </button>
                                                        <button type="button" onClick={() => deleteNominee(nominee.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1"><Trash2 className="w-4 h-4" /></button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </SectionCard>
                        </div>
                    </form>
                </div>

                {/* Right Column: Completion Tracker (Takes 1/4 width) */}
                <div className="lg:col-span-1">
                    <div className="sticky top-24 space-y-6">
                        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Completion Status</h2>
                            
                            {/* Progress Ring / Text */}
                            <div className="flex flex-col items-center justify-center mb-6">
                                <div className="relative w-24 h-24">
                                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                        <path className="text-gray-200" stroke="currentColor" strokeWidth="3" fill="none" d="M18 2.5a15.5 15.5 0 1 1 0 31 15.5 15.5 0 0 1 0-31" />
                                        <path className="text-indigo-600 transition-all duration-500" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" strokeDasharray={`${progress}, 100`} d="M18 2.5a15.5 15.5 0 1 1 0 31 15.5 15.5 0 0 1 0-31" />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-2xl font-bold text-gray-900">{progress}%</span>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-500 mt-2">{completedSteps} of {steps.length} steps completed</p>
                            </div>

                            {/* Steps List */}
                            <div className="space-y-3">
                                {steps.map((step, index) => (
                                    <div key={index} className="flex items-center gap-3">
                                        {step.complete ? (
                                            <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                                        ) : (
                                            <Circle className="w-5 h-5 text-gray-300 shrink-0" />
                                        )}
                                        <span className={`text-sm ${step.complete ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                                            {step.name}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Nominee Modal */}
            {showNomineeModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">{editingNomineeId ? "Edit Nominee" : "Add Nominee"}</h3>
                            <button type="button" onClick={() => { setShowNomineeModal(false); resetNomineeForm(); }} className="text-gray-400 hover:text-gray-600 transition-colors"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                                <input type="text" name="name" value={nomineeForm.name} onChange={handleNomineeInputChange} placeholder="Nominee full name" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Relation *</label>
                                    <input type="text" name="relation" value={nomineeForm.relation} onChange={handleNomineeInputChange} placeholder="e.g. Spouse" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Share % *</label>
                                    <input type="text" name="share" value={nomineeForm.share} onChange={handleNomineeInputChange} placeholder="e.g. 50" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ID Type</label>
                                    <select name="idType" value={nomineeForm.idType} onChange={handleNomineeInputChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none">
                                        <option value="nid">National ID</option>
                                        <option value="birthCert">Birth Certificate</option>
                                        <option value="passport">Passport</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ID Number</label>
                                    <input type="text" name="idNumber" value={nomineeForm.idNumber} onChange={handleNomineeInputChange} placeholder="Enter ID" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ID Document (Upload)</label>
                                {renderFileUpload(nomineeForm.idDocumentFile, handleNomineeFileChange, () => setNomineeForm((prev) => ({ ...prev, idDocumentFile: null })), "Upload Nominee ID Document")}
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                            <button type="button" onClick={() => { setShowNomineeModal(false); resetNomineeForm(); }} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm">Cancel</button>
                            <button type="button" onClick={editingNomineeId ? updateNominee : addNominee} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm">{editingNomineeId ? "Update Nominee" : "Add Nominee"}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}