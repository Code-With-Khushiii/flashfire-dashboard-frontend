import { PersonalInfo } from "./components/PersonalInfo";
import { Summary } from "./components/Summary";
import { WorkExperience } from "./components/WorkExperience";
import { Projects } from "./components/Projects";
import { Leadership } from "./components/Leadership";
import { Skills } from "./components/Skills";
import { Education } from "./components/Education";
import { ResumePreview } from "./components/ResumePreview";
import { ChangesComparison } from "./components/ChangesComparison";
import { RotateCcw, Save, Check, LucideSaveAll } from "lucide-react";
import { useResumeStore } from "./store/useResumeStore";
import { useResumeUnlockStore } from "./store/resumeStore";
import { initialData } from "./data/initialData";
import { useState, useEffect } from "react";
import { useSearchParams, useParams } from "react-router-dom";
import ResumeSelectorModal from "./components/ResumeSelectorModal";
import LockedSection from "./components/LockedSection";
import ResumeParserModal from "./components/ResumeParserModal";
import Login from "./components/Login";
import AdminDashboard from "./components/AdminDashboard";
import { ResumePreview1 } from "./components/ResumePreview1";
import { PreviewStore } from "./store/PreviewStore";
import { Publications } from "./components/Publications";
import { ResumePreviewMedical } from "./components/ResumePreviewMedical";
import { useJobsSessionStore } from "../../state_management/JobsSessionStore";
import "./index.css"; //

// Type definitions remain the same
interface WorkExperienceItem {
    id: string;
    position: string;
    company: string;
    duration: string;
    location: string;
    roleType: string;
    responsibilities: string[];
}
interface ProjectItem {
    id: string;
    position: string;
    company: string;
    duration: string;
    location: string;
    roleType: string;
    responsibilities: string[];
    linkName: string;
    linkUrl: string;
}
interface LeadershipItem {
    id: string;
    title: string;
    organization: string;
}
interface EducationItem {
    id: string;
    institution: string;
    location: string;
    degree: string;
    field: string;
    duration: string;
    additionalInfo: string;
}

interface SkillCategory {
    id: string;
    category: string;
    skills: string;
}
interface PublicationItem {
    id: string;
    details: string;
}
type ResumeDataType = typeof initialData;

function AccessKeyEditor() {
    const { resume_id, unlockKey: accessKey, setAccessKey } = useResumeUnlockStore();
    const [inputKey, setInputKey] = useState<string>(accessKey || "");
    const [originalKey, setOriginalKey] = useState<string>(accessKey || "");
    const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
    const [showConfirm, setShowConfirm] = useState<boolean>(false);
    const apiUrl = import.meta.env.VITE_API_URL || "https://resume-maker-backend-lf5z.onrender.com";
    const isAdmin = typeof window !== 'undefined' && localStorage.getItem("role") === "admin";

    useEffect(() => {
        setInputKey(accessKey || "");
        setOriginalKey(accessKey || "");
        // If we don't have a value yet, fetch from backend for accuracy
        const fetchUnlock = async () => {
            if (!accessKey && resume_id) {
                try {
                    const apiUrl = import.meta.env.VITE_API_URL || "https://resume-maker-backend-lf5z.onrender.com";
                    const res = await fetch(`${apiUrl}/api/resume-index/${resume_id}`);
                    const data = await res.json();
                    if (res.ok && data && typeof data.unlockKey === 'string') {
                        setAccessKey(data.unlockKey);
                        setInputKey(data.unlockKey);
                        setOriginalKey(data.unlockKey);
                    }
                } catch (e) {
                    console.error("Error fetching unlock key:", e);
                    
                }
            }
        };
        fetchUnlock();
    }, [accessKey, resume_id, setAccessKey]);

    const hasChanges = inputKey.trim() !== (originalKey || "");
    const disabled = !resume_id || !hasChanges || status === "saving";

    const performUpdate = async () => {
        if (!resume_id || !hasChanges) return;
        try {
            setStatus("saving");
            const res = await fetch(`${apiUrl}/api/update-unlock-key`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ resume_id, unlockKey: inputKey.trim() })
            });
            const data = await res.json();
            if (!res.ok || data.error) {
                throw new Error(data.error || "Failed to update unlock key");
            }
            setAccessKey(data.unlockKey);
            setOriginalKey(data.unlockKey);
            setStatus("saved");
            setTimeout(() => setStatus("idle"), 1500);
        } catch (e) {
            setStatus("error");
            setTimeout(() => setStatus("idle"), 2000);
        }
    };

    const handleUpdateClick = () => {
        if (!hasChanges || !resume_id) return;
        setShowConfirm(true);
    };

    // Only admins can see and update unlock key editor
    if (!resume_id || !isAdmin) {
        return null;
    }

    return (
        <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Unlock Key</label>
            <div className="flex gap-2">
                <input
                    type="text"
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter unlock key"
                />
                <button
                    onClick={handleUpdateClick}
                    disabled={disabled}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${disabled ? "bg-gray-300 text-gray-600 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                >
                    {status === "saving" ? "Updating..." : "Update Unlock Key"}
                </button>
            </div>
            {status === "saved" && (
                <p className="text-xs text-green-600 mt-1">Unlock key updated.</p>
            )}
            {status === "error" && (
                <p className="text-xs text-red-600 mt-1">Failed to update unlock key.</p>
            )}
            {showConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-[999] flex items-center justify-center" onClick={() => setShowConfirm(false)}>
                    <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">Confirm Update</h3>
                        <p className="text-sm text-gray-600 mb-4">Do you want to update the unlock key?</p>
                        <div className="flex justify-end gap-2">
                            <button
                                className="px-3 py-2 text-sm rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300"
                                onClick={() => setShowConfirm(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="px-3 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
                                onClick={() => {
                                    performUpdate();
                                    setShowConfirm(false);
                                }}
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function App() {
    // URL parameters
    const [searchParams] = useSearchParams();
    const { jobId } = useParams<{ jobId: string }>();
    const startWithEditor = searchParams.get("view") === "editor";
    
    // Check if we're in the optimize route to show print buttons
    const isOptimizeRoute = window.location.pathname.includes('/optimize/');

    // Authentication state
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userRole, setUserRole] = useState<string>("");
    const [token, setToken] = useState<string>("");
    const [authView, setAuthView] = useState<"login" | "admin" | "resume">(
        "login"
    );
    const { versionV, setVersion } = PreviewStore();

    // Get session store for updating job cache
    const { updateJob, refreshJobByMongoId } = useJobsSessionStore();

    const {
        resumeData,
        setResumeData,
        baseResume,
        setBaseResume,
        showLeadership,
        setShowLeadership,
        showProjects,
        setShowProjects,
        showSummary,
        setShowSummary,
        isSaved,
        setIsSaved,
        jobDescription,
        setJobDescription,
        isOptimizing,
        setIsOptimizing,
        optimizedData,
        setOptimizedData,
        currentView: currentResumeView,
        setCurrentView: setCurrentResumeView,
        showChanges,
        setShowChanges,
        changedFields,
        setChangedFields,
        resetStore,
        loadLastSelectedResume,
        clearLastSelectedResume,
        debugLocalStorage,
        // setUserId,
        showPublications,
        setShowPublications,
    } = useResumeStore();

    const {
        isPersonalInfoEditable,
        // isSummaryEditable,
        // isWorkExperienceEditable,
        isProjectsEditable,
        isLeadershipEditable,
        // isSkillsEditable,
        // isEducationEditable,
        isEditingUnlocked,
        lockAllSections,
        checkAdminAndUnlock,
        setResumeId,
        // setAccessKey,
        resume_id,
    } = useResumeUnlockStore();

    const [showParseModal, setShowParseModal] = useState(false);
    const [storeHydrated, setStoreHydrated] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);
    
    // Additional state variables for job details and optimization
    const [companyName, setCompanyName] = useState<string>("");
    const [jobTitle, setJobTitle] = useState<string>("");
    const [showOptimizeConfirmation, setShowOptimizeConfirmation] = useState(false);

    // Always open in Editor on initial load
    useEffect(() => {
        setCurrentResumeView("editor");
    }, []);

    // Debug: Log store state on mount
    useEffect(() => {
        console.log("Optimizer component mounted. Store state:", {
            resumeData: resumeData,
            baseResume: baseResume,
        });

        // Check what's in localStorage
        const storedData = localStorage.getItem("resume-storage");
        console.log("Raw localStorage data:", storedData);
        if (storedData) {
            try {
                const parsed = JSON.parse(storedData);
                console.log("Parsed localStorage data:", parsed);
                console.log(
                    "Has lastSelectedResume:",
                    !!parsed.state?.lastSelectedResume
                );
                console.log(
                    "Has lastSelectedResumeId:",
                    !!parsed.state?.lastSelectedResumeId
                );
                console.log(
                    "Resume name in localStorage:",
                    parsed.state?.lastSelectedResume?.personalInfo?.name ||
                        "No name"
                );
            } catch (e) {
                console.error("Failed to parse localStorage data:", e);
            }
        }

        // Expose debug function to global scope for console access
        (window as any).debugResumeStore = debugLocalStorage;
        console.log("Debug function available as window.debugResumeStore()");

        // Wait longer for store hydration and localStorage sync when opening new tab
        const isNewTab = window.opener !== null;
        const waitTime = isNewTab ? 500 : 200; // Wait longer for new tabs

        // If this is a new tab, try to refresh localStorage data from the parent window
        if (isNewTab) {
            console.log(
                "🔄 New tab detected - attempting to sync localStorage with parent window"
            );

            // Listen for storage events from the parent window
            const handleStorageChange = (e: StorageEvent) => {
                if (e.key === "resume-storage" && e.newValue) {
                    console.log(
                        "📡 Received localStorage update from parent window"
                    );
                    // Force a page reload to pick up the new data
                    window.location.reload();
                }
            };

            window.addEventListener("storage", handleStorageChange);

            // Clean up listener
            const cleanup = () => {
                window.removeEventListener("storage", handleStorageChange);
            };

            const timer = setTimeout(() => {
                console.log("⏰ New tab hydration timeout - proceeding");
                cleanup();
                setStoreHydrated(true);
            }, waitTime);

            return () => {
                clearTimeout(timer);
                cleanup();
            };
        }

        // Regular timer for existing tabs
        const timer = setTimeout(() => {
            console.log("⏰ Existing tab hydration timeout - proceeding");
            setStoreHydrated(true);
        }, waitTime);
        return () => clearTimeout(timer);
    }, []);

    // Function to check if projects exist in the database
    const checkProjectsInDatabase = async (userEmail?: string) => {
        try {
            if (!userEmail) {
                console.log(
                    "No user email provided - keeping Projects section disabled"
                );
                setShowProjects(false);
                return;
            }

            const apiUrl =
                import.meta.env.VITE_API_URL || "https://resume-maker-backend-lf5z.onrender.com";
            const response = await fetch(
                `${apiUrl}/api/check-projects?userEmail=${encodeURIComponent(
                    userEmail
                )}`
            );
            const result = await response.json();

            console.log("Projects check result:", result);

            if (result.hasProjects) {
                setShowProjects(true);
                console.log(
                    "Projects found in database - enabling Projects section"
                );
            } else {
                setShowProjects(false);
                console.log(
                    "No projects found in database - keeping Projects section disabled"
                );
            }
        } catch (error) {
            console.error("Error checking for projects:", error);
            // Default to false if there's an error
            setShowProjects(false);
        }
    };

    // Function to check loaded resume data and set checkboxes accordingly
    const checkLoadedResumeData = (
        resumeData: ResumeDataType & { checkboxStates?: any }
    ) => {
        console.log("Checking loaded resume data for sections...");

        // Check if there are saved checkbox states from the database
        if (resumeData.checkboxStates) {
            console.log(
                "Found saved checkbox states:",
                resumeData.checkboxStates
            );
            console.log(
                "Setting showSummary to:",
                resumeData.checkboxStates.showSummary ?? true
            );
            setShowSummary(resumeData.checkboxStates.showSummary ?? true);
            setShowProjects(resumeData.checkboxStates.showProjects ?? false);
            setShowLeadership(
                resumeData.checkboxStates.showLeadership ?? false
            );
            const hasValidPublications =
                resumeData.publications &&
                resumeData.publications.length > 0 &&
                resumeData.publications.some(
                    (item) => item.details && item.details.trim() !== ""
                );
            const hasOnlyEmptyPublications =
                resumeData.publications &&
                resumeData.publications.length > 0 &&
                resumeData.publications.every(
                    (item) => !item.details || item.details.trim() === ""
                );
            const finalHasPublications =
                hasValidPublications && !hasOnlyEmptyPublications;
            setShowPublications(finalHasPublications);
            console.log(
                "Checkboxes set from saved states - Summary:",
                resumeData.checkboxStates.showSummary,
                "Projects:",
                resumeData.checkboxStates.showProjects,
                "Leadership:",
                resumeData.checkboxStates.showLeadership
            );
            return;
        }

        // Fallback to content-based detection if no saved states
        console.log("No saved checkbox states, using content-based detection");

        // Check if summary section has meaningful data
        const hasValidSummary =
            resumeData.summary && resumeData.summary.trim() !== "";

        // Check if projects section has meaningful data
        const hasValidProjects =
            resumeData.projects &&
            resumeData.projects.length > 0 &&
            resumeData.projects.some(
                (project) =>
                    (project.position && project.position.trim() !== "") ||
                    (project.company && project.company.trim() !== "") ||
                    (project.responsibilities &&
                        project.responsibilities.some(
                            (resp) => resp.trim() !== ""
                        )) ||
                    (project.linkName && project.linkName.trim() !== "") ||
                    (project.linkUrl && project.linkUrl.trim() !== "")
            );

        // Check if leadership section has meaningful data
        const hasValidLeadership =
            resumeData.leadership &&
            resumeData.leadership.length > 0 &&
            resumeData.leadership.some(
                (item) =>
                    (item.title && item.title.trim() !== "") ||
                    (item.organization && item.organization.trim() !== "")
            );

        console.log("Resume data analysis:", {
            hasValidSummary,
            hasValidProjects,
            hasValidLeadership,
        });
        console.log("Summary data:", resumeData.summary);
        console.log("Projects data:", resumeData.projects);
        console.log("Leadership data:", resumeData.leadership);

        // Additional check: If projects array has only empty objects, treat it as empty
        const hasOnlyEmptyProjects =
            resumeData.projects &&
            resumeData.projects.length > 0 &&
            resumeData.projects.every(
                (project) =>
                    (!project.position || project.position.trim() === "") &&
                    (!project.company || project.company.trim() === "") &&
                    (!project.responsibilities ||
                        project.responsibilities.every(
                            (resp) => resp.trim() === ""
                        )) &&
                    (!project.linkName || project.linkName.trim() === "") &&
                    (!project.linkUrl || project.linkUrl.trim() === "")
            );

        // Additional check: If leadership array has only empty objects, treat it as empty
        const hasOnlyEmptyLeadership =
            resumeData.leadership &&
            resumeData.leadership.length > 0 &&
            resumeData.leadership.every(
                (item) =>
                    (!item.title || item.title.trim() === "") &&
                    (!item.organization || item.organization.trim() === "")
            );

        // Final decision: Only show if there's actual content, not just empty objects
        const finalHasSummary = Boolean(hasValidSummary);
        const finalHasProjects = hasValidProjects && !hasOnlyEmptyProjects;
        const finalHasLeadership =
            hasValidLeadership && !hasOnlyEmptyLeadership;

        console.log("Final analysis:", {
            hasValidSummary,
            finalHasSummary,
            hasValidProjects,
            hasOnlyEmptyProjects,
            finalHasProjects,
            hasValidLeadership,
            hasOnlyEmptyLeadership,
            finalHasLeadership,
        });

        // Set the checkboxes based on actual data
        setShowSummary(finalHasSummary);
        setShowProjects(finalHasProjects);
        setShowLeadership(finalHasLeadership);

        console.log(
            "Checkboxes set from content analysis - Summary:",
            finalHasSummary,
            "Projects:",
            finalHasProjects,
            "Leadership:",
            finalHasLeadership
        );
    };

    // Check for existing authentication on component mount
    useEffect(() => {
        if (!storeHydrated) {
            console.log(
                "Waiting for store hydration before checking authentication"
            );
            return;
        }

        const storedToken = localStorage.getItem("jwt");
        const storedRole = localStorage.getItem("role");
        const storedEmail = localStorage.getItem("userEmail");

        if (storedToken && storedRole) {
            setToken(storedToken);
            setUserRole(storedRole);
            setIsAuthenticated(true);

            // Route based on role
            if (storedRole === "admin") {
                setAuthView("admin");
            } else {
                // First try to load the last selected resume
                console.log(
                    "Attempting to load last selected resume from authentication"
                );
                const resumeLoaded = loadLastSelectedResume();

                if (resumeLoaded) {
                    console.log("Loaded last selected resume from storage");
                    // The checkLoadedResumeData will be called in a useEffect when resumeData changes
                } else {
                    console.log(
                        "No last selected resume found during authentication"
                    );
                    // For interns, load their client's default resume if no last selected resume
                    if (
                        storedEmail &&
                        (storedEmail === "sai@company.com" ||
                            storedEmail === "amit@company.com")
                    ) {
                        const loadDefaultResume = async () => {
                            try {
                                const apiUrl =
                                    import.meta.env.VITE_API_URL ||
                                    "https://resume-maker-backend-lf5z.onrender.com";
                                const response = await fetch(
                                    `${apiUrl}/api/default-resume/${storedEmail}`
                                );
                                const result = await response.json();

                                if (result.success && result.resume) {
                                    setResumeData(result.resume);
                                    setBaseResume(result.resume);
                                    console.log(
                                        `Loaded default resume for ${storedEmail}`
                                    );
                                    // Check the loaded resume data and set checkboxes accordingly
                                    checkLoadedResumeData(result.resume);
                                }
                            } catch (error) {
                                console.error(
                                    "Error loading default resume:",
                                    error
                                );
                            }
                        };
                        loadDefaultResume();
                    }
                }
                setAuthView("resume");

                // Note: checkLoadedResumeData is called after loading the resume data
                // No need to call checkProjectsInDatabase here as it would override the actual resume data
            }
        }

        // Set initialization complete
        setIsInitializing(false);
    }, [storeHydrated]);

    // Load last selected resume on component mount (separate from auth)
    useEffect(() => {
        // Only try to load if we're authenticated and not admin and store is hydrated
        if (isAuthenticated && userRole !== "admin" && storeHydrated) {
            console.log(
                "Attempting to load last selected resume on component mount"
            );
            const resumeLoaded = loadLastSelectedResume();
            if (resumeLoaded) {
                console.log("Loaded last selected resume on component mount");
            } else {
                console.log("No last selected resume found on component mount");
            }
        }
    }, [isAuthenticated, userRole, storeHydrated, loadLastSelectedResume]);

    // Set currentView to editor for non-admin users when opening from JobModal
    useEffect(() => {
        if (authView === "resume" && startWithEditor && userRole !== "admin") {
            setCurrentResumeView("editor");
        }
    }, [authView, startWithEditor, userRole, setCurrentResumeView]);

    // Reinforce: after resume data (or last-selected resume) hydrates, ensure URL wins
    useEffect(() => {
        if (authView === "resume" && startWithEditor && userRole !== "admin") {
            setCurrentResumeView("editor");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resumeData, baseResume, storeHydrated]);

    // Auto-unlock sections for admin users
    useEffect(() => {
        if (authView === "resume" && userRole === "admin") {
            checkAdminAndUnlock();
        }
    }, [authView, userRole, checkAdminAndUnlock]);

    // Debug: Log when checkbox states change
    useEffect(() => {
        console.log("showProjects state changed to:", showProjects);
    }, [showProjects]);

    useEffect(() => {
        console.log("showSummary state changed to:", showSummary);
    }, [showSummary]);

    useEffect(() => {
        console.log("showLeadership state changed to:", showLeadership);
    }, [showLeadership]);

    useEffect(() => {
        console.log("showPublications state changed to:", showPublications);
    }, [showPublications]);

    // Handle jobId from URL
    useEffect(() => {
        if (jobId && jobId !== resume_id) {
            console.log("Setting resume ID from URL:", jobId);
            setResumeId(jobId);
        }
    }, [jobId, resume_id, setResumeId]);

    // Load resume data when jobId changes
    useEffect(() => {
        if (jobId && isAuthenticated && storeHydrated) {
            console.log("Loading resume data for jobId:", jobId);
            // Debug localStorage state
            debugLocalStorage();
            // Try to load the last selected resume first
            const resumeLoaded = loadLastSelectedResume();
            if (!resumeLoaded) {
                console.log(
                    "No last selected resume found, will use initial data"
                );
            }
        }
    }, [
        jobId,
        isAuthenticated,
        storeHydrated,
        loadLastSelectedResume,
        debugLocalStorage,
    ]);

    // Fetch job description from backend when jobId is available
    const fetchJobDescription = async (jobId: string) => {
        try {
            console.log("🔄 Fetching job description for jobId:", jobId);

            const apiUrl =
                import.meta.env.VITE_API_BASE_URL || "http://localhost:8086";
            const fullUrl = `${apiUrl}/getJobDescription/${jobId}`;
            console.log("🌐 Making request to:", fullUrl);

            const response = await fetch(fullUrl, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            console.log(
                "📡 Response status:",
                response.status,
                response.statusText
            );
            console.log(
                "📡 Response headers:",
                Object.fromEntries(response.headers.entries())
            );

            if (!response.ok) {
                const errorText = await response.text();
                console.error("❌ Response error text:", errorText);
                throw new Error(
                    `HTTP error! status: ${response.status}, message: ${errorText}`
                );
            }

            const data = await response.json();
            console.log("✅ Job description fetched successfully:", {
                jobDescription: data.jobDescription?.substring(0, 100) + "...",
                jobTitle: data.jobTitle,
                companyName: data.companyName,
            });

            // Set the job description in the store
            if (data.jobDescription) {
                setJobDescription(data.jobDescription);
                console.log("✅ Job description set in store");
            } else {
                console.log("⚠️ No job description found for this job");
            }
            
            // Set company name and job title
            if (data.companyName) {
                setCompanyName(data.companyName);
                console.log("✅ Company name set:", data.companyName);
            }
            if (data.jobTitle) {
                setJobTitle(data.jobTitle);
                console.log("✅ Job title set:", data.jobTitle);
            }
        } catch (error) {
            console.error("❌ Error fetching job description:", error);

            // Check if it's a network error (backend not running)
            if (error instanceof TypeError && error.message.includes("fetch")) {
                console.error(
                    "🌐 Network error - Backend server might not be running on port 8086"
                );
                console.error(
                    "💡 Please ensure the backend server is running: npm start (in Backend folder)"
                );
            }
        }
    };

    // Fetch job description when jobId changes and user is authenticated
    useEffect(() => {
        if (jobId && isAuthenticated && storeHydrated) {
            console.log(
                "🔄 Triggering job description fetch for jobId:",
                jobId
            );
            fetchJobDescription(jobId);
        }
    }, [jobId, isAuthenticated, storeHydrated]);

    // Note: Removed the useEffect that was overriding saved checkbox states
    // Now checkbox states are only set when explicitly loading resume data

    // Handle login success
    const updatePublications = (data: PublicationItem[]) => {
        setResumeData({ ...resumeData, publications: data });
        trackChanges("publications");
    };
    const updateOptimizedPublications = (data: PublicationItem[]) => {
        if (optimizedData) {
            setOptimizedData((prev) =>
                prev
                    ? {
                          ...prev,
                          publications: data,
                      }
                    : null
            );
        }
    };

    const handleLogin = async (
        loginToken: string,
        role?: string,
        userEmail?: string
    ) => {
        setToken(loginToken);
        setUserRole(role || "user");
        setIsAuthenticated(true);

        if (role === "admin") {
            setAuthView("admin");
        } else {
            // For interns, load their client's default resume
            if (
                userEmail &&
                (userEmail === "sai@company.com" ||
                    userEmail === "amit@company.com")
            ) {
                try {
                    const apiUrl =
                        import.meta.env.VITE_API_URL ||
                        (import.meta.env.DEV
                            ? import.meta.env.VITE_DEV_API_URL ||
                              "https://resume-maker-backend-lf5z.onrender.com"
                            : "");
                    const response = await fetch(
                        `${apiUrl}/api/default-resume/${userEmail}`
                    );
                    const result = await response.json();

                    if (result.success && result.resume) {
                        setResumeData(result.resume);
                        setBaseResume(result.resume);
                        console.log(`Loaded default resume for ${userEmail}`);
                        // Check the loaded resume data and set checkboxes accordingly
                        checkLoadedResumeData(result.resume);
                    }
                } catch (error) {
                    console.error("Error loading default resume:", error);
                }
            }
            setAuthView("resume");

            // Check for projects in database when user logs in
            checkProjectsInDatabase(userEmail);
        }
    };

    // Handle logout
    const handleLogout = () => {
        localStorage.removeItem("jwt");
        localStorage.removeItem("role");
        localStorage.removeItem("userEmail");
        setIsAuthenticated(false);
        setUserRole("");
        setToken("");
        setAuthView("login");
        resetStore();
        // Clear the persistent resume selection on logout
        clearLastSelectedResume();
    };

    // Switch to resume builder from admin dashboard
    const switchToResumeBuilder = () => {
        setAuthView("resume");
        // For admin users, we don't need to unlock sections since they won't see the editing panel
        // Admin users will only see the resume preview without editing capabilities
    };

    // Generate dynamic filename based on name
    const generateFilename = (data: typeof resumeData) => {
        const name = data.personalInfo.name || "Resume";
        return (
            name.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "") +
            "_Resume.pdf"
        );
    };

    // Track changes
    const trackChanges = (field: string) => {
        const currentFields =
            changedFields instanceof Set ? changedFields : new Set<string>();
        setChangedFields(new Set([...currentFields, field]));
    };

    // --- Update functions ---
    const updatePersonalInfo = (field: string, value: string) => {
        setResumeData({
            ...resumeData,
            personalInfo: {
                ...resumeData.personalInfo,
                [field]: value,
            },
        });
        trackChanges(`personalInfo.${field}`);
    };
    const updateSummary = (value: string) => {
        setResumeData({ ...resumeData, summary: value });
        trackChanges("summary");
    };
    const updateWorkExperience = (data: WorkExperienceItem[]) => {
        setResumeData({ ...resumeData, workExperience: data });
        trackChanges("workExperience");
    };
    const updateProjects = (data: ProjectItem[]) => {
        setResumeData({ ...resumeData, projects: data });
        trackChanges("projects");
    };
    const updateLeadership = (data: LeadershipItem[]) => {
        setResumeData({ ...resumeData, leadership: data });
        trackChanges("leadership");
    };
    const updateSkills = (data: SkillCategory[]) => {
        setResumeData({ ...resumeData, skills: data });
        trackChanges("skills");
    };
    const updateEducation = (data: EducationItem[]) => {
        setResumeData({ ...resumeData, education: data });
        trackChanges("education");
    };

    const updateOptimizedSummary = (value: string) => {
        if (optimizedData) {
            setOptimizedData((prev) =>
                prev
                    ? {
                          ...prev,
                          summary: value,
                      }
                    : null
            );
        }
    };

    const updateOptimizedWorkExperience = (data: WorkExperienceItem[]) => {
        if (optimizedData) {
            setOptimizedData((prev) =>
                prev
                    ? {
                          ...prev,
                          workExperience: data,
                      }
                    : null
            );
        }
    };

    const updateOptimizedProjects = (data: ProjectItem[]) => {
        if (optimizedData) {
            setOptimizedData((prev) =>
                prev
                    ? {
                          ...prev,
                          projects: data,
                      }
                    : null
            );
        }
    };
    const updateOptimizedSkills = (data: SkillCategory[]) => {
        if (optimizedData) {
            setOptimizedData((prev) =>
                prev
                    ? {
                          ...prev,
                          skills: data,
                      }
                    : null
            );
        }
    };
    const updateOptimizedEducation = (data: EducationItem[]) => {
        if (optimizedData) {
            setOptimizedData((prev) =>
                prev
                    ? {
                          ...prev,
                          education: data,
                      }
                    : null
            );
        }
    };
    const handleResumeParseSuccess = (parsedData: ResumeDataType) => {
        console.log("Resume parsed successfully:", parsedData);
        // setResumeData(parsedData);
        // setCurrentView("editor");
    };
    // --- Save ---
    const handleSave = async () => {
        try {
            setIsSaved(true);

            const { name } = resumeData.personalInfo;
            const safeName = name
                ? name.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "")
                : "user";
            const filename = `${safeName}_resume.pdf`;
            const apiUrl =
                import.meta.env.VITE_API_URL || "https://resume-maker-backend-lf5z.onrender.com";
            const saveData = {
                filename,
                data: resumeData,
                checkboxStates: {
                    showSummary,
                    showProjects,
                    showLeadership,
                    showPublications,
                },
                createdBy: userRole === "admin" ? "admin" : "user",
            };
            console.log("Saving resume with data:", saveData);

            const response = await fetch(`${apiUrl}/api/save-resume`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(saveData),
            });

            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error || "Failed to save resume");
            }

            console.log(
                "Resume JSON saved:",
                filename,
                "Resume ID:",
                result.resume_id
            );
            // Optionally store resume_id in state or context for later use
            // setResumeId(result.resume_id);

            setTimeout(() => {
                setIsSaved(false);
            }, 2000);
        } catch (error) {
            console.error("Error saving resume:", error);
            alert("Error saving resume. Please try again.");
        }
    };

    const handleV1Resume = async () => {
        try {
            console.log("Saving to V1 resume with ID:", resume_id);
            const apiUrl =
                import.meta.env.VITE_API_URL || "https://resume-maker-backend-lf5z.onrender.com";
            await fetch(`${apiUrl}/api/save-v1-resume`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ id: resume_id, version: versionV }),
            });
            alert("V1 resume saved go to All resume V1 to see it.");
        } catch (error) {
            alert("Error saving to V1 resume. Please try again.");
            console.error("Error saving to V1 resume:", error);
        }
    };
    const handleV2Resume = async () => {
        try {
            console.log("Saving to V2 resume with ID:", resume_id);
            const apiUrl =
                import.meta.env.VITE_API_URL || "https://resume-maker-backend-lf5z.onrender.com";
            await fetch(`${apiUrl}/api/save-v2-resume`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ id: resume_id, version: versionV }),
            });
            alert(
                "Medical resume saved go to Medical resume session  to see it."
            );
        } catch (error) {
            alert("Error saving to medical resume. Please try again.");
            console.error("Error saving to medical resume:", error);
        }
    };

    const handlePrint = () => {
        const currentData =
            currentResumeView === "optimized" && optimizedData
                ? optimizedData
                : resumeData;
        const filename = generateFilename(currentData);

        // Simple print with instructions
        const shouldPrint = window.confirm(
            `📄 PRINT SETTINGS:\n\n` +
                `• Filename: ${filename}\n` +
                `• Set Margins to "None"\n` +
                `• Disable "Headers and footers"\n` +
                `• Set Scale to 100%\n` +
                `• Use "Save as PDF" for best quality\n\n` +
                `Click OK to print your resume.`
        );

        if (shouldPrint) {
            // Set the document title to the filename for better PDF naming
            const originalTitle = document.title;
            document.title = filename.replace(".pdf", "");

            // Add afterPrint event listener for guidance
            const afterPrint = () => {
                setTimeout(() => {
                    const resumePreviewElement = document.querySelector(
                        "[data-resume-preview]"
                    ) as HTMLElement;
                    if (resumePreviewElement) {
                        const resumeHeight = resumePreviewElement.scrollHeight;
                        const pageHeight = 1056; // Standard letter page height in pixels
                        const maxSinglePageHeight = pageHeight - 50; // Buffer for margins

                        if (resumeHeight > maxSinglePageHeight) {
                            alert(
                                `📄 PRINT COMPLETED\n\n` +
                                    `If you got a 2-page PDF instead of 1-page:\n\n` +
                                    `Next time, in the print dialog:\n` +
                                    `1. Click on "Pages" dropdown\n` +
                                    `2. Select "Current" or enter "1"\n` +
                                    `3. This ensures you get only the first page\n\n` +
                                    `This helps avoid accidentally downloading multi-page resumes for job applications.`
                            );
                        }
                    }
                }, 500);
            };

            window.addEventListener("afterprint", afterPrint);
            window.print();

            // Cleanup
            setTimeout(() => {
                document.title = originalTitle;
                window.removeEventListener("afterprint", afterPrint);
            }, 1000);
        }
    };

    // --- Reset ---
    const handleStartOver = () => {
        if (
            window.confirm(
                "Are you sure you want to start over? This will reset all your data."
            )
        ) {
            localStorage.clear();
            resetStore();
        }
    };

    const getOptimizationChanges = (
        original: typeof initialData,
        optimized: typeof initialData
    ) => {
        const changes = new Set<string>();

        // Compare personal info
        Object.keys(original.personalInfo).forEach((key) => {
            const typedKey = key as keyof typeof original.personalInfo;
            if (
                original.personalInfo[typedKey] !==
                optimized.personalInfo[typedKey]
            ) {
                changes.add(`personalInfo.${key}`);
            }
        });

        // Compare summary
        if (original.summary !== optimized.summary) {
            changes.add("summary");
        }

        // Compare work experience
        if (
            JSON.stringify(original.workExperience) !==
            JSON.stringify(optimized.workExperience)
        ) {
            changes.add("workExperience");
        }

        // Compare projects
        if (
            JSON.stringify(original.projects) !==
            JSON.stringify(optimized.projects)
        ) {
            changes.add("projects");
        }

        // Compare leadership
        if (
            JSON.stringify(original.leadership) !==
            JSON.stringify(optimized.leadership)
        ) {
            changes.add("leadership");
        }

        // Compare skills
        if (
            JSON.stringify(original.skills) !== JSON.stringify(optimized.skills)
        ) {
            changes.add("skills");
        }

        // Compare education
        if (
            JSON.stringify(original.education) !==
            JSON.stringify(optimized.education)
        ) {
            changes.add("education");
        }

        if (
            JSON.stringify(original.publications) !==
            JSON.stringify(optimized.publications)
        ) {
            changes.add("publications");
        }

        return changes;
    };

    const updateOptimizedPersonalInfo = (field: string, value: string) => {
        if (optimizedData) {
            setOptimizedData((prev) =>
                prev
                    ? {
                          ...prev,
                          personalInfo: {
                              ...prev.personalInfo,
                              [field]: value,
                          },
                      }
                    : null
            );
        }
    };

    const updateOptimizedLeadership = (data: LeadershipItem[]) => {
        if (optimizedData) {
            setOptimizedData((prev) =>
                prev
                    ? {
                          ...prev,
                          leadership: data,
                      }
                    : null
            );
        }
    };

    const autoSaveChangesToDashboard = async (originalData: any, optimizedData: any) => {
        try {
            const apiUrl =
                import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

            // Get only changed fields
            const getChangedFieldsOnly = () => {
                const startingContent: any = {};
                const finalChanges: any = {};

                // Personal Info - only changed fields
                const personalInfoChanged = Object.keys(
                    originalData.personalInfo
                ).filter(
                    (key) =>
                        originalData.personalInfo[
                            key as keyof typeof originalData.personalInfo
                        ] !==
                        optimizedData.personalInfo[
                            key as keyof typeof optimizedData.personalInfo
                        ]
                );

                if (personalInfoChanged.length > 0) {
                    startingContent.personalInfo = {};
                    finalChanges.personalInfo = {};
                    personalInfoChanged.forEach((key) => {
                        const typedKey = key as keyof typeof originalData.personalInfo;
                        startingContent.personalInfo[key] =
                            originalData.personalInfo[typedKey];
                        finalChanges.personalInfo[key] =
                            optimizedData.personalInfo[typedKey];
                    });
                }

                // Summary - only if changed
                if (originalData.summary !== optimizedData.summary) {
                    startingContent.summary = originalData.summary;
                    finalChanges.summary = optimizedData.summary;
                }

                // Work Experience - only changed items
                const changedWorkExp = originalData.workExperience
                    .map((orig: any, idx: number) => {
                        const opt = optimizedData.workExperience[idx];
                        if (!opt) return null;

                        const changes: any = {};
                        const originals: any = {};
                        let hasChanges = false;

                        ["position", "company", "duration", "location", "roleType"].forEach((field) => {
                            if (orig[field] !== opt[field]) {
                                originals[field] = orig[field];
                                changes[field] = opt[field];
                                hasChanges = true;
                            }
                        });

                        if (JSON.stringify(orig.responsibilities) !== JSON.stringify(opt.responsibilities)) {
                            originals.responsibilities = [...orig.responsibilities];
                            changes.responsibilities = [...opt.responsibilities];
                            hasChanges = true;
                        }

                        if (hasChanges) {
                            return {
                                id: orig.id,
                                original: originals,
                                optimized: changes,
                            };
                        }
                        return null;
                    })
                    .filter(Boolean);

                if (changedWorkExp.length > 0) {
                    startingContent.workExperience = changedWorkExp.map((item: any) => ({
                        id: item.id,
                        ...item.original,
                    }));
                    finalChanges.workExperience = changedWorkExp.map((item: any) => ({
                        id: item.id,
                        ...item.optimized,
                    }));
                }

                // Projects - only changed items
                const changedProjects = originalData.projects
                    .map((orig: any, idx: number) => {
                        const opt = optimizedData.projects[idx];
                        if (!opt) return null;

                        const changes: any = {};
                        const originals: any = {};
                        let hasChanges = false;

                        ["position", "company", "duration", "location", "roleType"].forEach((field) => {
                            if (orig[field] !== opt[field]) {
                                originals[field] = orig[field];
                                changes[field] = opt[field];
                                hasChanges = true;
                            }
                        });

                        if (JSON.stringify(orig.responsibilities) !== JSON.stringify(opt.responsibilities)) {
                            originals.responsibilities = [...orig.responsibilities];
                            changes.responsibilities = [...opt.responsibilities];
                            hasChanges = true;
                        }

                        if (hasChanges) {
                            return {
                                id: orig.id,
                                original: originals,
                                optimized: changes,
                            };
                        }
                        return null;
                    })
                    .filter(Boolean);

                if (changedProjects.length > 0) {
                    startingContent.projects = changedProjects.map((item: any) => ({
                        id: item.id,
                        ...item.original,
                    }));
                    finalChanges.projects = changedProjects.map((item: any) => ({
                        id: item.id,
                        ...item.optimized,
                    }));
                }

                // Skills - only changed categories
                const changedSkills = originalData.skills
                    .map((orig: any, idx: number) => {
                        const opt = optimizedData.skills[idx];
                        if (!opt) return null;

                        if (orig.category !== opt.category || orig.skills !== opt.skills) {
                            return {
                                id: orig.id,
                                original: {
                                    category: orig.category,
                                    skills: orig.skills,
                                },
                                optimized: {
                                    category: opt.category,
                                    skills: opt.skills,
                                },
                            };
                        }
                        return null;
                    })
                    .filter(Boolean);

                if (changedSkills.length > 0) {
                    startingContent.skills = changedSkills.map((item: any) => ({
                        id: item.id,
                        ...item.original,
                    }));
                    finalChanges.skills = changedSkills.map((item: any) => ({
                        id: item.id,
                        ...item.optimized,
                    }));
                }

                // Leadership - only changed items
                const changedLeadership = originalData.leadership
                    .map((orig: any, idx: number) => {
                        const opt = optimizedData.leadership[idx];
                        if (!opt) return null;

                        if (orig.title !== opt.title || orig.organization !== opt.organization) {
                            return {
                                id: orig.id,
                                original: {
                                    title: orig.title,
                                    organization: orig.organization,
                                },
                                optimized: {
                                    title: opt.title,
                                    organization: opt.organization,
                                },
                            };
                        }
                        return null;
                    })
                    .filter(Boolean);

                if (changedLeadership.length > 0) {
                    startingContent.leadership = changedLeadership.map((item: any) => ({
                        id: item.id,
                        ...item.original,
                    }));
                    finalChanges.leadership = changedLeadership.map((item: any) => ({
                        id: item.id,
                        ...item.optimized,
                    }));
                }

                // Education - only changed items
                const changedEducation = originalData.education
                    .map((orig: any, idx: number) => {
                        const opt = optimizedData.education[idx];
                        if (!opt) return null;

                        const fields = ["institution", "location", "degree", "field", "additionalInfo"];
                        const hasChanges = fields.some((field) => orig[field] !== opt[field]);

                        if (hasChanges) {
                            const originals: any = {};
                            const changes: any = {};

                            fields.forEach((field) => {
                                if (orig[field] !== opt[field]) {
                                    originals[field] = orig[field];
                                    changes[field] = opt[field];
                                }
                            });

                            return {
                                id: orig.id,
                                original: originals,
                                optimized: changes,
                            };
                        }
                        return null;
                    })
                    .filter(Boolean);

                if (changedEducation.length > 0) {
                    startingContent.education = changedEducation.map((item: any) => ({
                        id: item.id,
                        ...item.original,
                    }));
                    finalChanges.education = changedEducation.map((item: any) => ({
                        id: item.id,
                        ...item.optimized,
                    }));
                }

                return { startingContent, finalChanges };
            };

            const { startingContent, finalChanges } = getChangedFieldsOnly();

            console.log("Auto-saving changes for job ID:", jobId);

            const response = await fetch(`${apiUrl}/saveChangedSession`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    id: jobId,
                    startingContent: startingContent,
                    finalChanges: finalChanges,
                    optimizedResume: {
                        resumeData: optimizedData,
                        hasResume: true,
                        showSummary: showSummary,
                        showProjects: showProjects,
                        showLeadership: showLeadership,
                        showPublications: showPublications,
                        version: versionV
                    }
                }),
            });

            if (response.ok) {
                console.log("Changes auto-saved successfully, now refreshing job data...");
                
                // After saving successfully, refresh the job from backend
                if (jobId && refreshJobByMongoId) {
                    try {
                        await refreshJobByMongoId(jobId);
                        console.log("Job data refreshed successfully in session storage");
                    } catch (err) {
                        console.error('Error refreshing job in background:', err);
                    }
                }
                return true;
            } else {
                const errorText = await response.text();
                console.error("Failed to auto-save changes:", errorText);
                return false;
            }
        } catch (error) {
            console.error("Error during auto-save:", error);
            return false;
        }
    };

    const handleOptimizeWithAI = async () => {
        if (!jobDescription.trim()) {
            alert("Please enter a job description first.");
            return;
        }

        setIsOptimizing(true);

        try {
            // Get API URL from environment variables
            const prompt: string =
                "if you recieve any HTML tages please ignore it and optimize the resume according to the given JD. Make sure not to cut down or shorten any points in the Work Experience section. IN all fields please do not cut down or shorten any points or content. For example, if a role in the base resume has 6 points, the optimized version should also retain all 6 points. The content should be aligned with the JD but the number of points per role must remain the same. Do not touch or optimize publications if given to you.";
            const apiUrl =
                import.meta.env.VITE_API_URL || "https://resume-maker-backend-lf5z.onrender.com";

            const response = await fetch(`${apiUrl}/api/optimize-with-gemini`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    resume_data: resumeData,
                    job_description: prompt + jobDescription,
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const optimizedDataResult = await response.json();

            // Check if we got valid optimized data
            if (
                optimizedDataResult &&
                (optimizedDataResult.summary || optimizedDataResult.workExperience)
            ) {
                // Store optimized data temporarily and show comparison view
                const newOptimizedData = {
                    ...resumeData,
                    summary: optimizedDataResult.summary || resumeData.summary,
                    workExperience:
                        optimizedDataResult.workExperience ||
                        resumeData.workExperience,
                    skills: optimizedDataResult.skills || resumeData.skills,
                    education: optimizedDataResult.education || resumeData.education,
                    publications:
                        optimizedDataResult.publications || resumeData.publications,
                };

                setOptimizedData(newOptimizedData);
                setCurrentResumeView("optimized"); // Automatically switch to optimized view
                
                // Update job in session storage to reflect changes immediately
                if (jobId) {
                    updateJob(jobId, { 
                        updatedAt: new Date().toISOString()
                    });
                    console.log("Updated job in session storage to trigger re-render");
                }
                
                
                const saveSuccess = await autoSaveChangesToDashboard(resumeData, newOptimizedData);
                
                if (saveSuccess) {
                    alert(
                        'AI optimization complete and changes saved to dashboard! Check the "Optimized Resume" tab to see and edit the enhanced content.'
                    );
                } else {
                    alert(
                        'AI optimization falled!. Please try again.'
                    );
                }
            } else {
                alert(
                    "AI optimization failed. Please try again or edit your resume content manually."
                );
                
            }
        } catch (error) {
            console.error("Error optimizing resume:", error);
            alert("Error optimizing resume: " + error);
            
        } finally {
            setIsOptimizing(false);
        }
    };

    const [showModal, setShowModal] = useState(false);

    // Show loading state during initialization
    if (isInitializing) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    // Render based on current view
    if (authView === "login") {
        return <Login onLogin={handleLogin} />;
    }

    if (authView === "admin") {
        return (
            <AdminDashboard
                token={token}
                onLogout={handleLogout}
                onSwitchToResumeBuilder={switchToResumeBuilder}
            />
        );
    }

    return (
        <>
            <div className="min-h-screen bg-gray-50">
                <header className="bg-white shadow-sm border-b no-print">
                    <div className="max-w-7xl mx-auto px-4 py-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">
                                    Professional Resume Builder Portal
                                </h1>
                                <p className="text-gray-600 mt-1">
                                    Edit sections on the left, see live preview
                                    on the right
                                </p>
                                <div className="text-sm text-blue-600 mt-1 font-medium">
                                    📄 File:{" "}
                                    {generateFilename(
                                        currentResumeView === "optimized" &&
                                            optimizedData
                                            ? optimizedData
                                            : resumeData
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center space-x-4">
                                {/* User Info */}
                                <div className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-lg">
                                    <span className="text-sm text-gray-600">
                                        Welcome,
                                    </span>
                                    <span className="text-sm font-medium text-gray-900">
                                        {userRole === "admin"
                                            ? "Admin"
                                            : "User"}
                                    </span>
                                    <button
                                        onClick={handleLogout}
                                        className="text-sm text-red-600 hover:text-red-800 transition-colors"
                                    >
                                        Logout
                                    </button>
                                </div>

                                {/* Go Back to Dashboard Button - Only for Admin */}
                                {userRole === "admin" && (
                                    <button
                                        onClick={() => setAuthView("admin")}
                                        className="px-4 py-2 rounded-md text-sm font-medium transition-colors bg-purple-600 text-white hover:bg-purple-700 flex items-center gap-2"
                                    >
                                        <svg
                                            className="h-4 w-4"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M15 19l-7-7 7-7"
                                            />
                                        </svg>
                                        Dashboard
                                    </button>
                                )}

                                {/* View Changes Toggle - Only show when optimized data exists and user is on optimized view */}
                                {optimizedData &&
                                    currentResumeView === "optimized" && (
                                        <button
                                            onClick={() =>
                                                setShowChanges(!showChanges)
                                            }
                                            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                                showChanges
                                                    ? "bg-yellow-100 text-yellow-800 border border-yellow-300"
                                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                            }`}
                                        >
                                            {showChanges
                                                ? " Hide Changes"
                                                : " View Changes"}
                                        </button>
                                    )}

                                {/* Navigation Buttons */}
                                <nav className="flex space-x-4">
                                    {userRole === "admin" && (
                                        <>
                                            <button
                                                onClick={() => {
                                                    setVersion(1);
                                                    setShowModal(true);
                                                }}
                                                className="px-4 py-2 rounded-md text-sm font-medium transition-colors bg-orange-600 text-white hover:bg-orange-700"
                                            >
                                                All resume V1
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setVersion(2);
                                                    setShowModal(true);
                                                }}
                                                className="px-4 py-2 rounded-md text-sm font-medium transition-colors bg-orange-600 text-white hover:bg-orange-700"
                                            >
                                                Medical resumes
                                            </button>
                                        </>
                                    )}

                                    {/* All Resumes Button */}
                                    <button
                                        onClick={() => {
                                            setVersion(0);
                                            setShowModal(true);
                                        }}
                                        className="px-4 py-2 rounded-md text-sm font-medium transition-colors bg-orange-600 text-white hover:bg-orange-700"
                                    >
                                        All resumes
                                    </button>
                                    <ResumeSelectorModal
                                        open={showModal}
                                        onClose={() => {
                                            setShowModal(false);
                                            setCurrentResumeView("editor");
                                        }}
                                        onSelect={(
                                            resume: ResumeDataType & {
                                                checkboxStates?: any;
                                            }
                                        ) => {
                                            setResumeData(resume);
                                            setBaseResume(resume);
                                            checkLoadedResumeData(resume);
                                            lockAllSections();
                                            setShowModal(false);
                                            if (userRole === "admin") {
                                                checkAdminAndUnlock();
                                            }
                                            setCurrentResumeView("editor");

                                            // setModalVersion(null);
                                        }}
                                        version={versionV}
                                    />

                                    {/* Other nav buttons */}
                                    <button
                                        onClick={() => {
                                            setCurrentResumeView("editor");
                                            setShowChanges(false);
                                        }}
                                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                            currentResumeView === "editor"
                                                ? "bg-blue-600 text-white"
                                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                        }`}
                                    >
                                        Resume Editor
                                    </button>

                                    <button
                                        onClick={() => {
                                            setCurrentResumeView(
                                                optimizedData
                                                    ? "optimized"
                                                    : "changes"
                                            );
                                            if (!optimizedData)
                                                setShowChanges(false);
                                        }}
                                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                            currentResumeView === "optimized" ||
                                            currentResumeView === "changes"
                                                ? "bg-blue-600 text-white"
                                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                        }`}
                                    >
                                        {optimizedData
                                            ? "Optimized Resume"
                                            : "Changes Made"}
                                    </button>
                                </nav>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="max-w-7xl mx-auto px-4 py-6">
                    {currentResumeView === "editor" ? (
                        /* Normal Edit View */
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Left Side - Edit Sections */}
                            <div className="space-y-6 bg-white rounded-lg shadow-sm p-6 h-fit max-h-[800px] overflow-y-auto no-print">
                                {/* Personal Information Section */}
                                <LockedSection
                                    isLocked={!isPersonalInfoEditable}
                                    sectionName="Resume is locked"
                                >
                                    <PersonalInfo
                                        data={resumeData.personalInfo}
                                        onChange={updatePersonalInfo}
                                    />

                                    {/* Summary Toggle and Section */}
                                    <>
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    id="showSummary"
                                                    checked={showSummary}
                                                    onChange={(e) => {
                                                        console.log(
                                                            "Summary checkbox manually changed to:",
                                                            e.target.checked
                                                        );
                                                        setShowSummary(
                                                            e.target.checked
                                                        );
                                                    }}
                                                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                                                />
                                                <label
                                                    htmlFor="showSummary"
                                                    className="text-sm font-medium text-gray-700"
                                                >
                                                    Include Summary section
                                                </label>
                                            </div>

                                            {showSummary && (
                                                <Summary
                                                    data={resumeData.summary}
                                                    onChange={updateSummary}
                                                />
                                            )}
                                        </div>
                                    </>

                                    {/* Work Experience Section */}
                                    <>
                                        <WorkExperience
                                            data={resumeData.workExperience}
                                            onChange={updateWorkExperience}
                                        />
                                    </>

                                    {/* Projects Toggle and Section */}
                                    <>
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    id="showProjects"
                                                    checked={showProjects}
                                                    onChange={(e) =>
                                                        setShowProjects(
                                                            e.target.checked
                                                        )
                                                    }
                                                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                                                    disabled={
                                                        !isProjectsEditable
                                                    }
                                                />
                                                <label
                                                    htmlFor="showProjects"
                                                    className="text-sm font-medium text-gray-700"
                                                >
                                                    Include Projects section
                                                </label>
                                            </div>

                                            {showProjects && (
                                                <Projects
                                                    data={resumeData.projects}
                                                    onChange={updateProjects}
                                                />
                                            )}
                                        </div>

                                        {/* Leadership & Volunteering Toggle and Section */}

                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    id="showLeadership"
                                                    checked={showLeadership}
                                                    onChange={(e) =>
                                                        setShowLeadership(
                                                            e.target.checked
                                                        )
                                                    }
                                                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                                                    disabled={
                                                        !isLeadershipEditable
                                                    }
                                                />
                                                <label
                                                    htmlFor="showLeadership"
                                                    className="text-sm font-medium text-gray-700"
                                                >
                                                    Include Leadership &
                                                    Volunteering section
                                                </label>
                                            </div>

                                            {showLeadership && (
                                                <Leadership
                                                    data={resumeData.leadership}
                                                    onChange={updateLeadership}
                                                />
                                            )}
                                        </div>
                                    </>

                                    {/* Skills Section */}
                                    <>
                                        <Skills
                                            data={resumeData.skills}
                                            onChange={updateSkills}
                                        />
                                    </>

                                    {/* Education Section */}
                                    <>
                                        <Education
                                            data={resumeData.education}
                                            onChange={updateEducation}
                                        />
                                    </>
                                    <>
                                        {versionV == 2 ? (
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="checkbox"
                                                        id="showPublications"
                                                        checked={
                                                            showPublications
                                                        }
                                                        onChange={(e) =>
                                                            setShowPublications(
                                                                e.target.checked
                                                            )
                                                        }
                                                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                                                    />
                                                    <label
                                                        htmlFor="showPublications"
                                                        className="text-sm font-medium text-gray-700"
                                                    >
                                                        Include Publications
                                                        section
                                                    </label>
                                                </div>

                                                {showPublications && (
                                                    <Publications
                                                        data={
                                                            resumeData.publications
                                                        }
                                                        onChange={
                                                            updatePublications
                                                        }
                                                    />
                                                )}
                                            </div>
                                        ) : null}
                                    </>

                                    {/* Save Button - Also lock this */}

                                    <button
                                        onClick={handleSave}
                                        className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-md transition-colors font-medium ${
                                            isSaved
                                                ? "bg-green-600 text-white"
                                                : "bg-blue-600 text-white hover:bg-blue-700"
                                        }`}
                                    >
                                        {isSaved ? (
                                            <Check size={18} />
                                        ) : (
                                            <Save size={18} />
                                        )}
                                        {isSaved ? "Saved!" : "Save Resume"}
                                    </button>
                                    {!isSaved && (
                                        <p className="text-xs text-gray-500 text-center">
                                            Save your progress to keep data
                                            after refresh
                                        </p>
                                    )}

                                    {/* Admin-only Unlock Key Editor (moved below Save, above Start Over) */}
                                    <AccessKeyEditor />

                                    {/* Start Over Button */}
                                    <button
                                        onClick={handleStartOver}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium mt-2"
                                    >
                                        <RotateCcw size={18} />
                                        Start Over
                                    </button>
                                    <p className="text-xs text-gray-500 mt-2 text-center">
                                        This will clear all your data and start
                                        fresh
                                    </p>
                                    <div className="flex gap-4">
                                        <button
                                            onClick={handleV1Resume}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium mt-2"
                                        >
                                            <LucideSaveAll size={18} />
                                            Save to V1 Resume
                                        </button>
                                        <button
                                            onClick={handleV2Resume}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium mt-2"
                                        >
                                            <LucideSaveAll size={18} />
                                            Save to Medical Resume
                                        </button>
                                    </div>

                                    <p>
                                        saves a new resume of this resume to V1
                                        resume template
                                    </p>
                                </LockedSection>

                                {/* Job Description Input - This stays UNLOCKED */}
                                <div className="space-y-4 border-t border-gray-200 pt-6">
                                    <h3 className="text-lg font-semibold text-gray-800">
                                        AI Resume Optimization
                                    </h3>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Job Description
                                        </label>
                                        <textarea
                                            value={jobDescription}
                                            onChange={(e) =>
                                                setJobDescription(
                                                    e.target.value
                                                )
                                            }
                                            rows={6}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                            placeholder="Paste the job description here to optimize your resume for this specific role..."
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            AI will analyze this job description
                                            and optimize your resume content to
                                            better match the requirements.
                                        </p>
                                    </div>

                                    {/* Optimize with AI Button - Also stays UNLOCKED */}
                                    <button
                                        onClick={() => setShowOptimizeConfirmation(true)}
                                        disabled={
                                            isOptimizing ||
                                            !jobDescription.trim()
                                        }
                                        className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-md transition-colors font-medium ${
                                            isOptimizing ||
                                            !jobDescription.trim()
                                                ? "bg-gray-400 text-white cursor-not-allowed"
                                                : "bg-purple-600 text-white hover:bg-purple-700"
                                        }`}
                                    >
                                        {isOptimizing ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white">
                                                    {" "}
                                                </div>
                                                Optimizing...
                                            </>
                                        ) : (
                                            <>
                                                <svg
                                                    className="w-4 h-4"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M13 10V3L4 14h7v7l9-11h-7z"
                                                    />
                                                </svg>
                                                Optimize 
                                            </>
                                        )}
                                    </button>
                                    {!jobDescription.trim() && (
                                        <p className="text-xs text-gray-500 text-center">
                                            Enter a job description to enable AI
                                            optimization
                                        </p>
                                    )}
                                    
                                    {/* Job Details Display */}
                                    {jobTitle && companyName && (
                                        <div className="mt-4 p-3 bg-gray-50 rounded-md text-center">
                                            <p className="text-sm text-gray-700 mb-2 font-bold">
                                                Optimizing for {resumeData.personalInfo?.name || "Unknown"}
                                            </p>
                                            <p className="text-sm text-gray-600 mb-1 font-bold">at</p>
                                            <p className="text-sm text-gray-700 font-bold">
                                                <span className="font-medium">Role:</span> {jobTitle}
                                            </p>
                                            <p className="text-sm text-gray-700 font-bold">
                                                <span className="font-medium">Company:</span> {companyName}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right Side - Live Preview */}
                            <div className="lg:sticky lg:top-6 h-fit no-print">
                                <div className="bg-white rounded-lg shadow-sm p-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-lg font-semibold text-gray-800">
                                            {userRole === "admin"
                                                ? "Resume Preview (Admin View)"
                                                : "Live Resume Preview"}
                                        </h2>
                                        {versionV === 2 && (
                                            <button
                                                onClick={handlePrint}
                                                // style={{ display: "none" }}
                                                className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 transition-colors text-sm"
                                            >
                                                Print Resume
                                            </button>
                                        )}
                                    </div>
                                    {versionV === 0 ? (
                                        <ResumePreview
                                            data={resumeData}
                                            showLeadership={showLeadership}
                                            showProjects={showProjects}
                                            showSummary={showSummary}
                                            // showPublications={showPublications}
                                            showChanges={userRole !== "admin"}
                                            changedFields={
                                                userRole === "admin"
                                                    ? new Set()
                                                    : changedFields
                                            }
                                            showPrintButtons={isOptimizeRoute}
                                        />
                                    ) : null}

                                    {versionV === 1 ? (
                                        <ResumePreview1
                                            data={resumeData}
                                            showLeadership={showLeadership}
                                            showProjects={showProjects}
                                            showSummary={showSummary}
                                            showChanges={userRole !== "admin"}
                                            changedFields={
                                                userRole === "admin"
                                                    ? new Set()
                                                    : changedFields
                                            }
                                            showPrintButtons={isOptimizeRoute}
                                        />
                                    ) : null}

                                    {versionV === 2 ? (
                                        <ResumePreviewMedical
                                            data={resumeData}
                                            showLeadership={showLeadership}
                                            showProjects={showProjects}
                                            showSummary={showSummary}
                                            showPublications={showPublications}
                                            showChanges={userRole !== "admin"}
                                            changedFields={
                                                userRole === "admin"
                                                    ? new Set()
                                                    : changedFields
                                            }
                                        />
                                    ) : null}
                                    {/* <ResumePreview
                                        data={resumeData}
                                        showLeadership={showLeadership}
                                        showProjects={showProjects}
                                        showSummary={showSummary}
                                        showChanges={userRole !== "admin"}
                                        changedFields={
                                            userRole === "admin"
                                                ? new Set()
                                                : changedFields
                                        }
                                    /> */}
                                </div>
                            </div>
                        </div>
                    ) : currentResumeView === "optimized" ? (
                        /* Optimized Resume Editor View */
                        <div className="space-y-6">
                            {showChanges ? (
                                /* Show detailed comparison */
                                <ChangesComparison
                                    originalData={resumeData}
                                    optimizedData={optimizedData!}
                                    changedFields={getOptimizationChanges(
                                        resumeData,
                                        optimizedData!
                                    )}
                                />
                            ) : (
                                /* Show normal optimized resume editor */
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Left Side - Edit Optimized Sections */}
                                    <div className="space-y-6 bg-white rounded-lg shadow-sm p-6 h-fit max-h-[800px] overflow-y-auto no-print">
                                        <div className="border-b border-gray-200 pb-4 mb-6">
                                            <h2 className="text-xl font-semibold text-gray-800">
                                                Edit Optimized Resume
                                            </h2>
                                            <p className="text-gray-600 mt-1">
                                                Make adjustments to your AI -
                                                optimized content
                                            </p>
                                        </div>
                                        {/* todo : do it now : hide it */}
                                        {optimizedData && (
                                            <>
                                                <LockedSection
                                                    isLocked={
                                                        !isEditingUnlocked
                                                    }
                                                    sectionName="Editable session "
                                                >
                                                    <PersonalInfo
                                                        data={
                                                            optimizedData.personalInfo
                                                        }
                                                        onChange={
                                                            updateOptimizedPersonalInfo
                                                        }
                                                    />
                                                    <Summary
                                                        data={
                                                            optimizedData.summary
                                                        }
                                                        onChange={
                                                            updateOptimizedSummary
                                                        }
                                                    />
                                                    <WorkExperience
                                                        data={
                                                            optimizedData.workExperience
                                                        }
                                                        onChange={
                                                            updateOptimizedWorkExperience
                                                        }
                                                    />

                                                    {/* Projects Toggle */}
                                                    <div className="space-y-4">
                                                        <div className="flex items-center gap-3">
                                                            <input
                                                                type="checkbox"
                                                                id="showOptimizedProjects"
                                                                checked={
                                                                    showProjects
                                                                }
                                                                onChange={(e) =>
                                                                    setShowProjects(
                                                                        e.target
                                                                            .checked
                                                                    )
                                                                }
                                                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                                                            />
                                                            <label
                                                                htmlFor="showOptimizedProjects"
                                                                className="text-sm font-medium text-gray-700"
                                                            >
                                                                Include Projects
                                                                section
                                                            </label>
                                                        </div>

                                                        {showProjects && (
                                                            <Projects
                                                                data={
                                                                    optimizedData.projects
                                                                }
                                                                onChange={
                                                                    updateOptimizedProjects
                                                                }
                                                            />
                                                        )}
                                                    </div>

                                                    {/* Leadership & Volunteering Toggle */}
                                                    <div className="space-y-4">
                                                        <div className="flex items-center gap-3">
                                                            <input
                                                                type="checkbox"
                                                                id="showOptimizedLeadership"
                                                                checked={
                                                                    showLeadership
                                                                }
                                                                onChange={(e) =>
                                                                    setShowLeadership(
                                                                        e.target
                                                                            .checked
                                                                    )
                                                                }
                                                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                                                            />
                                                            <label
                                                                htmlFor="showOptimizedLeadership"
                                                                className="text-sm font-medium text-gray-700"
                                                            >
                                                                Include
                                                                Leadership &
                                                                Volunteering
                                                                section
                                                            </label>
                                                        </div>

                                                        {showLeadership && (
                                                            <Leadership
                                                                data={
                                                                    optimizedData.leadership
                                                                }
                                                                onChange={
                                                                    updateOptimizedLeadership
                                                                }
                                                            />
                                                        )}
                                                    </div>

                                                    <Skills
                                                        data={
                                                            optimizedData.skills
                                                        }
                                                        onChange={
                                                            updateOptimizedSkills
                                                        }
                                                    />
                                                    <Education
                                                        data={
                                                            optimizedData.education
                                                        }
                                                        onChange={
                                                            updateOptimizedEducation
                                                        }
                                                    />
                                                    <div className="space-y-4">
                                                        <div className="flex items-center gap-3">
                                                            <input
                                                                type="checkbox"
                                                                id="showOptimizedPublications"
                                                                checked={
                                                                    showPublications
                                                                }
                                                                onChange={(e) =>
                                                                    setShowPublications(
                                                                        e.target
                                                                            .checked
                                                                    )
                                                                }
                                                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                                                            />
                                                            <label
                                                                htmlFor="showOptimizedPublications"
                                                                className="text-sm font-medium text-gray-700"
                                                            >
                                                                Include
                                                                Publications
                                                                section
                                                            </label>
                                                        </div>

                                                        {showPublications && (
                                                            <Publications
                                                                data={
                                                                    optimizedData.publications
                                                                }
                                                                onChange={
                                                                    updateOptimizedPublications
                                                                }
                                                            />
                                                        )}
                                                    </div>

                                                    {/* Save Optimized Button */}
                                                    <button
                                                        onClick={() => {
                                                            // Save optimized data to localStorage with a different key
                                                            localStorage.setItem(
                                                                "optimizedResumeData",
                                                                JSON.stringify(
                                                                    optimizedData
                                                                )
                                                            );
                                                            alert(
                                                                "Optimized resume saved!"
                                                            );
                                                        }}
                                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
                                                    >
                                                        <Save size={18} />
                                                        Save Optimized Resume
                                                    </button>
                                                </LockedSection>
                                                {/* Print Optimized Resume */}
                                                <button
                                                    onClick={handlePrint}
                                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 text-white rounded-md hover:bg-gray-900 transition-colors font-medium"
                                                >
                                                    Print Optimized Resume
                                                </button>
                                            </>
                                        )}
                                    </div>

                                    {/* Right Side - Live Preview */}
                                    <div className="lg:sticky lg:top-6 h-fit no-print">
                                        <div className="bg-white rounded-lg shadow-sm p-4">
                                            <div className="flex items-center justify-between mb-4">
                                                <h2 className="text-lg font-semibold text-gray-800">
                                                    Optimized Resume Preview
                                                </h2>
                                                {versionV === 2 && (
                                                    <button
                                                        onClick={handlePrint}
                                                        // style={{ display: "none" }}
                                                        className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 transition-colors text-sm"
                                                    >
                                                        Print Resume
                                                    </button>
                                                )}
                                            </div>
                                            {optimizedData && (
                                                <>
                                                    {versionV === 0 && (
                                                        <ResumePreview
                                                            data={optimizedData}
                                                            showLeadership={
                                                                showLeadership
                                                            }
                                                            showProjects={
                                                                showProjects
                                                            }
                                                            showSummary={
                                                                showSummary
                                                            }
                                                            showPublications={
                                                                showPublications
                                                            }
                                                            showChanges={false}
                                                            changedFields={
                                                                new Set()
                                                            }
                                                            showPrintButtons={isOptimizeRoute}
                                                        />
                                                    )}

                                                    {versionV === 1 && (
                                                        <ResumePreview1
                                                            data={optimizedData}
                                                            showLeadership={
                                                                showLeadership
                                                            }
                                                            showProjects={
                                                                showProjects
                                                            }
                                                            showSummary={
                                                                showSummary
                                                            }
                                                            showChanges={false}
                                                            changedFields={
                                                                new Set()
                                                            }
                                                            showPrintButtons={isOptimizeRoute}
                                                        />
                                                    )}

                                                    {versionV === 2 && (
                                                        <ResumePreviewMedical
                                                            data={optimizedData}
                                                            showLeadership={
                                                                showLeadership
                                                            }
                                                            showProjects={
                                                                showProjects
                                                            }
                                                            showSummary={
                                                                showSummary
                                                            }
                                                            showPublications={
                                                                showPublications
                                                            }
                                                            showChanges={false}
                                                            changedFields={
                                                                new Set()
                                                            }
                                                        />
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Changes Made View */
                        <div className="space-y-6">
                            <div className="bg-white rounded-lg shadow-sm p-6 no-print">
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-800">
                                        Changes Made
                                    </h2>
                                    <p className="text-gray-600 mt-1">
                                        Review all changes made by AI
                                        optimization
                                    </p>
                                </div>
                            </div>

                            <div className="bg-white rounded-lg shadow-sm p-6">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Original Resume */}
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
                                            Original Base Resume
                                        </h3>
                                        {/* <ResumePreview
                                            data={baseResume}
                                            showLeadership={showLeadership}
                                            showProjects={showProjects}
                                            showSummary={showSummary}
                                            showPublications={showPublications}
                                            showChanges={false}
                                            changedFields={new Set()}
                                        /> */}
                                        {versionV == 0 ? (
                                            <ResumePreview
                                                data={resumeData}
                                                showLeadership={showLeadership}
                                                showProjects={showProjects}
                                                showSummary={showSummary}
                                                // showPublications={
                                                //     showPublications
                                                // }
                                                showChanges={false}
                                                changedFields={new Set()}
                                            />
                                        ) : null}
                                        {versionV == 1 ? (
                                            <ResumePreview1
                                                data={resumeData}
                                                showLeadership={showLeadership}
                                                showProjects={showProjects}
                                                showChanges={false}
                                                changedFields={new Set()}
                                            />
                                        ) : null}
                                        {versionV == 2 ? (
                                            <ResumePreviewMedical
                                                data={resumeData}
                                                showLeadership={showLeadership}
                                                showProjects={showProjects}
                                                showChanges={false}
                                                changedFields={new Set()}
                                            />
                                        ) : null}
                                    </div>

                                    {/* Current Resume */}
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
                                            Current Resume
                                        </h3>
                                        {versionV == 0 ? (
                                            <ResumePreview
                                                data={resumeData}
                                                showLeadership={showLeadership}
                                                showProjects={showProjects}
                                                showSummary={showSummary}
                                                // showPublications={
                                                //     showPublications
                                                // }
                                                showChanges={true}
                                                changedFields={changedFields}
                                            />
                                        ) : null}
                                        {versionV == 1 ? (
                                            <ResumePreview1
                                                data={resumeData}
                                                showLeadership={showLeadership}
                                                showProjects={showProjects}
                                                showChanges={false}
                                                changedFields={changedFields}
                                            />
                                        ) : null}
                                        {versionV == 2 ? (
                                            <ResumePreviewMedical
                                                data={resumeData}
                                                showLeadership={showLeadership}
                                                showProjects={showProjects}
                                                showChanges={false}
                                                changedFields={changedFields}
                                            />
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Print-only resume content - only visible when printing */}
                {/* <div className="hidden print:block">
                    {currentResumeView === "optimized" && optimizedData ? (
                        <ResumePreview
                            data={optimizedData}
                            showLeadership={showLeadership}
                            showProjects={showProjects}
                            showSummary={showSummary}
                            showChanges={false}
                            changedFields={new Set()}
                        />
                    ) : (
                        <ResumePreview
                            data={resumeData}
                            showLeadership={showLeadership}
                            showProjects={showProjects}
                            showSummary={showSummary}
                            showChanges={false}
                            changedFields={new Set()}
                        />
                    )}
                </div> */}
                <div className="hidden print:block">
                    {currentResumeView === "optimized" && optimizedData ? (
                        <>
                            {versionV === 0 ? (
                                <ResumePreview
                                    data={optimizedData}
                                    showLeadership={showLeadership}
                                    showProjects={showProjects}
                                    showSummary={showSummary}
                                    // showPublications={showPublications}
                                    showChanges={false}
                                    changedFields={new Set()}
                                />
                            ) : null}

                            {versionV === 1 ? (
                                <ResumePreview1
                                    data={optimizedData}
                                    showLeadership={showLeadership}
                                    showProjects={showProjects}
                                    showSummary={showSummary}
                                    showChanges={false}
                                    changedFields={new Set()}
                                />
                            ) : null}

                            {versionV === 2 ? (
                                <ResumePreviewMedical
                                    data={optimizedData}
                                    showLeadership={showLeadership}
                                    showProjects={showProjects}
                                    showSummary={showSummary}
                                    showPublications={showPublications}
                                    showChanges={false}
                                    changedFields={new Set()}
                                />
                            ) : null}
                        </>
                    ) : (
                        <>
                            {versionV === 0 ? (
                                <ResumePreview
                                    data={resumeData}
                                    showLeadership={showLeadership}
                                    showProjects={showProjects}
                                    showSummary={showSummary}
                                    // showPublications={showPublications}
                                    showChanges={false}
                                    changedFields={new Set()}
                                />
                            ) : null}

                            {versionV === 1 ? (
                                <ResumePreview1
                                    data={resumeData}
                                    showLeadership={showLeadership}
                                    showProjects={showProjects}
                                    showSummary={showSummary}
                                    showChanges={false}
                                    changedFields={new Set()}
                                />
                            ) : null}

                            {versionV === 2 ? (
                                <ResumePreviewMedical
                                    data={resumeData}
                                    showLeadership={showLeadership}
                                    showProjects={showProjects}
                                    showSummary={showSummary}
                                    showPublications={showPublications}
                                    showChanges={false}
                                    changedFields={new Set()}
                                />
                            ) : null}
                        </>
                    )}
                </div>
            </div>
            
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
                                        {resumeData.personalInfo?.name || "Unknown"}
                                    </span>
                                    <p className="text-xl text-gray-700 mb-2">at</p>
                                    <div className="flex flex-wrap justify-center items-center gap-6">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl text-gray-700">Role:</span>
                                            <span className="text-2xl font-bold text-blue-700">
                                                {jobTitle || "Role not specified"}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl text-gray-700">Company:</span>
                                            <span className="text-2xl font-bold text-blue-700">
                                                {companyName || "Company not specified"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <p className="text-sm text-gray-500 text-center mt-4">
                                Please verify the name, role, and company name are correct before proceeding
                            </p>
                        </div>
                        <div className="flex gap-4">
                            <button
                                onClick={() => {
                                    setShowOptimizeConfirmation(false);
                                    handleOptimizeWithAI();
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
        </>
    );
}

export default App;
