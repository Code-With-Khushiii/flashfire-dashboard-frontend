import React, { useContext, useMemo, useState, useEffect } from "react";
import { UserContext } from "../state_management/UserContext";
import { CarTaxiFront, X, Check } from "lucide-react";
import { useUserProfile } from "../state_management/ProfileContext";
import { useNavigate } from 'react-router-dom';

/** ---------- STEPS ---------- */
const STEPS = [
  { key: "personal", title: "Personal & Education", blurb: "Tell us who you are and where you studied." },
  { key: "preferences", title: "Preferences & Experience", blurb: "Share your target roles, salary, and locations." },
  { key: "links", title: "Links, Documents & Consent", blurb: "Add URLs, upload documents, and confirm consent." },
] as const;

type ModalSection =
  | "personal"
  | "education"
  | "professional"
  | "preferences"
  | "links"
  | "terms";

const sectionToStep: Record<ModalSection, number> = {
  personal: 0,      // Personal & Education page
  education: 0,     // (same step as personal)
  professional: 1,  // Preferences & Experience page
  preferences: 1,
  links: 2,         // Links, Documents & Consent page
  terms: 2,
};


type FormData = {
  name: string;
  firstName: string;
  lastName: string;
  contactNumber: string;
  dob: string;
  bachelorsUniDegree: string;
  bachelorsGradMonthYear: string;
  bachelorsGPA: string;
  mastersUniDegree: string;
  mastersGradMonthYear: string;
  mastersGPA: string;
  visaStatus: string;
  otherVisaType?: string;
  visaExpiry: string;
  address: string;
  preferredRoles: string;
  experienceLevel: string;
  expectedSalaryRange: string;
  preferredLocations: string;
  targetCompanies: string;
  reasonForLeaving: string;
  linkedinUrl: string;
  githubUrl: string;
  portfolioUrl: string;
  // Files (for UI only)
  coverLetterFile?: File | null;
  resumeFile?: File | null;
  transcriptFile?: File | null;
  // Cloudinary URLs (THIS is what we persist/send)
  coverLetterUrl?: string;
  resumeUrl?: string;
  transcriptUrl?: string;
  confirmAccuracy: boolean;
  agreeTos: boolean;
   expectedSalaryNarrative: string; // free text
  ssnNumber: string;               // digits only (we'll keep 0–9)
  availabilityNote: string;
  joinTime: string;                // join time selection
};

const initialData: FormData = {
  name: "",
  firstName: "",
  lastName: "",
  contactNumber: "",
  dob: "",
  bachelorsUniDegree: "",
  bachelorsGradMonthYear: "",
  bachelorsGPA: "",
  mastersUniDegree: "",
  mastersGradMonthYear: "",
  mastersGPA: "",
  visaStatus: "",
  otherVisaType: "", 
  visaExpiry: "",
  address: "",
  preferredRoles: "",
  experienceLevel: "",
  expectedSalaryRange: "",
  preferredLocations: "",
  targetCompanies: "",
  reasonForLeaving: "",
  linkedinUrl: "",
  githubUrl: "",
  portfolioUrl: "",
  coverLetterFile: null,
  resumeFile: null,
  transcriptFile: null,
  coverLetterUrl: "",
  resumeUrl: "",
  transcriptUrl: "",
  confirmAccuracy: false,
  agreeTos: false,
   expectedSalaryNarrative: '', // free text
  ssnNumber: '',               // digits only (we'll keep 0–9)
  availabilityNote: '',
  joinTime: 'in 1 week',       // join time selection
};

const VISA_OPTIONS = ["CPT", "F1", "F1 OPT", "F1 STEM OPT", "H1B", "Green Card", "U.S. Citizen", "Other"];
const EXPERIENCE_OPTIONS = ["0-2 Years", "2-4 Years", "4-6 Years", "6-8 Years", "8+ Years"];
const SALARY_OPTIONS = ["60k-100k", "100k-150k", "150k-200k", "Other"];
const JOIN_TIME_OPTIONS = ["in 1 week", "in 2 week", "in 3 week", "in 4 week", "in 6-7 week"];

/** ---------- UI Helpers ---------- */
function Header({ stepIndex }: { stepIndex: number }) {
  const step = STEPS[stepIndex];
  const percent = ((stepIndex + 1) / STEPS.length) * 100;
  return (
    <div className="relative overflow-hidden rounded-t-2xl">
      <div className="bg-gradient-to-r from-orange-500 to-rose-600 p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="uppercase tracking-widest text-xs font-semibold text-white/90 mb-2">FlashFire — Client Onboarding</p>
            <h2 className="text-2xl font-bold mb-2">
              Step {stepIndex + 1} of {STEPS.length}: {step.title}
            </h2>
            <p className="text-white/95 text-base">{step.blurb}</p>
          </div>
          <div className="hidden sm:block text-right">
            <span className="inline-block rounded-full bg-white/20 px-4 py-2 text-sm font-medium backdrop-blur-sm">All fields required</span>
          </div>
        </div>
      </div>
      <div className="h-2 w-full bg-gray-100">
        <div className="h-full bg-gradient-to-r from-orange-500 to-rose-600 transition-all duration-500 ease-out" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function FieldLabel({ children, required = true }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-semibold text-gray-800 mb-2">
      {children} {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement> & { hasError?: boolean }) {
  const { hasError, ...inputProps } = props;
  return (
    <input
      {...inputProps}
      data-error={hasError}
      className={[
        "w-full rounded-lg border px-4 py-3 text-base text-gray-900 placeholder:text-gray-500",
        "focus:outline-none focus:ring-2 transition-all duration-200",
        hasError 
          ? "border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500/20" 
          : "border-gray-300 bg-white focus:border-orange-500 focus:ring-orange-500/20 hover:border-gray-400",
        props.className ?? "",
      ].join(" ")}
    />
  );
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { hasError?: boolean }) {
  const { hasError, ...textareaProps } = props;
  return (
    <textarea
      {...textareaProps}
      data-error={hasError}
      className={[
        "w-full rounded-lg border px-3 py-2 text-gray-900 placeholder:text-gray-500",
        "focus:outline-none focus:ring-2 transition-all duration-200 resize-none",
        hasError 
          ? "border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500/20" 
          : "border-gray-300 bg-white focus:border-orange-500 focus:ring-orange-500/20 hover:border-gray-400",
        props.className ?? "",
      ].join(" ")}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement> & { hasError?: boolean }) {
  const { hasError, ...selectProps } = props;
  return (
    <select
      {...selectProps}
      data-error={hasError}
      className={[
        "w-full rounded-lg border px-4 py-3 text-gray-900",
        "focus:outline-none focus:ring-2 transition-all duration-200 cursor-pointer",
        hasError 
          ? "border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500/20" 
          : "border-gray-300 bg-white focus:border-orange-500 focus:ring-orange-500/20 hover:border-gray-400",
        props.className ?? "",
      ].join(" ")}
    />
  );
}

function ErrorText({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return <p className="mt-2 text-sm text-red-600 font-medium">{children}</p>;
}

/** ---------- Local file upload ---------- */
async function uploadFileLocally(file: File, fileType: 'resume' | 'coverLetter' | 'transcript') {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;
  
  // Get token and user details from localStorage
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
  formData.append('token', token);
  formData.append('userDetails', JSON.stringify(userAuth.userDetails));
  console.log('Uploading file:', token);

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
  return data.secure_url || data.url;
}

// Helper function to convert file to base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}

/** ---------- FileInput that uploads instantly ---------- */
function FileInput({
  label,
  required,
  file,
  onFileChange,
  onUploaded, // returns the secure_url
  hasError,
}: {
  label: string;
  required?: boolean;
  file: File | null | undefined;
  onFileChange: (f: File | null) => void;
  onUploaded: (url: string) => void;
  hasError?: boolean;
}) {
  const [error, setError] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  return (
    <div>
      <FieldLabel required={required}>{label}</FieldLabel>
      <div className="relative">
        <input
          type="file"
          data-error={hasError}
          className={[
            "block w-full cursor-pointer rounded-lg border-2 border-dashed p-6 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-gradient-to-r file:from-orange-500 file:to-rose-600 file:px-4 file:py-2 file:text-white hover:file:opacity-90 transition-all duration-200 focus:outline-none focus:ring-2",
            hasError 
              ? "border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500/20" 
              : "border-gray-300 bg-gray-50 hover:border-gray-400 focus:border-orange-500 focus:ring-orange-500/20"
          ].join(" ")}
          accept=".pdf,.doc,.docx,.txt"
          onChange={async (e) => {
            const f = e.currentTarget.files?.[0] ?? null;
            if (!f) {
              onFileChange(null);
              return;
            }
            const max = 10 * 1024 * 1024; // 10 MB
            if (f.size > max) {
              setError("File too large. Max 10 MB.");
              onFileChange(null);
              return;
            }
            setError("");
            onFileChange(f);

            setUploading(true);
            try {
              // Determine file type based on label
              const fileType = label.toLowerCase().includes('resume') ? 'resume' : label.toLowerCase().includes('transcript') ? 'transcript' : 'coverLetter';
              const url = await uploadFileLocally(f, fileType);
              onUploaded(url);
            } catch (err: any) {
              setError(err?.message || "Upload failed");
              onFileChange(null);
            } finally {
              setUploading(false);
            }
          }}
        />
        <div className="mt-3 flex items-center gap-3 text-sm text-gray-600">
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            PDF, DOC, DOCX, TXT · Max 10 MB
          </span>
          {file && (
            <span className="flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-green-800 text-xs font-medium">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {file.name}
            </span>
          )}
          {uploading && (
            <span className="flex items-center gap-1 text-orange-600">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Uploading…
            </span>
          )}
        </div>
      </div>
      <ErrorText>{error}</ErrorText>
    </div>
  );
}

/** ---------- Main ---------- */
export default function NewUserModal({ 
  setUserProfileFormVisibility, 
  mode = 'create',
  startSection = 'personal',
  onProfileComplete
}: { 
  setUserProfileFormVisibility: (v: boolean) => void;
  mode?: 'create' | 'edit';
  startSection?: ModalSection;
  onProfileComplete?: () => void;
}) {
  const navigate = useNavigate();
const [stepIndex, setStepIndex] = useState<number>(() => sectionToStep[startSection] ?? 0);
    // at the top of NewUserModal
const EDIT_PASSCODE = import.meta.env.VITE_EDIT_PASSCODE || "2025"; // fallback for dev

const [showPasscode, setShowPasscode] = useState(false);
const [passcode, setPasscode] = useState("");
const [passErr, setPassErr] = useState("");
const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  const [data, setData] = useState<FormData>({ ...initialData });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isLast = stepIndex === STEPS.length - 1;
  const ctx = useContext(UserContext);
  const set = (patch: Partial<FormData>) => setData((d) => ({ ...d, ...patch }));
  const { setProfileFromApi, isProfileComplete } = useUserProfile();
  // at top: import React, { useContext, useMemo, useState, useEffect } from "react";
// ...
const { userProfile: ctxProfile } = useUserProfile();

function addrToString(addr: any): string {
  if (!addr) return "";
  if (typeof addr === "string") return addr;
  const street   = addr.street ?? "";
  const city     = addr.city ?? "";
  const state    = addr.state ?? "";
  const zip      = addr.zip ?? addr.zipCode ?? "";
  // omit country in the single-line field, add if you want:
  return [street, city, state, zip].filter(Boolean).join(", ");
}
const arrToLine = (v: any) =>
  Array.isArray(v) ? v.join("; ") : (typeof v === "string" ? v : "");

const toMonth = (v?: string) => (v ? v.slice(0, 7) : "");   // YYYY-MM
const toDate  = (v?: string) => (v ? v.slice(0, 10) : "");  // YYYY-MM-DD

const handleSuccessClose = () => {
  setShowSuccessPopup(false);
  setUserProfileFormVisibility(false); // Close the modal
  onProfileComplete?.(); // Call the callback if provided
  // Refresh user context and localStorage before redirect
  try {
    const ls = JSON.parse(localStorage.getItem('userAuth') || '{}');
    if (ls && ls.token && ls.userDetails) {
      // Optionally, you can call context.setData or setProfileFromApi here if needed
      // This ensures context is up to date
    }
  } catch (e) {
    // Ignore parse errors
  }
  navigate('/dashboard'); // Redirect to dashboard
};

useEffect(() => {
  if (mode !== "edit") return;

  // Prefer context; fall back to localStorage userAuth.userProfile
  const ls = (() => {
    try { return JSON.parse(localStorage.getItem("userAuth") || "{}"); }
    catch { return {}; }
  })();
  const p: any = ctxProfile ?? ls?.userProfile;
  if (!p) return;

  setData((prev) => ({
    ...prev,
    // Step 0 — personal & education
    firstName: p.firstName ?? "",
    lastName: p.lastName ?? "",
    contactNumber: p.contactNumber ?? "",
    dob: toDate(p.dob),
    bachelorsUniDegree: p.bachelorsUniDegree ?? "",
    bachelorsGradMonthYear: toMonth(p.bachelorsGradMonthYear),
    bachelorsGPA: p.bachelorsGPA ?? "",
    mastersUniDegree: p.mastersUniDegree ?? "",
    mastersGradMonthYear: toMonth(p.mastersGradMonthYear),
    mastersGPA: p.mastersGPA ?? "",
    visaStatus: p.visaStatus ?? "",
    visaExpiry: toDate(p.visaExpiry),
    address: addrToString(p.address),

    // Step 1 — preferences & experience (form expects single lines)
    preferredRoles: arrToLine(p.preferredRoles),
    experienceLevel: p.experienceLevel ?? "",
    expectedSalaryRange: p.expectedSalaryRange ?? "",
    preferredLocations: arrToLine(p.preferredLocations),
    targetCompanies: arrToLine(p.targetCompanies),
    reasonForLeaving: p.reasonForLeaving ?? "",
    expectedSalaryNarrative: p.expectedSalaryNarrative ?? "",
    ssnNumber: p.ssnNumber ?? "",
    availabilityNote: p.availabilityNote ?? "",

    // Step 2 — links & docs
    linkedinUrl: p.linkedinUrl ?? "",
    githubUrl: p.githubUrl ?? "",
    portfolioUrl: p.portfolioUrl ?? "",
    coverLetterUrl: p.coverLetterUrl ?? "",
    resumeUrl: p.resumeUrl ?? "",
    transcriptUrl: p.transcriptUrl ?? "",
    confirmAccuracy: Boolean(p.confirmAccuracy),
    agreeTos: Boolean(p.agreeTos),
  }));
}, [mode, ctxProfile]);


  const validateUrl = (v: string) => {
    if (!v.trim()) return false;
    try {
      // Must start with http:// or https://
      if (!v.startsWith('http://') && !v.startsWith('https://')) {
        return false;
      }
      new URL(v);
      return true;
    } catch {
      return false;
    }
  };

  // Function to validate URL format in real-time
  const isValidUrlFormat = (v: string) => {
    if (!v.trim()) return true; // Empty is valid (will be checked as required separately)
    return /^https?:\/\/.+/.test(v);
  };

  const digitsOnly = (v: string) => v.replace(/\D/g, "");

  const validateStep = (index: number) => {
    const e: Record<string, string> = {};
    
    if (index === 0) {
      // Personal Information Validation
      if (!data.name.trim()) {
        e.name = "Full name is required";
      } else if (data.name.trim().split(/\s+/).length < 2) {
        e.name = "Please enter your first and last name";
      }
      
      // Contact Number Validation
      const phone = digitsOnly(data.contactNumber);
      if (!phone) {
        e.contactNumber = "Phone number is required";
      } else if (phone.length < 10) {
        e.contactNumber = "Please enter a valid 10-digit phone number";
      } else if (phone.length > 15) {
        e.contactNumber = "Phone number is too long";
      }
      
      // Date of Birth Validation
      if (!data.dob) {
        e.dob = "Date of birth is required";
      } else {
        const dobDate = new Date(data.dob);
        const today = new Date();
        const age = today.getFullYear() - dobDate.getFullYear();
        if (age < 16) {
          e.dob = "You must be at least 16 years old";
        } else if (age > 100) {
          e.dob = "Please enter a valid date of birth";
        }
      }
      
      // Education Validation
      if (!data.bachelorsUniDegree.trim()) {
        e.bachelorsUniDegree = "Bachelor's degree information is required";
      } else if (data.bachelorsUniDegree.trim().length < 10) {
        e.bachelorsUniDegree = "Please provide complete degree information";
      }
      
      if (!data.bachelorsGradMonthYear) {
        e.bachelorsGradMonthYear = "Bachelor's graduation date is required";
      } else {
        const gradDate = new Date(data.bachelorsGradMonthYear);
        const today = new Date();
        if (gradDate > today) {
          e.bachelorsGradMonthYear = "Graduation date cannot be in the future";
        }
      }
      
      if (!data.mastersUniDegree.trim()) {
        e.mastersUniDegree = "Master's degree information is required";
      } else if (data.mastersUniDegree.trim().length < 10) {
        e.mastersUniDegree = "Please provide complete degree information";
      }
      
      if (!data.mastersGradMonthYear) {
        e.mastersGradMonthYear = "Master's graduation date is required";
      } else {
        const gradDate = new Date(data.mastersGradMonthYear);
        const today = new Date();
        if (gradDate > today) {
          e.mastersGradMonthYear = "Graduation date cannot be in the future";
        }
        // Check if master's graduation is after bachelor's
        if (data.bachelorsGradMonthYear) {
          const bachelorsGrad = new Date(data.bachelorsGradMonthYear);
          if (gradDate < bachelorsGrad) {
            e.mastersGradMonthYear = "Master's graduation must be after bachelor's graduation";
          }
        }
      }
      
      // GPA Validation (optional but if provided, must be valid)
      if (data.bachelorsGPA && data.bachelorsGPA.trim()) {
        const gpa = parseFloat(data.bachelorsGPA);
        if (isNaN(gpa) || gpa < 0 || gpa > 4) {
          e.bachelorsGPA = "GPA must be between 0.0 and 4.0";
        }
      }
      
      if (data.mastersGPA && data.mastersGPA.trim()) {
        const gpa = parseFloat(data.mastersGPA);
        if (isNaN(gpa) || gpa < 0 || gpa > 4) {
          e.mastersGPA = "GPA must be between 0.0 and 4.0";
        }
      }
      
      // Visa Status Validation
      if (!data.visaStatus) {
        e.visaStatus = "Visa status is required";
      }
      
      // Check if "Other" is selected and otherVisaType is provided
      if (data.visaStatus === "Other" && !data?.otherVisaType?.trim()) {
        e.otherVisaType = "Please specify your visa type";
      }
      
      // Address Validation
      if (!data.address.trim()) {
        e.address = "Complete address is required";
      } else if (data.address.trim().length < 20) {
        e.address = "Please provide a complete address with street, city, state, and ZIP";
      }
    } else if (index === 1) {
      // Job Preferences Validation
      if (!data.preferredRoles.trim()) {
        e.preferredRoles = "Preferred job roles are required";
      } else if (data.preferredRoles.trim().length < 5) {
        e.preferredRoles = "Please provide more specific job roles";
      }
      
      if (!data.experienceLevel) {
        e.experienceLevel = "Experience level is required";
      }
      
      if (!data.expectedSalaryRange) {
        e.expectedSalaryRange = "Expected salary range is required";
      }
      
      if (!data.preferredLocations.trim()) {
        e.preferredLocations = "Preferred locations are required";
      } else if (data.preferredLocations.trim().length < 3) {
        e.preferredLocations = "Please specify at least one location";
      }
      
      if (!data.targetCompanies.trim()) {
        e.targetCompanies = "Target companies are required";
      } else if (data.targetCompanies.trim().length < 3) {
        e.targetCompanies = "Please specify at least one company";
      }
      
      // SSN validation - optional but must be empty or exactly 3 digits
      if (data.ssnNumber && data.ssnNumber.length > 0 && data.ssnNumber.length !== 3) {
        e.ssnNumber = "SSN must be last 3 digits or left empty";
      }
      
      // Join time validation
      if (!data.joinTime) {
        e.joinTime = "Please select when you can join";
      }
      
    } else if (index === 2) {
      // LinkedIn URL - required and must be valid URL
      if (!data.linkedinUrl.trim()) {
        e.linkedinUrl = "LinkedIn URL is required";
      } else if (!validateUrl(data.linkedinUrl)) {
        e.linkedinUrl = "Please enter a valid LinkedIn URL";
      } else if (!data.linkedinUrl.includes('linkedin.com')) {
        e.linkedinUrl = "Please enter a valid LinkedIn profile URL";
      }
      
      // GitHub URL - optional but must be valid URL if provided
      if (data.githubUrl.trim() && !validateUrl(data.githubUrl)) {
        e.githubUrl = "Please enter a valid GitHub URL";
      } else if (data.githubUrl.trim() && !data.githubUrl.includes('github.com')) {
        e.githubUrl = "Please enter a valid GitHub profile URL";
      }
      
      // Portfolio URL - optional but must be valid URL if provided
      if (data.portfolioUrl.trim() && !validateUrl(data.portfolioUrl)) {
        e.portfolioUrl = "Please enter a valid portfolio URL";
      }

      // Resume - required
      if (!data.resumeUrl?.trim()) {
        e.resumeUrl = "Resume upload is required";
      }

      // Consent validation
      if (!data.confirmAccuracy) {
        e.confirmAccuracy = "You must confirm the accuracy of your information";
      }
      
      if (!data.agreeTos) {
        e.agreeTos = "You must agree to the Terms of Service to continue";
      }
    }
    
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (!validateStep(stepIndex)) {
      // Scroll to first error field
      const firstErrorField = document.querySelector('[data-error="true"]') as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      if (firstErrorField && typeof firstErrorField.focus === 'function') {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstErrorField.focus();
      }
      return;
    }
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  };
  const back = () => setStepIndex((i) => Math.max(i - 1, 0));

  useEffect(() => {
  setStepIndex(sectionToStep[startSection] ?? 0);
}, [startSection]);


  // replace your handleSubmit with this pair:
const submitForm = async () => {
  try {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;
    const { coverLetterFile, resumeFile, transcriptFile, ...payload } = data;

    // Derive first/last name from full name if missing
    const trimmedName = (payload.name || "").trim();
    let firstName = (payload.firstName || "").trim();
    let lastName = (payload.lastName || "").trim();
    if (trimmedName && (!firstName || !lastName)) {
      const parts = trimmedName.split(/\s+/);
      firstName = firstName || parts[0] || "";
      lastName = lastName || parts.slice(1).join(" ") || "";
    }

    // Get token from context or localStorage as fallback
    const token = ctx?.token || JSON.parse(localStorage.getItem('userAuth') || '{}')?.token;
    const email = ctx?.userDetails?.email || JSON.parse(localStorage.getItem('userAuth') || '{}')?.userDetails?.email;
    
    if (!token || !email) {
      throw new Error(JSON.stringify({ message: "Token or user details missing" }));
    }

    const res = await fetch(`${API_BASE_URL}/setprofile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ...payload, firstName, lastName, email, token, userDetails: ctx?.userDetails }),
    });

    const resJson = await res.json();

    if (res.ok) {
      console.log('Profile saved successfully (200 OK) - closing modal');
      
      try {
        const payloadFromApi =
          resJson?.userProfile ??
          resJson?.data?.userProfile ??
          resJson?.data ??
          resJson;
        setProfileFromApi(payloadFromApi);
      } catch (e) {
        console.log('Could not save profile data, but modal will still close');
      }
      
      setUserProfileFormVisibility(false);
      onProfileComplete?.();
      return;
    }
    
    throw new Error(JSON.stringify(resJson));
    
  } catch (err: any) {
    console.error(err);
    const msg = (() => { try { return JSON.parse(err.message)?.message; } catch { return err.message; } })();
    alert(msg || "Something went wrong while submitting. Please try again.");
  }
};

const handleSubmit = () => {
  // Remove passcode requirement for development
  // if (mode === "edit") {
  //   const pin = window.prompt("Enter passcode to update profile:");
  //   if (pin !== EDIT_PASSCODE) return alert("Incorrect passcode");
  // }
  submitForm();
};

  // Handler to collect and log all info from the first step when Next is clicked
  const handleNextWithLog = () => {
    if (stepIndex === 0) {
      // Collect all values from the first step
      const info = {
        firstName: data.firstName,
        lastName: data.lastName,
        contactNumber: data.contactNumber,
        dob: data.dob,
        bachelorsUniDegree: data.bachelorsUniDegree,
        bachelorsGradMonthYear: data.bachelorsGradMonthYear,
        bachelorsGPA: data.bachelorsGPA,
        mastersUniDegree: data.mastersUniDegree,
        mastersGradMonthYear: data.mastersGradMonthYear,
        mastersGPA: data.mastersGPA,
        visaStatus: data.visaStatus,
        address: data.address,
      };
      console.log('Step 1 Info:', info);
    }
    next();
  };

  const page = useMemo(() => {
    switch (stepIndex) {
      case 0:
        return (
          <div className="space-y-8">
            {/* Personal Information Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 pb-2 border-b border-gray-200">Personal Information</h3>
              <div className="space-y-6">
                <div>
                  <FieldLabel>Name</FieldLabel>
                  <TextInput 
                    hasError={!!errors.name}
                    value={data.name} 
                    onChange={(e) => {
                      set({ name: e.target.value });
                      if (errors.name) {
                        setErrors(prev => ({ ...prev, name: '' }));
                      }
                    }} 
                    placeholder="Full name" 
                  />
                  <ErrorText>{errors.name}</ErrorText>
                </div>
                <div>
                  <FieldLabel>Contact Number</FieldLabel>
                  <TextInput 
                    hasError={!!errors.contactNumber}
                    inputMode="tel" 
                    placeholder="Phone number" 
                    value={data.contactNumber} 
                    onChange={(e) => {
                      set({ contactNumber: e.target.value });
                      if (errors.contactNumber) {
                        setErrors(prev => ({ ...prev, contactNumber: '' }));
                      }
                    }} 
                  />
                  <ErrorText>{errors.contactNumber}</ErrorText>
                </div>
                <div>
                  <FieldLabel>Date of Birth</FieldLabel>
                  <TextInput 
                    hasError={!!errors.dob}
                    type="date" 
                    placeholder="Date of birth" 
                    value={data.dob} 
                    onChange={(e) => {
                      set({ dob: e.target.value });
                      if (errors.dob) {
                        setErrors(prev => ({ ...prev, dob: '' }));
                      }
                    }} 
                  />
                  <ErrorText>{errors.dob}</ErrorText>
                </div>
              </div>
            </div>

            {/* Education Information Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-6 pb-2 border-b border-gray-200">Education Information</h3>
              <div className="space-y-6">
                <div>
                  <FieldLabel>Bachelor's University Name & Degree (with Duration)</FieldLabel>
                  <TextInput 
                    hasError={!!errors.bachelorsUniDegree}
                    placeholder="Bachelor's degree details" 
                    value={data.bachelorsUniDegree} 
                    onChange={(e) => {
                      set({ bachelorsUniDegree: e.target.value });
                      if (errors.bachelorsUniDegree) {
                        setErrors(prev => ({ ...prev, bachelorsUniDegree: '' }));
                      }
                    }} 
                  />
                  <ErrorText>{errors.bachelorsUniDegree}</ErrorText>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <FieldLabel>Graduation Month & Year</FieldLabel>
                    <TextInput 
                      hasError={!!errors.bachelorsGradMonthYear}
                      type="month" 
                      placeholder="Graduation month & year" 
                      value={data.bachelorsGradMonthYear} 
                      onChange={(e) => {
                        set({ bachelorsGradMonthYear: e.target.value });
                        if (errors.bachelorsGradMonthYear) {
                          setErrors(prev => ({ ...prev, bachelorsGradMonthYear: '' }));
                        }
                      }} 
                    />
                    <ErrorText>{errors.bachelorsGradMonthYear}</ErrorText>
                  </div>
                  <div className="flex-1">
                    <FieldLabel>GPA</FieldLabel>
                    <TextInput 
                      hasError={!!errors.bachelorsGPA}
                      type="text" 
                      placeholder="Bachelor's GPA (e.g., 3.8)" 
                      value={data.bachelorsGPA} 
                      onChange={(e) => {
                        set({ bachelorsGPA: e.target.value });
                        if (errors.bachelorsGPA) {
                          setErrors(prev => ({ ...prev, bachelorsGPA: '' }));
                        }
                      }} 
                    />
                    <ErrorText>{errors.bachelorsGPA}</ErrorText>
                  </div>
                </div>
                <div>
                  <FieldLabel>Master's University Name & Degree (with Duration)</FieldLabel>
                  <TextInput 
                    hasError={!!errors.mastersUniDegree}
                    placeholder="Master's degree details" 
                    value={data.mastersUniDegree} 
                    onChange={(e) => {
                      set({ mastersUniDegree: e.target.value });
                      if (errors.mastersUniDegree) {
                        setErrors(prev => ({ ...prev, mastersUniDegree: '' }));
                      }
                    }} 
                  />
                  <ErrorText>{errors.mastersUniDegree}</ErrorText>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <FieldLabel>Graduation Month & Year</FieldLabel>
                    <TextInput 
                      hasError={!!errors.mastersGradMonthYear}
                      type="month" 
                      placeholder="Master's graduation month & year" 
                      value={data.mastersGradMonthYear} 
                      onChange={(e) => {
                        set({ mastersGradMonthYear: e.target.value });
                        if (errors.mastersGradMonthYear) {
                          setErrors(prev => ({ ...prev, mastersGradMonthYear: '' }));
                        }
                      }} 
                    />
                    <ErrorText>{errors.mastersGradMonthYear}</ErrorText>
                  </div>
                  <div className="flex-1">
                    <FieldLabel>GPA</FieldLabel>
                    <TextInput 
                      hasError={!!errors.mastersGPA}
                      type="text" 
                      placeholder="Master's GPA (e.g., 3.9)" 
                      value={data.mastersGPA} 
                      onChange={(e) => {
                        set({ mastersGPA: e.target.value });
                        if (errors.mastersGPA) {
                          setErrors(prev => ({ ...prev, mastersGPA: '' }));
                        }
                      }} 
                    />
                    <ErrorText>{errors.mastersGPA}</ErrorText>
                  </div>
                </div>
              </div>
            </div>

            {/* Immigration & Address Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-6 pb-2 border-b border-gray-200">Immigration & Address</h3>
              <div className="space-y-6">
                <div>
                  <FieldLabel>Current Visa Status</FieldLabel>
                  <Select 
                    hasError={!!errors.visaStatus}
                    value={data.visaStatus} 
                    onChange={(e) => {
                      set({ visaStatus: e.target.value, otherVisaType: e.target.value !== "Other" ? "" : data.otherVisaType });
                      if (errors.visaStatus) {
                        setErrors(prev => ({ ...prev, visaStatus: '' }));
                      }
                    }}
                  >
                    <option value="">Select status…</option>
                    {VISA_OPTIONS.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </Select>
                  <ErrorText>{errors.visaStatus}</ErrorText>

                  {/* Conditionally show text input when "Other" is selected */}
                  {data.visaStatus === "Other" && (
                    <div className="mt-4">
                      <FieldLabel>Specify Visa Type</FieldLabel>
                      <TextInput
                        hasError={!!errors.otherVisaType}
                        placeholder="Enter your visa type"
                        value={data.otherVisaType || ""}
                        onChange={(e) => {
                          set({ otherVisaType: e.target.value });
                          if (errors.otherVisaType) {
                            setErrors(prev => ({ ...prev, otherVisaType: '' }));
                          }
                        }}
                      />
                      <ErrorText>{errors.otherVisaType}</ErrorText>
                    </div>
                  )}
                </div>
                <div>
                  <FieldLabel>Complete Current Address (Street, City, State, ZIP Code)</FieldLabel>
                  <TextArea 
                    hasError={!!errors.address}
                    rows={3} 
                    placeholder="Complete address (Street, City, State, ZIP)" 
                    value={data.address} 
                    onChange={(e) => {
                      set({ address: e.target.value });
                      if (errors.address) {
                        setErrors(prev => ({ ...prev, address: '' }));
                      }
                    }} 
                  />
                  <ErrorText>{errors.address}</ErrorText>
                </div>
              </div>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-8">
            {/* Job Preferences Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-6 pb-2 border-b border-gray-200">Job Preferences</h3>
              <div className="space-y-6">
                <div>
                  <FieldLabel>Preferred Job Roles</FieldLabel>
                  <TextInput 
                    hasError={!!errors.preferredRoles}
                    placeholder="Preferred job roles (e.g., Software Engineer)" 
                    value={data.preferredRoles} 
                    onChange={(e) => {
                      set({ preferredRoles: e.target.value });
                      if (errors.preferredRoles) {
                        setErrors(prev => ({ ...prev, preferredRoles: '' }));
                      }
                    }} 
                  />
                  <ErrorText>{errors.preferredRoles}</ErrorText>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <FieldLabel>Experience Level</FieldLabel>
                    <Select 
                      hasError={!!errors.experienceLevel}
                      value={data.experienceLevel} 
                      onChange={(e) => {
                        set({ experienceLevel: e.target.value });
                        if (errors.experienceLevel) {
                          setErrors(prev => ({ ...prev, experienceLevel: '' }));
                        }
                      }}
                    >
                      <option value="">Select experience level…</option>
                      <option value="Entry Level">Entry Level</option>
                      <option value="Mid Level">Mid Level</option>
                      <option value="Senior Level">Senior Level</option>
                      <option value="Executive">Executive</option>
                    </Select>
                    <ErrorText>{errors.experienceLevel}</ErrorText>
                  </div>
                  <div>
                    <FieldLabel>Expected Base Salary</FieldLabel>
                    <Select 
                      hasError={!!errors.expectedSalaryRange}
                      value={data.expectedSalaryRange} 
                      onChange={(e) => {
                        set({ expectedSalaryRange: e.target.value });
                        if (errors.expectedSalaryRange) {
                          setErrors(prev => ({ ...prev, expectedSalaryRange: '' }));
                        }
                      }}
                    >
                      <option value="">Select salary range…</option>
                      {SALARY_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </Select>
                    <ErrorText>{errors.expectedSalaryRange}</ErrorText>
                  </div>
                </div>
              </div>
            </div>

            {/* Location & Company Preferences Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-6 pb-2 border-b border-gray-200">Location & Company Preferences</h3>
              <div className="space-y-6">
                <div>
                  <FieldLabel>Preferred Job Locations</FieldLabel>
                  <TextInput 
                    hasError={!!errors.preferredLocations}
                    placeholder="Preferred locations (e.g., New York, SF)" 
                    value={data.preferredLocations} 
                    onChange={(e) => {
                      set({ preferredLocations: e.target.value });
                      if (errors.preferredLocations) {
                        setErrors(prev => ({ ...prev, preferredLocations: '' }));
                      }
                    }} 
                  />
                  <ErrorText>{errors.preferredLocations}</ErrorText>
                </div>
                <div>
                  <FieldLabel>Companies Targeting</FieldLabel>
                  <TextInput 
                    hasError={!!errors.targetCompanies}
                    placeholder="Target companies (e.g., Google, Amazon)" 
                    value={data.targetCompanies} 
                    onChange={(e) => {
                      set({ targetCompanies: e.target.value });
                      if (errors.targetCompanies) {
                        setErrors(prev => ({ ...prev, targetCompanies: '' }));
                      }
                    }} 
                  />
                  <ErrorText>{errors.targetCompanies}</ErrorText>
                </div>
              </div>
            </div>

            {/* Additional Information Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-6 pb-2 border-b border-gray-200">Additional Information</h3>
              <div className="space-y-6">
                <div>
                  <FieldLabel required={false}>SSN Number (Optional - must be last 3 digits)</FieldLabel>
                  <TextInput
                    hasError={!!errors.ssnNumber}
                    inputMode="numeric"
                    maxLength={3}
                    placeholder="Last 3 SSN digits or leave empty"
                    value={data.ssnNumber}
                    onChange={(e) => {
                      const digits = digitsOnly(e.target.value).slice(0, 3);
                      set({ ssnNumber: digits });
                      if (errors.ssnNumber) {
                        setErrors(prev => ({ ...prev, ssnNumber: '' }));
                      }
                    }}
                  />
                  {data.ssnNumber && data.ssnNumber.length > 0 && data.ssnNumber.length !== 3 && (
                    <p className="mt-2 text-sm text-amber-600 font-medium">SSN must be last 3 digits or left empty</p>
                  )}
                  <ErrorText>{errors.ssnNumber}</ErrorText>
                </div>
                <div>
                  <FieldLabel required={false}>Reason for Leaving Your Previous Role (Optional)</FieldLabel>
                  <TextArea 
                    hasError={!!errors.reasonForLeaving}
                    rows={3} 
                    placeholder="Reason for leaving previous role" 
                    value={data.reasonForLeaving} 
                    onChange={(e) => {
                      set({ reasonForLeaving: e.target.value });
                      if (errors.reasonForLeaving) {
                        setErrors(prev => ({ ...prev, reasonForLeaving: '' }));
                      }
                    }} 
                  />
                  <ErrorText>{errors.reasonForLeaving}</ErrorText>
                </div>
                <div>
                  <FieldLabel>How soon can you join the company?</FieldLabel>
                  <Select 
                    hasError={!!errors.joinTime}
                    value={data.joinTime} 
                    onChange={(e) => {
                      set({ joinTime: e.target.value });
                      if (errors.joinTime) {
                        setErrors(prev => ({ ...prev, joinTime: '' }));
                      }
                    }}
                  >
                    <option value="">Select timeline…</option>
                    <option value="Immediately">Immediately</option>
                    <option value="2 weeks">2 weeks</option>
                    <option value="1 month">1 month</option>
                    <option value="2-3 months">2-3 months</option>
                    <option value="3+ months">3+ months</option>
                  </Select>
                  <ErrorText>{errors.joinTime}</ErrorText>
                </div>
                <div>
                  <FieldLabel required={false}>Availability to Join (Optional)</FieldLabel>
                  <TextInput
                    placeholder="Your availability to start work"
                    value={data.availabilityNote}
                    onChange={(e) => set({ availabilityNote: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-8">
            {/* Professional Links Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-6 pb-2 border-b border-gray-200">Professional Links</h3>
              <div className="space-y-6">
                <div>
                  <FieldLabel>LinkedIn URL</FieldLabel>
                  <TextInput 
                    hasError={!!errors.linkedinUrl}
                    placeholder="LinkedIn profile URL" 
                    value={data.linkedinUrl} 
                    onChange={(e) => {
                      const value = e.target.value;
                      set({ linkedinUrl: value });
                      // Real-time validation
                      if (value && !isValidUrlFormat(value)) {
                        setErrors(prev => ({ ...prev, linkedinUrl: "URL must start with http:// or https://" }));
                      } else {
                        setErrors(prev => ({ ...prev, linkedinUrl: "" }));
                      }
                    }}
                  />
                  <ErrorText>{errors.linkedinUrl}</ErrorText>
                  {data.linkedinUrl && !isValidUrlFormat(data.linkedinUrl) && (
                    <p className="mt-2 text-sm text-red-600 font-medium">Please enter a valid URL starting with http:// or https://</p>
                  )}
                </div>
                <div>
                  <FieldLabel required={false}>GitHub URL (Optional)</FieldLabel>
                  <TextInput 
                    hasError={!!errors.githubUrl}
                    placeholder="GitHub profile URL" 
                    value={data.githubUrl} 
                    onChange={(e) => {
                      const value = e.target.value;
                      set({ githubUrl: value });
                      // Real-time validation
                      if (value && !isValidUrlFormat(value)) {
                        setErrors(prev => ({ ...prev, githubUrl: "URL must start with http:// or https://" }));
                      } else {
                        setErrors(prev => ({ ...prev, githubUrl: "" }));
                      }
                    }}
                  />
                  <ErrorText>{errors.githubUrl}</ErrorText>
                  {data.githubUrl && !isValidUrlFormat(data.githubUrl) && (
                    <p className="mt-2 text-sm text-red-600 font-medium">Please enter a valid URL starting with http:// or https://</p>
                  )}
                </div>
                <div>
                  <FieldLabel required={false}>Portfolio Link (Optional)</FieldLabel>
                  <TextInput 
                    hasError={!!errors.portfolioUrl}
                    placeholder="Portfolio website URL" 
                    value={data.portfolioUrl} 
                    onChange={(e) => {
                      const value = e.target.value;
                      set({ portfolioUrl: value });
                      // Real-time validation
                      if (value && !isValidUrlFormat(value)) {
                        setErrors(prev => ({ ...prev, portfolioUrl: "URL must start with http:// or https://" }));
                      } else {
                        setErrors(prev => ({ ...prev, portfolioUrl: "" }));
                      }
                    }}
                  />
                  <ErrorText>{errors.portfolioUrl}</ErrorText>
                  {data.portfolioUrl && !isValidUrlFormat(data.portfolioUrl) && (
                    <p className="mt-2 text-sm text-red-600 font-medium">Please enter a valid URL starting with http:// or https://</p>
                  )}
                </div>
              </div>
            </div>

            {/* Document Upload Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-6 pb-2 border-b border-gray-200">Document Upload</h3>
              <div className="space-y-6">
                <div>
                  <FileInput
                    label="Cover Letter (Optional)"
                    required={false}
                    hasError={!!errors.coverLetterUrl}
                    file={data.coverLetterFile ?? null}
                    onFileChange={(f) => set({ coverLetterFile: f })}
                    onUploaded={(url) => {
                      set({ coverLetterUrl: url });
                      if (errors.coverLetterUrl) {
                        setErrors(prev => ({ ...prev, coverLetterUrl: '' }));
                      }
                    }}
                  />
                  <ErrorText>{errors.coverLetterUrl}</ErrorText>
                </div>
                <div className="sm:col-span-2">
                  <FileInput
                    label="Resume"
                    required={true}
                    hasError={!!errors.resumeUrl}
                    file={data.resumeFile ?? null}
                    onFileChange={(f) => set({ resumeFile: f })}
                    onUploaded={(url) => {
                      set({ resumeUrl: url });
                      if (errors.resumeUrl) {
                        setErrors(prev => ({ ...prev, resumeUrl: '' }));
                      }
                    }}
                  />
                  <ErrorText>{errors.resumeUrl}</ErrorText>
                </div>
                <div className="sm:col-span-2">
                  <FileInput
                    label="Transcript (Optional)"
                    required={false}
                    hasError={!!errors.transcriptUrl}
                    file={data.transcriptFile ?? null}
                    onFileChange={(f) => set({ transcriptFile: f })}
                    onUploaded={(url) => {
                      set({ transcriptUrl: url });
                      if (errors.transcriptUrl) {
                        setErrors(prev => ({ ...prev, transcriptUrl: '' }));
                      }
                    }}
                  />
                  <ErrorText>{errors.transcriptUrl}</ErrorText>
                </div>
              </div>
            </div>

            {/* Consent Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-6 pb-2 border-b border-gray-200">Consent & Agreement</h3>
              <div className={`space-y-4 rounded-xl border p-6 ${errors.confirmAccuracy || errors.agreeTos ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-start gap-4">
                  <input
                    id="confirm"
                    type="checkbox"
                    className={`mt-1 h-5 w-5 rounded focus:ring-2 ${errors.confirmAccuracy ? 'border-red-500 text-red-600 focus:ring-red-500' : 'border-gray-300 text-orange-600 focus:ring-orange-500'}`}
                    checked={data.confirmAccuracy}
                    onChange={(e) => {
                      set({ confirmAccuracy: e.target.checked });
                      if (errors.confirmAccuracy) {
                        setErrors(prev => ({ ...prev, confirmAccuracy: '' }));
                      }
                    }}
                  />
                  <label htmlFor="confirm" className="text-sm text-gray-800 leading-relaxed">
                    I confirm that the information provided is accurate and can be used for job applications on my behalf.
                    <span className="ml-1 text-red-500">*</span>
                  </label>
                </div>
                <ErrorText>{errors.confirmAccuracy}</ErrorText>

                <div className="flex items-start gap-4">
                  <input
                    id="tos"
                    type="checkbox"
                    className={`mt-1 h-5 w-5 rounded focus:ring-2 ${errors.agreeTos ? 'border-red-500 text-red-600 focus:ring-red-500' : 'border-gray-300 text-orange-600 focus:ring-orange-500'}`}
                    checked={data.agreeTos}
                    onChange={(e) => {
                      set({ agreeTos: e.target.checked });
                      if (errors.agreeTos) {
                        setErrors(prev => ({ ...prev, agreeTos: '' }));
                      }
                    }}
                  />
                  <label htmlFor="tos" className="text-sm text-gray-800 leading-relaxed">
                    I agree to the Terms of Service and Privacy Policy of FlashFire, and the conditions listed at
                    <a className="ml-1 underline decoration-orange-600 decoration-2 underline-offset-2 hover:text-orange-600" href="https://www.flashfirejobs.com/termsofservice" target="_blank" rel="noreferrer">
                      www.flashfirejobs.com/termsofservice
                    </a>
                    .
                    <span className="ml-1 text-red-500">*</span>
                  </label>
                </div>
                <ErrorText>{errors.agreeTos}</ErrorText>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  }, [stepIndex, data, errors]);

  // removed: if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2">
      <div className="relative z-10 mx-auto w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-black/5 px-4 sm:px-6 py-5 max-h-[90vh] flex flex-col">
        {/* Progress Bar Placeholder */}
        {/* Slim Gradient Header with Icon and Badge */}
        <div className="w-full flex items-center justify-between bg-gradient-to-r from-orange-500 to-rose-600 rounded-t-xl px-6 py-4 mb-2">
          <div className="flex items-center gap-2">
            <span className="bg-white/30 rounded-full p-1"><svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></span>
            <span className="text-white font-bold text-base">Step {stepIndex + 1} of 3</span>
          </div>
          <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full">All fields required</span>
        </div>
        {/* Description */}
        <div className="w-full text-center text-sm text-gray-700 mb-3">{STEPS[stepIndex].blurb}</div>
        {/* Progress Bar/Stepper */}
        <div className="w-full flex items-center gap-2 mb-4">
          <div className={`flex-1 h-2 rounded-full ${stepIndex >= 0 ? 'bg-orange-500' : 'bg-gray-200'}`}></div>
          <div className={`flex-1 h-2 rounded-full ${stepIndex >= 1 ? 'bg-orange-500' : 'bg-gray-200'}`}></div>
          <div className={`flex-1 h-2 rounded-full ${stepIndex === 2 ? 'bg-orange-500' : 'bg-gray-200'}`}></div>
        </div>
        {/* Form Fields: Full width, icons, spacing */}
        <div className="max-h-[48vh] overflow-y-auto overflow-x-hidden p-3 space-y-6 w-full box-border">
          {page}
        </div>
        {/* Footer Buttons */}
        <div className="flex items-center justify-between gap-2 border-t border-gray-200 bg-gray-50 px-4 py-3 mt-auto">
          <div className="flex items-center gap-2">
            <button
              onClick={back}
              disabled={stepIndex === 0}
              className="inline-flex items-center rounded border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-500 enabled:hover:bg-gray-50 disabled:opacity-40 transition-colors duration-200"
            >
              Back
            </button>
            <button
              className="inline-flex items-center rounded border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-orange-500 hover:bg-orange-50 transition-colors duration-200"
            >
              Save & Continue Later
            </button>
            {!isLast ? (
              <button
                onClick={handleNextWithLog}
                className="inline-flex items-center rounded bg-gradient-to-r from-orange-500 to-rose-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-90 transition-opacity duration-200"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="inline-flex items-center rounded bg-gradient-to-r from-orange-500 to-rose-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-90 transition-opacity duration-200"
              >
                Submit
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
