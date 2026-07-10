"use client";

import React, { useState, useEffect } from "react";
import { addMember } from "@/app/actions/member";
import {
    User,
    Calendar,
    Phone,
    Mail,
    MapPin,
    Home,
    Building,
    CreditCard,
    FileText,
    Users,
    Upload,
    X,
    Plus,
    Trash2,
    CheckCircle,
    AlertCircle,
} from "lucide-react";

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

// Color configuration
const sectionColors = {
    personal: { bg: "bg-blue-50", border: "border-blue-200", header: "bg-blue-600", text: "text-white", topBorder: "border-t-blue-600" },
    contact: { bg: "bg-green-50", border: "border-green-200", header: "bg-green-600", text: "text-white", topBorder: "border-t-green-600" },
    bank: { bg: "bg-yellow-50", border: "border-yellow-200", header: "bg-yellow-600", text: "text-white", topBorder: "border-t-yellow-600" },
    residence: { bg: "bg-gray-50", border: "border-gray-300", header: "bg-gray-600", text: "text-white", topBorder: "border-t-gray-600" },
    docs: { bg: "bg-blue-50", border: "border-blue-200", header: "bg-blue-500", text: "text-white", topBorder: "border-t-blue-500" },
    nominees: { bg: "bg-green-50", border: "border-green-200", header: "bg-green-500", text: "text-white", topBorder: "border-t-green-500" },
};

export default function MemberAddPage() {
    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [nomineeIdCounter, setNomineeIdCounter] = useState(1);
    const [showNomineeModal, setShowNomineeModal] = useState(false);
    const [editingNomineeId, setEditingNomineeId] = useState<string | null>(null);
    const [nomineeForm, setNomineeForm] = useState<Omit<Nominee, "id">>({
        name: "",
        relation: "",
        share: "",
        idType: "nid",
        idNumber: "",
        idDocumentFile: null,
    });
    const [additionalDocCounter, setAdditionalDocCounter] = useState(1);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitAttempted, setSubmitAttempted] = useState(false);
    const [progress, setProgress] = useState(0);
    const [nomineeError, setNomineeError] = useState<string>("");

    // Compute progress
    useEffect(() => {
        let filled = 0;
        requiredFields.forEach((field) => {
            const value = formData[field];
            if (value !== undefined && value !== null && value !== "") {
                filled++;
            }
        });
        const total = requiredFields.length;
        setProgress(Math.round((filled / total) * 100));
    }, [formData]);

    // Validate nominee shares
    const validateNomineeShares = (nominees: Nominee[]): string | null => {
        if (nominees.length === 0) return null;
        if (nominees.length === 1) {
            const share = parseFloat(nominees[0].share);
            if (isNaN(share) || share !== 100) {
                return "With a single nominee, share must be 100%.";
            }
            return null;
        }
        let total = 0;
        for (const n of nominees) {
            const s = parseFloat(n.share);
            if (isNaN(s) || s <= 0) {
                return `Share for "${n.name}" must be a positive number.`;
            }
            total += s;
        }
        if (total > 100) {
            return `Total nominee shares (${total}%) exceed 100%. Please adjust.`;
        }
        return null;
    };

    // Run validation whenever nominees change
    useEffect(() => {
        const err = validateNomineeShares(formData.nominees);
        setNomineeError(err || "");
    }, [formData.nominees]);

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value, type } = e.target;
        if (type === "checkbox") {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData((prev) => ({ ...prev, [name]: checked }));
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }));
        }
        if (errors[name]) {
            setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof Pick<FormData, "idDocumentFile">) => {
        const file = e.target.files?.[0] || null;
        setFormData((prev) => ({ ...prev, [field]: file }));
        if (errors[field]) {
            setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    // Additional Documents
    const addAdditionalDocument = () => {
        setFormData((prev) => ({
            ...prev,
            additionalDocuments: [
                ...prev.additionalDocuments,
                { id: `doc-${additionalDocCounter}`, name: "", file: null },
            ],
        }));
        setAdditionalDocCounter((prev) => prev + 1);
    };

    const updateAdditionalDocument = (id: string, field: "name" | "file", value: string | File | null) => {
        setFormData((prev) => ({
            ...prev,
            additionalDocuments: prev.additionalDocuments.map((doc) =>
                doc.id === id ? { ...doc, [field]: value } : doc
            ),
        }));
    };

    const removeAdditionalDocument = (id: string) => {
        setFormData((prev) => ({
            ...prev,
            additionalDocuments: prev.additionalDocuments.filter((doc) => doc.id !== id),
        }));
    };

    // Nominee handlers
    const handleNomineeInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        setNomineeForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleNomineeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setNomineeForm((prev) => ({ ...prev, idDocumentFile: file }));
    };

    // Check nominee share before adding/updating
    const checkNomineeShare = (newNominees: Nominee[], editingId: string | null): boolean => {
        // Temporarily replace the nominee if editing
        const nomineesToCheck = editingId
            ? newNominees.map(n => n.id === editingId ? { ...n, share: nomineeForm.share } : n)
            : [...newNominees, { ...nomineeForm, id: `temp-${Date.now()}` } as Nominee];
        const error = validateNomineeShares(nomineesToCheck);
        if (error) {
            alert(error);
            return false;
        }
        return true;
    };

    const addNominee = () => {
        if (!nomineeForm.name || !nomineeForm.relation || !nomineeForm.share) {
            alert("Please fill in all required nominee fields.");
            return;
        }
        if (!checkNomineeShare(formData.nominees, null)) return;

        const newNominee: Nominee = {
            id: `nom-${nomineeIdCounter}`,
            ...nomineeForm,
        };
        setFormData((prev) => ({
            ...prev,
            nominees: [...prev.nominees, newNominee],
        }));
        setNomineeIdCounter((prev) => prev + 1);
        resetNomineeForm();
        setShowNomineeModal(false);
    };

    const editNominee = (id: string) => {
        const nominee = formData.nominees.find((n) => n.id === id);
        if (nominee) {
            setNomineeForm({
                name: nominee.name,
                relation: nominee.relation,
                share: nominee.share,
                idType: nominee.idType,
                idNumber: nominee.idNumber,
                idDocumentFile: nominee.idDocumentFile,
            });
            setEditingNomineeId(id);
            setShowNomineeModal(true);
        }
    };

    const updateNominee = () => {
        if (!nomineeForm.name || !nomineeForm.relation || !nomineeForm.share) {
            alert("Please fill in all required nominee fields.");
            return;
        }
        if (!checkNomineeShare(formData.nominees, editingNomineeId)) return;

        setFormData((prev) => ({
            ...prev,
            nominees: prev.nominees.map((n) =>
                n.id === editingNomineeId
                    ? { ...n, ...nomineeForm }
                    : n
            ),
        }));
        resetNomineeForm();
        setShowNomineeModal(false);
        setEditingNomineeId(null);
    };

    const deleteNominee = (id: string) => {
        if (confirm("Are you sure you want to remove this nominee?")) {
            const newNominees = formData.nominees.filter((n) => n.id !== id);
            // Validate after deletion
            const err = validateNomineeShares(newNominees);
            if (err) {
                alert(err);
                return;
            }
            setFormData((prev) => ({
                ...prev,
                nominees: newNominees,
            }));
        }
    };

    const resetNomineeForm = () => {
        setNomineeForm({
            name: "",
            relation: "",
            share: "",
            idType: "nid",
            idNumber: "",
            idDocumentFile: null,
        });
        setEditingNomineeId(null);
    };

    // Validation functions
    const validateMobile = (phone: string) => {
        const digits = phone.replace(/\D/g, "");
        return digits.length === 11;
    };

    const validateEmail = (email: string) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        requiredFields.forEach((field) => {
            const value = formData[field];
            if (!value || value === "") {
                newErrors[field] = "This field is required";
            }
        });

        if (formData.phoneNumber && !validateMobile(formData.phoneNumber)) {
            newErrors.phoneNumber = "Must be 11 digits (e.g., 01712345678)";
        }
        if (formData.emergencyContact && !validateMobile(formData.emergencyContact)) {
            newErrors.emergencyContact = "Must be 11 digits";
        }
        if (formData.emailAddress && !validateEmail(formData.emailAddress)) {
            newErrors.emailAddress = "Invalid email format";
        }

        // Check nominee validation
        const nomineeErr = validateNomineeShares(formData.nominees);
        if (nomineeErr) {
            newErrors.nominees = nomineeErr;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitAttempted(true);
        if (validateForm()) {
            // Construct FormData for the Server Action
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
            
            // Call the Server Action
            await addMember(fd);
        } else {
            alert("Please fill the required fields before submitting.");
        }
    };

    const renderFileUpload = (
        file: File | null,
        onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
        onRemove: () => void,
        label: string,
        key?: string
    ) => {
        return (
            <div key={key} className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-primary transition-colors">
                {file ? (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary" />
                            <span className="text-sm text-gray-700 truncate max-w-[150px]">
                                {file.name}
                            </span>
                            <span className="text-xs text-gray-400">
                                ({(file.size / 1024).toFixed(1)} KB)
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={onRemove}
                            className="text-red-500 hover:text-red-700 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <label className="flex flex-col items-center justify-center cursor-pointer">
                        <Upload className="w-8 h-8 text-gray-400 mb-1" />
                        <span className="text-sm text-gray-500">{label}</span>
                        <span className="text-xs text-gray-400">Click to upload</span>
                        <input
                            type="file"
                            className="hidden"
                            accept="image/*,.pdf"
                            onChange={onFileChange}
                        />
                    </label>
                )}
            </div>
        );
    };

    // Section wrapper to apply consistent colors
    const SectionCard = ({ color, children, title, icon }: { color: typeof sectionColors.personal, children: React.ReactNode, title: string, icon: React.ReactNode }) => (
        <div className={`rounded-xl shadow-md border ${color.bg} ${color.border} border-t-4 ${color.topBorder}`}>
            <div className={`${color.header} ${color.text} px-6 py-3 rounded-t-xl flex items-center gap-2`}>
                {icon}
                <h2 className="text-lg font-semibold">{title}</h2>
            </div>
            <div className="p-6">{children}</div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
                {/* Header with Progress */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 bg-white rounded-xl shadow-md p-6 border-l-4 border-primary">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Add New Member</h1>
                        <p className="text-gray-500 mt-1">Complete all required fields to register a new member</p>
                    </div>
                    <div className="mt-4 md:mt-0 flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-600">Completion</span>
                            <div className="w-40 h-2.5 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-blue-500 via-green-500 to-yellow-500 transition-all duration-500"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <span className="text-sm font-bold text-primary">{progress}%</span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="memberForm"
                                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-md"
                            >
                                <CheckCircle className="w-4 h-4" />
                                Save Member
                            </button>
                        </div>
                    </div>
                </div>

                <form id="memberForm" onSubmit={handleSubmit} className="space-y-6">
                    {/* Member Status Card - neutral */}
                    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                        <div className="flex flex-wrap items-center gap-6">
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                    <span className="w-20">Status</span>
                                    <select
                                        key="memberStatus"
                                        name="memberStatus"
                                        value={formData.memberStatus}
                                        onChange={handleInputChange}
                                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </label>
                            </div>
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                    <span className="w-24">Member No</span>
                                    <input
                                        key="memberNo"
                                        type="text"
                                        name="memberNo"
                                        value={formData.memberNo}
                                        onChange={handleInputChange}
                                        placeholder="Auto-generated"
                                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-40 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                        autoComplete="off"
                                    />
                                </label>
                            </div>
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                    <Calendar className="w-4 h-4 text-gray-400" />
                                    <span className="w-16">Joined</span>
                                    <input
                                        key="joinedDate"
                                        type="date"
                                        name="joinedDate"
                                        value={formData.joinedDate}
                                        onChange={handleInputChange}
                                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                    />
                                </label>
                            </div>
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                    <input
                                        key="kycVerified"
                                        type="checkbox"
                                        name="kycVerified"
                                        checked={formData.kycVerified}
                                        onChange={handleInputChange}
                                        className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                                    />
                                    KYC Verified
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Two Column Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Personal Information - Blue */}
                        <SectionCard color={sectionColors.personal} title="Personal Information" icon={<User className="w-5 h-5" />}>
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            First Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            key="firstName"
                                            type="text"
                                            name="firstName"
                                            value={formData.firstName}
                                            onChange={handleInputChange}
                                            placeholder="i.e Md Rayhan"
                                            className={`w-full border ${errors.firstName && submitAttempted ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none`}
                                            autoComplete="off"
                                        />
                                        {errors.firstName && submitAttempted && (
                                            <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" /> {errors.firstName}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Last Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            key="lastName"
                                            type="text"
                                            name="lastName"
                                            value={formData.lastName}
                                            onChange={handleInputChange}
                                            placeholder="i.e. Sarder"
                                            className={`w-full border ${errors.lastName && submitAttempted ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none`}
                                            autoComplete="off"
                                        />
                                        {errors.lastName && submitAttempted && (
                                            <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" /> {errors.lastName}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Father's Name
                                    </label>
                                    <input
                                        key="fatherName"
                                        type="text"
                                        name="fatherName"
                                        value={formData.fatherName}
                                        onChange={handleInputChange}
                                        placeholder="Father's full name"
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                        autoComplete="off"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Mother's Name
                                    </label>
                                    <input
                                        key="motherName"
                                        type="text"
                                        name="motherName"
                                        value={formData.motherName}
                                        onChange={handleInputChange}
                                        placeholder="Mother's full name"
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                        autoComplete="off"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Spouse Name
                                    </label>
                                    <input
                                        key="spouseName"
                                        type="text"
                                        name="spouseName"
                                        value={formData.spouseName}
                                        onChange={handleInputChange}
                                        placeholder="Spouse's full name"
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                        autoComplete="off"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Date of Birth <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        key="dateOfBirth"
                                        type="date"
                                        name="dateOfBirth"
                                        value={formData.dateOfBirth}
                                        onChange={handleInputChange}
                                        className={`w-full border ${errors.dateOfBirth && submitAttempted ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none`}
                                    />
                                    {errors.dateOfBirth && submitAttempted && (
                                        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" /> {errors.dateOfBirth}
                                        </p>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Gender <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            key="gender"
                                            name="gender"
                                            value={formData.gender}
                                            onChange={handleInputChange}
                                            className={`w-full border ${errors.gender && submitAttempted ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none`}
                                        >
                                            {genders.map((g) => (
                                                <option key={g} value={g.toLowerCase()}>{g}</option>
                                            ))}
                                        </select>
                                        {errors.gender && submitAttempted && (
                                            <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" /> {errors.gender}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Religion
                                        </label>
                                        <select
                                            key="religion"
                                            name="religion"
                                            value={formData.religion}
                                            onChange={handleInputChange}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                        >
                                            <option value="">Select</option>
                                            {religions.map((r) => (
                                                <option key={r} value={r}>{r}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Nationality
                                        </label>
                                        <input
                                            key="nationality"
                                            type="text"
                                            name="nationality"
                                            value={formData.nationality}
                                            onChange={handleInputChange}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                            autoComplete="off"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Blood Group
                                        </label>
                                        <select
                                            key="bloodGroup"
                                            name="bloodGroup"
                                            value={formData.bloodGroup}
                                            onChange={handleInputChange}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                        >
                                            <option value="">Select</option>
                                            {bloodGroups.map((bg) => (
                                                <option key={bg} value={bg}>{bg}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Profession
                                    </label>
                                    <input
                                        key="profession"
                                        type="text"
                                        name="profession"
                                        value={formData.profession}
                                        onChange={handleInputChange}
                                        placeholder="e.g. Business, Engineer"
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                        autoComplete="off"
                                    />
                                </div>
                            </div>
                        </SectionCard>

                        {/* Contact & Family - Green */}
                        <SectionCard color={sectionColors.contact} title="Contact & Family Records" icon={<Phone className="w-5 h-5" />}>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Phone Number <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        key="phoneNumber"
                                        type="tel"
                                        name="phoneNumber"
                                        value={formData.phoneNumber}
                                        onChange={handleInputChange}
                                        placeholder="01712345678"
                                        className={`w-full border ${errors.phoneNumber && submitAttempted ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none`}
                                        autoComplete="off"
                                    />
                                    {errors.phoneNumber && submitAttempted && (
                                        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" /> {errors.phoneNumber}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Email Address <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        key="emailAddress"
                                        type="email"
                                        name="emailAddress"
                                        value={formData.emailAddress}
                                        onChange={handleInputChange}
                                        placeholder="member@example.com"
                                        className={`w-full border ${errors.emailAddress && submitAttempted ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none`}
                                        autoComplete="off"
                                    />
                                    {errors.emailAddress && submitAttempted && (
                                        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" /> {errors.emailAddress}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Emergency Contact
                                    </label>
                                    <input
                                        key="emergencyContact"
                                        type="tel"
                                        name="emergencyContact"
                                        value={formData.emergencyContact}
                                        onChange={handleInputChange}
                                        placeholder="01812345678"
                                        className={`w-full border ${errors.emergencyContact && submitAttempted ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none`}
                                        autoComplete="off"
                                    />
                                    {errors.emergencyContact && submitAttempted && (
                                        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" /> {errors.emergencyContact}
                                        </p>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            ID Type <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            key="idType"
                                            name="idType"
                                            value={formData.idType}
                                            onChange={handleInputChange}
                                            className={`w-full border ${errors.idType && submitAttempted ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none`}
                                        >
                                            <option value="">Select</option>
                                            {idTypes.map((id) => (
                                                <option key={id} value={id}>{id}</option>
                                            ))}
                                        </select>
                                        {errors.idType && submitAttempted && (
                                            <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" /> {errors.idType}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            ID Number <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            key="idNumber"
                                            type="text"
                                            name="idNumber"
                                            value={formData.idNumber}
                                            onChange={handleInputChange}
                                            placeholder="Enter ID"
                                            className={`w-full border ${errors.idNumber && submitAttempted ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none`}
                                            autoComplete="off"
                                        />
                                        {errors.idNumber && submitAttempted && (
                                            <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" /> {errors.idNumber}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        ID Document (Upload)
                                    </label>
                                    {renderFileUpload(
                                        formData.idDocumentFile,
                                        (e) => handleFileChange(e, "idDocumentFile"),
                                        () => setFormData((prev) => ({ ...prev, idDocumentFile: null })),
                                        "Upload ID Document",
                                        "idDocumentFile"
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Marital Status <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            key="maritalStatus"
                                            name="maritalStatus"
                                            value={formData.maritalStatus}
                                            onChange={handleInputChange}
                                            className={`w-full border ${errors.maritalStatus && submitAttempted ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none`}
                                        >
                                            {maritalStatuses.map((m) => (
                                                <option key={m} value={m.toLowerCase()}>{m}</option>
                                            ))}
                                        </select>
                                        {errors.maritalStatus && submitAttempted && (
                                            <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" /> {errors.maritalStatus}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Marriage Date
                                        </label>
                                        <input
                                            key="marriageDate"
                                            type="date"
                                            name="marriageDate"
                                            value={formData.marriageDate}
                                            onChange={handleInputChange}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </SectionCard>

                        {/* Bank Information - Yellow */}
                        <SectionCard color={sectionColors.bank} title="Bank Information" icon={<CreditCard className="w-5 h-5" />}>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Account Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        key="accountName"
                                        type="text"
                                        name="accountName"
                                        value={formData.accountName}
                                        onChange={handleInputChange}
                                        placeholder="Full name as per bank"
                                        className={`w-full border ${errors.accountName && submitAttempted ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none`}
                                        autoComplete="off"
                                    />
                                    {errors.accountName && submitAttempted && (
                                        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" /> {errors.accountName}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Account Number <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        key="accountNumber"
                                        type="text"
                                        name="accountNumber"
                                        value={formData.accountNumber}
                                        onChange={handleInputChange}
                                        placeholder="Enter account number"
                                        className={`w-full border ${errors.accountNumber && submitAttempted ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none`}
                                        autoComplete="off"
                                    />
                                    {errors.accountNumber && submitAttempted && (
                                        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" /> {errors.accountNumber}
                                        </p>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Bank Name <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            key="bankName"
                                            name="bankName"
                                            value={formData.bankName}
                                            onChange={handleInputChange}
                                            className={`w-full border ${errors.bankName && submitAttempted ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none`}
                                        >
                                            <option value="">Select Bank</option>
                                            {banks.map((b) => (
                                                <option key={b} value={b}>{b}</option>
                                            ))}
                                        </select>
                                        {errors.bankName && submitAttempted && (
                                            <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" /> {errors.bankName}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Branch
                                        </label>
                                        <input
                                            key="branch"
                                            type="text"
                                            name="branch"
                                            value={formData.branch}
                                            onChange={handleInputChange}
                                            placeholder="Branch name"
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                            autoComplete="off"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Routing Number
                                    </label>
                                    <input
                                        key="routingNumber"
                                        type="text"
                                        name="routingNumber"
                                        value={formData.routingNumber}
                                        onChange={handleInputChange}
                                        placeholder="Routing number"
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                        autoComplete="off"
                                    />
                                </div>
                            </div>
                        </SectionCard>

                        {/* Residence Information - Ash/Gray */}
                        <SectionCard color={sectionColors.residence} title="Residence Information" icon={<Home className="w-5 h-5" />}>
                            <div className="space-y-3">
                                <div className="border-b border-gray-200 pb-3">
                                    <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                                        <MapPin className="w-4 h-4 text-gray-500" />
                                        Current Residence <span className="text-red-500">*</span>
                                    </h3>
                                    <div className="space-y-2">
                                        <input
                                            key="currentAddress"
                                            type="text"
                                            name="currentAddress"
                                            value={formData.currentAddress}
                                            onChange={handleInputChange}
                                            placeholder="Address"
                                            className={`w-full border ${errors.currentAddress && submitAttempted ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none`}
                                            autoComplete="off"
                                        />
                                        {errors.currentAddress && submitAttempted && (
                                            <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" /> {errors.currentAddress}
                                            </p>
                                        )}
                                        <div className="grid grid-cols-3 gap-2">
                                            <input
                                                key="currentPostOffice"
                                                type="text"
                                                name="currentPostOffice"
                                                value={formData.currentPostOffice}
                                                onChange={handleInputChange}
                                                placeholder="Post Office"
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                                autoComplete="off"
                                            />
                                            <select
                                                key="currentDistrict"
                                                name="currentDistrict"
                                                value={formData.currentDistrict}
                                                onChange={handleInputChange}
                                                className={`w-full border ${errors.currentDistrict && submitAttempted ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none`}
                                            >
                                                <option value="">District</option>
                                                {districts.map((d) => (
                                                    <option key={d} value={d}>{d}</option>
                                                ))}
                                            </select>
                                            {errors.currentDistrict && submitAttempted && (
                                                <p className="text-red-500 text-xs col-span-3 mt-1 flex items-center gap-1">
                                                    <AlertCircle className="w-3 h-3" /> {errors.currentDistrict}
                                                </p>
                                            )}
                                            <input
                                                key="currentPostCode"
                                                type="text"
                                                name="currentPostCode"
                                                value={formData.currentPostCode}
                                                onChange={handleInputChange}
                                                placeholder="Post Code"
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                                autoComplete="off"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                                        <Building className="w-4 h-4 text-gray-500" />
                                        Permanent Residence <span className="text-red-500">*</span>
                                    </h3>
                                    <div className="space-y-2">
                                        <input
                                            key="permanentAddress"
                                            type="text"
                                            name="permanentAddress"
                                            value={formData.permanentAddress}
                                            onChange={handleInputChange}
                                            placeholder="Address"
                                            className={`w-full border ${errors.permanentAddress && submitAttempted ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none`}
                                            autoComplete="off"
                                        />
                                        {errors.permanentAddress && submitAttempted && (
                                            <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" /> {errors.permanentAddress}
                                            </p>
                                        )}
                                        <div className="grid grid-cols-3 gap-2">
                                            <input
                                                key="permanentPostOffice"
                                                type="text"
                                                name="permanentPostOffice"
                                                value={formData.permanentPostOffice}
                                                onChange={handleInputChange}
                                                placeholder="Post Office"
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                                autoComplete="off"
                                            />
                                            <select
                                                key="permanentDistrict"
                                                name="permanentDistrict"
                                                value={formData.permanentDistrict}
                                                onChange={handleInputChange}
                                                className={`w-full border ${errors.permanentDistrict && submitAttempted ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none`}
                                            >
                                                <option value="">District</option>
                                                {districts.map((d) => (
                                                    <option key={d} value={d}>{d}</option>
                                                ))}
                                            </select>
                                            {errors.permanentDistrict && submitAttempted && (
                                                <p className="text-red-500 text-xs col-span-3 mt-1 flex items-center gap-1">
                                                    <AlertCircle className="w-3 h-3" /> {errors.permanentDistrict}
                                                </p>
                                            )}
                                            <input
                                                key="permanentPostCode"
                                                type="text"
                                                name="permanentPostCode"
                                                value={formData.permanentPostCode}
                                                onChange={handleInputChange}
                                                placeholder="Post Code"
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                                autoComplete="off"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </SectionCard>

                        {/* Additional Documents - Blue (lighter) */}
                        <div className="lg:col-span-2">
                            <SectionCard color={sectionColors.docs} title="Additional Documents" icon={<FileText className="w-5 h-5" />}>
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-sm text-gray-500">Upload supporting documents</span>
                                    <button
                                        type="button"
                                        onClick={addAdditionalDocument}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add Document
                                    </button>
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
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Document Name
                                                    </label>
                                                    <input
                                                        key={`doc-name-${doc.id}`}
                                                        type="text"
                                                        value={doc.name}
                                                        onChange={(e) =>
                                                            updateAdditionalDocument(doc.id, "name", e.target.value)
                                                        }
                                                        placeholder="e.g. TIN Certificate"
                                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                                        autoComplete="off"
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-[200px]">
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        File
                                                    </label>
                                                    {renderFileUpload(
                                                        doc.file,
                                                        (e) =>
                                                            updateAdditionalDocument(
                                                                doc.id,
                                                                "file",
                                                                e.target.files?.[0] || null
                                                            ),
                                                        () => updateAdditionalDocument(doc.id, "file", null),
                                                        "Upload File",
                                                        `doc-file-${doc.id}`
                                                    )}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeAdditionalDocument(doc.id)}
                                                    className="text-red-500 hover:text-red-700 transition-colors p-1 mt-1"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </SectionCard>
                        </div>

                        {/* Nominees - Green (lighter) */}
                        <div className="lg:col-span-2">
                            <SectionCard color={sectionColors.nominees} title="Registered Nominees" icon={<Users className="w-5 h-5" />}>
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <span className="text-sm text-gray-500">Nominee share validation is enforced</span>
                                        {nomineeError && (
                                            <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" /> {nomineeError}
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            resetNomineeForm();
                                            setShowNomineeModal(true);
                                            setEditingNomineeId(null);
                                        }}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add Nominee
                                    </button>
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
                                            <div
                                                key={nominee.id}
                                                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <h4 className="font-medium text-gray-900">
                                                            {nominee.name}
                                                        </h4>
                                                        <p className="text-sm text-gray-500">
                                                            {nominee.relation}
                                                        </p>
                                                        <div className="flex flex-wrap items-center gap-2 mt-1 text-sm">
                                                            <span className="text-primary font-medium">
                                                                {nominee.share}% Share
                                                            </span>
                                                            <span className="text-gray-300">|</span>
                                                            <span className="text-gray-400 text-xs">
                                                                {nominee.idType === "nid"
                                                                    ? "NID"
                                                                    : nominee.idType === "birthCert"
                                                                        ? "Birth Cert"
                                                                        : "Passport"}
                                                                : {nominee.idNumber}
                                                            </span>
                                                            {nominee.idDocumentFile && (
                                                                <>
                                                                    <span className="text-gray-300">|</span>
                                                                    <span className="text-xs text-green-600 flex items-center gap-1">
                                                                        <FileText className="w-3 h-3" />
                                                                        Document uploaded
                                                                    </span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => editNominee(nominee.id)}
                                                            className="text-gray-400 hover:text-primary transition-colors p-1"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => deleteNominee(nominee.id)}
                                                            className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </SectionCard>
                        </div>
                    </div>

                    {/* Form Actions */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-md"
                        >
                            <CheckCircle className="w-4 h-4" />
                            Save Member
                        </button>
                    </div>
                </form>
            </div>

            {/* Nominee Modal */}
            {showNomineeModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">
                                {editingNomineeId ? "Edit Nominee" : "Add Nominee"}
                            </h3>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowNomineeModal(false);
                                    resetNomineeForm();
                                }}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Full Name *
                                </label>
                                <input
                                    key="nominee-name"
                                    type="text"
                                    name="name"
                                    value={nomineeForm.name}
                                    onChange={handleNomineeInputChange}
                                    placeholder="Nominee full name"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                    autoComplete="off"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Relation *
                                </label>
                                <input
                                    key="nominee-relation"
                                    type="text"
                                    name="relation"
                                    value={nomineeForm.relation}
                                    onChange={handleNomineeInputChange}
                                    placeholder="e.g. Spouse, Son, Daughter"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                    autoComplete="off"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Share Percentage *
                                </label>
                                <input
                                    key="nominee-share"
                                    type="text"
                                    name="share"
                                    value={nomineeForm.share}
                                    onChange={handleNomineeInputChange}
                                    placeholder="e.g. 50"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                    autoComplete="off"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        ID Type
                                    </label>
                                    <select
                                        key="nominee-idType"
                                        name="idType"
                                        value={nomineeForm.idType}
                                        onChange={handleNomineeInputChange}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                    >
                                        <option value="nid">National ID</option>
                                        <option value="birthCert">Birth Certificate</option>
                                        <option value="passport">Passport</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        ID Number
                                    </label>
                                    <input
                                        key="nominee-idNumber"
                                        type="text"
                                        name="idNumber"
                                        value={nomineeForm.idNumber}
                                        onChange={handleNomineeInputChange}
                                        placeholder="Enter ID"
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                        autoComplete="off"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    ID Document (Upload)
                                </label>
                                {renderFileUpload(
                                    nomineeForm.idDocumentFile,
                                    handleNomineeFileChange,
                                    () => setNomineeForm((prev) => ({ ...prev, idDocumentFile: null })),
                                    "Upload Nominee ID Document",
                                    "nominee-idDoc"
                                )}
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowNomineeModal(false);
                                    resetNomineeForm();
                                }}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={editingNomineeId ? updateNominee : addNominee}
                                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm"
                            >
                                {editingNomineeId ? "Update Nominee" : "Add Nominee"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}