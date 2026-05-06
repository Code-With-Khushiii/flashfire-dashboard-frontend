import {
    X,
    Briefcase,
    Calendar,
    User,
    FileText,
    ArrowRight,
    Link,
    Copy,
    ExternalLink,
    TimerIcon,
    Upload as UploadIcon,
    Check,
    Loader2,
    Mail,
    GitCommit,
} from "lucide-react";
import { useRef, useState, Suspense, lazy, useContext, useEffect } from "react";
import LoadingScreen from "./LoadingScreen.tsx";
import { getTimeAgo } from "../utils/getTimeAgo.ts";
import { UserContext } from "../state_management/UserContext.tsx";
import { useUserJobs } from "../state_management/UserJobs.tsx"; // ⬅️ NEW
import { hasOptimizedResumeLocal } from "../utils/hasOptimizedResumeLocal.ts";
import { useJobDescriptionLoader } from "../state_management/JobsSessionStore.ts";
const AttachmentsModal = lazy(() => import("./AttachmentsModal.tsx"));
import ResumeChangesComparison from "./ResumeChangesComparison.tsx";
import { useOperationsStore } from "../state_management/Operations.ts";
import { useResumeStore } from "./AiOprimizer/store/useResumeStore.ts";
import { toastUtils, toastMessages } from "../utils/toast.ts";
import { useJobsSessionStore } from "../state_management/JobsSessionStore.ts";
import {
    getOptimizedResumeUrl,
    getOptimizedResumeTitle,
} from "../utils/getOptimizedResumeUrl.ts";
import { ResumePreview } from "./AiOprimizer/components/ResumePreview.tsx";
// import { ResumePreview1 } from "./AiOprimizer/components/ResumePreview1";
import { ResumePreviewMedical } from "./AiOprimizer/components/ResumePreviewMedical.tsx";

/* ---------- ENV ---------- */
import { uploadAttachment } from "../utils/uploadService.ts";
import { optimizeImageUrl } from "../utils/imageCache.ts";
import { savePdf } from "../utils/savePdf.ts";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
const JOB_UPDATE_ENDPOINT = `${API_BASE}/updatechanges`;
const PLAN_ENDPOINT = `${API_BASE}/api/plans/select`;

function normalizeRole(value: unknown): string {
    return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function isFlashfireOpsEmail(value: unknown): boolean {
    return typeof value === "string" && value.toLowerCase().includes("@flashfirehq");
}

/** Same diff rules as flashfire-dashboard-backend autoOptimizationWorker (changesMade for JobModal + auto-opt). */
function hasStableResumeRowId(entry: any): boolean {
    return entry && entry.id !== undefined && entry.id !== null && entry.id !== "";
}

function pairResumeRowsByIdThenIndex(origArr: any[] | undefined, optArr: any[] | undefined) {
    const orig = Array.isArray(origArr) ? origArr : [];
    const opt = Array.isArray(optArr) ? optArr : [];
    const pairedOrigIdx = new Set<number>();
    const pairedOptIdx = new Set<number>();
    const pairs: { orig: any; opt: any }[] = [];

    orig.forEach((o, oi) => {
        if (!hasStableResumeRowId(o)) return;
        const idStr = String(o.id);
        const j = opt.findIndex(
            (p, idx) => !pairedOptIdx.has(idx) && hasStableResumeRowId(p) && String(p.id) === idStr
        );
        if (j >= 0) {
            pairs.push({ orig: o, opt: opt[j] });
            pairedOrigIdx.add(oi);
            pairedOptIdx.add(j);
        }
    });

    const unpairedOrig = orig.filter((_, i) => !pairedOrigIdx.has(i));
    const unpairedOpt = opt.filter((_, i) => !pairedOptIdx.has(i));
    const len = Math.max(unpairedOrig.length, unpairedOpt.length);
    for (let k = 0; k < len; k++) {
        pairs.push({ orig: unpairedOrig[k], opt: unpairedOpt[k] });
    }
    return pairs;
}

function deepCloneDiff(val: any) {
    if (val === undefined) return val;
    try {
        return JSON.parse(JSON.stringify(val));
    } catch {
        return val;
    }
}

const EXTRA_CHANGE_SECTION_KEYS = [
    "projects",
    "leadership",
    "education",
    "publications",
] as const;

function diffWorkExperienceResumeEntry(orig: any, opt: any) {
    const originals: Record<string, any> = {};
    const changes: Record<string, any> = {};
    let hasChanges = false;
    if (!orig || !opt) {
        return { hasChanges: false, originals, changes, id: orig?.id ?? opt?.id };
    }
    (["position", "company", "duration", "location", "roleType"] as const).forEach((field) => {
        if (orig[field] !== opt[field]) {
            originals[field] = orig[field];
            changes[field] = opt[field];
            hasChanges = true;
        }
    });
    if (JSON.stringify(orig.responsibilities) !== JSON.stringify(opt.responsibilities)) {
        originals.responsibilities = [...(orig.responsibilities || [])];
        changes.responsibilities = [...(opt.responsibilities || [])];
        hasChanges = true;
    }
    return { hasChanges, originals, changes, id: orig.id };
}

function getOptimizationChangesMade(baselineForDiff: any, optimizedData: any) {
    const startingContent: Record<string, any> = {};
    const finalChanges: Record<string, any> = {};

    if (!baselineForDiff || !optimizedData) {
        return {
            startingContent: { summary: baselineForDiff?.summary ?? "" },
            finalChanges: { summary: optimizedData?.summary ?? "" },
        };
    }

    const origPI = baselineForDiff.personalInfo || {};
    const optPI = optimizedData.personalInfo || {};
    const personalInfoChanged = Object.keys(origPI).filter((key) => origPI[key] !== optPI[key]);
    if (personalInfoChanged.length > 0) {
        startingContent.personalInfo = {};
        finalChanges.personalInfo = {};
        personalInfoChanged.forEach((key) => {
            startingContent.personalInfo[key] = origPI[key];
            finalChanges.personalInfo[key] = optPI[key];
        });
    }

    if ((baselineForDiff.summary || "") !== (optimizedData.summary || "")) {
        startingContent.summary = baselineForDiff.summary || "";
        finalChanges.summary = optimizedData.summary || "";
    }

    const changedWorkExp: any[] = [];
    for (const { orig, opt } of pairResumeRowsByIdThenIndex(
        baselineForDiff.workExperience,
        optimizedData.workExperience
    )) {
        const { hasChanges, originals, changes, id } = diffWorkExperienceResumeEntry(orig, opt);
        if (hasChanges && orig && opt) {
            changedWorkExp.push({ id, original: originals, optimized: changes });
        } else if (orig && !opt) {
            changedWorkExp.push({
                id: orig.id,
                original: {
                    ...(["position", "company", "duration", "location", "roleType"] as const).reduce(
                        (acc: any, f) => {
                            acc[f] = orig[f];
                            return acc;
                        },
                        {}
                    ),
                    responsibilities: [...(orig.responsibilities || [])],
                },
                optimized: {},
            });
        } else if (!orig && opt) {
            changedWorkExp.push({
                id: opt.id,
                original: {},
                optimized: {
                    ...(["position", "company", "duration", "location", "roleType"] as const).reduce(
                        (acc: any, f) => {
                            acc[f] = opt[f];
                            return acc;
                        },
                        {}
                    ),
                    responsibilities: [...(opt.responsibilities || [])],
                },
            });
        }
    }

    if (changedWorkExp.length > 0) {
        startingContent.workExperience = changedWorkExp.map((item) => ({
            id: item.id,
            ...item.original,
        }));
        finalChanges.workExperience = changedWorkExp.map((item) => ({
            id: item.id,
            ...item.optimized,
        }));
    }

    const changedSkills: any[] = [];
    for (const { orig, opt } of pairResumeRowsByIdThenIndex(
        baselineForDiff.skills,
        optimizedData.skills
    )) {
        if (orig && opt && (orig.category !== opt.category || orig.skills !== opt.skills)) {
            changedSkills.push({
                id: orig.id,
                original: { category: orig.category, skills: orig.skills },
                optimized: { category: opt.category, skills: opt.skills },
            });
        } else if (orig && !opt) {
            changedSkills.push({
                id: orig.id,
                original: { category: orig.category, skills: orig.skills },
                optimized: { category: "", skills: "" },
            });
        } else if (!orig && opt) {
            changedSkills.push({
                id: opt.id,
                original: { category: "", skills: "" },
                optimized: { category: opt.category, skills: opt.skills },
            });
        }
    }

    if (changedSkills.length > 0) {
        startingContent.skills = changedSkills.map((item) => ({
            id: item.id,
            ...item.original,
        }));
        finalChanges.skills = changedSkills.map((item) => ({
            id: item.id,
            ...item.optimized,
        }));
    }

    for (const key of EXTRA_CHANGE_SECTION_KEYS) {
        const a = baselineForDiff[key];
        const b = optimizedData[key];
        if (JSON.stringify(a) !== JSON.stringify(b)) {
            startingContent[key] = deepCloneDiff(a);
            finalChanges[key] = deepCloneDiff(b);
        }
    }

    if (
        !startingContent.workExperience &&
        JSON.stringify(baselineForDiff.workExperience) !==
            JSON.stringify(optimizedData.workExperience)
    ) {
        startingContent.workExperience = deepCloneDiff(baselineForDiff.workExperience);
        finalChanges.workExperience = deepCloneDiff(optimizedData.workExperience);
    }
    if (
        !startingContent.skills &&
        JSON.stringify(baselineForDiff.skills) !== JSON.stringify(optimizedData.skills)
    ) {
        startingContent.skills = deepCloneDiff(baselineForDiff.skills);
        finalChanges.skills = deepCloneDiff(optimizedData.skills);
    }
    if (
        !startingContent.summary &&
        JSON.stringify(baselineForDiff.summary ?? "") !==
            JSON.stringify(optimizedData.summary ?? "")
    ) {
        startingContent.summary = baselineForDiff.summary ?? "";
        finalChanges.summary = optimizedData.summary ?? "";
    }

    if (Object.keys(startingContent).length === 0) {
        const structuralKeys = ["personalInfo", "summary", "workExperience", "skills"] as const;
        for (const key of structuralKeys) {
            const a = baselineForDiff[key];
            const b = optimizedData[key];
            if (JSON.stringify(a) !== JSON.stringify(b)) {
                startingContent[key] = deepCloneDiff(a);
                finalChanges[key] = deepCloneDiff(b);
            }
        }
    }

    return { startingContent, finalChanges };
}

/* ---------- Upload handler (uses backend API - supports R2 and Cloudinary) ---------- */
async function uploadToCloudinary(
    file: File,
    {
        resourceType = "auto",
        folder = "flashfirejobs",
        preset = undefined,
    }: {
        resourceType?: "auto" | "image" | "raw";
        folder?: string;
        preset?: string;
    } = {}
) {
    try {
        // Use the new unified upload service
        const url = await uploadAttachment(file, folder);
        return { secure_url: url };
    } catch (error) {
        console.error("Upload error:", error);
        throw error;
    }
}

/* ---------- Persist new image URLs into JobModel.attachments[] ---------- */
async function persistAttachmentsToJob({
    jobID,
    userEmail,
    urls,
    token,
    role,
    userDetails,
    operationsUserName,
    operationsUserEmail,
}: {
    jobID: string;
    userEmail: string;
    urls: string[];
    token: string | null;
    role?: string;
    userDetails?: any;
    operationsUserName?: string;
    operationsUserEmail?: string;
}) {
    if (role == "operations") {
        const payload = {
            action: "edit",
            jobID,
            userDetails: { email: userEmail, name: operationsUserName || userEmail },
            attachmentUrls: urls,
            role: role,
            operationsName: operationsUserName || "operations",
            operationsEmail: operationsUserEmail || "operations@flashfirehq"
        };

        const res = await fetch(`${API_BASE}/operations/jobs`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            let errorMessage = "Failed to persist attachments";
            try {
                const errorResponse = await res.json();
                errorMessage = errorResponse.message || errorMessage;
            } catch {
                // If JSON parsing fails, try to get text
                try {
                    errorMessage = await res.text() || errorMessage;
                } catch {
                    errorMessage = `Server error: ${res.status} ${res.statusText}`;
                }
            }
            throw new Error(errorMessage);
        }
        return res.json() as Promise<{ message?: string; updatedJobs?: any[] }>;
    } else {
        const payload = {
            action: "edit",
            jobID,
            userDetails: { email: userEmail, name: userDetails?.name || userEmail },
            attachmentUrls: urls,
            token,
            role: role,
        };

        const res = await fetch(JOB_UPDATE_ENDPOINT, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        if (!res.ok) {
            let errorMessage = "Failed to persist attachments";
            try {
                const errorResponse = await res.json();
                errorMessage = errorResponse.message || errorMessage;
            } catch {
                // If JSON parsing fails, try to get text
                try {
                    errorMessage = await res.text() || errorMessage;
                } catch {
                    errorMessage = `Server error: ${res.status} ${res.statusText}`;
                }
            }
            throw new Error(errorMessage);
        }
        return res.json() as Promise<{ message?: string; updatedJobs?: any[] }>;
    }
}

/* ---------- Persist optimized resume to UserModel via PlanSelect ---------- */
async function persistOptimizedResumeToUser({
    token,
    userEmail,
    entry,
    role,
}: {
    token: string | null;
    userEmail: string;
    role?: string;
    entry: {
        url: string;
        companyName?: string;
        jobRole?: string;
        jobId?: string;
        jobLink?: string;
    };
}) {
    if (role == "operations") {
        const payload = {
            userDetails: { email: userEmail },
            optimizedResumeEntry: {
                url: entry.url,
                companyName: entry.companyName ?? "",
                jobRole: entry.jobRole ?? "",
                jobId: entry.jobId ?? "",
                jobLink: entry.jobLink ?? "",
                name: entry.jobRole,
                createdAt: Date.now()
            },
        };

        const res = await fetch(`${API_BASE}/operations/plans/select`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        const text = await res.text();
        let json: any = {};
        try {
            json = text ? JSON.parse(text) : {};
        } catch { }
        if (!res.ok)
            throw new Error(
                (json && json.message) ||
                text ||
                "Failed to save optimized resume"
            );
        return json as { message?: string; userDetails?: any };
    } else {
        const payload = {
            token,
            userDetails: { email: userEmail },
            optimizedResumeEntry: {
                url: entry.url,
                companyName: entry.companyName ?? "",
                jobRole: entry.jobRole ?? "",
                jobId: entry.jobId ?? "",
                jobLink: entry.jobLink ?? "",
            },
        };

        const res = await fetch(PLAN_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        const text = await res.text();
        let json: any = {};
        try {
            json = text ? JSON.parse(text) : {};
        } catch { }
        if (!res.ok)
            throw new Error(
                (json && json.message) ||
                text ||
                "Failed to save optimized resume"
            );
        return json as { message?: string; userDetails?: any };
    }
}

type Sections =
    | "details"
    | "link"
    | "description"
    | "attachments"
    | "resume"
    | "timeline"
    | "changes";

export default function JobModal({
    setShowJobModal,
    jobDetails,
    initialSection, // ⬅️ NEW (optional)
    onResumeUploaded,
    onAutoCheckDone,
    onAttachmentUploaded,
}: {
    setShowJobModal: (v: boolean) => void;
    jobDetails: any;
    initialSection?: Sections; // ⬅️ NEW
    onResumeUploaded?: (url?: string) => void;
    onAutoCheckDone?: (exists: boolean) => void;
    onAttachmentUploaded?: (updatedJob?: any) => void;
}) {
    const ctx = useContext(UserContext);
    const token = ctx?.token ?? null;
    const setData = ctx?.setData ?? null;
    const currentUser = ctx?.userDetails ?? {};
    const currentUserEmail = typeof currentUser?.email === "string" ? currentUser.email.trim().toLowerCase() : "";

    const getCompanyDomain = (companyName: string) => {
        return companyName.replace(/\s+/g, '').toLowerCase();
    };

    const { role, name: operationsUserName, email: operationsUserEmail, getOperatorName } = useOperationsStore();
    const normalizedStoreRole = normalizeRole(role);
    const normalizedContextRole = normalizeRole(
        currentUser?.role || currentUser?.userType
    );
    const normalizedStoredRole = normalizeRole(localStorage.getItem("role"));
    const normalizedCurrentUserRole = normalizedContextRole || normalizedStoredRole;
    const hasOpsRole =
        normalizedCurrentUserRole === "operations" ||
        normalizedCurrentUserRole === "operator" ||
        normalizedStoreRole === "operations" ||
        normalizedStoreRole === "operator";
    const isEndUserSession = !hasOpsRole && !!currentUserEmail && !isFlashfireOpsEmail(currentUserEmail);
    const isOperatorViewer = hasOpsRole || isFlashfireOpsEmail(operationsUserEmail || "");
    const isSavedStatusForViewer = String(jobDetails?.currentStatus || "")
        .toLowerCase()
        .startsWith("saved");
    const hideResumeAndChangesForViewer =
        isEndUserSession && isSavedStatusForViewer;

    // NEW (paste-to-upload buffer)
    const [pastedImages, setPastedImages] = useState<File[]>([]);
    const [pastedPreviews, setPastedPreviews] = useState<string[]>([]);
    const [isUploadingPasted, setIsUploadingPasted] = useState(false);
    const [pasteError, setPasteError] = useState<string | null>(null);

    const { setUserJobs } = useUserJobs();
    const { getJobDescription, isJobDescriptionLoading, loadJobDescription } = useJobDescriptionLoader();
    const { refreshJobByMongoId } = useJobsSessionStore();

    const [attachmentsModalActiveStatus, setAttachmentsModalActiveStatus] =
        useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [resumeData, setResumeData] = useState<any>(null);
    const [resumeLoading, setResumeLoading] = useState(false);
    const [resumeError, setResumeError] = useState<string | null>(null);
    const [activeSection, setActiveSection] = useState<Sections>(
        initialSection ?? "details"
    );
    const [showOptimizeScaleModal, setShowOptimizeScaleModal] = useState(false); // For operations role
    const [showDownloadFilenameModal, setShowDownloadFilenameModal] = useState(false); // For confirmation modal
    const [downloadFilename, setDownloadFilename] = useState("");
    const [originalFilename, setOriginalFilename] = useState("");
    const [showFilenameConfirmModal, setShowFilenameConfirmModal] = useState(false);
    const [pendingDownloadBlob, setPendingDownloadBlob] = useState<Blob | null>(null);
    const [optimizedResumeData, setOptimizedResumeData] = useState<any>(null); // To store optimized data for scaling modal
    const [optimizedResumeMetadata, setOptimizedResumeMetadata] = useState<any>(null);
    const [showOptimizeConfirmation, setShowOptimizeConfirmation] = useState(false);
    const [resumeNameForModal, setResumeNameForModal] = useState<string>("");
    const [optimizeScale, setOptimizeScale] = useState(() => {
        const saved = localStorage.getItem('resumePreview_lastScale');
        return saved ? parseFloat(saved) : 1.0;
    });
    const [removalReasonData, setRemovalReasonData] = useState<{
        removalReason: string;
        removalDate: string;
        removedBy: string;
    } | null>(null);


    const handleDownloadClick = async () => {
        if (role !== 'operator' && role !== 'operations') {
            return; // Don't track downloads for non-operation users
        }

        try {
            const mongoId = jobDetails._id;
            const jobId = jobDetails.jobID;
            const idToUse = mongoId || jobId;

            if (!idToUse) {
                console.error('No ID found in job details:', jobDetails);
                return;
            }

            await fetch(`${API_BASE}/downloaded`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: idToUse }),
            });

            if (setUserJobs) {
                setUserJobs((prev) =>
                    prev.map(j =>
                        ((j._id === idToUse || j.jobID === idToUse)) ? { ...j, downloaded: true } : j
                    )
                );
            }
        } catch (error) {
            console.error("Failed to track download:", error);
        }
    };

    const showOpsDownloadIndicator =
        (role === 'operator' || role === 'operations') && !jobDetails.downloaded;

    // NEW: Blocking state for optimization
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [optimizationError, setOptimizationError] = useState<string | null>(null);

    // Load job description when modal opens (skip if we already know it's empty)
    useEffect(() => {
        if (jobDetails?.jobID && activeSection === 'description') {
            if (jobDetails.jobDescription === '') return; // Already know it's empty
            const cachedDescription = getJobDescription(jobDetails.jobID);
            if (cachedDescription !== null && cachedDescription !== undefined) return; // Already cached
            if (!isJobDescriptionLoading(jobDetails.jobID)) {
                loadJobDescription(jobDetails.jobID);
            }
        }
    }, [jobDetails?.jobID, jobDetails?.jobDescription, activeSection, getJobDescription, isJobDescriptionLoading, loadJobDescription]);

    useEffect(() => {
        if (role === "operations" && jobDetails?.jobID && jobDetails?.userID) {
            const isRemoved = jobDetails?.currentStatus?.toLowerCase().startsWith('deleted') || 
                             jobDetails?.currentStatus?.toLowerCase().startsWith('removed');
            
            if (isRemoved) {
                setRemovalReasonData(null);
                
                fetch(`${API_BASE}/get-removal-reason`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        jobID: jobDetails.jobID,
                        userEmail: jobDetails.userID
                    }),
                })
                .then(res => res.json())
                .then(result => {
                    if (result.success && result.removalReason) {
                        setRemovalReasonData({
                            removalReason: result.removalReason,
                            removalDate: result.removalDate || '',
                            removedBy: result.removedBy || 'user'
                        });
                    }
                })
                .catch(error => {
                    console.error('Error fetching removal reason:', error);
                });
            } else {
                setRemovalReasonData(null);
            }
        } else {
            setRemovalReasonData(null);
        }
    }, [jobDetails?.jobID, jobDetails?.userID, jobDetails?.currentStatus, role]);



    // Handle keyboard shortcuts for job description copy
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Check for Ctrl + Shift + C
            if (event.ctrlKey && event.shiftKey && event.key === 'C') {
                event.preventDefault();

                // Only copy if we're in the description section and have job description
                if (activeSection === 'description' && jobDetails?.jobDescription) {
                    const text = document.querySelector(".job-description-html")?.textContent || "";
                    if (text.trim()) {
                        navigator.clipboard.writeText(text);
                        // Optional: Show a brief notification
                        console.log("✅ Job description copied to clipboard!");
                    }
                }
            }
        };

        // Add event listener
        document.addEventListener('keydown', handleKeyDown);

        // Cleanup
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [activeSection, jobDetails?.jobDescription]);

    // local image grid
    const [attachments, setAttachments] = useState<string[]>(
        () => jobDetails?.attachments || []
    );
    const [imgFile, setImgFile] = useState<File | null>(null); // kept for minimal-change parity (not used in paste flow)
    const [isUploadingImg, setIsUploadingImg] = useState(false); // kept
    const [imgError, setImgError] = useState<string | null>(null); // kept

    // optimized resume (document) — in DETAILS tab
    const docInputRef = useRef<HTMLInputElement | null>(null);
    const [isUploadingDoc, setIsUploadingDoc] = useState(false);
    const [docError, setDocError] = useState<string | null>(null);
    const [recentDocUrl, setRecentDocUrl] = useState<string | null>(null);

    // --- helper: compute whether resume exists for this job (localStorage) ---
    useEffect(() => {
        if (initialSection) setActiveSection(initialSection);
    }, [initialSection]);

    // Function to fetch resume data
    const fetchResumeData = async (jobId: string) => {
        setResumeLoading(true);
        setResumeError(null);

        try {
            // Check session storage first
            const cacheKey = `resume_${jobId}`;
            const cachedData = sessionStorage.getItem(cacheKey);

            if (cachedData) {
                const parsed = JSON.parse(cachedData);
                const now = new Date().getTime();
                const cacheTime = parsed.timestamp || 0;
                const hoursDiff = (now - cacheTime) / (1000 * 60 * 60);

                if (hoursDiff < 24) {
                    const defaultOrder = [
                        "personalInfo",
                        "summary",
                        "workExperience",
                        "projects",
                        "leadership",
                        "skills",
                        "education",
                        "publications",
                    ];
                    setResumeData({
                        ...parsed.data,
                        sectionOrder: parsed.data?.sectionOrder || defaultOrder,
                    });
                    setResumeLoading(false);
                    return;
                }
            }

            const response = await fetch(`${API_BASE}/getOptimizedResume/${jobId}`);
            const result = await response.json();

            if (response.ok && result.success) {
                const defaultOrder = [
                    "personalInfo",
                    "summary",
                    "workExperience",
                    "projects",
                    "leadership",
                    "skills",
                    "education",
                    "publications",
                ];
                setResumeData({
                    ...result.optimizedResume,
                    sectionOrder:
                        result.optimizedResume?.sectionOrder || defaultOrder,
                });
                // Cache for 24 hours
                sessionStorage.setItem(cacheKey, JSON.stringify({
                    data: {
                        ...result.optimizedResume,
                        sectionOrder:
                            result.optimizedResume?.sectionOrder || defaultOrder,
                    },
                    timestamp: new Date().getTime()
                }));
            } else {
                setResumeError(result.error || "No optimized resume found");
            }
        } catch (error) {
            setResumeError("Failed to load resume data");
            console.error("Error fetching resume data:", error);
        } finally {
            setResumeLoading(false);
        }
    };

    // Auto-load resume data when switching to resume tab
    useEffect(() => {
        if (activeSection === "resume" && jobDetails?.jobID) {
            // First check if job has optimizedResume data directly
            if (jobDetails.optimizedResume?.resumeData) {
                console.log("Auto-loading resume from job data");
                const defaultOrder = [
                    "personalInfo",
                    "summary",
                    "workExperience",
                    "projects",
                    "leadership",
                    "skills",
                    "education",
                    "publications",
                ];
                setResumeData({
                    ...jobDetails.optimizedResume,
                    sectionOrder:
                        jobDetails.optimizedResume.sectionOrder || defaultOrder,
                });
                return;
            }

            // If no resume data in job object, try to fetch from API
            if (!resumeData && !resumeLoading) {
                console.log("Auto-fetching resume from API");
                fetchResumeData(jobDetails.jobID);
            }
        }
    }, [activeSection, jobDetails?.jobID, jobDetails?.optimizedResume]);
    useEffect(() => {
        if (initialSection !== "attachments") return;

        const exists = hasOptimizedResumeLocal(
            jobDetails?.jobID,
            jobDetails?.companyName
        );

        setHasResumeForJob(exists);

        const hasAttachments = jobDetails?.attachments && Array.isArray(jobDetails.attachments) && jobDetails.attachments.length > 0;
        
        if (!hasAttachments && initialSection === "attachments") {
            return;
        }

        onAutoCheckDone?.(exists);
    }, [initialSection, jobDetails?.jobID, jobDetails?.companyName, jobDetails?.attachments]);

    // const computeHasResumeForJob = () => {
    //   try {
    //     const auth = JSON.parse(localStorage.getItem("userAuth") || "{}");

    //     // Prefer array at userDetails (as you asked): userAuth.userDetails.filter(...)
    //     let arr: any[] = Array.isArray(auth?.userDetails) ? auth.userDetails : [];

    //     // fallback: sometimes resumes live at userDetails.optimizedResumes
    //     if (!arr.length && Array.isArray(auth?.userDetails?.optimizedResumes)) {
    //       arr = auth.userDetails.optimizedResumes;
    //     }

    //     const currentId = jobDetails?.jobID;
    //     return Array.isArray(arr) && arr.some((item) => (item?.jobID ?? item?.jobId) === currentId);
    //   } catch {
    //     return false;
    //   }
    // };

    const [hasResumeForJob, setHasResumeForJob] = useState<boolean>(() =>
        hasOptimizedResumeLocal(jobDetails?.jobID, jobDetails?.companyName)
    );

    // Always keep it in sync when job or local user changes
    useEffect(() => {
        setHasResumeForJob(hasOptimizedResumeLocal(jobDetails?.jobID, jobDetails?.companyName));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [jobDetails?.jobID, jobDetails?.companyName, ctx?.userDetails]);
    // NEW: capture images from Ctrl+V
    const handlePasteImages = (e: React.ClipboardEvent<HTMLDivElement>) => {
        setPasteError(null);
        const items = e.clipboardData?.items || [];
        for (const item of items) {
            if (item.type && item.type.startsWith("image/")) {
                const f = item.getAsFile();
                if (f) {
                    // ✅ Append new image(s) to the existing pasted list
                    setPastedImages((prev) => [...prev, f]);
                    setPastedPreviews((prev) => [...prev, URL.createObjectURL(f)]);
                }
            }
        }
    };


    // NEW: upload pasted images -> Cloudinary -> persist to job.attachments[]
    const uploadPastedImages = async () => {
        setPasteError(null);
        if (!pastedImages.length) return;

        const jobID = jobDetails?.jobID;
        const userEmail = currentUser?.email;
        if (!jobID || !userEmail) {
            setPasteError(
                "Missing jobID or user email; cannot save attachments."
            );
            return;
        }

        setIsUploadingPasted(true);
        try {
            const urls: string[] = [];
            for (const file of pastedImages) {
                const up = await uploadToCloudinary(file, {
                    resourceType: "image",
                    folder: "flashfirejobs/attachments",
                });
                if (up?.secure_url) urls.push(up.secure_url as string);
            }

            if (urls.length) {
                // ✅ Append uploaded pasted images to existing attachments
                setAttachments((prev) => [...(Array.isArray(prev) ? prev : []), ...urls]);

                const resp = await persistAttachmentsToJob({
                    jobID,
                    userEmail,
                    urls,
                    token,
                    role,
                    userDetails: currentUser, // Pass user details
                    operationsUserName, // Pass operations user name
                    operationsUserEmail, // Pass operations user email
                });

                if (resp?.updatedJobs) {
                    setUserJobs(resp.updatedJobs);
                    const updated = resp.updatedJobs.find((j) => j.jobID === jobID);
                    if (updated) {
                        if (updated.attachments && Array.isArray(updated.attachments) && updated.attachments.length > 0) {
                            setAttachments(updated.attachments);
                        } else {
                            setAttachments(urls);
                            updated.attachments = urls;
                        }
                        onAttachmentUploaded?.(updated);
                    } else {
                        const fallbackJob = { ...jobDetails, jobID, attachments: urls };
                        setAttachments(urls);
                        onAttachmentUploaded?.(fallbackJob);
                    }
                } else {
                    const fallbackJob = { ...jobDetails, jobID, attachments: urls };
                    setAttachments(urls);
                    onAttachmentUploaded?.(fallbackJob);
                }
            }


            // clear paste buffer
            pastedPreviews.forEach((u) => URL.revokeObjectURL(u));
            setPastedPreviews([]);
            setPastedImages([]);
        } catch (e: any) {
            setPasteError(e?.message || "Failed to upload pasted images.");
        } finally {
            setIsUploadingPasted(false);
        }
    };

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            toastUtils.success("Link copied to clipboard!");
        } catch (error) {
            toastUtils.error("Failed to copy link");
        }
    };

    /* ---------- Upload handlers (kept; not used in paste flow) ---------- */
    const handleImgUpload = async () => {
        setImgError(null);
        if (!imgFile) return;

        const jobID = jobDetails?.jobID;
        const userEmail = currentUser?.email;
        if (!jobID || !userEmail) {
            setImgError("Missing jobID or user email; cannot save attachment.");
            console.error("[handleImgUpload] Missing identifiers", {
                jobID,
                userEmail,
                jobDetails,
                currentUser,
            });
            return;
        }

        if (!imgFile.type.startsWith("image/")) {
            setImgError("Please choose an image (png/jpg/webp).");
            return;
        }

        setIsUploadingImg(true);
        try {
            const up = await uploadToCloudinary(imgFile, {
                resourceType: "image",
                folder: "flashfirejobs/attachments",
            });
            const url = up.secure_url as string;

            const resp = await persistAttachmentsToJob({
                jobID,
                userEmail,
                urls: [url],
                token,
                role,
                userDetails: currentUser,
                operationsUserName,
                operationsUserEmail,
            });

            if (resp?.updatedJobs) {
                setUserJobs(resp.updatedJobs);
                const updated = resp.updatedJobs.find((j) => j.jobID === jobID);
                if (updated) {
                    if (updated.attachments && Array.isArray(updated.attachments) && updated.attachments.length > 0) {
                        setAttachments(updated.attachments);
                    } else {
                        setAttachments([url]);
                        updated.attachments = [url];
                    }
                    onAttachmentUploaded?.(updated);
                } else {
                    const fallbackJob = { ...jobDetails, jobID, attachments: [url] };
                    setAttachments([url]);
                    onAttachmentUploaded?.(fallbackJob);
                }
            } else {
                const fallbackJob = { ...jobDetails, jobID, attachments: [url] };
                setAttachments([url]);
                onAttachmentUploaded?.(fallbackJob);
            }

            setImgFile(null);
        } catch (e: any) {
            setImgError(e.message || "Upload failed");
        } finally {
            setIsUploadingImg(false);
        }
    };
    const sanitizeCompanyDomain = (name: string) => {
        if (!name) return "example.com";

        // Clean spaces and invalid characters
        let domain = name
            .toLowerCase()
            .replace(/\s+/g, "")       // remove spaces
            .replace(/[^a-z0-9.-]/g, ""); // remove invalid chars

        // Avoid double .com
        if (!domain.includes(".")) domain += ".com";

        return domain;
    };

    const handleChooseDoc = () => docInputRef.current?.click();

    const handleDocFileChange = async (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        setDocError(null);
        const file = e.target.files?.[0];
        if (!file) return;

        const jobID = jobDetails?.jobID;
        const userEmail = currentUser?.email;
        if (!jobID || !userEmail) {
            setDocError(
                "Missing jobID or user email; cannot add optimized resume."
            );
            console.error("[handleDocFileChange] Missing identifiers", {
                jobID,
                userEmail,
                jobDetails,
                currentUser,
            });
            e.target.value = "";
            return;
        }

        const isDoc =
            file.type === "application/pdf" ||
            file.type === "application/msword" ||
            file.type ===
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        if (!isDoc) {
            setDocError("Please select a PDF/DOC/DOCX file.");
            e.target.value = "";
            return;
        }

        setIsUploadingDoc(true);
        try {
            // 1) upload to Cloudinary as raw document
            const up = await uploadToCloudinary(file, {
                resourceType: "raw",
                folder: "flashfirejobs/docs",
            });
            const url = up.secure_url as string;

            // 2) persist to user (PlanSelect + LocalTokenValidator)
            const resp = await persistOptimizedResumeToUser({
                token,
                userEmail,
                entry: {
                    url,
                    companyName: jobDetails?.companyName,
                    jobRole: jobDetails?.jobTitle,
                    jobId: jobDetails?.jobID,
                    jobLink: jobDetails?.joblink,
                },
                role,
            });

            // 3) UPDATE CONTEXT + LOCALSTORAGE with server user details
            const serverUser = resp?.userDetails;
            if (serverUser) {
                const existingAuthRaw = localStorage.getItem("userAuth");
                const existingAuth = existingAuthRaw
                    ? JSON.parse(existingAuthRaw)
                    : {};
                const finalToken: string =
                    (token as string) || existingAuth?.token || "";

                if (ctx?.setData && finalToken) {
                    ctx.setData({ userDetails: serverUser, token: finalToken });
                } else {
                    localStorage.setItem(
                        "userAuth",
                        JSON.stringify({
                            ...existingAuth,
                            userDetails: serverUser,
                            token: finalToken,
                        })
                    );
                }
            }

            setRecentDocUrl(url);
            setHasResumeForJob(true); // 🔒 flip UI immediately
            onResumeUploaded?.(url);
            e.target.value = "";
        } catch (e: any) {
            setDocError(e.message || "Upload failed");
        } finally {
            setIsUploadingDoc(false);
        }
    };
    const { setJobDescription } = useResumeStore();

    // Lock background scroll while modal is open
    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, []);

    // Close on Escape key (attachment lightbox first, then whole job modal)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                if (isOptimizing) return;
                if (attachmentsModalActiveStatus) {
                    setAttachmentsModalActiveStatus(false);
                    return;
                }
                setShowJobModal(false);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [
        setShowJobModal,
        isOptimizing,
        attachmentsModalActiveStatus,
        setAttachmentsModalActiveStatus,
    ]);

    const sections = [
        {
            id: "details",
            label: "Job Details",
            icon: FileText,
            color: "bg-blue-50 text-blue-700 border-blue-200",
        },
        {
            id: "link",
            label: "Job Link",
            icon: Link,
            color: "bg-green-50 text-green-700 border-green-200",
        },
        {
            id: "description",
            label: "Job Description",
            icon: Briefcase,
            color: "bg-purple-50 text-purple-700 border-purple-200",
        },
        {
            id: "attachments",
            label: "Attachments",
            icon: User,
            color: "bg-orange-50 text-orange-700 border-orange-200",
        },
        {
            id: "resume",
            label: "Resume",
            icon: FileText,
            color: "bg-blue-50 text-blue-700 border-blue-200",
        },
        {
            id: "changes",
            label: "Changes Made",
            icon: GitCommit,
            color: "bg-brown-800 text-orange-700 border-orange-200",
        },
        {
            id: "timeline",
            label: "Application Timeline",
            icon: TimerIcon,
            color: "bg-brown-800 text-orange-700 border-orange-200",
        },
    ] as const;
    const visibleSections = sections.filter((section) => {
        if (
            hideResumeAndChangesForViewer &&
            (section.id === "resume" || section.id === "changes")
        ) {
            return false;
        }
        return true;
    });

    useEffect(() => {
        if (
            hideResumeAndChangesForViewer &&
            (activeSection === "resume" || activeSection === "changes")
        ) {
            setActiveSection("details");
        }
    }, [hideResumeAndChangesForViewer, activeSection]);

    const renderContent = () => {
        if (
            hideResumeAndChangesForViewer &&
            (activeSection === "resume" || activeSection === "changes")
        ) {
            return (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <p className="text-gray-500">
                        Resume and changes are not available in Saved jobs for normal users.
                    </p>
                </div>
            );
        }
        switch (activeSection) {
            case "details":
                return (
                    <div className="space-y-4">
                        {/* Card 1: Company + Upload/Uploaded */}
                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                            <div className="text-sm font-medium text-gray-600 mb-2">
                                Company Name
                            </div>
                            <div className="flex items-center gap-3">
                                <img
                                    src={`https://www.google.com/s2/favicons?domain=${sanitizeCompanyDomain(jobDetails.companyName)}&sz=64`}
                                    alt="Company Logo"
                                    className="w-[35px] h-[35px] m-2"
                                    style={{ display: 'none' }} // Start hidden until load check
                                    onError={(e) => {
                                        e.currentTarget.style.display = "none"; // Hide broken image
                                    }}
                                    onLoad={(e) => {
                                        const img = e.currentTarget;
                                        // Default globe is always 16x16; custom ones resize to 64x64
                                        if (img.naturalHeight === 16 && img.naturalWidth === 16) {
                                            img.style.display = "none"; // Hide default
                                        } else {
                                            img.style.display = "block"; // Show custom
                                        }
                                    }}
                                />
                                <p className="text-lg font-semibold text-gray-900">
                                    {jobDetails.companyName}
                                </p>
                            </div>
                        </div>

                        {/* <div className="bg-white rounded-lg flex justify-between border border-gray-200 p-4">
              <p className="text-lg flex flex-col justify-start items-center font-semibold text-gray-900">
                <h4 className="text-sm font-medium text-gray-600 mb-6">Company Name</h4>
                <img
                  src={`https://www.google.com/s2/favicons?domain=${jobDetails.companyName}.com&sz=64`}
                  alt="Company Logo"
                  className="w-[40px] h-[40px] m-2 mt-0"
                />
                {jobDetails.companyName}
              </p>

              <div className="bg-white rounded-lg border border-blue-200 p-4">
                <div className="flex items-center mb-3">
                  <UploadIcon className="w-4 h-4 text-blue-600 mr-2" />
                  <h4 className="text-sm font-semibold text-blue-700">
                    Add Optimized Resume (PDF/DOC/DOCX)
                  </h4>
                </div>

                {hasResumeForJob ? (
                  <div className="mt-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-green-700">
                        <Check className="w-4 h-4" />
                        <span>Resume already uploaded for this job</span>
                      </div>
                      <button
                        onClick={() => {
                          const resumeUrl = getOptimizedResumeUrl(jobDetails?.jobID, jobDetails?.companyName);
                          const resumeTitle = getOptimizedResumeTitle(jobDetails?.jobID, jobDetails?.companyName);
                          if (resumeUrl) {
                            window.open(resumeUrl, '_blank');
                            toastUtils.success(resumeTitle ? `Opening "${resumeTitle}" in new tab...` : "Opening resume in new tab...");
                          } else {
                            toastUtils.error("Resume URL not found");
                          }
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Visit Resume
                      </button>
                    </div>
                    {(() => {
                      const resumeTitle = getOptimizedResumeTitle(jobDetails?.jobID, jobDetails?.companyName);
                      return resumeTitle ? (
                        <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded border">
                          <strong>Resume:</strong> {resumeTitle}
                        </div>
                      ) : null;
                    })()}
                  </div>
                ) : (
                  <>
                    <input
                      ref={docInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={handleDocFileChange}
                      className="hidden"
                    />

                    <button
                      onClick={handleChooseDoc}
                      disabled={isUploadingDoc}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50"
                    >
                      {isUploadingDoc ? (
                        <Loader2 className="animate-spin w-4 h-4" />
                      ) : (
                        <UploadIcon className="w-4 h-4" />
                      )}
                      {isUploadingDoc ? "Uploading..." : "Add Optimized Resume"}
                    </button>

                    {recentDocUrl && (
                      <div className="mt-3 flex items-center gap-2 text-sm text-green-700">
                        <Check className="w-4 h-4" />
                        <a href={recentDocUrl} target="_blank" rel="noreferrer" className="underline">
                          Document added — Open/Download
                        </a>
                      </div>
                    )}
                    {docError && <p className="mt-2 text-sm text-red-600">{docError}</p>}
                  </>
                )}
              </div>
            </div> */}

                        {/* Card 2: Added On */}
                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                            <div className="flex items-center mb-2">
                                <Calendar className="w-4 h-4 text-gray-500 mr-2" />
                                <span className="text-sm font-medium text-gray-600">
                                    Added On
                                </span>
                            </div>
                            <p className="text-lg font-semibold text-gray-900">
                                {getTimeAgo(jobDetails?.createdAt || jobDetails?.dateAdded || jobDetails?.updatedAt)}
                            </p>
                        </div>

                        {/* Card 3: Position */}
                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                            <div className="flex items-center mb-2">
                                <Briefcase className="w-4 h-4 text-gray-500 mr-2" />
                                <span className="text-sm font-medium text-gray-600">Position</span>
                            </div>
                            <p className="text-lg font-semibold text-gray-900">{jobDetails.jobTitle}</p>
                        </div>

                        {/* Card 4: Candidate */}
                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                            <div className="flex items-center mb-2">
                                <User className="w-4 h-4 text-gray-500 mr-2" />
                                <span className="text-sm font-medium text-gray-600">Candidate</span>
                            </div>
                            <p className="text-lg font-semibold text-gray-900">
                                {currentUser?.email || jobDetails.userID}
                            </p>
                        </div>
                    </div>
                );

            case "link":
                return (
                    <div className="space-y-4">
                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-lg font-semibold text-gray-900">Job Application Link</h4>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => copyToClipboard(jobDetails.joblink)}
                                        className="flex items-center px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                                    >
                                        <Copy className="w-4 h-4 mr-1" />
                                        Copy
                                    </button>
                                    <a
                                        href={jobDetails.joblink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                                    >
                                        <ExternalLink className="w-4 h-4 mr-1" />
                                        Open
                                    </a>
                                </div>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-4 border-2 border-dashed border-gray-300">
                                <code className="text-sm text-gray-700 break-all font-mono">{jobDetails.joblink}</code>
                            </div>
                        </div>
                    </div>
                );
            case "description":
                const emailMatch = jobDetails?.jobDescription
                    ? jobDetails.jobDescription.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g)
                    : null;

                return (
                    // <div className="space-y-4">
                    //   <div className="bg-white rounded-lg border border-gray-200 p-6">
                    //     <h4 className="text-lg font-semibold text-gray-900 mb-4">Job Description</h4>
                    //     <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                    //       {jobDetails?.jobDescription ? (
                    //         <div
                    //           className="text-sm text-gray-700 leading-relaxed job-description-html"
                    //           dangerouslySetInnerHTML={{
                    //             __html: jobDetails.jobDescription,
                    //           }}
                    //         ></div>
                    //       ) : (
                    //         <p className="text-gray-500 italic text-sm">
                    //           No job description available.
                    //         </p>
                    //       )}
                    //     </div>

                    //     {/* ✅ Show extracted emails from job description */}
                    //     {emailMatch && emailMatch.length > 0 && (
                    //       <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    //         <h5 className="text-sm font-semibold text-yellow-800 mb-2">
                    //           📧 Emails found in Job Description to reach out:
                    //         </h5>
                    //         <ul className="list-disc list-inside text-sm text-gray-700">
                    //           {emailMatch.map((email: string, idx: number) => (
                    //             <li key={idx} className="flex p-1 m-1"> <Mail className="size-3 m-1" /> {email}</li>
                    //           ))}
                    //         </ul>
                    //       </div>
                    //     )}
                    //   </div>
                    // </div>
                    <div className="space-y-4">
                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-lg font-semibold text-gray-900">Job Description</h4>
                                <button
                                    onClick={() => {
                                        // Try to read from the rendered HTML first
                                        const el = document.querySelector(".job-description-html") as HTMLElement | null;
                                        let text = (el?.textContent || "").trim();

                                        // Fallback: use cached or raw description, stripping HTML if present
                                        if (!text) {
                                            const raw = (getJobDescription(jobDetails?.jobID) || jobDetails?.jobDescription || "").toString();
                                            // Strip HTML tags if any
                                            text = raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
                                        }

                                        if (text) {
                                            navigator.clipboard.writeText(text);
                                        }
                                    }}
                                    className="text-sm px-3 py-1 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                                    title="Copy job description (Ctrl + Shift + C)"
                                >
                                    Copy
                                </button>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                                {(() => {
                                    const cachedDescription = getJobDescription(jobDetails?.jobID);
                                    const description = cachedDescription ?? jobDetails?.jobDescription;
                                    const isLoading = isJobDescriptionLoading(jobDetails?.jobID);
                                    const isEmpty = description === '' || (description === undefined && jobDetails?.jobDescription === '');

                                    // When we know it's empty, show message instead of loader
                                    if (isEmpty) {
                                        return (
                                            <p className="text-gray-500 italic text-sm">
                                                No job description available for this job card.
                                            </p>
                                        );
                                    }

                                    if (isLoading) {
                                        return (
                                            <div className="flex items-center justify-center py-8">
                                                <Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-2" />
                                                <span className="text-gray-600">Loading job description...</span>
                                            </div>
                                        );
                                    }

                                    return description ? (
                                        <div
                                            className="text-sm text-gray-700 leading-relaxed job-description-html"
                                            dangerouslySetInnerHTML={{
                                                __html: description,
                                            }}
                                        ></div>
                                    ) : (
                                        <p className="text-gray-500 italic text-sm">
                                            No job description available for this job card.
                                        </p>
                                    );
                                })()}
                            </div>

                            {/* ✅ Show extracted emails from job description */}
                            {emailMatch && emailMatch.length > 0 && (
                                <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                    <h5 className="text-sm font-semibold text-yellow-800 mb-2">
                                        📧 Emails found in Job Description to reach out:
                                    </h5>
                                    <ul className="list-disc list-inside text-sm text-gray-700">
                                        {emailMatch.map((email: string, idx: number) => (
                                            <li key={idx} className="flex p-1 m-1">
                                                <Mail className="size-3 m-1" /> {email}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>

                );

            case "attachments":
                return (
                    <div className="space-y-4">
                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-lg font-semibold text-gray-900">
                                    Attachments
                                </h4>
                            </div>

                            {/* ---- Paste Images (Ctrl+V) ---- */}
                            <div className="mb-6 rounded-lg border border-orange-200 p-4">
                                <div className="flex items-center mb-3">
                                    <UploadIcon className="w-4 h-4 text-orange-600 mr-2" />
                                    <h4 className="text-sm font-semibold text-orange-700">
                                        Paste Images (Ctrl+V) — PNG/JPG/WEBP
                                    </h4>
                                </div>

                                <div
                                    onPaste={handlePasteImages}
                                    className="border-2 border-dashed border-orange-400/70 rounded-lg p-4 min-h-[96px] flex items-center justify-center bg-orange-50"
                                >
                                    {pastedPreviews.length ? (
                                        <div className="w-full">
                                            <div className="flex flex-wrap gap-2">
                                                {pastedPreviews.map((src, idx) => (
                                                    <img
                                                        key={idx}
                                                        src={src}
                                                        alt={`pasted-${idx}`}
                                                        className="w-20 h-20 object-cover rounded-md border cursor-zoom-in"
                                                        onClick={() => {
                                                            setSelectedImage(src);
                                                            setAttachmentsModalActiveStatus(true);
                                                        }}
                                                    />
                                                ))}
                                            </div>

                                            <div className="mt-3 flex gap-2">
                                                <button
                                                    onClick={uploadPastedImages}
                                                    disabled={isUploadingPasted}
                                                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-600 text-white disabled:opacity-50"
                                                >
                                                    {isUploadingPasted ? (
                                                        <Loader2 className="animate-spin w-4 h-4" />
                                                    ) : (
                                                        <UploadIcon className="w-4 h-4" />
                                                    )}
                                                    {isUploadingPasted ? "Uploading..." : "Upload pasted images"}
                                                </button>

                                                <button
                                                    onClick={() => {
                                                        pastedPreviews.forEach((u) => URL.revokeObjectURL(u));
                                                        setPastedPreviews([]);
                                                        setPastedImages([]);
                                                    }}
                                                    disabled={isUploadingPasted}
                                                    className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700"
                                                >
                                                    Clear
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-gray-600 text-sm flex items-center">
                                            <Copy className="w-4 h-4 mr-2" /> Copy an image and press{" "}
                                            <span className="mx-1 font-semibold">Ctrl+V</span> here
                                        </p>
                                    )}
                                </div>

                                {pasteError && <p className="mt-2 text-sm text-red-600">{pasteError}</p>}
                            </div>

                            {/* Optimized Resume Section */}
                            {/* {jobDetails?.optimizedResume?.hasResume && (
                <div className="mb-6 rounded-lg border border-blue-200 p-4">
                  <div className="flex items-center mb-3">
                    <FileText className="w-4 h-4 text-blue-600 mr-2" />
                    <h4 className="text-sm font-semibold text-blue-700">
                      Optimized Resume
                    </h4>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-900">
                          {jobDetails.jobTitle} - Optimized Resume
                        </p>
                        <p className="text-xs text-blue-700">
                          Version {jobDetails.optimizedResume.version === 0 ? 'Standard' : 
                                   jobDetails.optimizedResume.version === 1 ? 'Hybrid' : 'Medical'}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setResumeData(jobDetails.optimizedResume);
                          setActiveSection("resume");
                        }}
                        className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                      >
                        View Resumess
                      </button>
                    </div>
                  </div>
                </div>
              )} */}

                            {/* Image Grid */}
                            <div className="h-96 overflow-auto rounded-lg border p-3">
                                {attachments.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-1">
                                        {attachments.map((url, idx) => (
                                            <img
                                                key={idx}
                                                src={optimizeImageUrl(url)}
                                                alt={`Attachment-${idx}`}
                                                className="w-full h-auto object-cover cursor-zoom-in"
                                                draggable={false}
                                                onClick={() => {
                                                    setSelectedImage(url);
                                                    setAttachmentsModalActiveStatus(true);
                                                }}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500 italic flex items-center justify-center h-full">
                                        No attachment uploaded yet.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                );

            case "resume":
                return (
                    <div className="space-y-4">
                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-lg font-semibold text-gray-900">
                                    Resume
                                </h4>
                            </div>

                            {resumeLoading && (
                                <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                                    <span className="ml-2 text-gray-600">Loading resume...</span>
                                </div>
                            )}

                            {/* {resumeError && (
                                <div className="text-center py-8">
                                    <p className="text-red-600 mb-4">{resumeError}</p>
                                    <button
                                        onClick={() => fetchResumeData(jobDetails.jobID)}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                                    >
                                        Try Again
                                    </button>
                                </div>
                            )} */}

                            {resumeData && !resumeLoading && (
                                <div className="resume-preview-container">
                                    {(() => {
                                        // Use V from API for resume type: V=0 normal 1-pager, V=2 medical (V can be on optimizedResume or inside resumeData)
                                        const resumeVersion = resumeData.resumeData?.V ?? resumeData.V ?? resumeData.version ?? 0;
                                        if (resumeVersion === 2) {
                                            return (
                                                <ResumePreviewMedical
                                                    data={resumeData.resumeData}
                                                    showLeadership={resumeData.showLeadership}
                                                    showProjects={resumeData.showProjects}
                                                    showSummary={resumeData.showSummary}
                                                    showPublications={resumeData.showPublications}
                                                    showPrintButtons
                                                    showDirectPdfButton={role === "operations"}
                                                    sectionOrder={resumeData.sectionOrder}
                                                    onDownloadClick={handleDownloadClick}
                                                />
                                            );
                                        }
                                        return (
                                            <ResumePreview
                                                data={resumeData.resumeData}
                                                showLeadership={resumeData.showLeadership}
                                                showProjects={resumeData.showProjects}
                                                showSummary={resumeData.showSummary}
                                                showPublications={resumeData.showPublications}
                                                showChanges={false}
                                                changedFields={new Set()}
                                                showPrintButtons
                                                showDirectPdfButton={role === "operations"}
                                                sectionOrder={resumeData.sectionOrder}
                                                onDownloadClick={handleDownloadClick}
                                            />
                                        );
                                    })()}
                                </div>
                            )}

                            {!resumeData && !resumeLoading && (
                                <div className="space-y-4">
                                    {/* Check if job has optimizedResume data in the job object */}
                                    {jobDetails?.optimizedResume?.resumeData ? (
                                        <div className="text-center py-8">
                                            <p className="text-gray-500 mb-4">Resume data found in job record</p>
                                            <button
                                                onClick={() => {
                                                    setResumeData(jobDetails.optimizedResume);
                                                }}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                                            >
                                                Load Resume from Job
                                            </button>
                                        </div>
                                    ) : hasResumeForJob ? (
                                        <div className="space-y-4">
                                            {/* <div className="text-center">
                                                <div className="flex items-center justify-center gap-2 text-green-700 mb-4">
                                                    <Check className="w-5 h-5" />
                                                    <span>Resume already uploaded for this job</span>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        const resumeUrl = getOptimizedResumeUrl(jobDetails?.jobID, jobDetails?.companyName);
                                                        const resumeTitle = getOptimizedResumeTitle(jobDetails?.jobID, jobDetails?.companyName);
                                                        if (resumeUrl) {
                                                            window.open(resumeUrl, "_blank");
                                                            toastUtils.success(resumeTitle ? `Opening "${resumeTitle}" in new tab...` : "Opening resume in new tab...");
                                                        } else {
                                                            toastUtils.error("Resume URL not found");
                                                        }
                                                    }}
                                                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors mb-4"
                                                >
                                                    Open Resume in New Tab
                                                </button>
                                            </div> */}

                                            {/* PDF Preview */}
                                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                                                <iframe
                                                    src={`${getOptimizedResumeUrl(jobDetails?.jobID, jobDetails?.companyName)}#toolbar=1&navpanes=0&scrollbar=1`}
                                                    className="w-full h-[600px]"
                                                    title="Resume Preview"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-white rounded-lg border border-blue-200 p-4">
                                            <div className="flex items-center mb-3">
                                                <UploadIcon className="w-4 h-4 text-blue-600 mr-2" />
                                                <h4 className="text-sm font-semibold text-blue-700">
                                                    Add Optimized Resume (PDF/DOC/DOCX)
                                                </h4>
                                            </div>

                                            <input
                                                ref={docInputRef}
                                                type="file"
                                                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                                onChange={handleDocFileChange}
                                                className="hidden"
                                            />

                                            <button
                                                onClick={handleChooseDoc}
                                                disabled={isUploadingDoc}
                                                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50"
                                            >
                                                {isUploadingDoc ? (
                                                    <Loader2 className="animate-spin w-4 h-4" />
                                                ) : (
                                                    <UploadIcon className="w-4 h-4" />
                                                )}
                                                {isUploadingDoc ? "Uploading..." : "Add Optimized Resume"}
                                            </button>

                                            {recentDocUrl && (
                                                <div className="mt-3 flex items-center gap-2 text-sm text-green-700">
                                                    <Check className="w-4 h-4" />
                                                    <a href={recentDocUrl} target="_blank" rel="noreferrer" className="underline">
                                                        Document added — Open/Download
                                                    </a>
                                                </div>
                                            )}
                                            {docError && (
                                                <p className="mt-2 text-sm text-red-600">{docError}</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                );

            case "timeline":
                return (
                    <div className="space-y-4">
                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                            <h4 className="text-lg font-semibold text-gray-900 mb-4">
                                📈 Application Timeline
                            </h4>
                            {(jobDetails?.timeline?.length > 0 || (isOperatorViewer && removalReasonData)) ? (
                                <ol className="relative border-s border-gray-200">
                                    {jobDetails?.timeline?.map(
                                        (event: string, idx: number) => {
                                            let displayEvent = event;
                                            const evLower = event.toLowerCase();
                                            if (evLower === 'added by user') {
                                                displayEvent = 'Added by user';
                                            } else if (evLower.includes('added by')) {
                                                if (!isOperatorViewer) {
                                                    displayEvent = 'Added';
                                                }
                                            } else if (event === 'Added') {
                                                const name = jobDetails?.addedBy?.trim();
                                                displayEvent =
                                                    isOperatorViewer && name
                                                        ? `Added by ${name}`
                                                        : 'Added';
                                            }
                                            return (
                                                <li
                                                    key={idx}
                                                    className="mb-10 ms-6"
                                                >
                                                    <span className="absolute flex items-center justify-center w-6 h-6 bg-purple-100 rounded-full -start-3 ring-8 ring-white">
                                                        <svg
                                                            className="w-3 h-3 text-purple-600"
                                                            fill="currentColor"
                                                            viewBox="0 0 20 20"
                                                        >
                                                            <path
                                                                fillRule="evenodd"
                                                                d="M16.707 5.293a1 1 0 00-1.414 0L10 10.586 6.707 7.293A1 1 0 105.293 8.707l4 4a1 1 0 001.414 0l6-6a1 1 0 000-1.414z"
                                                                clipRule="evenodd"
                                                            />
                                                        </svg>
                                                    </span>
                                                    <h3 className="flex items-center mb-1 text-md font-semibold text-purple-800">
                                                        {displayEvent}
                                                    </h3>
                                                    <p className="text-sm text-gray-500">
                                                        Step {idx + 1}
                                                    </p>
                                                </li>
                                            );
                                        }
                                    )}
                                    {isOperatorViewer && removalReasonData && (
                                        <li className="mb-10 ms-6">
                                            <span className="absolute flex items-center justify-center w-6 h-6 bg-red-100 rounded-full -start-3 ring-8 ring-white">
                                                <svg
                                                    className="w-3 h-3 text-red-600"
                                                    fill="currentColor"
                                                    viewBox="0 0 20 20"
                                                >
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                            </span>
                                            <h3 className="flex items-center mb-1 text-md font-semibold text-red-800">
                                                🚨 Removed by {removalReasonData.removedBy}
                                            </h3>
                                            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r mt-2">
                                                <p className="text-sm text-red-700">
                                                    {removalReasonData.removalReason}
                                                </p>
                                                {removalReasonData.removalDate && (
                                                    <p className="mt-1 text-xs text-red-600">
                                                        Removed on: {removalReasonData.removalDate}
                                                    </p>
                                                )}
                                            </div>
                                        </li>
                                    )}
                                </ol>
                            ) : (
                                <div className="text-gray-500 italic">
                                    No timeline available.
                                </div>
                            )}
                        </div>
                    </div>
                );

            case "changes":
                return (
                    <div className="space-y-4">
                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                            <h4 className="text-lg font-semibold text-gray-900 mb-4">
                                Changes Made
                            </h4>
                            {jobDetails?.changesMade ? (
                                <ResumeChangesComparison
                                    changesMade={jobDetails.changesMade}
                                />
                            ) : (
                                // <div className="text-gray-500 italic">
                                //     No changes available, please optimize your
                                //     resume.
                                // </div>
                                null
                            )}
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    // Handle resume optimization
    const handleOptimizeResume = async () => {
        setIsOptimizing(true);
        setOptimizationError(null);
        let loadingToast: string | number | null = null;

        try {
            // Get user email - for operations, get from currentUser (the client whose job this is)
            const userEmail = currentUser?.email;

            if (!userEmail) {
                // toastUtils.error("User email not found. Cannot optimize resume.");
                throw new Error("User email not found. Cannot optimize resume.");
            }

            // Get job description - try multiple sources
            let jobDesc = jobDetails?.jobDescription || getJobDescription(jobDetails?.jobID) || "";

            // If no job description found, try to load it
            if (!jobDesc && jobDetails?.jobID) {
                if (!isJobDescriptionLoading(jobDetails.jobID)) {
                    // Wait for the load to complete and get the result
                    const loadedDesc = await loadJobDescription(jobDetails.jobID);
                    if (loadedDesc) {
                        jobDesc = loadedDesc;
                    }
                } else {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    jobDesc = getJobDescription(jobDetails.jobID) || "";
                }
            }

            if (!jobDesc) {
                throw new Error("Job description not found. Please add job description first.");
            }

            loadingToast = toastUtils.loading("Optimizing resume... Please wait.");

            const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
            const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8086";
            const pdfServerUrl = import.meta.env.VITE_PDF_SERVER_URL || "http://localhost:8000";

            // Step 1: Get user's assigned resume
            const resumeResponse = await fetch(`${apiUrl}/api/resume-by-email`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: userEmail }),
            });

            if (!resumeResponse.ok) {
                if (resumeResponse.status === 404) {
                    throw new Error("No resume assigned to this user. Please assign a resume first.");
                } else {
                    throw new Error("Failed to load user's resume.");
                }
            }

            const resumeData = await resumeResponse.json();

            if (!resumeData || !resumeData.personalInfo) {
                throw new Error("Invalid resume data.");
            }

            // Check if resume version is 2 (Medical)
            const resumeVersion = resumeData.V || 0;
            const isVersion2 = resumeVersion === 2;

            // Step 2: Optimize the resume
            const prompt = "if you recieve any HTML tages please ignore it and optimize the resume according to the given JD. Make sure not to cut down or shorten any points in the Work Experience section. IN all fields please do not cut down or shorten any points or content. For example, if a role in the base resume has 6 points, the optimized version should also retain all 6 points. The content should be aligned with the JD but the number of points per role must remain the same. Do not touch or optimize publications if given to you.";

            const filteredResumeForOptimization = {
                ...resumeData,
                summary: resumeData.checkboxStates?.showSummary !== false ? resumeData.summary : "",
                projects: resumeData.checkboxStates?.showProjects ? resumeData.projects : [],
                leadership: resumeData.checkboxStates?.showLeadership ? resumeData.leadership : [],
                publications: resumeData.publications || [],
            };

            let optimizeResponse: Response | null = null;
            let retryCount = 0;
            const maxRetries = 1;

            while (retryCount <= maxRetries) {
                try {

                    optimizeResponse = await fetch(`${apiUrl}/api/optimize-with-gemini`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            resume_data: filteredResumeForOptimization,
                            job_description: prompt + jobDesc,
                        }),
                    });

                    if (optimizeResponse.ok) {
                        break; // Success, exit retry loop
                    }

                    if (retryCount === maxRetries) {
                        throw new Error(`Optimization failed: ${optimizeResponse.status}`);
                    }

                    // Wait before retry
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    retryCount++;
                } catch (error) {
                    if (retryCount === maxRetries) {
                        throw error;
                    }
                    // Wait before retry
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    retryCount++;
                }
            }

            const optimizedData = await optimizeResponse!.json();

            if (!optimizedData || (!optimizedData.summary && !optimizedData.workExperience)) {
                throw new Error("Optimization failed. Data returned was empty.");
            }

            // Guard: restore any work experience entries Gemini silently dropped.
            // Gemini is instructed to keep all entries but sometimes ignores this.
            const origWorkExp: any[] = Array.isArray(resumeData.workExperience) ? resumeData.workExperience : [];
            const optWorkExp: any[] = Array.isArray(optimizedData.workExperience) ? optimizedData.workExperience : [];
            if (origWorkExp.length > 0 && optWorkExp.length < origWorkExp.length) {
                const survivedIds = new Set(
                    optWorkExp.filter((e: any) => e?.id != null).map((e: any) => String(e.id))
                );
                const dropped = origWorkExp.filter((e: any) =>
                    e?.id != null ? !survivedIds.has(String(e.id)) : !optWorkExp.includes(e)
                );
                if (dropped.length > 0) {
                    console.warn(
                        `[Optimizer] Gemini dropped ${dropped.length} work experience entr${dropped.length === 1 ? "y" : "ies"} — restoring originals.`
                    );
                    optimizedData.workExperience = [...optWorkExp, ...dropped];
                }
            }

            // Step 3: Baseline must match the JSON sent to optimize-with-gemini
            const baselineForDiff = {
                ...resumeData,
                summary: filteredResumeForOptimization.summary,
                projects: filteredResumeForOptimization.projects,
                leadership: filteredResumeForOptimization.leadership,
                publications: filteredResumeForOptimization.publications,
            };
            const { startingContent, finalChanges } = getOptimizationChangesMade(
                baselineForDiff,
                optimizedData
            );

            // Step 4: Save optimized resume to job
            const jobId = jobDetails._id || jobDetails.jobID;
            const saveResponse = await fetch(`${apiBaseUrl}/saveChangedSession`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: jobId,
                    startingContent: startingContent,
                    finalChanges: finalChanges,
                    optimizedResume: {
                        resumeData: optimizedData,
                        hasResume: true,
                        showSummary: resumeData.checkboxStates?.showSummary !== false,
                        showProjects: resumeData.checkboxStates?.showProjects || false,
                        showLeadership: resumeData.checkboxStates?.showLeadership || false,
                        showPublications: resumeData.checkboxStates?.showPublications || false,
                        version: resumeData.V || 0,
                        sectionOrder: resumeData.sectionOrder || [
                            "personalInfo",
                            "summary",
                            "workExperience",
                            "projects",
                            "leadership",
                            "skills",
                            "education",
                            "publications"
                        ]
                    }
                }),
            });

            if (!saveResponse.ok) {
                throw new Error("Failed to save optimized resume");
            }


            await refreshJobByMongoId(jobId);
            const optimizedResumeEntry = {
                resumeData: optimizedData,
                hasResume: true,
                showSummary: resumeData.checkboxStates?.showSummary !== false,
                showProjects: resumeData.checkboxStates?.showProjects || false,
                showLeadership: resumeData.checkboxStates?.showLeadership || false,
                showPublications: resumeData.checkboxStates?.showPublications || false,
                version: resumeData.V || 0,
                sectionOrder: resumeData.sectionOrder || [
                    "personalInfo",
                    "summary",
                    "workExperience",
                    "projects",
                    "leadership",
                    "skills",
                    "education",
                    "publications"
                ]
            };
            setUserJobs((prevJobs) =>
                prevJobs.map((job) =>
                    (job._id === jobId || job.jobID === jobId)
                        ? { ...job, optimizedResume: optimizedResumeEntry }
                        : job
                )
            );

            if (role === "operations") {
                setOptimizedResumeData(optimizedData);
                setOptimizedResumeMetadata({
                    showSummary: resumeData.checkboxStates?.showSummary !== false,
                    showProjects: resumeData.checkboxStates?.showProjects || false,
                    showLeadership: resumeData.checkboxStates?.showLeadership || false,
                    showPublications: resumeData.checkboxStates?.showPublications || false,
                    version: resumeData.V || 0,
                    sectionOrder: resumeData.sectionOrder || [
                        "personalInfo",
                        "summary",
                        "workExperience",
                        "projects",
                        "leadership",
                        "skills",
                        "education",
                        "publications"
                    ]
                });
                setShowOptimizeScaleModal(true);
            } else {
                const downloadPdf = async () => {
                    const pdfLoadingToast = toastUtils.loading("Making the best optimal PDF... Please wait.");
                    try {
                        if (isVersion2) {
                            const pdfPayload = {
                                personalInfo: optimizedData.personalInfo,
                                summary: optimizedData.summary || "",
                                workExperience: optimizedData.workExperience || [],
                                projects: optimizedData.projects || [],
                                leadership: optimizedData.leadership || [],
                                skills: optimizedData.skills || [],
                                education: optimizedData.education || [],
                                publications: optimizedData.publications || [],
                                checkboxStates: {
                                    showSummary: resumeData.checkboxStates?.showSummary !== false,
                                    showProjects: resumeData.checkboxStates?.showProjects || false,
                                    showLeadership: resumeData.checkboxStates?.showLeadership || false,
                                    showPublications: resumeData.checkboxStates?.showPublications || false,
                                },
                            };
                            const pdfResponse = await fetch(`${pdfServerUrl}/v1/generate-pdf`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify(pdfPayload),
                            });
                            if (!pdfResponse.ok) {
                                toastUtils.dismissToast(pdfLoadingToast);
                                throw new Error(`PDF generation failed: ${pdfResponse.status}`);
                            }
                            const pdfBlob = await pdfResponse.blob();
                            const pdfUrl = window.URL.createObjectURL(pdfBlob);
                            const link = document.createElement("a");
                            link.href = pdfUrl;
                            const name = optimizedData.personalInfo?.name || "Resume";
                            const cleanName = name.replace(/\s+/g, "_");
                            // link.download = `${cleanName}_Resume.pdf`;
                            // document.body.appendChild(link);
                            // link.click();
                            // document.body.removeChild(link);
                            // await savePdf(pdfBlob, `${cleanName}_Resume.pdf`);

                            // Open modal instead of direct download
                            setPendingDownloadBlob(pdfBlob);
                            const filename = `${cleanName}_Resume.pdf`;
                            setDownloadFilename(filename);
                            setOriginalFilename(filename);
                            setShowDownloadFilenameModal(true);

                            window.URL.revokeObjectURL(pdfUrl);
                            toastUtils.dismissToast(pdfLoadingToast);
                            // toastUtils.success("✅ Resume optimized, saved, and PDF downloaded successfully!");
                        } else {
                            const pdfPayload = {
                                personalInfo: optimizedData.personalInfo,
                                summary: optimizedData.summary || "",
                                workExperience: optimizedData.workExperience || [],
                                projects: optimizedData.projects || [],
                                leadership: optimizedData.leadership || [],
                                skills: optimizedData.skills || [],
                                education: optimizedData.education || [],
                                publications: optimizedData.publications || [],
                                checkboxStates: {
                                    showSummary: resumeData.checkboxStates?.showSummary !== false,
                                    showProjects: resumeData.checkboxStates?.showProjects || false,
                                    showLeadership: resumeData.checkboxStates?.showLeadership || false,
                                    showPublications: resumeData.checkboxStates?.showPublications || false,
                                },
                                sectionOrder: resumeData.sectionOrder || [
                                    "personalInfo",
                                    "summary",
                                    "workExperience",
                                    "projects",
                                    "leadership",
                                    "skills",
                                    "education",
                                    "publications"
                                ],
                                scale: optimizeScale,
                                overrideAutoScale: true,
                            };
                            const pdfResponse = await fetch(`${pdfServerUrl}/v1/generate-pdf`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify(pdfPayload),
                            });
                            if (!pdfResponse.ok) {
                                toastUtils.dismissToast(pdfLoadingToast);
                                throw new Error(`PDF generation failed: ${pdfResponse.status}`);
                            }
                            const pdfBlob = await pdfResponse.blob();
                            const pdfUrl = window.URL.createObjectURL(pdfBlob);
                            const link = document.createElement("a");
                            link.href = pdfUrl;
                            const name = optimizedData.personalInfo?.name || "Resume";
                            const cleanName = name.replace(/\s+/g, "_");
                            // link.download = `${cleanName}_Resume.pdf`;
                            // document.body.appendChild(link);
                            // link.click();
                            // document.body.removeChild(link);
                            // await savePdf(pdfBlob, `${cleanName}_Resume.pdf`);

                            // Open modal instead of direct download
                            setPendingDownloadBlob(pdfBlob);
                            const filename = `${cleanName}_Resume.pdf`;
                            setDownloadFilename(filename);
                            setOriginalFilename(filename);
                            setShowDownloadFilenameModal(true);

                            window.URL.revokeObjectURL(pdfUrl);
                            toastUtils.dismissToast(pdfLoadingToast);
                            // toastUtils.success("✅ Resume optimized, saved, and PDF downloaded successfully!");
                        }
                    } catch (error: any) {
                        toastUtils.dismissToast(pdfLoadingToast);
                        throw error;
                    }
                };
                await downloadPdf();
            }
        } catch (error: any) {
            console.error("Error optimizing resume:", error);
            // toastUtils.error(error.message || "Failed to optimize resume. Please try again.");
            setOptimizationError(error.message || "Failed to optimize resume. Please try again.");
        } finally {
            if (loadingToast) toastUtils.dismissToast(loadingToast);
            setIsOptimizing(false);
        }
    };


    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-2 sm:p-4"
            style={{ overscrollBehavior: "contain" }}
        >
            <div
                className="relative flex h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-xl sm:h-[90vh]"
                style={{ overscrollBehavior: "contain" }}
            >
                {/* Header */}
                <div className="z-10 w-full bg-gradient-to-r from-orange-600 to-red-500 p-3 text-white sm:p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center">
                            <FileText className="mr-2 h-5 w-5 flex-shrink-0 sm:mr-3 sm:h-6 sm:w-6" />
                            <div className="min-w-0">
                                <h1 className="text-base font-bold sm:text-xl">
                                    📄 FlashFire Jobs
                                </h1>
                                <p className="truncate text-xs text-orange-100 sm:text-sm">
                                    {jobDetails.jobTitle}
                                    <span style={{
                                        color: (role === 'operator' || role === 'operations') && !jobDetails.downloaded ? '#d1d5db' : 'inherit',
                                        fontWeight: (role === 'operator' || role === 'operations') && !jobDetails.downloaded ? 'bold' : 'normal'
                                    }}> at </span>
                                    {jobDetails.companyName}
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-2 sm:flex-nowrap">
                            {role == "operations" ? (
                                <>
                                    <button
                                        onClick={async () => {
                                            // Try _id first, then fall back to jobID
                                            const mongoId = jobDetails._id;
                                            const jobId = jobDetails.jobID;

                                            // Prefer _id if available, otherwise use jobID
                                            const idToUse = mongoId || jobId;

                                            if (!idToUse) {
                                                console.error('No ID found in job details:', jobDetails);
                                                toastUtils.error('Job ID not found. Please refresh the page and try again.');
                                                return;
                                            }

                                            // Get client email from currentUser
                                            const clientEmail = currentUser?.email;

                                            // Use appropriate query parameter
                                            const queryParam = mongoId ? 'id' : 'jobId';
                                            let optimizeUrl = `${window.location.origin}/optimize/${idToUse}?view=editor&${queryParam}=${idToUse}`;

                                            // Add email to URL if available
                                            if (clientEmail) {
                                                optimizeUrl += `&email=${encodeURIComponent(clientEmail)}`;
                                            }

                                            // Copy URL to clipboard
                                            try {
                                                await navigator.clipboard.writeText(optimizeUrl);
                                                toastUtils.success("Optimize URL copied to clipboard!");
                                            } catch (error) {
                                                console.error('Failed to copy URL:', error);
                                                toastUtils.error("Failed to copy URL to clipboard");
                                            }
                                        }}
                                        className="rounded-lg bg-orange-700 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-orange-900 hover:bg-opacity-20 sm:px-4 sm:text-sm"
                                    >
                                        Copy Optimize URL
                                    </button>
                                    <button
                                        onClick={async () => {
                                            try {
                                                // Get user email - for operations, get from currentUser (the client whose job this is)
                                                const userEmail = currentUser?.email;

                                                if (!userEmail) {
                                                    toastUtils.error("User email not found. Cannot optimize resume.");
                                                    return;
                                                }

                                                // Fetch resume name to show in modal
                                                const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
                                                const resumeResponse = await fetch(`${apiUrl}/api/resume-by-email`, {
                                                    method: "POST",
                                                    headers: { "Content-Type": "application/json" },
                                                    body: JSON.stringify({ email: userEmail }),
                                                });

                                                if (!resumeResponse.ok) {
                                                    if (resumeResponse.status === 404) {
                                                        toastUtils.error("No resume assigned to this user. Please assign a resume first.");
                                                    } else {
                                                        toastUtils.error("Failed to load user's resume.");
                                                    }
                                                    return;
                                                }

                                                const resumeData = await resumeResponse.json();

                                                if (!resumeData || !resumeData.personalInfo) {
                                                    toastUtils.error("Invalid resume data.");
                                                    return;
                                                }

                                                // Set resume name and show confirmation modal
                                                setResumeNameForModal(resumeData.personalInfo?.name || "Unknown");

                                                // Load job description BEFORE showing confirmation
                                                if (jobDetails?.jobID) {
                                                    const cachedJD = getJobDescription(jobDetails.jobID);
                                                    if (!cachedJD && !isJobDescriptionLoading(jobDetails.jobID)) {
                                                        await loadJobDescription(jobDetails.jobID);
                                                    }
                                                }

                                                setShowOptimizeConfirmation(true);
                                            } catch (error: any) {
                                                console.error("Error loading resume:", error);
                                                toastUtils.error("Failed to load resume. Please try again.");
                                            }
                                        }}
                                        className="rounded-lg bg-orange-700 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-orange-900 hover:bg-opacity-20 sm:px-4 sm:text-sm"
                                    >
                                        Optimize
                                    </button>
                                </>
                            ) : null}
                            <button
                                onClick={() => {
                                    if (isOptimizing) return;
                                    setShowJobModal(false)
                                }}
                                disabled={isOptimizing}
                                className={`rounded-full p-2 transition-colors ${isOptimizing ? 'cursor-not-allowed opacity-50 bg-gray-400' : 'hover:bg-white hover:bg-opacity-20'}`}
                                style={{
                                    backgroundColor: showOpsDownloadIndicator ? 'rgba(255,255,255,0.12)' : undefined,
                                    border: showOpsDownloadIndicator ? '1px solid rgba(255,255,255,0.18)' : undefined,
                                    boxShadow: showOpsDownloadIndicator ? '0 0 0 1px rgba(0,0,0,0.08)' : undefined,
                                }}
                            >
                                <X className="h-5 w-5 sm:h-6 sm:w-6" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
                    {/* Sidebar */}
                    <div className="border-b border-gray-200 bg-gray-50 px-3 py-2 md:w-56 md:flex-shrink-0 md:border-b-0 md:border-r md:py-6">
                        <nav className="flex gap-2 overflow-x-auto pb-1 md:block md:space-y-2 md:overflow-visible md:pb-0">
                            {visibleSections.map((section: any) => {
                                const Icon = section.icon;
                                const isActive = activeSection === section.id;
                                return (
                                    <button
                                        key={section.id}
                                        onClick={() =>
                                            setActiveSection(section.id)
                                        }
                                        className={`flex flex-shrink-0 items-center whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm transition-all duration-200 md:w-full ${isActive
                                            ? `${section.color} border shadow-sm`
                                            : "text-gray-700 hover:bg-white hover:shadow-sm border border-transparent"
                                            }`}
                                    >
                                        <Icon
                                            className={`mr-2 h-4 w-4 flex-shrink-0 sm:h-5 sm:w-5 ${isActive ? "" : "text-gray-500"
                                                }`}
                                        />
                                        <span className="font-medium">
                                            {section.label}
                                        </span>
                                        {isActive && (
                                            <ArrowRight className="ml-2 hidden h-4 w-4 md:ml-auto md:block" />
                                        )}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Main Content */}
                    <div
                        className="min-w-0 flex-1 overflow-y-auto p-3 sm:p-5 md:p-6"
                        style={{ overscrollBehavior: "contain" }}
                    >
                        {renderContent()}
                    </div>
                </div>

                {/* Image Lightbox */}
                {attachmentsModalActiveStatus && (
                    <Suspense fallback={<LoadingScreen />}>
                        <AttachmentsModal
                            imageLink={selectedImage}
                            setAttachmentsModalActiveStatus={
                                setAttachmentsModalActiveStatus
                            }
                        />
                    </Suspense>
                )}

                {/* Download Filename Modal */}
                {showDownloadFilenameModal && pendingDownloadBlob && (
                    <div
                        style={{
                            position: "fixed",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: "rgba(0, 0, 0, 0.5)",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            zIndex: 2000,
                            padding: "20px",
                        }}
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                setShowDownloadFilenameModal(false);
                                setPendingDownloadBlob(null);
                                setDownloadFilename("");
                            }
                        }}
                    >
                        <div
                            style={{
                                backgroundColor: "white",
                                borderRadius: "12px",
                                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                                width: "100%",
                                maxWidth: "500px",
                                padding: "1.5rem",
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div style={{ paddingBottom: "1rem", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <h2
                                    style={{
                                        fontSize: "1.25rem",
                                        fontWeight: "bold",
                                        color: "#1f2937",
                                    }}
                                >
                                    {'showSaveFilePicker' in window ? "Save Resume" : "Save As"}
                                </h2>
                                <button
                                    onClick={() => {
                                        setShowDownloadFilenameModal(false);
                                        setPendingDownloadBlob(null);
                                        setDownloadFilename("");
                                    }}
                                    style={{
                                        backgroundColor: "transparent",
                                        border: "none",
                                        fontSize: "1.5rem",
                                        cursor: "pointer",
                                        color: "#6b7280",
                                    }}
                                >
                                    ×
                                </button>
                            </div>

                            {'showSaveFilePicker' in window ? (
                                <div style={{ padding: "1.5rem 0", textAlign: "center" }}>
                                    <p style={{ fontSize: "1rem", color: "#374151" }}>
                                        Optimization complete! Click <strong>Save</strong> to choose where to save your resume.
                                    </p>
                                </div>
                            ) : (
                                <div style={{ padding: "1rem 0" }}>
                                    <label
                                        style={{
                                            display: "block",
                                            fontSize: "0.875rem",
                                            fontWeight: "500",
                                            color: "#374151",
                                            marginBottom: "0.5rem",
                                        }}
                                    >
                                        Name:
                                    </label>
                                    <input
                                        type="text"
                                        value={downloadFilename}
                                        onChange={(e) => setDownloadFilename(e.target.value)}
                                        placeholder="Enter filename"
                                        style={{
                                            width: "100%",
                                            padding: "0.75rem",
                                            border: "1px solid #d1d5db",
                                            borderRadius: "6px",
                                            fontSize: "1rem",
                                        }}
                                    />
                                </div>
                            )}

                            <div style={{ paddingTop: "1rem", borderTop: "1px solid #e5e7eb", display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                                <button
                                    onClick={() => {
                                        setShowDownloadFilenameModal(false);
                                        setPendingDownloadBlob(null);
                                        setDownloadFilename("");
                                    }}
                                    style={{
                                        padding: "0.75rem 1.5rem",
                                        backgroundColor: "#f3f4f6",
                                        color: "#374151",
                                        border: "1px solid #d1d5db",
                                        borderRadius: "6px",
                                        cursor: "pointer",
                                        fontSize: "0.875rem",
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={async () => {
                                        if (pendingDownloadBlob && downloadFilename.trim()) {
                                            // Check if filename has been changed from original
                                            if (downloadFilename !== originalFilename) {
                                                setShowFilenameConfirmModal(true);
                                                return;
                                            }

                                            try {
                                                await savePdf(pendingDownloadBlob, downloadFilename.trim());
                                                // Only close modal if successful or native picker handled it
                                                setShowDownloadFilenameModal(false);
                                                setPendingDownloadBlob(null);
                                                setDownloadFilename("");
                                                setOriginalFilename("");
                                                toastUtils.success("✅ Download started!");
                                            } catch (error) {
                                                console.error("Download failed:", error);
                                                toastUtils.error("Failed to save file.");
                                            }
                                        }
                                    }}
                                    disabled={!('showSaveFilePicker' in window) && !downloadFilename.trim()}
                                    style={{
                                        padding: "0.75rem 1.5rem",
                                        backgroundColor: "#3b82f6",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "6px",
                                        cursor: (('showSaveFilePicker' in window) || downloadFilename.trim()) ? "pointer" : "not-allowed",
                                        fontSize: "0.875rem",
                                        opacity: (('showSaveFilePicker' in window) || downloadFilename.trim()) ? 1 : 0.5,
                                    }}
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Optimize Scale Modal for Operations */}
                {showOptimizeScaleModal && optimizedResumeData && optimizedResumeMetadata && (
                    <div
                        style={{
                            position: "fixed",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: "rgba(0, 0, 0, 0.5)",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            zIndex: 2000,
                            padding: "20px",
                        }}
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                setShowOptimizeScaleModal(false);
                                setOptimizedResumeData(null);
                                setOptimizedResumeMetadata(null);
                            }
                        }}
                    >
                        <div
                            style={{
                                backgroundColor: "white",
                                borderRadius: "12px",
                                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                                maxWidth: "1400px",
                                width: "100%",
                                maxHeight: "95vh",
                                display: "flex",
                                flexDirection: "column",
                                overflow: "hidden",
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div style={{ padding: "1.5rem", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                    <h2
                                        style={{
                                            fontSize: "1.5rem",
                                            fontWeight: "bold",
                                            marginBottom: "0.5rem",
                                            color: "#1f2937",
                                        }}
                                    >
                                        Select PDF Scale
                                    </h2>
                                    <p
                                        style={{
                                            fontSize: "0.9rem",
                                            color: "#6b7280",
                                        }}
                                    >
                                        Adjust the scale and see a live preview.
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowOptimizeScaleModal(false);
                                        setOptimizedResumeData(null);
                                        setOptimizedResumeMetadata(null);
                                    }}
                                    style={{
                                        backgroundColor: "transparent",
                                        border: "none",
                                        fontSize: "1.5rem",
                                        cursor: "pointer",
                                        color: "#6b7280",
                                        padding: "0.5rem",
                                    }}
                                >
                                    ×
                                </button>
                            </div>

                            <div style={{ flex: 1, overflow: "hidden", padding: "1.5rem" }}>
                                {optimizedResumeMetadata.version === 2 ? (
                                    <ResumePreviewMedical
                                        data={optimizedResumeData}
                                        showLeadership={optimizedResumeMetadata.showLeadership}
                                        showProjects={optimizedResumeMetadata.showProjects}
                                        showSummary={optimizedResumeMetadata.showSummary}
                                        showPublications={optimizedResumeMetadata.showPublications}
                                        showPrintButtons
                                        showDirectPdfButton={role === "operations"}
                                        sectionOrder={optimizedResumeMetadata.sectionOrder}
                                        onDownloadClick={handleDownloadClick}
                                    />
                                ) : (
                                    <ResumePreview
                                        data={optimizedResumeData}
                                        showLeadership={optimizedResumeMetadata.showLeadership}
                                        showProjects={optimizedResumeMetadata.showProjects}
                                        showSummary={optimizedResumeMetadata.showSummary}
                                        showPublications={optimizedResumeMetadata.showPublications}
                                        showChanges={false}
                                        changedFields={new Set()}
                                        showPrintButtons
                                        showDirectPdfButton={role === "operations"}
                                        sectionOrder={optimizedResumeMetadata.sectionOrder}
                                        onDownloadClick={handleDownloadClick}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Optimize Confirmation Dialog */}
                {showOptimizeConfirmation && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl mx-4">
                            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
                                Confirm Resume Optimization
                            </h2>
                            <div className="mb-8">
                                <p className="text-lg text-gray-700 text-center mb-4">
                                    Do you want to optimize the resume for:
                                </p>
                                <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-lg border-2 border-purple-200">
                                    <div className="text-center">
                                        <span className="text-3xl font-bold text-purple-700 block mb-3">
                                            {resumeNameForModal || "Unknown"}
                                        </span>
                                        <p className="text-xl text-gray-700 mb-2">at</p>
                                        <div className="flex flex-wrap justify-center items-center gap-6">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xl text-gray-700">Role:</span>
                                                <span className="text-2xl font-bold text-blue-700">
                                                    {jobDetails?.jobTitle || "Role not specified"}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xl text-gray-700">Company:</span>
                                                <span className="text-2xl font-bold text-blue-700">
                                                    {jobDetails?.companyName || "Company not specified"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Job Description Preview */}
                                <div className="mt-6">
                                    <h3 className="text-md font-semibold text-gray-700 mb-2">Job Description Preview:</h3>
                                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-48 overflow-y-auto">
                                        <p className="text-sm text-gray-600 whitespace-pre-wrap">
                                            {(() => {
                                                const raw = (getJobDescription(jobDetails?.jobID) || jobDetails?.jobDescription || "No job description available.").toString();
                                                return raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
                                            })()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => {
                                        setShowOptimizeConfirmation(false);
                                        handleOptimizeResume();
                                    }}
                                    className="flex-1 bg-purple-600 text-white py-3 px-6 rounded-lg hover:bg-purple-700 transition-colors font-semibold text-lg"
                                >
                                    Confirm
                                </button>
                                <button
                                    onClick={() => setShowOptimizeConfirmation(false)}
                                    className="flex-1 bg-gray-300 text-gray-800 py-3 px-6 rounded-lg hover:bg-gray-400 transition-colors font-semibold text-lg"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}



                {/* Optimization Error Modal */}
                {optimizationError && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]">
                        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md mx-4 text-center">
                            <div className="mb-6 flex justify-center">
                                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                                    <X className="w-8 h-8 text-red-600" />
                                </div>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">
                                Optimization Failed
                            </h2>
                            <p className="text-gray-600 mb-6">
                                {optimizationError}
                            </p>
                            <button
                                onClick={() => setOptimizationError(null)}
                                className="w-full bg-gray-800 text-white py-3 px-6 rounded-lg hover:bg-gray-900 transition-colors font-semibold"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}

                {/* Filename Confirmation Modal */}
                {showFilenameConfirmModal && (
                    <div
                        style={{
                            position: "fixed",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: "rgba(0, 0, 0, 0.5)",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            zIndex: 2000,
                        }}
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                setShowFilenameConfirmModal(false);
                            }
                        }}
                    >
                        <div
                            style={{
                                backgroundColor: "white",
                                padding: "2rem",
                                borderRadius: "12px",
                                maxWidth: "400px",
                                width: "90%",
                                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                            }}
                        >
                            <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.25rem", fontWeight: "600", color: "#1f2937" }}>
                                Confirm Filename Change
                            </h3>
                            <p style={{ margin: "0 0 1.5rem 0", fontSize: "0.875rem", color: "#6b7280", lineHeight: "1.5" }}>
                                Are you sure you want to download the PDF with the filename:
                            </p>
                            <div style={{
                                backgroundColor: "#f3f4f6",
                                padding: "0.75rem",
                                borderRadius: "6px",
                                marginBottom: "1.5rem",
                                fontFamily: "monospace",
                                fontSize: "0.875rem",
                                color: "#1f2937",
                                wordBreak: "break-all"
                            }}>
                                {downloadFilename}
                            </div>
                            <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                                <button
                                    onClick={() => setShowFilenameConfirmModal(false)}
                                    style={{
                                        padding: "0.75rem 1.5rem",
                                        backgroundColor: "#f3f4f6",
                                        color: "#374151",
                                        border: "none",
                                        borderRadius: "6px",
                                        cursor: "pointer",
                                        fontSize: "0.875rem",
                                        fontWeight: "500",
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={async () => {
                                        setShowFilenameConfirmModal(false);
                                        if (pendingDownloadBlob && downloadFilename.trim()) {
                                            try {
                                                await savePdf(pendingDownloadBlob, downloadFilename.trim());
                                                setShowDownloadFilenameModal(false);
                                                setPendingDownloadBlob(null);
                                                setDownloadFilename("");
                                                setOriginalFilename("");
                                                toastUtils.success("✅ Download started!");
                                            } catch (error) {
                                                console.error("Download failed:", error);
                                                toastUtils.error("Failed to save file.");
                                            }
                                        }
                                    }}
                                    style={{
                                        padding: "0.75rem 1.5rem",
                                        backgroundColor: "#3b82f6",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "6px",
                                        cursor: "pointer",
                                        fontSize: "0.875rem",
                                        fontWeight: "500",
                                    }}
                                >
                                    Download
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <style>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        </div>
    );
}
