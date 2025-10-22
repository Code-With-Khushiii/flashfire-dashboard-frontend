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
import LoadingScreen from "./LoadingScreen";
import { getTimeAgo } from "../utils/getTimeAgo.ts";
import { UserContext } from "../state_management/UserContext";
import { useUserJobs } from "../state_management/UserJobs.tsx"; // ⬅️ NEW
import { hasOptimizedResumeLocal } from "../utils/hasOptimizedResumeLocal.ts";
import { useJobDescriptionLoader } from "../state_management/JobsSessionStore";
const AttachmentsModal = lazy(() => import("./AttachmentsModal"));
import ResumeChangesComparison from "./ResumeChangesComparison.tsx";
import { useOperationsStore } from "../state_management/Operations.ts";
import { useResumeStore } from "./AiOprimizer/store/useResumeStore.ts";
import { toastUtils, toastMessages } from "../utils/toast";
import {
    getOptimizedResumeUrl,
    getOptimizedResumeTitle,
} from "../utils/getOptimizedResumeUrl";

/* ---------- ENV ---------- */
import { uploadAttachment } from "../utils/uploadService";
import { optimizeImageUrl } from "../utils/imageCache";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
const JOB_UPDATE_ENDPOINT = `${API_BASE}/updatechanges`;
const PLAN_ENDPOINT = `${API_BASE}/api/plans/select`;

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

        if (!res.ok)
            throw new Error(
                (await res.text()) || "Failed to persist attachments"
            );
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
        if (!res.ok)
            throw new Error(
                (await res.text()) || "Failed to persist attachments"
            );
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
                name : entry.jobRole,
                createdAt : Date.now()
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
        } catch {}
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
        } catch {}
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
    | "timeline"
    | "changes";

export default function JobModal({
    setShowJobModal,
    jobDetails,
    initialSection, // ⬅️ NEW (optional)
    onResumeUploaded,
    onAutoCheckDone,
}: {
    setShowJobModal: (v: boolean) => void;
    jobDetails: any;
    initialSection?: Sections; // ⬅️ NEW
    onResumeUploaded?: (url?: string) => void;
    onAutoCheckDone?: (exists: boolean) => void;
}) {
    const ctx = useContext(UserContext);
    const token = ctx?.token ?? null;
    const setData = ctx?.setData ?? null;
    const currentUser = ctx?.userDetails ?? {};

    const getCompanyDomain = (companyName: string) => {
        return companyName.replace(/\s+/g, '').toLowerCase();
    };

    const { role, name: operationsUserName, email: operationsUserEmail } = useOperationsStore();

    // NEW (paste-to-upload buffer)
    const [pastedImages, setPastedImages] = useState<File[]>([]);
    const [pastedPreviews, setPastedPreviews] = useState<string[]>([]);
    const [isUploadingPasted, setIsUploadingPasted] = useState(false);
    const [pasteError, setPasteError] = useState<string | null>(null);

    const { setUserJobs } = useUserJobs(); // ⬅️ NEW: global jobs updater
    const { getJobDescription, isJobDescriptionLoading, loadJobDescription } = useJobDescriptionLoader();

    const [attachmentsModalActiveStatus, setAttachmentsModalActiveStatus] =
        useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [activeSection, setActiveSection] = useState<Sections>(
        initialSection ?? "details"
    );

    // Load job description when modal opens
    useEffect(() => {
        if (jobDetails?.jobID && activeSection === 'description') {
            const cachedDescription = getJobDescription(jobDetails.jobID);
            if (!cachedDescription && !isJobDescriptionLoading(jobDetails.jobID)) {
                loadJobDescription(jobDetails.jobID);
            }
        }
    }, [jobDetails?.jobID, activeSection, getJobDescription, isJobDescriptionLoading, loadJobDescription]);

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
    useEffect(() => {
        // Only when opened due to a drag-move (attachments tab)
        if (initialSection !== "attachments") return;

        const exists = hasOptimizedResumeLocal(
            jobDetails?.jobID,
            jobDetails?.companyName
        );

        // Update UI hint inside modal
        setHasResumeForJob(exists);

        // Tell the parent (JobTracker) the result so it can move or not
        onAutoCheckDone?.(exists);

        // If not exists, we just keep the modal open on attachments so user can upload
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialSection, jobDetails?.jobID, jobDetails?.companyName]);

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
    if (updated?.attachments) {
      // ✅ Reflect full attachments array returned by backend
      setAttachments(updated.attachments);
    }
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

      setAttachments([url]); // ✅ replace array with just this one


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
                if (updated?.attachments) {
                    setAttachments(updated.attachments);
                }
            }

            setImgFile(null);
        } catch (e: any) {
            setImgError(e.message || "Upload failed");
        } finally {
            setIsUploadingImg(false);
        }
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

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setShowJobModal(false);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [setShowJobModal]);

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
            label: "Resume / Attachments",
            icon: User,
            color: "bg-orange-50 text-orange-700 border-orange-200",
        },
        {
            id: "timeline",
            label: "Application Timeline",
            icon: TimerIcon,
            color: "bg-brown-800 text-orange-700 border-orange-200",
        },
        {
            id: "changes",
            label: "Changes Made",
            icon: GitCommit,
            color: "bg-brown-800 text-orange-700 border-orange-200",
        },
    ] as const;

    const renderContent = () => {
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
                                    src={`https://www.google.com/s2/favicons?domain=${getCompanyDomain(
                                        jobDetails.companyName
                                    )}.com&sz=64`}
                                    alt="Company Logo"
                                    className="w-[40px] h-[40px]"
                                    onError={(e) => {
                                        e.currentTarget.style.display = "none";
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
        const description = cachedDescription || jobDetails?.jobDescription;
        const isLoading = isJobDescriptionLoading(jobDetails?.jobID);
        
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
            No job description available.
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
                                    Resume / Attachments
                                </h4>
                            </div>
                            {/* Attachments → Optimized Resume uploader (moved here)  */}
                            <div className="mb-6 bg-white rounded-lg border border-blue-200 p-4">
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
                                                <span>
                                                    Resume already uploaded for
                                                    this job
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const resumeUrl =
                                                        getOptimizedResumeUrl(
                                                            jobDetails?.jobID,
                                                            jobDetails?.companyName
                                                        );
                                                    const resumeTitle =
                                                        getOptimizedResumeTitle(
                                                            jobDetails?.jobID,
                                                            jobDetails?.companyName
                                                        );
                                                    if (resumeUrl) {
                                                        window.open(
                                                            resumeUrl,
                                                            "_blank"
                                                        );
                                                        toastUtils.success(
                                                            resumeTitle
                                                                ? `Opening "${resumeTitle}" in new tab...`
                                                                : "Opening resume in new tab..."
                                                        );
                                                    } else {
                                                        toastUtils.error(
                                                            "Resume URL not found"
                                                        );
                                                    }
                                                }}
                                                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                                Visit Resume
                                            </button>
                                        </div>
                                        {(() => {
                                            const resumeTitle =
                                                getOptimizedResumeTitle(
                                                    jobDetails?.jobID,
                                                    jobDetails?.companyName
                                                );
                                            return resumeTitle ? (
                                                <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded border">
                                                    <strong>Resume:</strong>{" "}
                                                    {resumeTitle}
                                                </div>
                                            ) : null;
                                        })()}
                                    </div>
                                ) : (
                                    <>
                                        {/* hidden input (reuses existing ref + handler) */}
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
                                            {isUploadingDoc
                                                ? "Uploading..."
                                                : "Add Optimized Resume"}
                                        </button>

                                        {recentDocUrl && (
                                            <div className="mt-3 flex items-center gap-2 text-sm text-green-700">
                                                <Check className="w-4 h-4" />
                                                <a
                                                    href={recentDocUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="underline"
                                                >
                                                    Document added —
                                                    Open/Download
                                                </a>
                                            </div>
                                        )}
                                        {docError && (
                                            <p className="mt-2 text-sm text-red-600">
                                                {docError}
                                            </p>
                                        )}
                                    </>
                                )}
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

            case "timeline":
                return (
                    <div className="space-y-4">
                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                            <h4 className="text-lg font-semibold text-gray-900 mb-4">
                                📈 Application Timeline
                            </h4>
                            {jobDetails?.timeline?.length > 0 ? (
                                <ol className="relative border-s border-gray-200">
                                    {jobDetails.timeline.map(
                                        (event: string, idx: number) => (
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
                                                    {event}
                                                </h3>
                                                <p className="text-sm text-gray-500">
                                                    Step {idx + 1}
                                                </p>
                                            </li>
                                        )
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

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4"
            style={{ overscrollBehavior: "contain" }}
        >
            <div
                className="relative w-full max-w-6xl h-[90vh] bg-white rounded-xl shadow-xl flex flex-col overflow-hidden"
                style={{ overscrollBehavior: "contain" }}
            >
                {/* Header */}
                <div className="w-full bg-gradient-to-r from-orange-600 to-red-500 text-white p-4 z-10">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center">
                            <FileText className="w-6 h-6 mr-3" />
                            <div>
                                <h1 className="text-xl font-bold">
                                    📄 FlashFire Jobs
                                </h1>
                                <p className="text-orange-100 text-sm">
                                    {jobDetails.jobTitle} at{" "}
                                    {jobDetails.companyName}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            {role == "operations" ? (
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
                                        
                                        // Use appropriate query parameter
                                        const queryParam = mongoId ? 'id' : 'jobId';
                                        const optimizeUrl = `${window.location.origin}/optimize/${idToUse}?view=editor&${queryParam}=${idToUse}`;
                                        
                                        // Copy URL to clipboard
                                        try {
                                            await navigator.clipboard.writeText(optimizeUrl);
                                            toastUtils.success("Optimize URL copied to clipboard!");
                                        } catch (error) {
                                            console.error('Failed to copy URL:', error);
                                            toastUtils.error("Failed to copy URL to clipboard");
                                        }
                                    }}
                                    className="hover:bg-orange-900 hover:bg-opacity-20 p-2 rounded-full transition-colors bg-orange-700 px-4 py-2"
                                >
                                    Copy Optimize URL
                                </button>
                            ) : null}
                            <button
                                onClick={() => setShowJobModal(false)}
                                className="hover:bg-white hover:bg-opacity-20 p-2 rounded-full transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar */}
                    <div className="w-56 bg-gray-50 border-r border-gray-200 py-6 px-3">
                        <nav className="space-y-2">
                            {[
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
                                    label: "Resume / Attachments",
                                    icon: User,
                                    color: "bg-orange-50 text-orange-700 border-orange-200",
                                },
                                {
                                    id: "timeline",
                                    label: "Application Timeline",
                                    icon: TimerIcon,
                                    color: "bg-brown-800 text-orange-700 border-orange-200",
                                },
                                {
                                    id: "changes",
                                    label: "Changes Made",
                                    icon: GitCommit,
                                    color: "bg-brown-800 text-red-700 border-orange-300",
                                },
                            ].map((section: any) => {
                                const Icon = section.icon;
                                const isActive = activeSection === section.id;
                                return (
                                    <button
                                        key={section.id}
                                        onClick={() =>
                                            setActiveSection(section.id)
                                        }
                                        className={`w-full flex items-center px-3 py-2 text-left rounded-lg transition-all duration-200 text-sm ${
                                            isActive
                                                ? `${section.color} border shadow-sm`
                                                : "text-gray-700 hover:bg-white hover:shadow-sm border border-transparent"
                                        }`}
                                    >
                                        <Icon
                                            className={`w-5 h-5 mr-2 ${
                                                isActive ? "" : "text-gray-500"
                                            }`}
                                        />
                                        <span className="font-medium">
                                            {section.label}
                                        </span>
                                        {isActive && (
                                            <ArrowRight className="w-4 h-4 ml-auto" />
                                        )}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Main Content */}
                    <div
                        className="flex-1 overflow-y-auto p-6"
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
            </div>
        </div>
    );
}

