import React, { useState, useContext, useEffect } from "react";
import { Pencil, Save, X, Copy, Check, Mail, Crown } from "lucide-react";
import { useUserProfile, UserProfile } from "../state_management/ProfileContext";
import { UserContext } from "../state_management/UserContext";
import { toastUtils, toastMessages } from "../utils/toast";
import SecretKeyModal from "./SecretKeyModal";
import { useOperationsStore } from "../state_management/Operations";
import { DatePicker } from "./DatePicker";
import { format, parse, isValid } from "date-fns";

// Helper function to format date string (removes time component)
const formatDateOnly = (dateString: string | undefined): string => {
  if (!dateString) return "";
  
  try {
    // If it's an ISO string with time, extract just the date part
    let datePart = dateString;
    if (dateString.includes('T')) {
      datePart = dateString.split('T')[0]; // Get YYYY-MM-DD part
    }
    
    // Parse and format
    const date = parse(datePart, "yyyy-MM-dd", new Date());
    if (isValid(date)) {
      return format(date, "dd/MM/yyyy");
    }
    
    // Try parsing as ISO date string directly
    const isoDate = new Date(dateString);
    if (isValid(isoDate)) {
      return format(isoDate, "dd/MM/yyyy");
    }
    
    return dateString; // Return as-is if parsing fails
  } catch {
    return dateString; // Return as-is if any error
  }
};

// Helper function to extract date part from ISO datetime string for date inputs
const extractDatePart = (dateString: string | undefined): string => {
  if (!dateString) return "";
  
  try {
    // If it's an ISO string with time, extract just the date part
    if (dateString.includes('T')) {
      return dateString.split('T')[0]; // Get YYYY-MM-DD part
    }
    
    // If it's already in YYYY-MM-DD format, return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    
    // Try to parse and extract date
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return format(date, "yyyy-MM-dd");
    }
    
    return dateString; // Return as-is if parsing fails
  } catch {
    return dateString; // Return as-is if any error
  }
};

const validateUrl = (value: string) => {
    if (!value.trim()) return false;
    try {
        if (!value.startsWith("http://") && !value.startsWith("https://")) {
            return false;
        }
        new URL(value);
        return true;
    } catch {
        return false;
    }
};

function RowTitle({ title, required = false }: { title: string; required?: boolean }) {
    return (
        <>
            {title}
            {required && <span className="ml-1 text-red-500">*</span>}
        </>
    );
}

/* ---------------- Helper Components ----------------- */
function Placeholder({ label }: { label?: string }) {
    return <span className="text-gray-400 italic">{label || "Not provided"}</span>;
}

function CopyButton({ value, title }: { value: string; title: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            toastUtils.success(`${title} copied to clipboard!`);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toastUtils.error("Failed to copy");
        }
    };

    if (!value || !value.trim()) return null;

    return (
        <button
            onClick={handleCopy}
            className="ml-2 p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all flex-shrink-0 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100"
            title={`Copy ${title}`}
            aria-label={`Copy ${title}`}
        >
            {copied ? (
                <Check size={15} className="text-green-600" />
            ) : (
                <Copy size={15} />
            )}
        </button>
    );
}

/* ---------------- Reusable Layout Rows ----------------- */
function InfoRow({
    title,
    value,
    isEditing = false,
    required = false,
    error,
    onValueChange = () => { },
}: {
    title: string;
    value?: string;
    isEditing?: boolean;
    required?: boolean;
    error?: string;
    onValueChange?: (value: string) => void;
}) {
    return (
        <div className="group flex flex-col md:flex-row md:items-center gap-1 md:gap-4 py-3.5 border-b border-gray-100 last:border-b-0">
            <div className="w-full md:w-1/3 text-sm font-medium text-gray-500">
                <RowTitle title={title} required={required} />
            </div>
            <div className="w-full md:w-2/3 flex flex-col">
                {isEditing ? (
                    <input
                        type="text"
                        value={value || ""}
                        onChange={(e) => onValueChange(e.target.value)}
                        required={required}
                        aria-invalid={!!error}
                        className={`w-full text-sm text-gray-900 bg-white border px-3 py-2 focus:outline-none focus:ring-1 ${
                            error
                                ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                                : "border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                        }`}
                        placeholder={`Enter ${title.toLowerCase()}`}
                    />
                ) : (
                    <div className="flex items-center">
                        <span className="flex-1 text-sm text-gray-900 break-words">
                            {value || <Placeholder />}
                        </span>
                        {value && <CopyButton value={value} title={title} />}
                    </div>
                )}
                {error && <span className="mt-1 text-xs text-red-600">{error}</span>}
            </div>
        </div>
    );
}

// CheckboxGroupRow — multi-select row with checkboxes (Profile UI's
// employment-type field uses this). `value` is the currently-selected
// option list; `options` defines the universe. Toggle fires
// `onValueChange` with the new array.
function CheckboxGroupRow({
    title,
    value,
    options,
    isEditing = false,
    onValueChange = () => {},
}: {
    title: string;
    value?: string[];
    options: string[];
    isEditing?: boolean;
    onValueChange?: (value: string[]) => void;
}) {
    const list = Array.isArray(value) ? value : [];
    const display = list.length ? list.join(", ") : "";
    const toggle = (opt: string) => {
        const next = list.includes(opt)
            ? list.filter((v) => v !== opt)
            : [...list, opt];
        onValueChange(next);
    };
    return (
        <div className="group flex flex-col md:flex-row md:items-start gap-1 md:gap-4 py-3.5 border-b border-gray-100 last:border-b-0">
            <div className="w-full md:w-1/3 text-sm font-medium text-gray-500 md:pt-1.5">
                {title}
            </div>
            <div className="w-full md:w-2/3 flex flex-col gap-2">
                {isEditing ? (
                    <div className="flex flex-wrap gap-2">
                        {options.map((opt) => {
                            const checked = list.includes(opt);
                            return (
                                <label
                                    key={opt}
                                    className={`inline-flex items-center gap-2 px-3 py-1.5 border text-sm cursor-pointer transition-colors ${
                                        checked
                                            ? "bg-orange-50 border-orange-400 text-orange-700"
                                            : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        className="accent-orange-500"
                                        checked={checked}
                                        onChange={() => toggle(opt)}
                                    />
                                    {opt}
                                </label>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex items-center w-full">
                        <span className="flex-1 text-sm text-gray-900 break-words">
                            {display || <Placeholder />}
                        </span>
                        {display && <CopyButton value={display} title={title} />}
                    </div>
                )}
            </div>
        </div>
    );
}

function TextAreaRow({
    title,
    value,
    isEditing = false,
    onValueChange = () => { },
}: {
    title: string;
    value?: string;
    isEditing?: boolean;
    onValueChange?: (value: string) => void;
}) {
    return (
        <div className="group flex flex-col md:flex-row md:items-start gap-1 md:gap-4 py-3.5 border-b border-gray-100 last:border-b-0">
            <div className="w-full md:w-1/3 text-sm font-medium text-gray-500 md:pt-0.5">
                {title}
            </div>
            <div className="w-full md:w-2/3 flex items-start">
                {isEditing ? (
                    <textarea
                        value={value || ""}
                        onChange={(e) => onValueChange(e.target.value)}
                        className="w-full text-sm text-gray-900 bg-white border px-3 py-2 focus:outline-none focus:ring-1 border-gray-300 focus:border-orange-500 focus:ring-orange-500 resize-y"
                        rows={3}
                        placeholder={`Enter ${title.toLowerCase()}`}
                    />
                ) : (
                    <>
                        <span className="flex-1 text-sm text-gray-900 break-words whitespace-pre-line leading-relaxed">
                            {value || <Placeholder />}
                        </span>
                        {value && <CopyButton value={value} title={title} />}
                    </>
                )}
            </div>
        </div>
    );
}

function FileUploadRow({
    title,
    currentFile,
    isEditing = false,
    required = false,
    error,
    onFileChange = () => { },
}: {
    title: string;
    currentFile?: string;
    isEditing?: boolean;
    required?: boolean;
    error?: string;
    onFileChange?: (file: string) => void;
}) {
    const [uploading, setUploading] = useState(false);
    const missingRequired = required && !currentFile;

    const handleFileUpload = async (file: File) => {
        try {
            setUploading(true);
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

            // Get token and email from localStorage
            const userAuth = JSON.parse(localStorage.getItem('userAuth') || '{}');
            const token = userAuth.token;
            const email = userAuth.userDetails?.email;

            if (!token || !email) {
                throw new Error("Authentication required");
            }

            // Create FormData for file upload
            const formData = new FormData();
            formData.append('file', file);
            formData.append('email', email);

            const response = await fetch(`${API_BASE_URL}/upload-profile-file`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Upload failed');
            }

            const data = await response.json();
            const fileUrl = data.secure_url || data.url;

            if (fileUrl) {
                onFileChange(fileUrl);
                toastUtils.success(`${title} uploaded successfully!`);
            } else {
                throw new Error("No URL returned from upload");
            }
        } catch (error: any) {
            console.error("Upload error:", error);
            toastUtils.error(error.message || "Upload failed");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="group flex flex-col md:flex-row md:items-start gap-1 md:gap-4 py-3.5 border-b border-gray-100 last:border-b-0">
            <div className="w-full md:w-1/3 text-sm font-medium text-gray-500 md:pt-0.5">
                <RowTitle title={title} required={required} />
            </div>
            <div className="w-full md:w-2/3 flex flex-col">
                {isEditing ? (
                    <div className="w-full">
                        <input
                            type="file"
                            accept=".pdf,.doc,.docx"
                            disabled={uploading}
                            aria-invalid={!!error}
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    handleFileUpload(file);
                                }
                            }}
                            className={`block w-full text-sm file:mr-3 file:border file:border-gray-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-50 file:cursor-pointer disabled:opacity-60 ${
                                error ? "text-red-600" : "text-gray-500"
                            }`}
                        />
                        {uploading && (
                            <span className="text-xs text-orange-600 mt-1 block">Uploading...</span>
                        )}
                        {missingRequired && !uploading && (
                            <span className="text-xs text-red-500 mt-1 block">
                                {title} is required.
                            </span>
                        )}
                    </div>
                ) : currentFile ? (
                    <div className="flex items-center">
                        <a
                            className="text-orange-600 underline underline-offset-2 text-sm font-medium break-words hover:text-orange-700"
                            href={currentFile}
                            target="_blank"
                            rel="noreferrer"
                        >
                            View File
                        </a>
                        <CopyButton value={currentFile} title={title} />
                    </div>
                ) : (
                    <Placeholder label="No file uploaded" />
                )}
                {error && <span className="mt-1 text-xs text-red-600">{error}</span>}
            </div>
        </div>
    );
}

/* ---------------- Card ----------------- */
function Card({
    children,
    title,
    onEdit,
    isEditing,
    onSave,
    onCancel,
}: {
    children: React.ReactNode;
    title: string;
    onEdit?: () => void;
    isEditing?: boolean;
    onSave?: () => void;
    onCancel?: () => void;
}) {
    return (
        <div className={`bg-white border p-4 sm:p-6 transition-colors ${isEditing ? "border-orange-400 ring-1 ring-orange-400" : "border-gray-300"}`}>
            <div className="flex items-center justify-between gap-3 pb-4 mb-1 border-b border-gray-200">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 border-l-4 border-orange-500 pl-3 leading-tight">
                    {title}
                </h3>
                {isEditing ? (
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                            onClick={onSave}
                            className="inline-flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 px-3.5 py-1.5 text-sm font-semibold text-white transition-colors"
                        >
                            <Save size={15} /> Save
                        </button>
                        <button
                            onClick={onCancel}
                            className="inline-flex items-center gap-1.5 border border-gray-300 bg-white px-3.5 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            <X size={15} /> Cancel
                        </button>
                    </div>
                ) : (
                    onEdit && (
                        <button
                            onClick={onEdit}
                            className="inline-flex items-center gap-1.5 border border-orange-500 bg-white px-3.5 py-1.5 text-sm font-semibold text-orange-600 hover:bg-orange-500 hover:text-white transition-colors flex-shrink-0"
                        >
                            <Pencil size={14} /> Edit
                        </button>
                    )
                )}
            </div>
            <div>{children}</div>
        </div>
    );
}

function joinArr(v?: string[] | null) {
    if (!v || v.length === 0) return "";
    return v.join(", ");
}

/* ---------------- Main Page ----------------- */
export default function ProfilePage() {
    const { userProfile, updateProfile } = useUserProfile();
    const [editingSection, setEditingSection] = useState<string | null>(null);
    const [editData, setEditData] = useState<Partial<UserProfile>>({});
    const ctx = useContext(UserContext);
    const [showSecretKeyModal, setShowSecretKeyModal] = useState(false);
    const [secretKeyError, setSecretKeyError] = useState<string>("");
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
    const { role } = useOperationsStore();
    const [gmailConnected, setGmailConnected] = useState<boolean | null>(null);

    useEffect(() => {
        const fetchLatestProfile = async () => {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;
            if (!ctx?.userDetails?.email || !ctx?.token) return;

            try {
                const response = await fetch(`${API_BASE_URL}/get-profile?email=${ctx.userDetails.email}`, {
                    headers: {
                        'Authorization': `Bearer ${ctx.token}`
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.userProfile) {
                        updateProfile(data.userProfile);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch latest profile", error);
            }
        };

        fetchLatestProfile();
    }, []);

    useEffect(() => {
        const checkGmailStatus = async () => {
            try {
                const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;
                if (!ctx?.userDetails?.email) return;
                const response = await fetch(`${API_BASE_URL}/gmail/status`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ email: ctx.userDetails.email })
                });
                if (!response.ok) {
                    setGmailConnected(false);
                    return;
                }
                const data = await response.json();
                setGmailConnected(!!data.connected);
            } catch {
                setGmailConnected(false);
            }
        };
        checkGmailStatus();
    }, [ctx?.userDetails?.email]);

    const handleConnectGmail = () => {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;
        if (!ctx?.userDetails?.email) return;
        const url = `${API_BASE_URL}/gmail/auth/google?email=${encodeURIComponent(
            ctx.userDetails.email
        )}`;
        window.open(url, "_blank", "noopener,noreferrer");
    };

    const data = userProfile ?? ({} as UserProfile);
    const displayName =
        `${userProfile?.firstName || ""} ${userProfile?.lastName || ""}`.trim() ||
        (ctx?.userDetails?.name || "").trim();

    const handleEditClick = (section: string) => {
        setEditingSection(section);
        setValidationErrors({});
        // Convert array fields to strings for editing
        const editDataCopy = { ...data };
        if (Array.isArray(editDataCopy.preferredRoles)) {
            editDataCopy.preferredRoles = joinArr(editDataCopy.preferredRoles) as any;
        }
        if (Array.isArray(editDataCopy.preferredLocations)) {
            editDataCopy.preferredLocations = joinArr(editDataCopy.preferredLocations) as any;
        }
        if (Array.isArray(editDataCopy.targetCompanies)) {
            editDataCopy.targetCompanies = joinArr(editDataCopy.targetCompanies) as any;
        }
        // SSN is stored as `ssn` in the DB but the form/edit uses `ssnNumber`.
        (editDataCopy as any).ssnNumber = (data as any).ssn ?? (data as any).ssnNumber ?? "";
        setEditData(editDataCopy);
    };

    const validateLinksSection = () => {
        const errors: Record<string, string> = {};
        const linkedinUrl = editData.linkedinUrl?.trim() || "";
        const resumeUrl = editData.resumeUrl?.trim() || "";

        if (!linkedinUrl) {
            errors.linkedinUrl = "LinkedIn URL is required";
        } else if (!validateUrl(linkedinUrl)) {
            errors.linkedinUrl = "Please enter a valid LinkedIn URL";
        } else if (!linkedinUrl.includes("linkedin.com")) {
            errors.linkedinUrl = "Please enter a valid LinkedIn profile URL";
        }

        if (!resumeUrl) {
            errors.resumeUrl = "Resume upload is required";
        }

        setValidationErrors(errors);
        if (Object.keys(errors).length > 0) {
            toastUtils.error("Please complete the required fields before saving.");
            return false;
        }

        return true;
    };

    const handleSaveClick = () => {
        if (editingSection === "links" && !validateLinksSection()) {
            return;
        }


        if (role === "operations") {
            setSecretKeyError("");
            setShowSecretKeyModal(true);
        } else {
            // For normal users, save directly without secret key
            handleSaveProfile();
        }
    };

    const handleSaveProfile = async () => {
        try {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;
            const token = ctx?.token;
            const email = ctx?.userDetails?.email;

            // Convert string fields to arrays before saving
            const dataToSave = { ...editData };

            // Prefix currency symbol onto expectedSalaryRange if editing professional section
            if (editingSection === "professional" && dataToSave.expectedSalaryRange) {
                const raw = String(dataToSave.expectedSalaryRange).trim();
                if (raw && !/^[£$₹]|^CA\$/.test(raw)) {
                    const amt = String(ctx?.userDetails?.amountPaid || '');
                    const sym = amt.match(/^([^0-9]+)/)?.[1];
                    if (sym === 'CAD') dataToSave.expectedSalaryRange = `CA$${raw}`;
                    else if (sym) dataToSave.expectedSalaryRange = `${sym}${raw}`;
                }
            }
            if (typeof dataToSave.preferredRoles === 'string') {
                dataToSave.preferredRoles = dataToSave.preferredRoles.split(',').map(s => s.trim()).filter(s => s.length > 0) as any;
            }
            if (typeof dataToSave.preferredLocations === 'string') {
                dataToSave.preferredLocations = dataToSave.preferredLocations.split(',').map(s => s.trim()).filter(s => s.length > 0) as any;
            }
            if (typeof dataToSave.targetCompanies === 'string') {
                dataToSave.targetCompanies = dataToSave.targetCompanies.split(',').map(s => s.trim()).filter(s => s.length > 0) as any;
            }

            const res = await fetch(`${API_BASE_URL}/setprofile`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    ...dataToSave,
                    email,
                    token,
                    userDetails: ctx?.userDetails,
                    secretKey: role === "operations" ? "flashfire@2025" : undefined,
                }),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || "Failed to update profile");
            }

            await res.json();
            updateProfile(dataToSave);
            setEditingSection(null);
            setEditData({});
            toastUtils.success(toastMessages.profileUpdated);
        } catch (error: any) {
            toastUtils.error(error.message || toastMessages.profileError);
        }
    };

    const handleSecretKeyConfirm = async (secretKey: string) => {
        if (secretKey !== "flashfire@2025") {
            setSecretKeyError("Incorrect secret key. Please try again.");
            return;
        }
        setShowSecretKeyModal(false);
        setSecretKeyError("");
        await handleSaveProfile();
    };

    const handleCancel = () => {
        setEditingSection(null);
        setEditData({});
        setValidationErrors({});
    };

    if (!userProfile && !ctx?.userDetails) {
        return (
            <div className="min-h-[calc(100vh-64px)] bg-gray-50 flex items-center justify-center px-4">
                <div className="text-center">
                    <h1 className="text-2xl font-semibold text-gray-900 mb-4">
                        Profile Not Found
                    </h1>
                    <p className="text-gray-600">Please complete your profile first.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            {/* Inner width matches the sections below (max-w-5xl) so the back
                button and title line up with the cards instead of hugging the
                viewport edge. */}
            <div className="bg-white border-b border-gray-200 border-t-4 border-t-orange-500">
                <div className="mx-auto max-w-5xl px-4 sm:px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 w-full sm:justify-between">
                        <div className="flex items-center gap-4 min-w-0">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-orange-500 text-white flex items-center justify-center text-xl sm:text-2xl font-bold uppercase flex-shrink-0">
                                {(displayName || ctx?.userDetails?.email || "?").charAt(0)}
                            </div>
                            <div className="min-w-0">
                                {displayName && (
                                    <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight truncate">
                                        {displayName}
                                    </h1>
                                )}
                                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                                    {ctx?.userDetails?.email && (
                                        <span className="inline-flex items-center gap-1.5 text-sm text-gray-500 min-w-0">
                                            <Mail size={14} className="flex-shrink-0 text-gray-400" />
                                            <span className="break-all">{ctx.userDetails.email}</span>
                                        </span>
                                    )}
                                    {ctx?.userDetails?.planType && (
                                        <span className="inline-flex items-center gap-1 bg-orange-50 border border-orange-200 px-2 py-0.5 text-xs font-semibold text-orange-700">
                                            <Crown size={12} />
                                            {ctx.userDetails.planType}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {gmailConnected !== null && role === 'operations' && (
                        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                            {gmailConnected ? (
                                <button
                                    type="button"
                                    onClick={handleConnectGmail}
                                    className="inline-flex items-center gap-2 bg-white px-4 py-2 text-sm font-medium text-emerald-700 border border-emerald-300 hover:bg-emerald-50 transition-colors"
                                    title="Click to change or reconnect the Gmail account used for recruiter outreach"
                                >
                                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                                    <span>
                                        Gmail connected for recruiter outreach
                                        <span className="ml-1 underline decoration-emerald-400 decoration-dotted">
                                            (click to change)
                                        </span>
                                    </span>
                                </button>
                            ) : (
                                <button
                                    onClick={handleConnectGmail}
                                    className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-sm font-semibold text-white px-4 py-2 transition-colors"
                                >
                                    <span className="inline-block h-2 w-2 rounded-full bg-red-300" />
                                    <span>Connect Gmail for recruiter emails</span>
                                </button>
                            )}
                        </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Sections */}
            <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-6">
                {/* Personal */}
                <Card
                    title="Personal Details"
                    onEdit={() => handleEditClick("personal")}
                    isEditing={editingSection === "personal"}
                    onSave={handleSaveClick}
                    onCancel={handleCancel}
                >
                    <InfoRow
                        title="First Name"
                        value={editingSection === "personal" ? editData.firstName : data.firstName}
                        isEditing={editingSection === "personal"}
                        onValueChange={(v) => setEditData({ ...editData, firstName: v })}
                    />
                    <InfoRow
                        title="Last Name"
                        value={editingSection === "personal" ? editData.lastName : data.lastName}
                        isEditing={editingSection === "personal"}
                        onValueChange={(v) => setEditData({ ...editData, lastName: v })}
                    />
                    <InfoRow
                        title="Contact Number"
                        value={editingSection === "personal" ? editData.contactNumber : data.contactNumber}
                        isEditing={editingSection === "personal"}
                        onValueChange={(v) => setEditData({ ...editData, contactNumber: v })}
                    />
                    {editingSection === "personal" ? (
                        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4 py-3.5 border-b border-gray-100">
                            <div className="w-full md:w-1/3 text-sm font-medium text-gray-500">Date of Birth</div>
                            <div className="w-full md:w-2/3">
                                <DatePicker
                                    value={editData.dob ? editData.dob.split('T')[0] : ""}
                                    onChange={(v) => setEditData({ ...editData, dob: v })}
                                    placeholder="Select date of birth"
                                    maxDate={new Date(new Date().setFullYear(new Date().getFullYear() - 16)).toISOString().split('T')[0]}
                                />
                            </div>
                        </div>
                    ) : (
                        <InfoRow
                            title="Date of Birth"
                            value={formatDateOnly(data.dob)}
                            isEditing={false}
                        />
                    )}
                    <TextAreaRow
                        title="Address"
                        value={editingSection === "personal" ? editData.address : data.address}
                        isEditing={editingSection === "personal"}
                        onValueChange={(v) => setEditData({ ...editData, address: v })}
                    />
                    <InfoRow
                        title="Visa Status"
                        value={editingSection === "personal" ? editData.visaStatus : data.visaStatus}
                        isEditing={editingSection === "personal"}
                        onValueChange={(v) => setEditData({ ...editData, visaStatus: v })}
                    />
                    {userProfile?.visaStatus == 'Other' && <InfoRow
                        title="Other Visa Status"
                        value={editingSection === "personal" ? editData.otherVisaType : data.otherVisaType}
                        isEditing={editingSection === "personal"}
                        onValueChange={(v) => setEditData({ ...editData, otherVisaType: v })}
                    />}
                    {ctx?.userDetails?.role === 'operations' && (
                        <InfoRow
                            title="Removed by users"
                            value={String(userProfile?.removedJobsCount || 0)}
                            isEditing={false} // Always read-only
                        />
                    )}
                </Card>

                {/* Education */}
                <Card
                    title="Education"
                    onEdit={() => handleEditClick("education")}
                    isEditing={editingSection === "education"}
                    onSave={handleSaveClick}
                    onCancel={handleCancel}
                >
                    <InfoRow
                        title="Bachelor's (University • Degree • Duration)"
                        value={
                            editingSection === "education"
                                ? editData.bachelorsUniDegree
                                : data.bachelorsUniDegree
                        }
                        isEditing={editingSection === "education"}
                        onValueChange={(v) => setEditData({ ...editData, bachelorsUniDegree: v })}
                    />
                    {editingSection === "education" ? (
                        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4 py-3.5 border-b border-gray-100">
                            <div className="w-full md:w-1/3 text-sm font-medium text-gray-500">
                                Bachelor's Start Date
                            </div>
                            <div className="w-full md:w-2/3">
                                <DatePicker
                                    value={extractDatePart(editData.bachelorsStartDate || data.bachelorsStartDate)}
                                    onChange={(v) => setEditData({ ...editData, bachelorsStartDate: v })}
                                    placeholder="dd/mm/yyyy"
                                />
                            </div>
                        </div>
                    ) : (
                        <InfoRow
                            title="Bachelor's Start Date"
                            value={data.bachelorsStartDate ? formatDateOnly(data.bachelorsStartDate) : undefined}
                        />
                    )}
                    {editingSection === "education" ? (
                        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4 py-3.5 border-b border-gray-100">
                            <div className="w-full md:w-1/3 text-sm font-medium text-gray-500">
                                Bachelor's End Date (Graduation)
                            </div>
                            <div className="w-full md:w-2/3">
                                <DatePicker
                                    value={extractDatePart(
                                        editData.bachelorsEndDate || 
                                        (editData.bachelorsGradMonthYear ? editData.bachelorsGradMonthYear + '-01' : '') || 
                                        data.bachelorsEndDate || 
                                        (data.bachelorsGradMonthYear ? data.bachelorsGradMonthYear + '-01' : '')
                                    )}
                                    onChange={(v) => {
                                        setEditData({ 
                                            ...editData, 
                                            bachelorsEndDate: v,
                                            bachelorsGradMonthYear: v ? v.slice(0, 7) : ''
                                        });
                                    }}
                                    placeholder="dd/mm/yyyy"
                                    minDate={extractDatePart(editData.bachelorsStartDate || data.bachelorsStartDate)}
                                />
                            </div>
                        </div>
                    ) : (
                        <InfoRow
                            title="Bachelor's End Date (MM-YYYY)"
                            value={
                                data.bachelorsEndDate 
                                    ? (() => {
                                        const datePart = extractDatePart(data.bachelorsEndDate);
                                        try {
                                            const date = parse(datePart, "yyyy-MM-dd", new Date());
                                            return format(date, "MM/yyyy");
                                        } catch {
                                            return datePart.slice(0, 7); // Return YYYY-MM part
                                        }
                                    })()
                                    : data.bachelorsGradMonthYear || ""
                            }
                        />
                    )}
                    <InfoRow
                        title="Bachelor's GPA"
                        value={
                            editingSection === "education"
                                ? editData.bachelorsGPA
                                : data.bachelorsGPA
                        }
                        isEditing={editingSection === "education"}
                        onValueChange={(v) => setEditData({ ...editData, bachelorsGPA: v })}
                    />
                    <InfoRow
                        title="Master's (University • Degree • Duration)"
                        value={
                            editingSection === "education"
                                ? editData.mastersUniDegree
                                : data.mastersUniDegree
                        }
                        isEditing={editingSection === "education"}
                        onValueChange={(v) => setEditData({ ...editData, mastersUniDegree: v })}
                    />
                    {editingSection === "education" ? (
                        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4 py-3.5 border-b border-gray-100">
                            <div className="w-full md:w-1/3 text-sm font-medium text-gray-500">
                                Master's Start Date (Optional)
                            </div>
                            <div className="w-full md:w-2/3">
                                <DatePicker
                                    value={extractDatePart(editData.mastersStartDate || data.mastersStartDate)}
                                    onChange={(v) => setEditData({ ...editData, mastersStartDate: v })}
                                    placeholder="dd/mm/yyyy"
                                    required={false}
                                />
                            </div>
                        </div>
                    ) : (
                        <InfoRow
                            title="Master's Start Date"
                            value={data.mastersStartDate ? formatDateOnly(data.mastersStartDate) : undefined}
                        />
                    )}
                    {editingSection === "education" ? (
                        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4 py-3.5 border-b border-gray-100">
                            <div className="w-full md:w-1/3 text-sm font-medium text-gray-500">
                                Master's End Date (Graduation) (Optional)
                            </div>
                            <div className="w-full md:w-2/3">
                                <DatePicker
                                    value={extractDatePart(
                                        editData.mastersEndDate || 
                                        (editData.mastersGradMonthYear ? editData.mastersGradMonthYear + '-01' : '') || 
                                        data.mastersEndDate || 
                                        (data.mastersGradMonthYear ? data.mastersGradMonthYear + '-01' : '')
                                    )}
                                    onChange={(v) => {
                                        setEditData({ 
                                            ...editData, 
                                            mastersEndDate: v,
                                            mastersGradMonthYear: v ? v.slice(0, 7) : ''
                                        });
                                    }}
                                    placeholder="dd/mm/yyyy"
                                    required={false}
                                    minDate={extractDatePart(editData.mastersStartDate || data.mastersStartDate)}
                                />
                            </div>
                        </div>
                    ) : (
                        <InfoRow
                            title="Master's End Date (MM-YYYY)"
                            value={
                                data.mastersEndDate 
                                    ? (() => {
                                        const datePart = extractDatePart(data.mastersEndDate);
                                        try {
                                            const date = parse(datePart, "yyyy-MM-dd", new Date());
                                            return format(date, "MM/yyyy");
                                        } catch {
                                            return datePart.slice(0, 7); // Return YYYY-MM part
                                        }
                                    })()
                                    : data.mastersGradMonthYear || ""
                            }
                        />
                    )}
                    <InfoRow
                        title="Master's GPA"
                        value={
                            editingSection === "education"
                                ? editData.mastersGPA
                                : data.mastersGPA
                        }
                        isEditing={editingSection === "education"}
                        onValueChange={(v) => setEditData({ ...editData, mastersGPA: v })}
                    />
                </Card>

                {/* Professional */}
                <Card
                    title="Professional"
                    onEdit={() => handleEditClick("professional")}
                    isEditing={editingSection === "professional"}
                    onSave={handleSaveClick}
                    onCancel={handleCancel}
                >
                    <InfoRow
                        title="Preferred Roles"
                        value={
                            editingSection === "professional"
                                ? (typeof editData.preferredRoles === 'string' 
                                    ? editData.preferredRoles 
                                    : joinArr(editData.preferredRoles))
                                : joinArr(data.preferredRoles)
                        }
                        isEditing={editingSection === "professional"}
                        onValueChange={(v) =>
                            setEditData({ ...editData, preferredRoles: v as any })
                        }
                    />
                    <InfoRow
                        title="Experience Level"
                        value={
                            editingSection === "professional"
                                ? editData.experienceLevel
                                : data.experienceLevel
                        }
                        isEditing={editingSection === "professional"}
                        onValueChange={(v) =>
                            setEditData({ ...editData, experienceLevel: v })
                        }
                    />
                    <InfoRow
                        title="Years of Experience (YOE)"
                        value={
                            editingSection === "professional"
                                ? String((editData as any).yearsOfExperience ?? "")
                                : String((data as any).yearsOfExperience ?? "")
                        }
                        isEditing={editingSection === "professional"}
                        onValueChange={(v) =>
                            setEditData({ ...editData, yearsOfExperience: v } as any)
                        }
                    />
                    {editingSection === "professional" ? (
                        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4 py-3.5 border-b border-gray-100">
                            <div className="w-full md:w-1/3 text-sm font-medium text-gray-500">
                                Expected Base Salary
                            </div>
                            <div className="w-full md:w-2/3">
                                <div className="relative flex items-center">
                                    <span className="absolute left-3 text-gray-500 text-sm pointer-events-none select-none">
                                        {(() => {
                                            const amt = String(ctx?.userDetails?.amountPaid || '');
                                            const sym = amt.match(/^([^0-9]+)/)?.[1];
                                            if (sym === 'CAD') return 'CA$';
                                            if (sym) return sym;
                                            return '$';
                                        })()}
                                    </span>
                                    <input
                                        type="text"
                                        value={(() => {
                                            const v = editData.expectedSalaryRange || '';
                                            return v.replace(/^[£$₹]|^CA\$/, '');
                                        })()}
                                        onChange={(e) =>
                                            setEditData({ ...editData, expectedSalaryRange: e.target.value })
                                        }
                                        className="w-full text-sm text-gray-900 bg-white border border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none py-2 pr-3"
                                        style={{ paddingLeft: '2.25rem' }}
                                        placeholder="e.g. 60,000"
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <InfoRow
                            title="Expected Base Salary"
                            value={data.expectedSalaryRange}
                        />
                    )}
                    <InfoRow
                        title="Preferred Locations"
                        value={
                            editingSection === "professional"
                                ? (typeof editData.preferredLocations === 'string' 
                                    ? editData.preferredLocations 
                                    : joinArr(editData.preferredLocations))
                                : joinArr(data.preferredLocations)
                        }
                        isEditing={editingSection === "professional"}
                        onValueChange={(v) =>
                            setEditData({ ...editData, preferredLocations: v as any })
                        }
                    />
                    <InfoRow
                        title="Target Companies"
                        value={
                            editingSection === "professional"
                                ? (typeof editData.targetCompanies === 'string' 
                                    ? editData.targetCompanies 
                                    : joinArr(editData.targetCompanies))
                                : joinArr(data.targetCompanies)
                        }
                        isEditing={editingSection === "professional"}
                        onValueChange={(v) =>
                            setEditData({ ...editData, targetCompanies: v as any })
                        }
                    />
                    <CheckboxGroupRow
                        title="Employment Types"
                        options={["Full-time", "Part-time", "Contract", "Internship"]}
                        value={
                            (editingSection === "professional"
                                ? editData.employmentTypes
                                : data.employmentTypes) as string[] | undefined
                            ?? (data.employmentTypes ?? ["Full-time"])
                        }
                        isEditing={editingSection === "professional"}
                        onValueChange={(v) =>
                            setEditData({ ...editData, employmentTypes: v as any })
                        }
                    />
                    <TextAreaRow
                        title="Reason for Leaving"
                        value={
                            editingSection === "professional"
                                ? editData.reasonForLeaving
                                : data.reasonForLeaving
                        }
                        isEditing={editingSection === "professional"}
                        onValueChange={(v) =>
                            setEditData({ ...editData, reasonForLeaving: v })
                        }
                    />
                </Card>

                {/* Links & Documents */}
                <Card
                    title="Links & Documents"
                    onEdit={() => handleEditClick("links")}
                    isEditing={editingSection === "links"}
                    onSave={handleSaveClick}
                    onCancel={handleCancel}
                >
                    <InfoRow
                        title="LinkedIn"
                        value={editingSection === "links" ? editData.linkedinUrl : data.linkedinUrl}
                        isEditing={editingSection === "links"}
                        required
                        error={editingSection === "links" ? validationErrors.linkedinUrl : undefined}
                        onValueChange={(v) => {
                            setEditData({ ...editData, linkedinUrl: v });
                            if (validationErrors.linkedinUrl) {
                                setValidationErrors({ ...validationErrors, linkedinUrl: "" });
                            }
                        }}
                    />
                    <InfoRow
                        title="GitHub"
                        value={editingSection === "links" ? editData.githubUrl : data.githubUrl}
                        isEditing={editingSection === "links"}
                        onValueChange={(v) => setEditData({ ...editData, githubUrl: v })}
                    />
                    <InfoRow
                        title="Portfolio"
                        value={
                            editingSection === "links" ? editData.portfolioUrl : data.portfolioUrl
                        }
                        isEditing={editingSection === "links"}
                        onValueChange={(v) => setEditData({ ...editData, portfolioUrl: v })}
                    />
                    <FileUploadRow
                        title="Resume"
                        currentFile={
                            editingSection === "links" ? editData.resumeUrl : data.resumeUrl
                        }
                        isEditing={editingSection === "links"}
                        required
                        error={editingSection === "links" ? validationErrors.resumeUrl : undefined}
                        onFileChange={(v) => {
                            setEditData({ ...editData, resumeUrl: v });
                            if (validationErrors.resumeUrl) {
                                setValidationErrors({ ...validationErrors, resumeUrl: "" });
                            }
                        }}
                    />
                    <FileUploadRow
                        title="Cover Letter"
                        currentFile={
                            editingSection === "links" ? editData.coverLetterUrl : data.coverLetterUrl
                        }
                        isEditing={editingSection === "links"}
                        onFileChange={(v) => setEditData({ ...editData, coverLetterUrl: v })}
                    />
                    <FileUploadRow
                        title="Portfolio File"
                        currentFile={
                            editingSection === "links"
                                ? editData.portfolioFileUrl
                                : data.portfolioFileUrl
                        }
                        isEditing={editingSection === "links"}
                        onFileChange={(v) => setEditData({ ...editData, portfolioFileUrl: v })}
                    />
                </Card>

                {/* Terms & Accuracy */}
                <Card
                    title="Terms & Accuracy"
                    onEdit={() => handleEditClick("compliance")}
                    isEditing={editingSection === "compliance"}
                    onSave={handleSaveClick}
                    onCancel={handleCancel}
                >
                    <InfoRow
                        title="SSN Number"
                        value={
                            editingSection === "compliance" ? editData.ssnNumber : ((data as any).ssn ?? data.ssnNumber)
                        }
                        isEditing={editingSection === "compliance"}
                        onValueChange={(v) => setEditData({ ...editData, ssnNumber: v })}
                    />
                    <TextAreaRow
                        title="Expected Salary Narrative"
                        value={
                            editingSection === "compliance"
                                ? editData.expectedSalaryNarrative
                                : data.expectedSalaryNarrative
                        }
                        isEditing={editingSection === "compliance"}
                        onValueChange={(v) =>
                            setEditData({ ...editData, expectedSalaryNarrative: v })
                        }
                    />
                    <InfoRow
                        title="Join Time"
                        value={editingSection === "compliance" ? editData.joinTime : data.joinTime}
                        isEditing={editingSection === "compliance"}
                        onValueChange={(v) => setEditData({ ...editData, joinTime: v })}
                    />
                    <InfoRow title="Confirm Accuracy" value={data.confirmAccuracy ? "Yes" : "No"} />
                    <InfoRow title="Agree to Terms" value={data.agreeTos ? "Yes" : "No"} />
                </Card>

                {/* Additional */}
                <Card
                    title="Additional Information"
                    onEdit={() => handleEditClick("additional")}
                    isEditing={editingSection === "additional"}
                    onSave={handleSaveClick}
                    onCancel={handleCancel}
                >
                    <InfoRow
                        title="Are you a veteran?"
                        value={editingSection === "additional" ? editData.veteranStatus : (data.veteranStatus || "No")}
                        isEditing={editingSection === "additional"}
                        onValueChange={(v) => setEditData({ ...editData, veteranStatus: v })}
                    />
                    <InfoRow
                        title="Do you have a disability?"
                        value={editingSection === "additional" ? editData.disabilityStatus : (data.disabilityStatus || "No")}
                        isEditing={editingSection === "additional"}
                        onValueChange={(v) => setEditData({ ...editData, disabilityStatus: v })}
                    />
                    <InfoRow
                        title="Will you require a sponsorship?"
                        value={editingSection === "additional" ? editData.scholarshipRequired : (data.scholarshipRequired || "No")}
                        isEditing={editingSection === "additional"}
                        onValueChange={(v) => setEditData({ ...editData, scholarshipRequired: v })}
                    />
                    <InfoRow
                        title="Are you eligible to work in United States?"
                        value={editingSection === "additional" ? editData.usWorkEligibility : (data.usWorkEligibility || "Yes")}
                        isEditing={editingSection === "additional"}
                        onValueChange={(v) => setEditData({ ...editData, usWorkEligibility: v })}
                    />
                    <TextAreaRow
                        title="When are you able to join the company?"
                        value={editingSection === "additional" ? editData.availabilityNote : (() => {
                            if (data.availabilityNote?.trim()) {
                                return data.availabilityNote;
                            }
                            const joinTime = data.joinTime;
                            if (!joinTime) {
                                return "I am available to start within 2 weeks of receiving offer.";
                            }
                            const timeMap: Record<string, string> = {
                                "in 1 week": "I am available to start within 1 week of receiving offer.",
                                "in 2 week": "I am available to start within 2 weeks of receiving offer.",
                                "in 2 weeks": "I am available to start within 2 weeks of receiving offer.",
                                "in 3 week": "I am available to start within 3 weeks of receiving offer.",
                                "in 3 weeks": "I am available to start within 3 weeks of receiving offer.",
                                "in 4 week": "I am available to start within 4 weeks of receiving offer.",
                                "in 4 weeks": "I am available to start within 4 weeks of receiving offer.",
                                "in 6-7 week":
                                    "I am available to start within 6-7 weeks of receiving offer.",
                                "in 6-7 weeks":
                                    "I am available to start within 6-7 weeks of receiving offer.",
                            };
                            return (
                                timeMap[joinTime] ||
                                "I am available to start within 2 weeks of receiving offer."
                            );
                        })()}
                        isEditing={editingSection === "additional"}
                        onValueChange={(v) => setEditData({ ...editData, availabilityNote: v })}
                    />
                    <TextAreaRow
                        title="How much salary are you expecting?"
                        value={editingSection === "additional" ? editData.expectedSalaryNarrative : (() => {
                            if (data.expectedSalaryNarrative?.trim()) {
                                return data.expectedSalaryNarrative;
                            }
                            const salaryRange = data.expectedSalaryRange || "";
                            if (!salaryRange || salaryRange.toLowerCase().includes("other")) {
                                return "";
                            }
                            return `I'm seeking a salary of ${salaryRange} annually, depending on the overall compensation package, responsibilities, and growth opportunities within the role.`;
                        })()}
                        isEditing={editingSection === "additional"}
                        onValueChange={(v) => setEditData({ ...editData, expectedSalaryNarrative: v })}
                    />
                    <InfoRow
                        title="Referred by"
                        value={editingSection === "additional" ? editData.referredBy : data.referredBy}
                        isEditing={editingSection === "additional"}
                        onValueChange={(v) => setEditData({ ...editData, referredBy: v })}
                    />
                </Card>

                {/* Credentials */}
                <Card title="Account Access Credentials">
                    <div className="bg-orange-50 border border-orange-200 border-l-4 border-l-orange-500 p-4 mt-4 mb-4">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 bg-orange-500"></div>
                            <span className="text-sm font-semibold text-orange-800">
                                Account Credentials
                            </span>
                        </div>
                        <p className="text-sm text-orange-700">
                            These are the credentials which you can use while applying in
                            different portals.
                        </p>
                    </div>
                    <InfoRow
                        title="Username / Email"
                        value={ctx?.userDetails?.email || "Not available"}
                    />
                    <InfoRow title="Password" value="Flashfire@1357" />
                    <div className="mt-4 p-4 bg-gray-50 border border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">
                            Important Notes:
                        </h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                            <li>• Password is standardized across all dashboard accounts</li>
                            <li>
                                • Keep these credentials secure and do not share with unauthorized
                                personnel
                            </li>
                        </ul>
                    </div>
                </Card>
            </div>

            {/* Secret Key Modal */}
            <SecretKeyModal
                isOpen={showSecretKeyModal}
                onClose={() => {
                    setShowSecretKeyModal(false);
                    setSecretKeyError("");
                }}
                onConfirm={handleSecretKeyConfirm}
                error={secretKeyError}
            />
        </div>
    );
}
