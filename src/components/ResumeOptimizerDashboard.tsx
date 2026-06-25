import { useState, useEffect, useContext } from "react";
import { PersonalInfo } from "./AiOprimizer/components/PersonalInfo";
import { Summary } from "./AiOprimizer/components/Summary";
import { WorkExperience } from "./AiOprimizer/components/WorkExperience";
import { Projects } from "./AiOprimizer/components/Projects";
import { Leadership } from "./AiOprimizer/components/Leadership";
import { Skills } from "./AiOprimizer/components/Skills";
import { Education } from "./AiOprimizer/components/Education";
import { Publications } from "./AiOprimizer/components/Publications";
import { ResumePreview } from "./AiOprimizer/components/ResumePreview";
// import { ResumePreview1 } from "./AiOprimizer/components/ResumePreview1";
import { ResumePreviewMedical } from "./AiOprimizer/components/ResumePreviewMedical";
import { DraggableSections } from "./AiOprimizer/components/DraggableSections";
import { Save, Check } from "lucide-react";
import { useResumeStore } from "./AiOprimizer/store/useResumeStore";
import { useResumeUnlockStore } from "./AiOprimizer/store/resumeStore";
import { initialData } from "./AiOprimizer/data/initialData";
import { useJobsSessionStore } from "../state_management/JobsSessionStore";
import ResumeSelectorModal from "./AiOprimizer/components/ResumeSelectorModal";
import LockedSection from "./AiOprimizer/components/LockedSection";
import { PreviewStore } from "./AiOprimizer/store/PreviewStore";
import { Job } from "../types";
import { Calendar } from "lucide-react";
import { getTimeAgo } from "../utils/getTimeAgo";
import { UserContext } from "../state_management/UserContext";
import AssignResumeModal from "./Admin/AssignResumeModal";
import { buildResumeOptimizationInstructionPrompt } from "../utils/resumeOptimizationPrompt";

type ResumeDataType = typeof initialData;

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

export default function ResumeOptimizerDashboard() {
    const { getJobsByStatus } = useJobsSessionStore();
    const { versionV, setVersion } = PreviewStore();
    const { updateJob, refreshJobByMongoId } = useJobsSessionStore();
    const ctx = useContext(UserContext);
    const email = ctx?.userDetails?.email;
    
    // Check admin status multiple ways
    const userType = ctx?.userDetails?.userType;
    const userRole = localStorage.getItem('role');
    const isAdmin = 
        userType === "Admin" || 
        userType === "Operations" || 
        userType === "admin" ||
        userType === "operations" ||
        userRole === "admin" ||
        userRole === "Admin" ||
        userRole === "operations" ||
        userRole === "Operations";
    
    // Debug log
    useEffect(() => {
        console.log("Admin check:", { userType, userRole, isAdmin, userDetails: ctx?.userDetails });
    }, [userType, userRole, isAdmin, ctx?.userDetails]);

    const {
        resumeData,
        setResumeData,
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
        sectionOrder,
        setSectionOrder,
        showPublications,
        setShowPublications,
        setLastSelectedResume,
    } = useResumeStore();

    const {
        isPersonalInfoEditable,
        isEditingUnlocked,
        lockAllSections,
        checkAdminAndUnlock,
        setResumeId,
    } = useResumeUnlockStore();

    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [showAssignResumeModal, setShowAssignResumeModal] = useState(false);
    const [companyName, setCompanyName] = useState<string>("");
    const [jobTitle, setJobTitle] = useState<string>("");
    const [showOptimizeConfirmation, setShowOptimizeConfirmation] = useState(false);
    const [jobSearchTerm, setJobSearchTerm] = useState<string>("");

    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8086";
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";


    const savedJobs = getJobsByStatus("saved");
    
    const filteredSavedJobs = savedJobs.filter((job) => {
        if (!jobSearchTerm.trim()) return true;
        const searchLower = jobSearchTerm.toLowerCase();
        return (
            job.jobTitle?.toLowerCase().includes(searchLower) ||
            job.companyName?.toLowerCase().includes(searchLower) ||
            job.jobDescription?.toLowerCase().includes(searchLower) ||
            job.joblink?.toLowerCase().includes(searchLower)
        );
    });

    // Load user's assigned resume by email
    const loadUserResume = async () => {
        if (!email) {
            console.log("No email available to load resume");
            return;
        }
        
        try {
            console.log("🔄 Loading user resume for email:", email);
            const response = await fetch(`${apiUrl}/api/resume-by-email`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            if (response.ok) {
                const resumeData = await response.json();
                if (resumeData && resumeData.personalInfo) {
                    console.log("✅ Resume data received:", resumeData);
                    setResumeData(resumeData);
                    setBaseResume(resumeData);
                    checkLoadedResumeData(resumeData);
                    if (resumeData.resumeId) {
                        setResumeId(resumeData.resumeId);
                        setLastSelectedResume(resumeData, resumeData.resumeId);
                    }
                    if (resumeData.V !== undefined) {
                        setVersion(resumeData.V);
                    }
                    lockAllSections();
                    checkAdminAndUnlock();
                    console.log("✅ Loaded user's assigned resume successfully");
                }
            } else if (response.status === 404) {
                console.log("ℹ️ No resume assigned to this user");
            } else {
                console.error("❌ Failed to load resume:", response.status, response.statusText);
            }
        } catch (error) {
            console.error("❌ Error loading user resume:", error);
        }
    };

    // Load resume when component mounts or email changes
    useEffect(() => {
        // Always try to load user's assigned resume when component mounts
        // This ensures it loads every time the Resume Optimizer tab is clicked
        if (email) {
            console.log("🔄 Component mounted/email changed, loading user's assigned resume");
            loadUserResume();
        }
    }, [email]); // Re-run when email changes or component mounts

    // Auto-unlock sections for operations users
    useEffect(() => {
        checkAdminAndUnlock();
    }, [checkAdminAndUnlock]);

    // Fetch job description when a job is selected
    useEffect(() => {
        if (selectedJob?.jobID) {
            fetchJobDescription(selectedJob.jobID);
        }
    }, [selectedJob]);

    const fetchJobDescription = async (jobId: string) => {
        try {
            console.log("🔄 Fetching job description for jobId:", jobId);
            const response = await fetch(`${apiBaseUrl}/getJobDescription/${jobId}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log("✅ Job description fetched successfully");

            if (data.jobDescription) {
                setJobDescription(data.jobDescription);
            }
            if (data.companyName) {
                setCompanyName(data.companyName);
            }
            if (data.jobTitle) {
                setJobTitle(data.jobTitle);
            }
        } catch (error) {
            console.error("❌ Error fetching job description:", error);
        }
    };

    const handleJobClick = (job: Job) => {
        setSelectedJob(job);
        setCurrentResumeView("editor");
    };

    const trackChanges = (field: string) => {
        const currentFields =
            changedFields instanceof Set ? changedFields : new Set<string>();
        setChangedFields(new Set([...currentFields, field]));
    };

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

    const updatePublications = (data: PublicationItem[]) => {
        setResumeData({ ...resumeData, publications: data });
        trackChanges("publications");
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

    const handleSave = async () => {
        try {
            setIsSaved(true);
            const { name } = resumeData.personalInfo;
            const safeName = name
                ? name.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "")
                : "user";
            const filename = `${safeName}_resume.pdf`;
            const saveData = {
                filename,
                data: resumeData,
                checkboxStates: {
                    showSummary,
                    showProjects,
                    showLeadership,
                    showPublications: showPublications,
                },
                sectionOrder: sectionOrder,
                createdBy: "operations",
            };

            const response = await fetch(`${apiUrl}/api/save-resume`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(saveData),
            });

            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error || "Failed to save resume");
            }

            setTimeout(() => {
                setIsSaved(false);
            }, 2000);
        } catch (error) {
            console.error("Error saving resume:", error);
            alert("Error saving resume. Please try again.");
        }
    };

    const autoSaveChangesToDashboard = async (originalData: any, optimizedData: any) => {
        try {
            const getChangedFieldsOnly = () => {
                const startingContent: any = {};
                const finalChanges: any = {};

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

                if (originalData.summary !== optimizedData.summary) {
                    startingContent.summary = originalData.summary;
                    finalChanges.summary = optimizedData.summary;
                }

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

                return { startingContent, finalChanges };
            };

            const { startingContent, finalChanges } = getChangedFieldsOnly();

            delete (startingContent as any).projects;
            delete (finalChanges as any).projects;
            delete (startingContent as any).education;
            delete (finalChanges as any).education;
            delete (startingContent as any).publications;
            delete (finalChanges as any).publications;
            delete (startingContent as any).leadership;
            delete (finalChanges as any).leadership;

            if (!showSummary) {
                delete (startingContent as any).summary;
                delete (finalChanges as any).summary;
            }

            console.log("Auto-saving changes for job ID:", selectedJob?.jobID);

            const response = await fetch(`${apiBaseUrl}/saveChangedSession`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    id: selectedJob?.jobID,
                    startingContent: startingContent,
                    finalChanges: finalChanges,
                    optimizedResume: {
                        resumeData: optimizedData,
                        hasResume: true,
                        showSummary: showSummary,
                        showProjects: showProjects,
                        showLeadership: showLeadership,
                        showPublications: showPublications,
                        version: versionV,
                        sectionOrder: sectionOrder
                    }
                }),
            });

            if (response.ok) {
                console.log("Changes auto-saved successfully, now refreshing job data...");
                
                if (selectedJob?.jobID && refreshJobByMongoId) {
                    try {
                        await refreshJobByMongoId(selectedJob.jobID);
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
            const prompt = buildResumeOptimizationInstructionPrompt(jobDescription);

            const filteredResumeForOptimization: typeof resumeData = {
                ...resumeData,
                summary: showSummary ? resumeData.summary : "",
                projects: showProjects ? resumeData.projects : [],
                leadership: showLeadership ? resumeData.leadership : [],
                publications: (resumeData as any).publications ? (resumeData as any).publications : [],
            } as typeof resumeData;

            const response = await fetch(`${apiUrl}/api/optimize-with-gemini`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    resume_data: filteredResumeForOptimization,
                    job_description: prompt + jobDescription,
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const optimizedDataResult = await response.json();

            if (
                optimizedDataResult &&
                (optimizedDataResult.summary || optimizedDataResult.workExperience)
            ) {
                const processSkills = (skills: any) => {
                    if (!skills || !Array.isArray(skills)) return skills;
                    return skills.map((skill: any) => ({
                        ...skill,
                        category: skill.category ? skill.category.split(/\s+/).map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ") : skill.category,
                        skills: skill.skills ? skill.skills.split(",").map((s: string) => {
                            const trimmed = s.trim();
                            if (!trimmed) return trimmed;
                            return trimmed.split(/\s+/).map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
                        }).join(", ") : skill.skills
                    }));
                };

                const newOptimizedData = {
                    ...resumeData,
                    summary: showSummary
                        ? optimizedDataResult.summary || resumeData.summary
                        : resumeData.summary,
                    workExperience:
                        optimizedDataResult.workExperience ||
                        resumeData.workExperience,
                    skills: processSkills(optimizedDataResult.skills || resumeData.skills),
                    education: optimizedDataResult.education || resumeData.education,
                    projects: showProjects
                        ? optimizedDataResult.projects || resumeData.projects
                        : resumeData.projects,
                    leadership: showLeadership
                        ? optimizedDataResult.leadership || resumeData.leadership
                        : resumeData.leadership,
                    publications: (resumeData as any).publications
                        ? (resumeData as any).publications
                        : (resumeData as any).publications,
                } as typeof resumeData;

                setOptimizedData(newOptimizedData);
                setCurrentResumeView("optimized");
                
                if (selectedJob?.jobID) {
                    updateJob(selectedJob.jobID, { 
                        updatedAt: new Date().toISOString()
                    });
                }
                
                const saveSuccess = await autoSaveChangesToDashboard(resumeData, newOptimizedData);
                
                if (saveSuccess) {
                    alert(
                        'AI optimization complete and changes saved to dashboard! Check the "Optimized Resume" tab to see and edit the enhanced content.'
                    );
                } else {
                    alert(
                        'AI optimization failed!. Please try again.'
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

    const handlePrint = () => {
        const currentData =
            currentResumeView === "optimized" && optimizedData
                ? optimizedData
                : resumeData;
        const filename = `${currentData.personalInfo.name || "Resume"}_Resume.pdf`;

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
            const originalTitle = document.title;
            document.title = filename.replace(".pdf", "");
            window.print();
            setTimeout(() => {
                document.title = originalTitle;
            }, 1000);
        }
    };

    const checkLoadedResumeData = (
        resumeData: ResumeDataType & { checkboxStates?: any; sectionOrder?: string[] }
    ) => {
        if (resumeData.checkboxStates) {
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
            setShowPublications(hasValidPublications);
            
            if (resumeData.sectionOrder && Array.isArray(resumeData.sectionOrder)) {
                setSectionOrder(resumeData.sectionOrder);
            }
            return;
        }

        const hasValidSummary =
            resumeData.summary && resumeData.summary.trim() !== "";
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
                        ))
            );

        const hasValidLeadership =
            resumeData.leadership &&
            resumeData.leadership.length > 0 &&
            resumeData.leadership.some(
                (item) =>
                    (item.title && item.title.trim() !== "") ||
                    (item.organization && item.organization.trim() !== "")
            );

        setShowSummary(Boolean(hasValidSummary));
        setShowProjects(Boolean(hasValidProjects));
        setShowLeadership(Boolean(hasValidLeadership));
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="flex h-screen">
                {/* Left Sidebar - Saved Jobs */}
                <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto flex flex-col">
                    <div className="p-4 border-b border-gray-200 flex-shrink-0">
                        <h2 className="text-lg font-semibold text-gray-800">Saved Jobs</h2>
                        <p className="text-sm text-gray-500 mt-1 mb-3">Click a job to load its description</p>
                        
                        {/* Search Input */}
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search jobs..."
                                value={jobSearchTerm}
                                onChange={(e) => setJobSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            />
                            <svg
                                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                />
                            </svg>
                            {jobSearchTerm && (
                                <button
                                    onClick={() => setJobSearchTerm("")}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    title="Clear search"
                                >
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
                                            d="M6 18L18 6M6 6l12 12"
                                        />
                                    </svg>
                                </button>
                            )}
                        </div>
                        
                        {/* Search Results Count */}
                        {jobSearchTerm && (
                            <p className="text-xs text-gray-500 mt-2">
                                {filteredSavedJobs.length} of {savedJobs.length} jobs
                            </p>
                        )}
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {savedJobs.length === 0 ? (
                            <div className="p-4 text-center text-gray-500 text-sm">
                                No saved jobs found
                            </div>
                        ) : filteredSavedJobs.length === 0 ? (
                            <div className="p-4 text-center text-gray-500 text-sm">
                                No jobs found matching "{jobSearchTerm}"
                            </div>
                        ) : (
                            filteredSavedJobs.map((job) => (
                                <div
                                    key={job.jobID}
                                    onClick={() => handleJobClick(job)}
                                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                                        selectedJob?.jobID === job.jobID
                                            ? "bg-blue-50 border-blue-300"
                                            : "bg-white border-gray-200 hover:bg-gray-50"
                                    }`}
                                >
                                    <h3 className="font-semibold text-gray-900 text-sm">
                                        {job.jobTitle}
                                    </h3>
                                    <p className="text-xs text-gray-600 mt-1">
                                        {job.companyName}
                                    </p>
                                    <div className="flex items-center text-xs text-gray-500 mt-2">
                                        <Calendar className="w-3 h-3 mr-1" />
                                        <span>
                                            {getTimeAgo(job?.createdAt || job?.dateAdded || job?.updatedAt)}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto">
                    <header className="bg-white shadow-sm border-b sticky top-0 z-10">
                        <div className="max-w-7xl mx-auto px-4 py-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900">
                                        Resume Optimizer
                                    </h1>
                                    <p className="text-gray-600 mt-1">
                                        Edit sections on the left, see live preview on the right
                                    </p>
                                </div>

                                <div className="flex items-center space-x-4">
                                    {/* Admin: Assign Resume Button - Only visible to admins */}
                                    {isAdmin && (
                                        <button
                                            onClick={() => setShowAssignResumeModal(true)}
                                            className="px-6 py-3 rounded-md text-base font-semibold transition-colors bg-green-600 text-white hover:bg-green-700 shadow-md"
                                            title="Assign resume to a user"
                                        >
                                            Assign Resume
                                        </button>
                                    )}

                                    {/* All Resumes Button - Big button for all resumes */}
                                    <button
                                        onClick={() => {
                                            setVersion(0);
                                            setShowModal(true);
                                        }}
                                        className="px-6 py-3 rounded-md text-base font-semibold transition-colors bg-orange-600 text-white hover:bg-orange-700 shadow-md"
                                    >
                                        All Resumes
                                    </button>

                                    {/* View Toggle */}
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
                                </div>
                            </div>
                        </div>
                    </header>

                    <ResumeSelectorModal
                        open={showModal}
                        onClose={() => {
                            setShowModal(false);
                            setCurrentResumeView("editor");
                        }}
                        onSelect={(
                            resume: ResumeDataType & {
                                checkboxStates?: any;
                                V?: number;
                            }
                        ) => {
                            if (resume.V !== undefined) {
                                setVersion(resume.V);
                            }
                            setResumeData(resume);
                            setBaseResume(resume);
                            checkLoadedResumeData(resume);
                            lockAllSections();
                            checkAdminAndUnlock();
                            setShowModal(false);
                            setCurrentResumeView("editor");
                        }}
                        version={versionV}
                    />

                    {isAdmin && (
                        <AssignResumeModal
                            open={showAssignResumeModal}
                            onClose={() => setShowAssignResumeModal(false)}
                            onAssignSuccess={() => {
                                setShowAssignResumeModal(false);
                                // Optionally reload the user's resume
                                if (email) {
                                    loadUserResume();
                                }
                            }}
                        />
                    )}

                    <div className="max-w-7xl mx-auto px-4 py-6">
                        {currentResumeView === "editor" ? (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Left Side - Edit Sections */}
                                <div className="space-y-6 bg-white rounded-lg shadow-sm p-6 h-fit max-h-[800px] overflow-y-auto">
                                    <LockedSection
                                        isLocked={!isPersonalInfoEditable}
                                        sectionName="Resume is locked"
                                    >
                                        <PersonalInfo
                                            data={resumeData.personalInfo}
                                            onChange={updatePersonalInfo}
                                        />

                                        {(() => {
                                            const definitions = [
                                                {
                                                    id: "summary",
                                                    title: "Summary",
                                                    component: showSummary ? (
                                                        <Summary
                                                            data={resumeData.summary}
                                                            onChange={updateSummary}
                                                        />
                                                    ) : <div className="text-gray-500 italic">Summary section is disabled</div>,
                                                    isEnabled: showSummary,
                                                    onToggle: (enabled: boolean) => setShowSummary(enabled),
                                                    showToggle: true,
                                                },
                                                {
                                                    id: "workExperience",
                                                    title: "Work Experience",
                                                    component: (
                                                        <WorkExperience
                                                            data={resumeData.workExperience}
                                                            onChange={updateWorkExperience}
                                                        />
                                                    ),
                                                    isEnabled: true,
                                                    showToggle: false,
                                                },
                                                {
                                                    id: "projects",
                                                    title: "Projects",
                                                    component: showProjects ? (
                                                        <Projects
                                                            data={resumeData.projects}
                                                            onChange={updateProjects}
                                                        />
                                                    ) : <div className="text-gray-500 italic">Projects section is disabled</div>,
                                                    isEnabled: showProjects,
                                                    onToggle: (enabled: boolean) => setShowProjects(enabled),
                                                    showToggle: true,
                                                },
                                                {
                                                    id: "leadership",
                                                    title: "Leadership & Achievements",
                                                    component: showLeadership ? (
                                                        <Leadership
                                                            data={resumeData.leadership}
                                                            onChange={updateLeadership}
                                                        />
                                                    ) : <div className="text-gray-500 italic">Leadership section is disabled</div>,
                                                    isEnabled: showLeadership,
                                                    onToggle: (enabled: boolean) => setShowLeadership(enabled),
                                                    showToggle: true,
                                                },
                                                {
                                                    id: "skills",
                                                    title: "Skills",
                                                    component: (
                                                        <Skills
                                                            data={resumeData.skills}
                                                            onChange={updateSkills}
                                                        />
                                                    ),
                                                    isEnabled: true,
                                                    showToggle: false,
                                                },
                                                {
                                                    id: "education",
                                                    title: "Education",
                                                    component: (
                                                        <Education
                                                            data={resumeData.education}
                                                            onChange={updateEducation}
                                                        />
                                                    ),
                                                    isEnabled: true,
                                                    showToggle: false,
                                                },
                                                ...(versionV == 2 ? [{
                                                    id: "publications",
                                                    title: "Publications",
                                                    component: (resumeData as any).publications ? (
                                                        <Publications
                                                            data={(resumeData as any).publications}
                                                            onChange={updatePublications}
                                                        />
                                                    ) : <div className="text-gray-500 italic">Publications section is disabled</div>,
                                                    isEnabled: (resumeData as any).publications ? true : false,
                                                    onToggle: (enabled: boolean) => setShowPublications(enabled),
                                                    showToggle: true,
                                                }] : []),
                                            ];
                                            const order = sectionOrder.filter((id) => id !== "personalInfo" && (versionV === 2 || id !== "publications"));
                                            const ordered = order
                                                .map((id) => definitions.find((d) => d.id === id))
                                                .filter(Boolean) as any[];
                                            return (
                                                <DraggableSections
                                                    sections={ordered}
                                                    onSectionOrderChange={setSectionOrder}
                                                />
                                            );
                                        })()}

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
                                    </LockedSection>

                                    {/* Job Description Input */}
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
                                        </div>

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
                                <div className="lg:sticky lg:top-6 h-fit">
                                    <div className="bg-white rounded-lg shadow-sm p-4">
                                        <div className="flex items-center justify-between mb-4">
                                            <h2 className="text-lg font-semibold text-gray-800">
                                                Live Resume Preview
                                            </h2>
                                        </div>
                                        {versionV === 0 ? (
                                            <ResumePreview
                                                data={resumeData}
                                                showLeadership={showLeadership}
                                                showProjects={showProjects}
                                                showSummary={showSummary}
                                                showChanges={false}
                                                changedFields={new Set()}
                                                showPrintButtons={true}
                                                sectionOrder={sectionOrder}
                                            />
                                        ) : null}

                                        {versionV === 1 ? (
                                            <ResumePreview
                                                data={resumeData}
                                                showLeadership={showLeadership}
                                                showProjects={showProjects}
                                                showSummary={showSummary}
                                                showChanges={false}
                                                changedFields={new Set()}
                                                showPrintButtons={true}
                                                sectionOrder={sectionOrder}
                                            />
                                        ) : null}

                                        {versionV === 2 ? (
                                            <ResumePreviewMedical
                                                data={resumeData}
                                                showLeadership={showLeadership}
                                                showProjects={showProjects}
                                                showSummary={showSummary}
                                                showPublications={showPublications}
                                                showPrintButtons={true}
                                                sectionOrder={sectionOrder}
                                            />
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        ) : currentResumeView === "optimized" ? (
                            <div className="space-y-6">
                                {showChanges ? (
                                    <div className="bg-white rounded-lg shadow-sm p-6">
                                        <h2 className="text-xl font-semibold text-gray-800 mb-4">
                                            Changes Comparison
                                        </h2>
                                        <p className="text-gray-600">Comparison view coming soon...</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {/* Left Side - Edit Optimized Sections */}
                                        <div className="space-y-6 bg-white rounded-lg shadow-sm p-6 h-fit max-h-[800px] overflow-y-auto">
                                            <div className="border-b border-gray-200 pb-4 mb-6">
                                                <h2 className="text-xl font-semibold text-gray-800">
                                                    Edit Optimized Resume
                                                </h2>
                                                <p className="text-gray-600 mt-1">
                                                    Make adjustments to your AI-optimized content
                                                </p>
                                            </div>
                                            {optimizedData && (
                                                <>
                                                    <LockedSection
                                                        isLocked={!isEditingUnlocked}
                                                        sectionName="Editable session"
                                                    >
                                                        <PersonalInfo
                                                            data={optimizedData.personalInfo}
                                                            onChange={updateOptimizedPersonalInfo}
                                                        />
                                                        {(() => {
                                                            const definitions = [
                                                                {
                                                                    id: "summary",
                                                                    title: "Summary",
                                                                    component: (
                                                                        <Summary
                                                                            data={optimizedData.summary}
                                                                            onChange={updateOptimizedSummary}
                                                                        />
                                                                    ),
                                                                    isEnabled: true,
                                                                    showToggle: false,
                                                                },
                                                                {
                                                                    id: "workExperience",
                                                                    title: "Work Experience",
                                                                    component: (
                                                                        <WorkExperience
                                                                            data={optimizedData.workExperience}
                                                                            onChange={updateOptimizedWorkExperience}
                                                                        />
                                                                    ),
                                                                    isEnabled: true,
                                                                    showToggle: false,
                                                                },
                                                                {
                                                                    id: "projects",
                                                                    title: "Projects",
                                                                    component: showProjects ? (
                                                                        <Projects
                                                                            data={optimizedData.projects}
                                                                            onChange={updateOptimizedProjects}
                                                                        />
                                                                    ) : <div className="text-gray-500 italic">Projects section is disabled</div>,
                                                                    isEnabled: showProjects,
                                                                    onToggle: (enabled: boolean) => setShowProjects(enabled),
                                                                    showToggle: true,
                                                                },
                                                                {
                                                                    id: "leadership",
                                                                    title: "Leadership & Volunteering",
                                                                    component: showLeadership ? (
                                                                        <Leadership
                                                                            data={optimizedData.leadership}
                                                                            onChange={updateOptimizedLeadership}
                                                                        />
                                                                    ) : <div className="text-gray-500 italic">Leadership section is disabled</div>,
                                                                    isEnabled: showLeadership,
                                                                    onToggle: (enabled: boolean) => setShowLeadership(enabled),
                                                                    showToggle: true,
                                                                },
                                                                {
                                                                    id: "skills",
                                                                    title: "Skills",
                                                                    component: (
                                                                        <Skills
                                                                            data={optimizedData.skills}
                                                                            onChange={updateOptimizedSkills}
                                                                        />
                                                                    ),
                                                                    isEnabled: true,
                                                                    showToggle: false,
                                                                },
                                                                {
                                                                    id: "education",
                                                                    title: "Education",
                                                                    component: (
                                                                        <Education
                                                                            data={optimizedData.education}
                                                                            onChange={updateOptimizedEducation}
                                                                        />
                                                                    ),
                                                                    isEnabled: true,
                                                                    showToggle: false,
                                                                },
                                                                ...(versionV == 2 ? [{
                                                                    id: "publications",
                                                                    title: "Publications",
                                                                    component: (optimizedData as any).publications ? (
                                                                        <Publications
                                                                            data={(optimizedData as any).publications}
                                                                            onChange={updateOptimizedPublications}
                                                                        />
                                                                    ) : <div className="text-gray-500 italic">Publications section is disabled</div>,
                                                                    isEnabled: (optimizedData as any).publications ? true : false,
                                                                    onToggle: (enabled: boolean) => setShowPublications(enabled),
                                                                    showToggle: true,
                                                                }] : []),
                                                            ];
                                                            const order = sectionOrder.filter((id) => id !== "personalInfo" && (versionV === 2 || id !== "publications"));
                                                            const ordered = order
                                                                .map((id) => definitions.find((d) => d.id === id))
                                                                .filter(Boolean) as any[];
                                                            return (
                                                                <DraggableSections
                                                                    sections={ordered}
                                                                    onSectionOrderChange={setSectionOrder}
                                                                />
                                                            );
                                                        })()}
                                                    </LockedSection>
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
                                        <div className="lg:sticky lg:top-6 h-fit">
                                            <div className="bg-white rounded-lg shadow-sm p-4">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h2 className="text-lg font-semibold text-gray-800">
                                                        Optimized Resume Preview
                                                    </h2>
                                                </div>
                                                {optimizedData && (
                                                    <>
                                                        {versionV === 0 && (
                                                            <ResumePreview
                                                                data={optimizedData}
                                                                showLeadership={showLeadership}
                                                                showProjects={showProjects}
                                                                showSummary={showSummary}
                                                                showPublications={showPublications}
                                                                showChanges={false}
                                                                changedFields={new Set()}
                                                                showPrintButtons={true}
                                                                sectionOrder={sectionOrder}
                                                            />
                                                        )}

                                                        {versionV === 1 && (
                                                            <ResumePreview
                                                                data={optimizedData}
                                                                showLeadership={showLeadership}
                                                                showProjects={showProjects}
                                                                showSummary={showSummary}
                                                                showChanges={false}
                                                                changedFields={new Set()}
                                                                showPrintButtons={true}
                                                                sectionOrder={sectionOrder}
                                                            />
                                                        )}

                                                        {versionV === 2 && (
                                                            <ResumePreviewMedical
                                                                data={optimizedData}
                                                                showLeadership={showLeadership}
                                                                showProjects={showProjects}
                                                                showSummary={showSummary}
                                                                showPublications={showPublications}
                                                                showPrintButtons={true}
                                                                sectionOrder={sectionOrder}
                                                            />
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : null}
                    </div>
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
        </div>
    );
}

