"use client";

import React, { useState, useMemo, useEffect } from "react";
import { submitMembershipApplication } from "@/app/actions/membership";
import {
    User, Calendar as CalendarIcon, Phone, Mail, MapPin, Home, Building,
    CreditCard, FileText, Users, Upload, X, Plus, Trash2,
    CheckCircle, AlertCircle, Circle, Sprout, ShieldCheck, Stamp, PenLine,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Nominee = { id: string; name: string; relation: string; share: string; phone: string; idType: "nid" | "birthCert" | "passport"; idNumber: string; idDocumentFile: File | null; photo: File | null; };
type AdditionalDocument = { id: string; name: string; file: File | null; };

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
    declarationName: string; agreedToTerms: boolean;
};

const initialFormData: FormData = {
    firstName: "", lastName: "", fatherName: "", motherName: "", spouseName: "",
    dateOfBirth: "", gender: "male", religion: "", nationality: "Bangladeshi",
    bloodGroup: "", profession: "", maritalStatus: "unmarried", marriageDate: "",
    phoneNumber: "", emailAddress: "", emergencyContact: "", emergencyContactName: "",
    idType: "", idNumber: "", idDocumentFile: null, memberPhoto: null,
    accountName: "", accountNumber: "", bankName: "", branch: "", routingNumber: "",
    currentAddress: "", currentPostOffice: "", currentDistrict: "", currentPostCode: "",
    permanentAddress: "", permanentPostOffice: "", permanentDistrict: "", permanentPostCode: "",
    additionalDocuments: [], nominees: [],
    declarationName: "", agreedToTerms: false,
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

/* ------------------------------------------------------------------ */
/*  Design tokens — see component-level <style jsx global> below       */
/*  Palette: deep ledger green, aged gold seal, brick-red mark,        */
/*  warm paper cream. Type: Fraunces (display) / Work Sans (body) /    */
/*  IBM Plex Mono (reference numbers, ledger figures).                 */
/* ------------------------------------------------------------------ */

const sectionMeta: Record<string, { label: string; icon: React.ReactNode; page: string }> = {
    personal: { label: "Personal Information", icon: <User className="w-5 h-5" />, page: "Page 1" },
    contact: { label: "Contact, Photo &amp; ID", icon: <Phone className="w-5 h-5" />, page: "Page 2" },
    bank: { label: "Bank Information", icon: <CreditCard className="w-5 h-5" />, page: "Page 3" },
    residence: { label: "Residence Information", icon: <Home className="w-5 h-5" />, page: "Page 4" },
    docs: { label: "Supporting Documents", icon: <FileText className="w-5 h-5" />, page: "Page 5" },
    nominees: { label: "Registered Nominees", icon: <Users className="w-5 h-5" />, page: "Page 6" },
};

function LedgerCard({ id, children }: { id: keyof typeof sectionMeta; children: React.ReactNode }) {
    const meta = sectionMeta[id];
    return (
        <div className="ledger-card">
            <div className="ledger-card-head">
                <span className="ledger-card-icon">{meta.icon}</span>
                <h2>{meta.label}</h2>
                <span className="ledger-card-page">{meta.page}</span>
            </div>
            <div className="ledger-card-body">{children}</div>
        </div>
    );
}

function EnterpriseDatePicker({ value, onChange, hasError }: { value: string, onChange: (val: string) => void, hasError?: boolean }) {
    return (
        <input
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`ledger-input ${hasError ? "ledger-input-error" : ""}`}
        />
    );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function MemberRegistrationPage() {
    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [nomineeIdCounter, setNomineeIdCounter] = useState(1);
    const [showNomineeModal, setShowNomineeModal] = useState(false);
    const [editingNomineeId, setEditingNomineeId] = useState<string | null>(null);
    const [nomineeForm, setNomineeForm] = useState<Omit<Nominee, "id">>({ name: "", relation: "", share: "", phone: "", idType: "nid", idNumber: "", idDocumentFile: null, photo: null });
    const [additionalDocCounter, setAdditionalDocCounter] = useState(1);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitAttempted, setSubmitAttempted] = useState(false);
    const [nomineeError, setNomineeError] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitFailed, setSubmitFailed] = useState(false);
    const [referenceNo, setReferenceNo] = useState<string | null>(null);

    const steps = useMemo(() => [
        { key: "personal", name: "Personal Information", complete: !!(formData.firstName && formData.lastName && formData.dateOfBirth && formData.gender && formData.maritalStatus) },
        { key: "contact", name: "Contact &amp; ID", complete: !!(formData.phoneNumber && formData.emailAddress && formData.idType && formData.idNumber && formData.emergencyContactName && formData.memberPhoto) },
        { key: "bank", name: "Bank Details", complete: !!(formData.accountName && formData.accountNumber && formData.bankName) },
        { key: "residence", name: "Address Info", complete: !!(formData.currentAddress && formData.currentDistrict && formData.permanentAddress && formData.permanentDistrict) },
        { key: "docs", name: "Documents", complete: !!formData.idDocumentFile },
        { key: "nominees", name: "Nominees", complete: formData.nominees.length > 0 },
        { key: "declare", name: "Declaration", complete: !!(formData.declarationName && formData.agreedToTerms) },
    ], [formData]);

    const completedSteps = steps.filter(s => s.complete).length;
    const progress = Math.round((completedSteps / steps.length) * 100);

    const validateMobile = (phone: string) => phone.replace(/\D/g, "").length === 11;
    const validateEmail = (email: string) => { if (!email) return true; const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; return re.test(email); };
    const validateIdNumber = (idType: string, idNumber: string) => {
        if (!idNumber) return false; const digits = idNumber.replace(/\D/g, "");
        if (idType === "National ID") return digits.length === 10 || digits.length === 13 || digits.length === 17;
        if (idType === "Passport") return idNumber.length >= 6;
        if (idType === "Birth Certificate") return digits.length === 17;
        if (idType === "Driving License") return idNumber.length > 5;
        return true;
    };
    const validateNomineeShares = (nominees: Nominee[]): string | null => {
        if (nominees.length === 0) return null;
        let total = 0;
        for (const n of nominees) { const s = parseFloat(n.share); if (isNaN(s) || s <= 0) return `Share for "${n.name}" must be a positive number.`; total += s; }
        if (total > 100) return `Total nominee shares (${total}%) exceed 100%. Please adjust.`;
        return null;
    };

    useEffect(() => { const err = validateNomineeShares(formData.nominees); setNomineeError(err || ""); }, [formData.nominees]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (type === "checkbox") { const checked = (e.target as HTMLInputElement).checked; setFormData((prev) => ({ ...prev, [name]: checked })); }
        else { setFormData((prev) => ({ ...prev, [name]: value })); }
        if (errors[name]) { setErrors((prev) => { const n = { ...prev }; delete n[name]; return n; }); }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof Pick<FormData, "idDocumentFile" | "memberPhoto">) => setFormData((prev) => ({ ...prev, [field]: e.target.files?.[0] || null }));
    const addAdditionalDocument = () => { setFormData((prev) => ({ ...prev, additionalDocuments: [...prev.additionalDocuments, { id: `doc-${additionalDocCounter}`, name: "", file: null }] })); setAdditionalDocCounter((prev) => prev + 1); };
    const updateAdditionalDocument = (id: string, field: "name" | "file", value: string | File | null) => setFormData((prev) => ({ ...prev, additionalDocuments: prev.additionalDocuments.map((doc) => doc.id === id ? { ...doc, [field]: value } : doc) }));
    const removeAdditionalDocument = (id: string) => setFormData((prev) => ({ ...prev, additionalDocuments: prev.additionalDocuments.filter((doc) => doc.id !== id) }));

    const handleNomineeInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setNomineeForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    const handleNomineeFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: "idDocumentFile" | "photo") => setNomineeForm((prev) => ({ ...prev, [field]: e.target.files?.[0] || null }));

    const checkNomineeShare = (newNominees: Nominee[], editingId: string | null): boolean => {
        const nomineesToCheck = editingId ? newNominees.map(n => n.id === editingId ? { ...n, share: nomineeForm.share } : n) : [...newNominees, { ...nomineeForm, id: `temp-${Date.now()}` } as Nominee];
        const error = validateNomineeShares(nomineesToCheck);
        if (error) { alert(error); return false; }
        return true;
    };

    const addNominee = () => {
        if (!nomineeForm.name || !nomineeForm.relation || !nomineeForm.share) { alert("Please fill in all required nominee fields."); return; }
        if (!checkNomineeShare(formData.nominees, null)) return;
        const newNominee: Nominee = { id: `nom-${nomineeIdCounter}`, ...nomineeForm };
        setFormData((prev) => ({ ...prev, nominees: [...prev.nominees, newNominee] }));
        setNomineeIdCounter((prev) => prev + 1); resetNomineeForm(); setShowNomineeModal(false);
    };

    const editNominee = (id: string) => {
        const nominee = formData.nominees.find((n) => n.id === id);
        if (nominee) { setNomineeForm({ name: nominee.name, relation: nominee.relation, share: nominee.share, phone: nominee.phone, idType: nominee.idType, idNumber: nominee.idNumber, idDocumentFile: nominee.idDocumentFile, photo: nominee.photo }); setEditingNomineeId(id); setShowNomineeModal(true); }
    };

    const updateNominee = () => {
        if (!nomineeForm.name || !nomineeForm.relation || !nomineeForm.share) { alert("Please fill in all required nominee fields."); return; }
        if (!checkNomineeShare(formData.nominees, editingNomineeId)) return;
        setFormData((prev) => ({ ...prev, nominees: prev.nominees.map((n) => n.id === editingNomineeId ? { ...n, ...nomineeForm } : n) }));
        resetNomineeForm(); setShowNomineeModal(false); setEditingNomineeId(null);
    };

    const deleteNominee = (id: string) => {
        if (confirm("Remove this nominee from your application?")) {
            const newNominees = formData.nominees.filter((n) => n.id !== id);
            const err = validateNomineeShares(newNominees);
            if (err) { alert(err); return; }
            setFormData((prev) => ({ ...prev, nominees: newNominees }));
        }
    };

    const resetNomineeForm = () => { setNomineeForm({ name: "", relation: "", share: "", phone: "", idType: "nid", idNumber: "", idDocumentFile: null, photo: null }); setEditingNomineeId(null); };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        requiredFields.forEach((field) => { const value = formData[field]; if (!value || value === "") newErrors[field] = "This field is required"; });
        if (formData.phoneNumber && !validateMobile(formData.phoneNumber)) newErrors.phoneNumber = "Must be exactly 11 digits (e.g., 01712345678)";
        if (formData.emergencyContact && !validateMobile(formData.emergencyContact)) newErrors.emergencyContact = "Must be exactly 11 digits";
        if (formData.emailAddress && !validateEmail(formData.emailAddress)) newErrors.emailAddress = "Invalid email format";
        if (formData.idType && formData.idNumber && !validateIdNumber(formData.idType, formData.idNumber)) {
            if (formData.idType === "National ID") newErrors.idNumber = "NID must be 10, 13, or 17 digits";
            else if (formData.idType === "Birth Certificate") newErrors.idNumber = "Birth Cert must be 17 digits";
            else newErrors.idNumber = "Invalid ID number format";
        }
        if (formData.nominees.length > 0) { let total = 0; for (const n of formData.nominees) total += parseFloat(n.share) || 0; if (total !== 100) newErrors.nominees = `Total nominee shares must equal exactly 100%. Currently at ${total}%.`; }
        if (!formData.declarationName) newErrors.declarationName = "Please type your full name to sign this application";
        if (!formData.agreedToTerms) newErrors.agreedToTerms = "You must confirm the declaration to submit";
        setErrors(newErrors);
        return newErrors;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitAttempted(true);
        setSubmitFailed(false);
        const formErrors = validateForm();
        if (Object.keys(formErrors).length === 0) {
            setIsSubmitting(true);
            const fd = new FormData();
            fd.append("firstName", formData.firstName); fd.append("lastName", formData.lastName);
            fd.append("fatherName", formData.fatherName); fd.append("motherName", formData.motherName);
            fd.append("spouseName", formData.spouseName); fd.append("dob", formData.dateOfBirth);
            fd.append("gender", formData.gender ? formData.gender.toUpperCase() : "OTHER");
            fd.append("religion", formData.religion); fd.append("nationality", formData.nationality);
            fd.append("bloodGroup", formData.bloodGroup ? formData.bloodGroup.replace("+", "_POSITIVE").replace("-", "_NEGATIVE") : "");
            fd.append("profession", formData.profession);
            fd.append("maritalStatus", formData.maritalStatus ? formData.maritalStatus.toUpperCase() : "");
            fd.append("marriageDate", formData.marriageDate);
            fd.append("phone", formData.phoneNumber); fd.append("email", formData.emailAddress);
            fd.append("emergencyPhone", formData.emergencyContact);
            fd.append("emergencyContactName", formData.emergencyContactName);
            fd.append("idType", formData.idType); fd.append("idNumber", formData.idNumber);
            fd.append("accountName", formData.accountName); fd.append("accountNumber", formData.accountNumber);
            fd.append("bankName", formData.bankName); fd.append("branch", formData.branch);
            fd.append("routingNumber", formData.routingNumber);
            fd.append("c_village", formData.currentAddress); fd.append("c_postOffice", formData.currentPostOffice);
            fd.append("c_district", formData.currentDistrict); fd.append("c_postalCode", formData.currentPostCode);
            fd.append("p_village", formData.permanentAddress); fd.append("p_postOffice", formData.permanentPostOffice);
            fd.append("p_district", formData.permanentDistrict); fd.append("p_postalCode", formData.permanentPostCode);
            fd.append("declarationName", formData.declarationName);

            if (formData.memberPhoto) fd.append("memberPhoto", formData.memberPhoto);
            if (formData.idDocumentFile) fd.append("idDocument", formData.idDocumentFile);

            formData.additionalDocuments.forEach((doc, i) => { if (doc.name) fd.append(`doc_${i}_name`, doc.name); if (doc.file) fd.append(`doc_${i}_file`, doc.file); });
            formData.nominees.forEach((nom, i) => {
                fd.append(`nom_${i}_name`, nom.name); fd.append(`nom_${i}_relation`, nom.relation);
                fd.append(`nom_${i}_share`, nom.share); fd.append(`nom_${i}_phone`, nom.phone || "");
                fd.append(`nom_${i}_idType`, nom.idType); fd.append(`nom_${i}_idNumber`, nom.idNumber);
                if (nom.idDocumentFile) fd.append(`nom_${i}_idDoc`, nom.idDocumentFile);
                if (nom.photo) fd.append(`nom_${i}_photo`, nom.photo);
            });

            try {
                const result = await submitMembershipApplication(fd);
                setReferenceNo(result?.referenceNo ?? `APP-${Date.now().toString().slice(-8)}`);
            } catch (err) {
                setSubmitFailed(true);
            } finally {
                setIsSubmitting(false);
            }
        } else {
            if (formErrors.nominees) alert(formErrors.nominees);
            const firstErrorEl = document.querySelector(".ledger-input-error");
            firstErrorEl?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    };

    const renderFileUpload = (file: File | null, onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void, onRemove: () => void, label: string) => {
        return (
            <div className="upload-well">
                {file ? (
                    <div className="upload-well-filled">
                        <div className="upload-well-file">
                            <FileText className="w-5 h-5 shrink-0" style={{ color: "var(--color-primary)" }} />
                            <span className="upload-well-name">{file.name}</span>
                            <span className="upload-well-size">({(file.size / 1024).toFixed(1)} KB)</span>
                        </div>
                        <button type="button" onClick={onRemove} className="upload-well-remove"><X className="w-4 h-4" /></button>
                    </div>
                ) : (
                    <label className="upload-well-empty">
                        <Upload className="w-6 h-6" style={{ color: "var(--color-gold-dark)" }} />
                        <span className="upload-well-label">{label}</span>
                        <span className="upload-well-hint">Tap to attach a photo or PDF</span>
                        <input type="file" className="hidden" accept="image/*,.pdf" onChange={onFileChange} />
                    </label>
                )}
            </div>
        );
    };

    /* -------------------------- Success state -------------------------- */
    if (referenceNo) {
        return (
            <div className="registration-root">
                <GlobalStyles />
                <div className="success-wrap">
                    <div className="success-card">
                        <div className="seal-stamp seal-stamp-lg" aria-hidden="true">
                            <SealIcon />
                        </div>
                        <h1 className="success-title">Application Received</h1>
                        <p className="success-copy">
                            Thank you, {formData.firstName || "friend"}. Your membership application has been entered into our ledger
                            and is awaiting review by the Somiti committee. Keep your reference number safe — you&apos;ll need it to check your status.
                        </p>
                        <div className="reference-chip">
                            <span className="reference-label">Reference No.</span>
                            <span className="reference-value">{referenceNo}</span>
                        </div>
                        <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
                            Submit Another Application
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="registration-root">
            <GlobalStyles />

            {/* ---------------------------- Cover / Hero ---------------------------- */}
            <header className="cover">
                <div className="cover-inner">
                    <div className="cover-emblem" aria-hidden="true"><SealIcon /></div>
                    <p className="cover-eyebrow">Membership Passbook &middot; Application</p>
                    <h1 className="cover-title">Join the Somiti</h1>
                    <p className="cover-subtitle">
                        Every member strengthens the fund we share. Fill in the pages below exactly as you would fill
                        a passbook at the counter — carefully, honestly, and in full.
                    </p>
                    <div className="cover-stitch" aria-hidden="true" />
                </div>
            </header>

            <div className="page-shell">
                <div className="content-grid">

                    {/* ---------------------------- Form column ---------------------------- */}
                    <form id="registrationForm" onSubmit={handleSubmit} className="form-column">

                        <LedgerCard id="personal">
                            <div className="field-grid-2">
                                <Field label="First Name" required error={submitAttempted ? errors.firstName : undefined}>
                                    <input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} placeholder="Ariful" className={inputClass(errors.firstName, submitAttempted)} />
                                </Field>
                                <Field label="Last Name" required error={submitAttempted ? errors.lastName : undefined}>
                                    <input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} placeholder="Chowdhury" className={inputClass(errors.lastName, submitAttempted)} />
                                </Field>
                            </div>
                            <div className="field-grid-2">
                                <Field label="Father's Name"><input type="text" name="fatherName" value={formData.fatherName} onChange={handleInputChange} placeholder="Father's full name" className="ledger-input" /></Field>
                                <Field label="Mother's Name"><input type="text" name="motherName" value={formData.motherName} onChange={handleInputChange} placeholder="Mother's full name" className="ledger-input" /></Field>
                            </div>
                            <Field label="Spouse Name"><input type="text" name="spouseName" value={formData.spouseName} onChange={handleInputChange} placeholder="Spouse's full name" className="ledger-input" /></Field>
                            <div className="field-grid-2">
                                <Field label="Date of Birth" required error={submitAttempted ? errors.dateOfBirth : undefined}>
                                    <EnterpriseDatePicker value={formData.dateOfBirth} onChange={(val) => setFormData(prev => ({ ...prev, dateOfBirth: val }))} hasError={!!errors.dateOfBirth && submitAttempted} />
                                </Field>
                                <Field label="Gender" required error={submitAttempted ? errors.gender : undefined}>
                                    <select name="gender" value={formData.gender} onChange={handleInputChange} className={inputClass(errors.gender, submitAttempted)}>{genders.map((g) => <option key={g} value={g.toLowerCase()}>{g}</option>)}</select>
                                </Field>
                            </div>
                            <div className="field-grid-2">
                                <Field label="Marital Status" required error={submitAttempted ? errors.maritalStatus : undefined}>
                                    <select name="maritalStatus" value={formData.maritalStatus} onChange={handleInputChange} className={inputClass(errors.maritalStatus, submitAttempted)}>{maritalStatuses.map((m) => <option key={m} value={m.toLowerCase()}>{m}</option>)}</select>
                                </Field>
                                <Field label="Marriage Date"><EnterpriseDatePicker value={formData.marriageDate} onChange={(val) => setFormData(prev => ({ ...prev, marriageDate: val }))} /></Field>
                            </div>
                            <div className="field-grid-2">
                                <Field label="Religion"><select name="religion" value={formData.religion} onChange={handleInputChange} className="ledger-input"><option value="">Select</option>{religions.map((r) => <option key={r} value={r}>{r}</option>)}</select></Field>
                                <Field label="Nationality"><input type="text" name="nationality" value={formData.nationality} onChange={handleInputChange} className="ledger-input" /></Field>
                            </div>
                            <div className="field-grid-2">
                                <Field label="Blood Group"><select name="bloodGroup" value={formData.bloodGroup} onChange={handleInputChange} className="ledger-input"><option value="">Select</option>{bloodGroups.map((bg) => <option key={bg} value={bg}>{bg}</option>)}</select></Field>
                                <Field label="Profession"><input type="text" name="profession" value={formData.profession} onChange={handleInputChange} placeholder="e.g. Farmer, Tailor, Teacher" className="ledger-input" /></Field>
                            </div>
                        </LedgerCard>

                        <LedgerCard id="contact">
                            <div className="field-grid-2">
                                <Field label="Your Photo"><span></span>{renderFileUpload(formData.memberPhoto, (e) => handleFileChange(e, "memberPhoto"), () => setFormData((prev) => ({ ...prev, memberPhoto: null })), "Upload Your Photo")}</Field>
                                <Field label="ID Document"><span></span>{renderFileUpload(formData.idDocumentFile, (e) => handleFileChange(e, "idDocumentFile"), () => setFormData((prev) => ({ ...prev, idDocumentFile: null })), "Upload ID Document")}</Field>
                            </div>
                            <Field label="Phone Number" required error={submitAttempted ? errors.phoneNumber : undefined}>
                                <input type="tel" name="phoneNumber" value={formData.phoneNumber} onChange={handleInputChange} placeholder="01712345678" className={inputClass(errors.phoneNumber, submitAttempted)} />
                            </Field>
                            <Field label="Email Address" required error={submitAttempted ? errors.emailAddress : undefined}>
                                <input type="email" name="emailAddress" value={formData.emailAddress} onChange={handleInputChange} placeholder="you@example.com" className={inputClass(errors.emailAddress, submitAttempted)} />
                            </Field>
                            <Field label="Emergency Contact" error={submitAttempted ? errors.emergencyContact : undefined}>
                                <input type="tel" name="emergencyContact" value={formData.emergencyContact} onChange={handleInputChange} placeholder="01812345678" className={inputClass(errors.emergencyContact, submitAttempted)} />
                            </Field>
                            <Field label="Emergency Contact Person Name"><input type="text" name="emergencyContactName" value={formData.emergencyContactName} onChange={handleInputChange} placeholder="Person's name" className="ledger-input" /></Field>
                            <div className="field-grid-2">
                                <Field label="ID Type" required error={submitAttempted ? errors.idType : undefined}>
                                    <select name="idType" value={formData.idType} onChange={handleInputChange} className={inputClass(errors.idType, submitAttempted)}><option value="">Select</option>{idTypes.map((id) => <option key={id} value={id}>{id}</option>)}</select>
                                </Field>
                                <Field label="ID Number" required error={submitAttempted ? errors.idNumber : undefined}>
                                    <input type="text" name="idNumber" value={formData.idNumber} onChange={handleInputChange} placeholder="Enter ID" className={inputClass(errors.idNumber, submitAttempted)} />
                                </Field>
                            </div>
                        </LedgerCard>

                        <LedgerCard id="bank">
                            <Field label="Account Name" required error={submitAttempted ? errors.accountName : undefined}>
                                <input type="text" name="accountName" value={formData.accountName} onChange={handleInputChange} placeholder="Full name as per bank" className={inputClass(errors.accountName, submitAttempted)} />
                            </Field>
                            <Field label="Account Number" required error={submitAttempted ? errors.accountNumber : undefined}>
                                <input type="text" name="accountNumber" value={formData.accountNumber} onChange={handleInputChange} placeholder="Enter account number" className={`${inputClass(errors.accountNumber, submitAttempted)} font-mono`} />
                            </Field>
                            <div className="field-grid-2">
                                <Field label="Bank Name" required error={submitAttempted ? errors.bankName : undefined}>
                                    <select name="bankName" value={formData.bankName} onChange={handleInputChange} className={inputClass(errors.bankName, submitAttempted)}><option value="">Select Bank</option>{banks.map((b) => <option key={b} value={b}>{b}</option>)}</select>
                                </Field>
                                <Field label="Branch"><input type="text" name="branch" value={formData.branch} onChange={handleInputChange} placeholder="Branch name" className="ledger-input" /></Field>
                            </div>
                            <Field label="Routing Number"><input type="text" name="routingNumber" value={formData.routingNumber} onChange={handleInputChange} placeholder="Routing number" className="ledger-input font-mono" /></Field>
                        </LedgerCard>

                        <LedgerCard id="residence">
                            <div className="ledger-subsection">
                                <h3 className="ledger-subhead"><MapPin className="w-4 h-4" /> Current Residence</h3>
                                <Field label="Address" required error={submitAttempted ? errors.currentAddress : undefined}>
                                    <input type="text" name="currentAddress" value={formData.currentAddress} onChange={handleInputChange} placeholder="Village / Road / House" className={inputClass(errors.currentAddress, submitAttempted)} />
                                </Field>
                                <div className="field-grid-3">
                                    <input type="text" name="currentPostOffice" value={formData.currentPostOffice} onChange={handleInputChange} placeholder="Post Office" className="ledger-input" />
                                    <select name="currentDistrict" value={formData.currentDistrict} onChange={handleInputChange} className={inputClass(errors.currentDistrict, submitAttempted)}><option value="">District</option>{districts.map((d) => <option key={d} value={d}>{d}</option>)}</select>
                                    <input type="text" name="currentPostCode" value={formData.currentPostCode} onChange={handleInputChange} placeholder="Post Code" className="ledger-input" />
                                </div>
                            </div>
                            <div className="ledger-subsection ledger-subsection-last">
                                <h3 className="ledger-subhead"><Building className="w-4 h-4" /> Permanent Residence</h3>
                                <Field label="Address" required error={submitAttempted ? errors.permanentAddress : undefined}>
                                    <input type="text" name="permanentAddress" value={formData.permanentAddress} onChange={handleInputChange} placeholder="Village / Road / House" className={inputClass(errors.permanentAddress, submitAttempted)} />
                                </Field>
                                <div className="field-grid-3">
                                    <input type="text" name="permanentPostOffice" value={formData.permanentPostOffice} onChange={handleInputChange} placeholder="Post Office" className="ledger-input" />
                                    <select name="permanentDistrict" value={formData.permanentDistrict} onChange={handleInputChange} className={inputClass(errors.permanentDistrict, submitAttempted)}><option value="">District</option>{districts.map((d) => <option key={d} value={d}>{d}</option>)}</select>
                                    <input type="text" name="permanentPostCode" value={formData.permanentPostCode} onChange={handleInputChange} placeholder="Post Code" className="ledger-input" />
                                </div>
                            </div>
                        </LedgerCard>

                        <LedgerCard id="docs">
                            <div className="section-toolbar">
                                <span className="section-toolbar-hint">Add extra proof documents, e.g. TIN Certificate, land record</span>
                                <button type="button" onClick={addAdditionalDocument} className="btn-chip"><Plus className="w-4 h-4" /> Add Document</button>
                            </div>
                            {formData.additionalDocuments.length === 0 ? (
                                <EmptyState icon={<FileText className="w-10 h-10" />} title="No documents added yet" subtitle='Click "Add Document" if you have extra paperwork to attach' />
                            ) : (
                                <div className="stack-3">
                                    {formData.additionalDocuments.map((doc) => (
                                        <div key={doc.id} className="doc-row">
                                            <div className="doc-row-name"><Field label="Document Name"><input type="text" value={doc.name} onChange={(e) => updateAdditionalDocument(doc.id, "name", e.target.value)} placeholder="e.g. TIN Certificate" className="ledger-input" /></Field></div>
                                            <div className="doc-row-file"><Field label="File">{renderFileUpload(doc.file, (e) => updateAdditionalDocument(doc.id, "file", e.target.files?.[0] || null), () => updateAdditionalDocument(doc.id, "file", null), "Upload File")}</Field></div>
                                            <button type="button" onClick={() => removeAdditionalDocument(doc.id)} className="icon-btn-danger"><Trash2 className="w-5 h-5" /></button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </LedgerCard>

                        <LedgerCard id="nominees">
                            <div className="section-toolbar">
                                <div>
                                    <span className="section-toolbar-hint">Total nominee shares must equal 100%</span>
                                    {nomineeError && <p className="field-error"><AlertCircle className="w-3 h-3" /> {nomineeError}</p>}
                                </div>
                                <button type="button" onClick={() => { resetNomineeForm(); setShowNomineeModal(true); setEditingNomineeId(null); }} className="btn-chip btn-chip-gold"><Plus className="w-4 h-4" /> Add Nominee</button>
                            </div>
                            {formData.nominees.length === 0 ? (
                                <EmptyState icon={<Users className="w-10 h-10" />} title="No nominees registered yet" subtitle='Click "Add Nominee" to name who receives your share' />
                            ) : (
                                <div className="nominee-grid">
                                    {formData.nominees.map((nominee) => (
                                        <div key={nominee.id} className="nominee-card">
                                            <div className="nominee-card-top">
                                                <div>
                                                    <h4 className="nominee-name">{nominee.name}</h4>
                                                    <p className="nominee-relation">{nominee.relation}</p>
                                                    <div className="nominee-meta">
                                                        <span className="nominee-share">{nominee.share}% Share</span>
                                                        <span className="nominee-divider">|</span>
                                                        <span className="nominee-id">{nominee.idType === "nid" ? "NID" : nominee.idType === "birthCert" ? "Birth Cert" : "Passport"}: {nominee.idNumber}</span>
                                                    </div>
                                                    {(nominee.idDocumentFile || nominee.photo || nominee.phone) && (
                                                        <div className="nominee-meta nominee-meta-sm">
                                                            {nominee.idDocumentFile && <span className="nominee-tag"><FileText className="w-3 h-3" /> ID Doc</span>}
                                                            {nominee.photo && <span className="nominee-tag"><FileText className="w-3 h-3" /> Photo</span>}
                                                            {nominee.phone && <span className="nominee-tag-plain">Ph: {nominee.phone}</span>}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="nominee-actions">
                                                    <button type="button" onClick={() => editNominee(nominee.id)} className="icon-btn"><PenLine className="w-4 h-4" /></button>
                                                    <button type="button" onClick={() => deleteNominee(nominee.id)} className="icon-btn-danger"><Trash2 className="w-4 h-4" /></button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </LedgerCard>

                        {/* -------------------------- Declaration -------------------------- */}
                        <div className="ledger-card declaration-card">
                            <div className="ledger-card-head">
                                <span className="ledger-card-icon"><ShieldCheck className="w-5 h-5" /></span>
                                <h2>Declaration &amp; Signature</h2>
                                <span className="ledger-card-page">Final Page</span>
                            </div>
                            <div className="ledger-card-body">
                                <p className="declaration-text">
                                    I declare that the information given in this application is true and complete to the best of
                                    my knowledge, and I agree to abide by the rules and bye-laws of the Somiti.
                                </p>
                                <Field label="Type your full name to sign" required error={submitAttempted ? errors.declarationName : undefined}>
                                    <input type="text" name="declarationName" value={formData.declarationName} onChange={handleInputChange} placeholder="Your full name" className={`${inputClass(errors.declarationName, submitAttempted)} signature-input`} />
                                </Field>
                                <label className="consent-row">
                                    <input type="checkbox" name="agreedToTerms" checked={formData.agreedToTerms} onChange={handleInputChange} />
                                    <span>I confirm the declaration above and consent to the Somiti verifying my details.</span>
                                </label>
                                {submitAttempted && errors.agreedToTerms && <p className="field-error"><AlertCircle className="w-3 h-3" /> {errors.agreedToTerms}</p>}

                                {submitFailed && (
                                    <p className="field-error field-error-block"><AlertCircle className="w-4 h-4" /> Something went wrong sending your application. Please try again.</p>
                                )}

                                <button type="submit" disabled={isSubmitting} className="btn-primary btn-submit">
                                    <Stamp className="w-4 h-4" /> {isSubmitting ? "Submitting…" : "Submit Application"}
                                </button>
                            </div>
                        </div>
                    </form>

                    {/* ---------------------------- Progress column ---------------------------- */}
                    <aside className="progress-column">
                        <div className="progress-card">
                            <h2 className="progress-title">Passbook Progress</h2>
                            <div className="progress-ring-wrap">
                                <div className="progress-ring">
                                    <svg viewBox="0 0 36 36">
                                        <path className="progress-ring-track" strokeWidth="3" fill="none" d="M18 2.5a15.5 15.5 0 1 1 0 31 15.5 15.5 0 0 1 0-31" />
                                        <path className="progress-ring-fill" strokeWidth="3" strokeLinecap="round" fill="none" strokeDasharray={`${progress}, 100`} d="M18 2.5a15.5 15.5 0 1 1 0 31 15.5 15.5 0 0 1 0-31" />
                                    </svg>
                                    <div className="progress-ring-label">{progress}%</div>
                                </div>
                                <p className="progress-caption">{completedSteps} of {steps.length} pages stamped</p>
                            </div>
                            <div className="stitch-trail">
                                {steps.map((step, index) => (
                                    <div key={step.key} className="stitch-item">
                                        <span className={`stitch-stamp ${step.complete ? "stitch-stamp-done" : ""}`}>
                                            {step.complete ? <CheckCircle className="w-4 h-4" /> : <Circle className="w-3 h-3" />}
                                        </span>
                                        <span className={`stitch-label ${step.complete ? "stitch-label-done" : ""}`}>{step.name}</span>
                                        {index < steps.length - 1 && <span className="stitch-thread" aria-hidden="true" />}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="help-card">
                            <Sprout className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
                            <p>Your application is reviewed by a committee member before your passbook is issued. Most applications are processed within 3–5 working days.</p>
                        </div>
                    </aside>
                </div>
            </div>

            {/* ---------------------------- Nominee modal ---------------------------- */}
            {showNomineeModal && (
                <div className="modal-overlay">
                    <div className="modal-card">
                        <div className="modal-head">
                            <h3>{editingNomineeId ? "Edit Nominee" : "Add Nominee"}</h3>
                            <button type="button" onClick={() => { setShowNomineeModal(false); resetNomineeForm(); }} className="icon-btn"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="modal-body">
                            <Field label="Full Name" required><input type="text" name="name" value={nomineeForm.name} onChange={handleNomineeInputChange} placeholder="Nominee full name" className="ledger-input" /></Field>
                            <div className="field-grid-2">
                                <Field label="Relation" required><input type="text" name="relation" value={nomineeForm.relation} onChange={handleNomineeInputChange} placeholder="e.g. Spouse" className="ledger-input" /></Field>
                                <Field label="Share %" required><input type="text" name="share" value={nomineeForm.share} onChange={handleNomineeInputChange} placeholder="e.g. 50" className="ledger-input font-mono" /></Field>
                            </div>
                            <Field label="Nominee Phone"><input type="tel" name="phone" value={nomineeForm.phone} onChange={handleNomineeInputChange} placeholder="01712345678" className="ledger-input" /></Field>
                            <Field label="Nominee Photo">{renderFileUpload(nomineeForm.photo, (e) => handleNomineeFileChange(e, "photo"), () => setNomineeForm((prev) => ({ ...prev, photo: null })), "Upload Photo")}</Field>
                            <div className="field-grid-2">
                                <Field label="ID Type"><select name="idType" value={nomineeForm.idType} onChange={handleNomineeInputChange} className="ledger-input"><option value="nid">National ID</option><option value="birthCert">Birth Certificate</option><option value="passport">Passport</option></select></Field>
                                <Field label="ID Number"><input type="text" name="idNumber" value={nomineeForm.idNumber} onChange={handleNomineeInputChange} placeholder="Enter ID" className="ledger-input" /></Field>
                            </div>
                            <Field label="ID Document">{renderFileUpload(nomineeForm.idDocumentFile, (e) => handleNomineeFileChange(e, "idDocumentFile"), () => setNomineeForm((prev) => ({ ...prev, idDocumentFile: null })), "Upload Nominee ID Document")}</Field>
                        </div>
                        <div className="modal-foot">
                            <button type="button" onClick={() => { setShowNomineeModal(false); resetNomineeForm(); }} className="btn-secondary">Cancel</button>
                            <button type="button" onClick={editingNomineeId ? updateNominee : addNominee} className="btn-primary">{editingNomineeId ? "Update Nominee" : "Add Nominee"}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Small presentational helpers                                       */
/* ------------------------------------------------------------------ */

function inputClass(error: string | undefined, submitAttempted: boolean) {
    return `ledger-input ${error && submitAttempted ? "ledger-input-error" : ""}`;
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
    return (
        <div className="field">
            <label className="field-label">{label} {required && <span className="field-required">*</span>}</label>
            {children}
            {error && <p className="field-error"><AlertCircle className="w-3 h-3" /> {error}</p>}
        </div>
    );
}

function EmptyState({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
    return (
        <div className="empty-state">
            <div className="empty-state-icon">{icon}</div>
            <p className="empty-state-title">{title}</p>
            <p className="empty-state-subtitle">{subtitle}</p>
        </div>
    );
}

function SealIcon() {
    return (
        <svg viewBox="0 0 120 120" className="seal-svg" xmlns="http://www.w3.org/2000/svg">
            <circle cx="60" cy="60" r="56" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="3 5" />
            <circle cx="60" cy="60" r="46" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M60 34 C 46 46, 46 62, 60 78 C 74 62, 74 46, 60 34 Z" fill="none" stroke="currentColor" strokeWidth="2.5" />
            <path d="M60 78 C 60 88, 52 92, 44 90" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M60 78 C 60 88, 68 92, 76 90" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="60" cy="52" r="4" fill="currentColor" />
        </svg>
    );
}

/* ------------------------------------------------------------------ */
/*  Global styles — design tokens live here                            */
/* ------------------------------------------------------------------ */

function GlobalStyles() {
    return (
        <style jsx global>{`
            @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Work+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');

            :root {
                --color-bg: #F7F2E4;
                --color-paper: #FCFAF3;
                --color-ink: #23302B;
                --color-ink-soft: #5B675F;
                --color-primary: #114B3B;
                --color-primary-dark: #0B342A;
                --color-primary-tint: #E5EEE7;
                --color-gold: #C08A22;
                --color-gold-dark: #8F6417;
                --color-gold-tint: #F5E7C4;
                --color-brick: #9C4636;
                --color-line: #DCD2B4;
                --font-display: 'Fraunces', ui-serif, Georgia, serif;
                --font-body: 'Work Sans', ui-sans-serif, system-ui, sans-serif;
                --font-mono: 'IBM Plex Mono', ui-monospace, monospace;
            }

            .registration-root {
                background: var(--color-bg);
                color: var(--color-ink);
                font-family: var(--font-body);
                min-height: 100vh;
                background-image:
                    linear-gradient(var(--color-line) 1px, transparent 1px);
                background-size: 100% 2.35rem;
            }

            /* ---------------- Cover ---------------- */
            .cover {
                position: relative;
                background: radial-gradient(120% 160% at 15% 0%, var(--color-primary-dark) 0%, var(--color-primary) 55%, #0d3d30 100%);
                color: #F4EFDD;
                padding: 4.5rem 1.5rem 5rem;
                overflow: hidden;
            }
            .cover::before {
                content: "";
                position: absolute; inset: 0;
                background-image: repeating-linear-gradient(115deg, rgba(244,239,221,0.04) 0px, rgba(244,239,221,0.04) 1px, transparent 1px, transparent 14px);
                pointer-events: none;
            }
            .cover-inner { position: relative; max-width: 46rem; margin: 0 auto; text-align: center; }
            .cover-emblem { width: 4.5rem; height: 4.5rem; margin: 0 auto 1.5rem; color: var(--color-gold); opacity: 0.95; }
            .seal-svg { width: 100%; height: 100%; }
            .cover-eyebrow {
                font-family: var(--font-mono); text-transform: uppercase; letter-spacing: 0.18em;
                font-size: 0.7rem; color: var(--color-gold-tint); margin-bottom: 0.9rem;
            }
            .cover-title {
                font-family: var(--font-display); font-optical-sizing: auto;
                font-weight: 600; font-size: clamp(2.25rem, 5vw, 3.4rem); line-height: 1.05; letter-spacing: -0.01em;
                margin-bottom: 1rem;
            }
            .cover-subtitle { font-size: 1.02rem; line-height: 1.65; color: #DCE6DC; max-width: 34rem; margin: 0 auto; }
            .cover-stitch {
                margin-top: 2.75rem; height: 1px;
                background-image: repeating-linear-gradient(90deg, var(--color-gold) 0 10px, transparent 10px 20px);
                opacity: 0.55;
            }

            /* ---------------- Shell / layout ---------------- */
            .page-shell { max-width: 74rem; margin: 0 auto; padding: 0 1.25rem 5rem; }
            .content-grid { display: grid; grid-template-columns: 1fr; gap: 2rem; margin-top: -2.75rem; }
            @media (min-width: 1024px) { .content-grid { grid-template-columns: minmax(0,1fr) 19rem; gap: 2.5rem; } }
            .form-column { display: flex; flex-direction: column; gap: 1.75rem; min-width: 0; }
            .progress-column { display: flex; flex-direction: column; gap: 1.25rem; }
            @media (min-width: 1024px) { .progress-column { position: sticky; top: 1.5rem; align-self: start; } }

            /* ---------------- Ledger card ---------------- */
            .ledger-card, .declaration-card {
                background: var(--color-paper);
                border: 1px solid var(--color-line);
                border-radius: 0.9rem;
                box-shadow: 0 1px 2px rgba(17,75,59,0.04), 0 12px 28px -18px rgba(17,75,59,0.25);
                overflow: hidden;
            }
            .ledger-card-head {
                display: flex; align-items: center; gap: 0.65rem;
                padding: 1.1rem 1.4rem;
                background: var(--color-primary);
                color: #F4EFDD;
                border-bottom: 3px double var(--color-gold);
            }
            .ledger-card-head h2 {
                font-family: var(--font-display); font-weight: 600; font-size: 1.15rem; flex: 1; letter-spacing: -0.01em;
            }
            .ledger-card-icon { display: flex; color: var(--color-gold-tint); }
            .ledger-card-page { font-family: var(--font-mono); font-size: 0.68rem; letter-spacing: 0.06em; color: #CBD9CD; opacity: 0.85; }
            .ledger-card-body { padding: 1.5rem 1.4rem 1.7rem; display: flex; flex-direction: column; gap: 1rem; }

            .field-grid-2 { display: grid; grid-template-columns: 1fr; gap: 1rem; }
            @media (min-width: 560px) { .field-grid-2 { grid-template-columns: 1fr 1fr; } }
            .field-grid-3 { display: grid; grid-template-columns: 1fr; gap: 0.6rem; }
            @media (min-width: 560px) { .field-grid-3 { grid-template-columns: 1fr 1fr 1fr; } }

            .field { display: flex; flex-direction: column; gap: 0.35rem; }
            .field-label { font-size: 0.82rem; font-weight: 500; color: var(--color-ink-soft); }
            .field-required { color: var(--color-brick); }
            .field-error { display: flex; align-items: center; gap: 0.3rem; font-size: 0.75rem; color: var(--color-brick); }
            .field-error-block { font-size: 0.85rem; margin-top: -0.2rem; }

            .ledger-input {
                width: 100%; background: #fff;
                border: 1px solid var(--color-line);
                border-radius: 0.55rem;
                padding: 0.55rem 0.75rem;
                font-size: 0.9rem; color: var(--color-ink);
                outline: none; transition: border-color .15s, box-shadow .15s;
            }
            .ledger-input:focus { border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-tint); }
            .ledger-input-error { border-color: var(--color-brick) !important; }
            .signature-input { font-family: var(--font-display); font-size: 1.15rem; font-style: italic; }

            .ledger-subsection { padding-bottom: 1.1rem; border-bottom: 1px dashed var(--color-line); display: flex; flex-direction: column; gap: 0.7rem; }
            .ledger-subsection-last { border-bottom: none; padding-bottom: 0; }
            .ledger-subhead { display: flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; font-weight: 600; color: var(--color-primary); }

            /* ---------------- Upload well ---------------- */
            .upload-well { border: 2px dashed var(--color-line); border-radius: 0.65rem; background: #FEFDF8; transition: border-color .15s; }
            .upload-well:hover { border-color: var(--color-gold); }
            .upload-well-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.15rem; padding: 1.1rem 0.75rem; cursor: pointer; text-align: center; }
            .upload-well-label { font-size: 0.85rem; color: var(--color-ink); font-weight: 500; }
            .upload-well-hint { font-size: 0.72rem; color: var(--color-ink-soft); }
            .upload-well-filled { display: flex; align-items: center; justify-content: space-between; padding: 0.7rem 0.85rem; gap: 0.5rem; }
            .upload-well-file { display: flex; align-items: center; gap: 0.5rem; min-width: 0; }
            .upload-well-name { font-size: 0.82rem; color: var(--color-ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 9rem; }
            .upload-well-size { font-size: 0.7rem; color: var(--color-ink-soft); font-family: var(--font-mono); }
            .upload-well-remove { color: var(--color-brick); flex-shrink: 0; }

            /* ---------------- Buttons / chips ---------------- */
            .btn-primary {
                display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
                background: var(--color-primary); color: #F4EFDD;
                font-weight: 600; font-size: 0.88rem;
                padding: 0.65rem 1.3rem; border-radius: 0.55rem;
                border: 1px solid var(--color-primary-dark);
                transition: background .15s, transform .1s;
            }
            .btn-primary:hover { background: var(--color-primary-dark); }
            .btn-primary:active { transform: translateY(1px); }
            .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
            .btn-submit { width: 100%; padding: 0.85rem 1.3rem; font-size: 0.95rem; margin-top: 0.3rem; }
            .btn-secondary { padding: 0.6rem 1.2rem; border-radius: 0.55rem; border: 1px solid var(--color-line); color: var(--color-ink-soft); font-size: 0.85rem; background: #fff; }
            .btn-chip { display: inline-flex; align-items: center; gap: 0.3rem; background: var(--color-primary); color: #fff; font-size: 0.78rem; font-weight: 500; padding: 0.4rem 0.75rem; border-radius: 999px; }
            .btn-chip-gold { background: var(--color-gold-dark); }

            .section-toolbar { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; }
            .section-toolbar-hint { font-size: 0.8rem; color: var(--color-ink-soft); }

            .stack-3 { display: flex; flex-direction: column; gap: 0.85rem; }
            .doc-row { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 0.75rem; padding-bottom: 0.85rem; border-bottom: 1px dashed var(--color-line); }
            .doc-row-name { flex: 1; min-width: 9rem; }
            .doc-row-file { flex: 1.4; min-width: 11rem; }

            .icon-btn { color: var(--color-ink-soft); padding: 0.25rem; border-radius: 0.4rem; }
            .icon-btn:hover { color: var(--color-primary); background: var(--color-primary-tint); }
            .icon-btn-danger { color: var(--color-ink-soft); padding: 0.25rem; border-radius: 0.4rem; }
            .icon-btn-danger:hover { color: var(--color-brick); background: #F7E9E5; }

            .empty-state { text-align: center; padding: 2.25rem 1rem; color: var(--color-ink-soft); }
            .empty-state-icon { display: flex; justify-content: center; margin-bottom: 0.5rem; opacity: 0.4; }
            .empty-state-title { font-weight: 500; color: var(--color-ink); }
            .empty-state-subtitle { font-size: 0.82rem; margin-top: 0.15rem; }

            /* ---------------- Nominees ---------------- */
            .nominee-grid { display: grid; grid-template-columns: 1fr; gap: 0.85rem; }
            @media (min-width: 560px) { .nominee-grid { grid-template-columns: 1fr 1fr; } }
            .nominee-card { border: 1px solid var(--color-line); border-radius: 0.6rem; padding: 0.9rem 1rem; background: #fff; }
            .nominee-card-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.5rem; }
            .nominee-name { font-weight: 600; color: var(--color-ink); }
            .nominee-relation { font-size: 0.82rem; color: var(--color-ink-soft); }
            .nominee-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem; margin-top: 0.35rem; font-size: 0.8rem; }
            .nominee-meta-sm { font-size: 0.72rem; }
            .nominee-share { color: var(--color-primary); font-weight: 600; }
            .nominee-divider { color: var(--color-line); }
            .nominee-id { color: var(--color-ink-soft); font-family: var(--font-mono); font-size: 0.72rem; }
            .nominee-tag { display: inline-flex; align-items: center; gap: 0.2rem; color: var(--color-primary); background: var(--color-primary-tint); padding: 0.1rem 0.4rem; border-radius: 999px; }
            .nominee-tag-plain { color: var(--color-ink-soft); }
            .nominee-actions { display: flex; align-items: center; gap: 0.1rem; }

            /* ---------------- Declaration ---------------- */
            .declaration-text { font-size: 0.88rem; line-height: 1.55; color: var(--color-ink-soft); background: var(--color-gold-tint); border-left: 3px solid var(--color-gold); padding: 0.75rem 0.9rem; border-radius: 0.4rem; }
            .consent-row { display: flex; align-items: flex-start; gap: 0.55rem; font-size: 0.85rem; color: var(--color-ink); }
            .consent-row input { margin-top: 0.2rem; accent-color: var(--color-primary); }

            /* ---------------- Progress / stitch trail ---------------- */
            .progress-card, .help-card { background: var(--color-paper); border: 1px solid var(--color-line); border-radius: 0.9rem; padding: 1.4rem; box-shadow: 0 1px 2px rgba(17,75,59,0.04); }
            .progress-title { font-family: var(--font-display); font-weight: 600; font-size: 1.05rem; margin-bottom: 1rem; }
            .progress-ring-wrap { display: flex; flex-direction: column; align-items: center; margin-bottom: 1.3rem; }
            .progress-ring { position: relative; width: 6.2rem; height: 6.2rem; }
            .progress-ring-track { stroke: var(--color-primary-tint); }
            .progress-ring-fill { stroke: var(--color-gold); transition: stroke-dasharray .5s ease; }
            .progress-ring svg { transform: rotate(-90deg); width: 100%; height: 100%; }
            .progress-ring-label { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-family: var(--font-display); font-weight: 600; font-size: 1.3rem; color: var(--color-primary); }
            .progress-caption { font-size: 0.78rem; color: var(--color-ink-soft); margin-top: 0.6rem; }

            .stitch-trail { display: flex; flex-direction: column; }
            .stitch-item { position: relative; display: flex; align-items: center; gap: 0.65rem; padding-bottom: 1.35rem; }
            .stitch-item:last-child { padding-bottom: 0; }
            .stitch-stamp {
                display: flex; align-items: center; justify-content: center;
                width: 1.6rem; height: 1.6rem; border-radius: 999px; flex-shrink: 0;
                border: 1.5px solid var(--color-line); color: var(--color-ink-soft); background: #fff;
                z-index: 1;
            }
            .stitch-stamp-done { border-color: var(--color-gold); color: var(--color-gold-dark); background: var(--color-gold-tint); }
            .stitch-label { font-size: 0.83rem; color: var(--color-ink-soft); }
            .stitch-label-done { color: var(--color-ink); font-weight: 500; }
            .stitch-thread {
                position: absolute; left: 0.79rem; top: 1.6rem; bottom: -0.05rem; width: 0;
                border-left: 2px dashed var(--color-line);
            }

            .help-card { display: flex; gap: 0.7rem; font-size: 0.82rem; color: var(--color-ink-soft); line-height: 1.5; }

            /* ---------------- Modal ---------------- */
            .modal-overlay { position: fixed; inset: 0; background: rgba(11,52,42,0.45); display: flex; align-items: center; justify-content: center; padding: 1rem; z-index: 50; }
            .modal-card { background: var(--color-paper); border-radius: 0.9rem; max-width: 28rem; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px -20px rgba(11,52,42,0.5); }
            .modal-head { display: flex; align-items: center; justify-content: space-between; padding: 1.1rem 1.4rem; border-bottom: 1px solid var(--color-line); }
            .modal-head h3 { font-family: var(--font-display); font-weight: 600; font-size: 1.1rem; }
            .modal-body { padding: 1.2rem 1.4rem; display: flex; flex-direction: column; gap: 0.9rem; }
            .modal-foot { display: flex; justify-content: flex-end; gap: 0.6rem; padding: 1rem 1.4rem; border-top: 1px solid var(--color-line); }

            /* ---------------- Success ---------------- */
            .success-wrap { display: flex; align-items: center; justify-content: center; min-height: 80vh; padding: 2rem 1.25rem; }
            .success-card { max-width: 28rem; text-align: center; background: var(--color-paper); border: 1px solid var(--color-line); border-radius: 1rem; padding: 2.75rem 2rem; box-shadow: 0 20px 60px -25px rgba(11,52,42,0.4); }
            .seal-stamp { color: var(--color-gold-dark); }
            .seal-stamp-lg { width: 4.5rem; height: 4.5rem; margin: 0 auto 1.25rem; }
            .success-title { font-family: var(--font-display); font-weight: 600; font-size: 1.6rem; color: var(--color-primary); margin-bottom: 0.75rem; }
            .success-copy { font-size: 0.92rem; color: var(--color-ink-soft); line-height: 1.6; margin-bottom: 1.5rem; }
            .reference-chip { display: inline-flex; flex-direction: column; gap: 0.15rem; background: var(--color-primary-tint); border: 1px dashed var(--color-primary); border-radius: 0.6rem; padding: 0.7rem 1.4rem; margin-bottom: 1.75rem; }
            .reference-label { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--color-ink-soft); }
            .reference-value { font-family: var(--font-mono); font-weight: 600; font-size: 1.1rem; color: var(--color-primary); }
        `}</style>
    );
}
