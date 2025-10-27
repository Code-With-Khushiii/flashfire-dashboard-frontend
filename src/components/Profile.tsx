import React, { useMemo, useState, useContext } from "react";
import { Pencil, Save, X, ArrowLeft, Copy, Check } from "lucide-react";
import { useUserProfile, UserProfile } from "../state_management/ProfileContext";
import { UserContext } from "../state_management/UserContext";
import { Link } from "react-router-dom";
import { toastUtils, toastMessages } from "../utils/toast";

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
            className="ml-2 p-1 rounded hover:bg-gray-100 transition-colors"
            title={`Copy ${title}`}
        >
            {copied ? (
                <Check size={16} className="text-green-600" />
            ) : (
                <Copy size={16} className="text-gray-500" />
            )}
        </button>
    );
}

/* ---------------- Reusable Layout Rows ----------------- */
function InfoRow({
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
        <div className="flex flex-col md:flex-row md:items-center py-3 border-b border-gray-100 last:border-b-0">
            <div className="w-full md:w-1/3 text-sm font-semibold text-gray-700 mb-1 md:mb-0">
                {title}
            </div>
            <div className="w-full md:w-2/3 flex items-center">
                {isEditing ? (
                    <input
                        type="text"
                        value={value || ""}
                        onChange={(e) => onValueChange(e.target.value)}
                        className="w-full text-sm border-b border-gray-300 px-2 py-1 focus:border-blue-500 focus:outline-none"
                        placeholder={`Enter ${title.toLowerCase()}`}
                    />
                ) : (
                    <>
                        <span className="flex-1 text-sm text-gray-900 break-words">
                            {value || <Placeholder />}
                        </span>
                        {value && <CopyButton value={value} title={title} />}
                    </>
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
        <div className="flex flex-col md:flex-row md:items-start py-3 border-b border-gray-100 last:border-b-0">
            <div className="w-full md:w-1/3 text-sm font-semibold text-gray-700 pt-1 mb-1 md:mb-0">
                {title}
            </div>
            <div className="w-full md:w-2/3 flex items-center">
                {isEditing ? (
                    <textarea
                        value={value || ""}
                        onChange={(e) => onValueChange(e.target.value)}
                        className="w-full text-sm border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none rounded-lg"
                        rows={3}
                        placeholder={`Enter ${title.toLowerCase()}`}
                    />
                ) : (
                    <>
                        <span className="flex-1 text-sm text-gray-900 break-words">
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
    onFileChange = () => { },
}: {
    title: string;
    currentFile?: string;
    isEditing?: boolean;
    onFileChange?: (file: string) => void;
}) {
    const [uploading, setUploading] = useState(false);

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
        <div className="flex flex-col md:flex-row md:items-start py-3 border-b border-gray-100 last:border-b-0">
            <div className="w-full md:w-1/3 text-sm font-semibold text-gray-700 pt-1 mb-1 md:mb-0">
                {title}
            </div>
            <div className="w-full md:w-2/3 flex items-center flex-wrap">
                {isEditing ? (
                    <div className="w-full">
                        <input
                            type="file"
                            accept=".pdf,.doc,.docx"
                            disabled={uploading}
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    handleFileUpload(file);
                                }
                            }}
                            className="block w-full text-sm text-gray-500"
                        />
                        {uploading && (
                            <span className="text-xs text-orange-600 mt-1">Uploading...</span>
                        )}
                    </div>
                ) : currentFile ? (
                    <>
                        <a
                            className="text-blue-600 underline text-sm break-words hover:text-blue-800"
                            href={currentFile}
                            target="_blank"
                            rel="noreferrer"
                        >
                            View File
                        </a>
                        <CopyButton value={currentFile} title={title} />
                    </>
                ) : (
                    <Placeholder label="No file uploaded" />
                )}
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-0">
                    {title}
                </h3>
                {isEditing ? (
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={onSave}
                            className="inline-flex items-center gap-2 bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 rounded-lg"
                        >
                            <Save size={16} /> Save
                        </button>
                        <button
                            onClick={onCancel}
                            className="inline-flex items-center gap-2 border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 rounded-lg"
                        >
                            <X size={16} /> Cancel
                        </button>
                    </div>
                ) : (
                    onEdit && (
                        <button
                            onClick={onEdit}
                            className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-rose-600 px-3 py-2 text-sm font-semibold text-white hover:opacity-90 rounded-lg"
                        >
                            <Pencil size={16} /> Edit
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

    const data = userProfile ?? ({} as UserProfile);

    const handleEditClick = (section: string) => {
        setEditingSection(section);
        setEditData(data);
    };

    const handleSave = async () => {
        try {
            const userKey = prompt("Enter the edit key to save changes:");
            if (userKey !== "flashfire2025") {
                toastUtils.error("Incorrect edit key. Changes not saved.");
                return;
            }

            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;
            const token = ctx?.token;
            const email = ctx?.userDetails?.email;

            const res = await fetch(`${API_BASE_URL}/setprofile`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    ...editData,
                    email,
                    token,
                    userDetails: ctx?.userDetails,
                }),
            });

            if (!res.ok) throw new Error("Failed to update profile");

            await res.json();
            updateProfile(editData);
            setEditingSection(null);
            setEditData({});
            toastUtils.success(toastMessages.profileUpdated);
        } catch {
            toastUtils.error(toastMessages.profileError);
        }
    };

    const handleCancel = () => {
        setEditingSection(null);
        setEditData({});
    };

    const fullName = useMemo(() => {
        const fn = data.firstName?.trim() || "";
        const ln = data.lastName?.trim() || "";
        return [fn, ln].filter(Boolean).join(" ") || "Your Name";
    }, [data.firstName, data.lastName]);

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
            <div className="bg-gradient-to-r from-orange-500 to-rose-500 shadow-md">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    {/* Back button */}
                    <div className="flex justify-center sm:justify-start w-full sm:w-auto">
                        <Link
                            to="/"
                            className="flex items-center gap-2 rounded-lg bg-white/20 backdrop-blur-sm px-4 py-2 text-white hover:bg-white/30 transition-all duration-200"
                        >
                            <ArrowLeft size={16} />
                            <span className="text-sm font-medium">Back to Dashboard</span>
                        </Link>
                    </div>

                    {/* Centered profile title block */}
                    <div className="flex-1 text-center">
                        <p className="text-xs uppercase tracking-wider text-white/80 font-semibold">
                            Professional Profile
                        </p>
                        <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-white drop-shadow-md">
                            {fullName}
                        </h1>
                    </div>
                </div>
            </div>

            {/* Sections */}
            <div className="mx-auto max-w-5xl px-3 sm:px-6 py-8 sm:py-12 space-y-6 sm:space-y-10">
                {/* Personal */}
                <Card
                    title="Personal Details"
                    onEdit={() => handleEditClick("personal")}
                    isEditing={editingSection === "personal"}
                    onSave={handleSave}
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
                    <InfoRow
                        title="Date of Birth"
                        value={editingSection === "personal" ? editData.dob : data.dob}
                        isEditing={editingSection === "personal"}
                        onValueChange={(v) => setEditData({ ...editData, dob: v })}
                    />
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
                </Card>

                {/* Educations */}
                <Card
                    title="Education"
                    onEdit={() => handleEditClick("education")}
                    isEditing={editingSection === "education"}
                    onSave={handleSave}
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
                    <InfoRow
                        title="Bachelor's Grad (MM-YYYY)"
                        value={
                            editingSection === "education"
                                ? editData.bachelorsGradMonthYear
                                : data.bachelorsGradMonthYear
                        }
                        isEditing={editingSection === "education"}
                        onValueChange={(v) =>
                            setEditData({ ...editData, bachelorsGradMonthYear: v })
                        }
                    />
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
                    <InfoRow
                        title="Master's Grad (MM-YYYY)"
                        value={
                            editingSection === "education"
                                ? editData.mastersGradMonthYear
                                : data.mastersGradMonthYear
                        }
                        isEditing={editingSection === "education"}
                        onValueChange={(v) =>
                            setEditData({ ...editData, mastersGradMonthYear: v })
                        }
                    />
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
                    onSave={handleSave}
                    onCancel={handleCancel}
                >
                    <InfoRow
                        title="Preferred Roles"
                        value={
                            editingSection === "professional"
                                ? joinArr(editData.preferredRoles)
                                : joinArr(data.preferredRoles)
                        }
                        isEditing={editingSection === "professional"}
                        onValueChange={(v) =>
                            setEditData({ ...editData, preferredRoles: v.split(",") })
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
                        title="Expected Base Salary"
                        value={
                            editingSection === "professional"
                                ? editData.expectedSalaryRange
                                : data.expectedSalaryRange
                        }
                        isEditing={editingSection === "professional"}
                        onValueChange={(v) =>
                            setEditData({ ...editData, expectedSalaryRange: v })
                        }
                    />
                    <InfoRow
                        title="Preferred Locations"
                        value={
                            editingSection === "professional"
                                ? joinArr(editData.preferredLocations)
                                : joinArr(data.preferredLocations)
                        }
                        isEditing={editingSection === "professional"}
                        onValueChange={(v) =>
                            setEditData({ ...editData, preferredLocations: v.split(",") })
                        }
                    />
                    <InfoRow
                        title="Target Companies"
                        value={
                            editingSection === "professional"
                                ? joinArr(editData.targetCompanies)
                                : joinArr(data.targetCompanies)
                        }
                        isEditing={editingSection === "professional"}
                        onValueChange={(v) =>
                            setEditData({ ...editData, targetCompanies: v.split(",") })
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
                    onSave={handleSave}
                    onCancel={handleCancel}
                >
                    <InfoRow
                        title="LinkedIn"
                        value={editingSection === "links" ? editData.linkedinUrl : data.linkedinUrl}
                        isEditing={editingSection === "links"}
                        onValueChange={(v) => setEditData({ ...editData, linkedinUrl: v })}
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
                        onFileChange={(v) => setEditData({ ...editData, resumeUrl: v })}
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
                    onSave={handleSave}
                    onCancel={handleCancel}
                >
                    <InfoRow
                        title="SSN Number"
                        value={
                            editingSection === "compliance" ? editData.ssnNumber : data.ssnNumber
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
                <Card title="Additional Information">
                    <InfoRow title="Are you veteran?" value="No" />
                    <InfoRow title="Do you have disability?" value="No" />
                    <InfoRow title="Will you require scholarship?" value="No" />
                    <InfoRow
                        title="Are you eligible to work in United States?"
                        value="Yes"
                    />
                    <TextAreaRow
                        title="When are you able to join the company?"
                        value={(() => {
                            const joinTime = data.joinTime;
                            if (!joinTime) {
                                return "I am available to start within 2 weeks of receiving offer.";
                            }
                            const timeMap: Record<string, string> = {
                                "in 1 week": "I am available to start within 1 week of receiving offer.",
                                "in 2 week": "I am available to start within 2 weeks of receiving offer.",
                                "in 3 week": "I am available to start within 3 weeks of receiving offer.",
                                "in 4 week": "I am available to start within 4 weeks of receiving offer.",
                                "in 6-7 week":
                                    "I am available to start within 6-7 weeks of receiving offer.",
                            };
                            return (
                                timeMap[joinTime] ||
                                "I am available to start within 2 weeks of receiving offer."
                            );
                        })()}
                    />
                    <InfoRow
                        title="How much salary are you expecting?"
                        value={(() => {
                            const salaryRange = data.expectedSalaryRange;
                            if (!salaryRange || salaryRange === "Other") {
                                return "I'm seeking a salary in the range of $80,000 to $100,000 annually, depending on the overall compensation package, responsibilities, and growth opportunities within the role.";
                            }
                            const rangeMap: Record<string, string> = {
                                "60k-100k": "$60,000 to $100,000",
                                "100k-150k": "$100,000 to $150,000",
                                "150k-200k": "$150,000 to $200,000",
                            };
                            const range = rangeMap[salaryRange] || "$80,000 to $100,000";
                            return `I'm seeking a salary in the range of ${range} annually, depending on the overall compensation package, responsibilities, and growth opportunities within the role.`;
                        })()}
                    />
                </Card>

                {/* Credentials */}
                <Card title="Account Access Credentials">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span className="text-sm font-semibold text-blue-800">
                                Account Credentials
                            </span>
                        </div>
                        <p className="text-sm text-blue-700">
                            These are the credentials which you can use while applying in
                            different portals.
                        </p>
                    </div>
                    <InfoRow
                        title="Username / Email"
                        value={ctx?.userDetails?.email || "Not available"}
                    />
                    <InfoRow title="Password" value="Flashfire@1357" />
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
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
        </div>
    );
}
