
import React, { useState, useEffect, useContext, Suspense, lazy, useRef } from "react";
import { Search, Plus, MessageSquare, Loader2, Clock, Filter, Home, Briefcase, FileText, Gift, ChevronDown, Menu, X } from "lucide-react";
import ReferAndEarnCard from "./ReferAndEarnCard.tsx";
import { Job, JobStatus } from "../types/index.ts";
const JobForm = lazy(() => import("./JobForm.tsx"));
const JobCard = lazy(() => import("./JobCard.tsx"));
import { UserContext } from "../state_management/UserContext.tsx";
import { useUserJobs } from "../state_management/UserJobs.tsx";
import LoadingScreen from "./LoadingScreen.tsx";
import { useOperationsStore } from "../state_management/Operations.ts";
import { toastUtils, toastMessages } from "../utils/toast.ts";
import { useJobsSessionStore } from "../state_management/JobsSessionStore.ts";
import { isUserOriginatedJob } from "../utils/jobOrigin.ts";
import { parseAddedTimestamp } from "../utils/getTimeAgo.ts";
import { useUserProfile } from "../state_management/ProfileContext.tsx";
import NotifyClientPasswordModal from "./NotifyClientPasswordModal.tsx";
const JobModal = lazy(() => import("./JobModal.tsx"));
const RemovalLimitModal = lazy(() => import("./RemovalLimitModal.tsx"));
const RemovalReasonModal = lazy(() => import("./RemovalReasonModal.tsx"));
const RemovalReasonDisplayModal = lazy(() => import("./RemovalReasonDisplayModal.tsx"));
const OpsConfirmRemoveUserJobModal = lazy(() => import("./OpsConfirmRemoveUserJobModal.tsx"));

const JOBS_PER_PAGE = 30;

interface JobTrackerProps {
  onTabChange?: (tab: string) => void;
  activeTab?: string;
}

const JobTracker = ({ onTabChange, activeTab: activeTabProp }: JobTrackerProps) => {
    const [showJobForm, setShowJobForm] = useState(false);
    const [editingJob, setEditingJob] = useState<Job | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showJobModal, setShowJobModal] = useState(false);
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [showRemovalLimitModal, setShowRemovalLimitModal] = useState(false);
    const [showRemovalReasonModal, setShowRemovalReasonModal] = useState(false);
    const [pendingRemovalJob, setPendingRemovalJob] = useState<Job | null>(null);
    const [showRemovalReasonDisplayModal, setShowRemovalReasonDisplayModal] = useState(false);
    const [showOpsRemoveUserConfirm, setShowOpsRemoveUserConfirm] = useState(false);
    const [pendingOpsUserRemovalJob, setPendingOpsUserRemovalJob] = useState<Job | null>(null);
    const [removalReasonData, setRemovalReasonData] = useState<{
        removalReason: string;
        removalDate: string;
        removedBy: string;
        jobTitle: string;
        companyName: string;
    } | null>(null);
    const { userJobs, setUserJobs } = useUserJobs();
    const { userDetails, token } = useContext(UserContext) || {};
    const { userProfile } = useUserProfile();
    const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
    const { clearPendingUpdate } = useJobsSessionStore();
    const [notifyLoading, setNotifyLoading] = useState(false);
    const [autoOptimizeLoading, setAutoOptimizeLoading] = useState(false);
    const [notifyCooldown, setNotifyCooldown] = useState(0);
    const [showNotifyPasswordModal, setShowNotifyPasswordModal] = useState(false);
    const [notifyPasswordError, setNotifyPasswordError] = useState('');
    const [showFilter, setShowFilter] = useState(false);
    const [hiddenStatuses, setHiddenStatuses] = useState<JobStatus[]>([]);

    // Handle URL parameters for opening job modal with specific section
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const jobId = urlParams.get('jobId');
        const section = urlParams.get('section');

        if (jobId && userJobs.length > 0) {
            const job = userJobs.find(j => j.jobID === jobId || j._id === jobId);
            if (job) {
                setSelectedJob(job);
                setShowJobModal(true);

                // If section is specified, we'll pass it to JobModal
                if (section === 'resume') {
                    // The JobModal will handle the initialSection prop
                }
            }
        }
    }, [userJobs]);

    useEffect(() => {
        if (notifyCooldown > 0) {
            const timer = setInterval(() => {
                setNotifyCooldown((prev) => {
                    if (prev <= 1) {
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [notifyCooldown]);

    // near other useState hooks
    const [pendingMove, setPendingMove] = useState<{ jobID: string; status: JobStatus } | null>(null);

    const boardRef = useRef<HTMLDivElement | null>(null);

    const [columnPages, setColumnPages] = useState<{
        [key in JobStatus]?: number;
    }>({});

    const role = useOperationsStore((state) => state.role);
    const name = useOperationsStore((state) => state.name);
    const operationsEmail = useOperationsStore((state) => state.email);

    const [showReferAndEarn, setShowReferAndEarn] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const userMenuRef = useRef<HTMLDivElement | null>(null);
    const mobileMenuRef = useRef<HTMLDivElement | null>(null);

    const initials = (() => {
        const n = userDetails?.name || (userProfile ? `${userProfile.firstName || ""} ${userProfile.lastName || ""}`.trim() : "");
        return n.split(" ").filter(Boolean).map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
    })();

    const navTabs = [
        { id: "dashboard", label: "Dashboard", icon: Home },
        { id: "jobs", label: "Job Tracker", icon: Briefcase },
        { id: "optimizer", label: "Documents", icon: FileText },
    ];

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
                setShowUserMenu(false);
            }
            const target = e.target as HTMLElement;
            if (mobileMenuRef.current && !mobileMenuRef.current.contains(target) && !target.closest("[data-mobile-trigger]")) {
                setMobileMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

    useEffect(() => {
        const checkCooldown = async () => {
            if (!userDetails?.email) return;
            try {
                const response = await fetch(`${API_BASE_URL}/api/whatsapp/check-cooldown`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        userEmail: userDetails.email
                    }),
                });
                const result = await response.json();
                if (result.success && !result.canSend && result.remainingHours) {
                    const hours = result.remainingHours;
                    const minutes = Math.ceil((hours - Math.floor(hours)) * 60);
                    setNotifyCooldown(Math.floor(hours) * 3600 + minutes * 60);
                } else {
                    setNotifyCooldown(0);
                }
            } catch (error) {
                console.error('Error checking cooldown:', error);
            }
        };
        checkCooldown();
        const interval = setInterval(checkCooldown, 60000);
        return () => clearInterval(interval);
    }, [userDetails?.email, API_BASE_URL]);

    const statusColumns: { status: JobStatus; label: string; color: string }[] = [
        { status: "saved", label: "Saved", color: "bg-gray-50" },
        { status: "applied", label: "Applied", color: "bg-blue-50" },
        { status: "interviewing", label: "Interviewing", color: "bg-amber-50" },
        { status: "offer", label: "Offers", color: "bg-green-50" },
        { status: "rejected", label: "Rejected", color: "bg-red-50" },
        { status: "deleted", label: "Removed", color: "bg-gray-100" },
    ];
    // useEffect(()=>{
    //    setUserJobs(userJobs);
    // },[ userJobs])

    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredJobs([]);
            return;
        }

        const matches = userJobs.filter(
            (job) =>
                job.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                job.companyName.toLowerCase().includes(searchQuery.toLowerCase())
        );

        setFilteredJobs(matches);
    }, [searchQuery, userJobs]);

    /**
     * Parse a date string coming from the backend (stored as en-IN locale string)
     * or any ISO/standard format into a numeric timestamp.
     *
     * Tries multiple formats: ISO, DD/MM/YYYY (IST), MM/DD/YYYY (US).
     * Returns 0 if parsing fails (will be sorted to bottom when sorting newest first).
     */
    const parseJobDate = (value?: string | null): number => {
        if (!value || typeof value !== "string") return 0;

        try {
            // Fast path: ISO timestamps (e.g., "2025-12-03T10:30:00.000Z")
            if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
                const iso = new Date(value);
                if (!Number.isNaN(iso.getTime()) && iso.getTime() > 0) {
                    return iso.getTime();
                }
            }

            // Parse format: "DD/MM/YYYY, h:mm:ss am/pm" or "MM/DD/YYYY, h:mm:ss am/pm"
            const parts = value.trim().split(",");
            if (parts.length === 2) {
                const datePart = parts[0].trim();
                const timePart = parts[1].trim();

                const dateNumbers = datePart.split("/").map((p) => Number(p.trim()));

                if (dateNumbers.length === 3 && dateNumbers.every(n => !Number.isNaN(n) && n > 0)) {
                    // Parse time first (common to both formats)
                    let hour = 0, minute = 0, second = 0;
                    const timeMatch = timePart.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)/i);
                    if (timeMatch) {
                        hour = Number(timeMatch[1]);
                        minute = Number(timeMatch[2]);
                        second = timeMatch[3] ? Number(timeMatch[3]) : 0;
                        const meridian = (timeMatch[4] || "").toLowerCase();
                        if (hour >= 1 && hour <= 12 && minute >= 0 && minute <= 59) {
                            if (meridian === "pm" && hour !== 12) hour += 12;
                            if (meridian === "am" && hour === 12) hour = 0;
                        } else {
                            return 0; // Invalid time
                        }
                    } else {
                        const timeMatch24 = timePart.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
                        if (timeMatch24) {
                            hour = Number(timeMatch24[1]);
                            minute = Number(timeMatch24[2]);
                            second = timeMatch24[3] ? Number(timeMatch24[3]) : 0;
                            if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
                                return 0; // Invalid time
                            }
                        }
                    }

                    const now = Date.now();
                    const currentYear = new Date().getFullYear();
                    let bestTimestamp = 0;

                    if (dateNumbers[0] <= 31 && dateNumbers[1] <= 12) {
                        let yyyy = dateNumbers[2];
                        if (yyyy < 100) yyyy += 2000;
                        if (yyyy >= 2000 && yyyy <= currentYear + 1) {
                            try {
                                const istOffsetMinutes = 330;
                                const utcMs = Date.UTC(yyyy, dateNumbers[1] - 1, dateNumbers[0], hour, minute, second) - istOffsetMinutes * 60 * 1000;
                                const d = new Date(utcMs);
                                if (!Number.isNaN(d.getTime()) && d.getTime() > 0 && d.getTime() <= now + 86400000) { // Allow 1 day in future for timezone issues
                                    bestTimestamp = d.getTime();
                                }
                            } catch (e) {
                            }
                        }
                    }

                    if (dateNumbers[0] <= 12 && dateNumbers[1] <= 31 && (bestTimestamp === 0 || (dateNumbers[0] <= 12 && dateNumbers[1] <= 12))) {
                        let yyyy = dateNumbers[2];
                        if (yyyy < 100) yyyy += 2000;
                        if (yyyy >= 2000 && yyyy <= currentYear + 1) {
                            try {
                                const istOffsetMinutes = 330;
                                const utcMs = Date.UTC(yyyy, dateNumbers[0] - 1, dateNumbers[1], hour, minute, second) - istOffsetMinutes * 60 * 1000;
                                const d = new Date(utcMs);
                                if (!Number.isNaN(d.getTime()) && d.getTime() > 0 && d.getTime() <= now + 86400000) {
                                    if (bestTimestamp === 0 || d.getTime() > bestTimestamp) {
                                        bestTimestamp = d.getTime();
                                    }
                                }
                            } catch (e) {
                                // Invalid date
                            }
                        }
                    }

                    if (bestTimestamp > 0) {
                        return bestTimestamp;
                    }
                }
            }

            // Fallback: try native Date parse
            const native = new Date(value);
            if (!Number.isNaN(native.getTime()) && native.getTime() > 0) {
                const now = Date.now();
                if (native.getTime() <= now + 86400000) {
                    return native.getTime();
                }
            }
        } catch (error) {
            console.warn("Failed to parse job date:", value, error);
        }

        // Return 0 for unparseable dates (will be sorted to bottom when sorting newest first)
        return 0;
    };

    /**
     * Get the timestamp we will use for ordering cards.
     * Requirement from product: sort strictly by "when it was added",
     * so we prefer dateAdded first, then createdAt, and do NOT use updatedAt.
     * Returns 0 if neither date can be parsed (will be sorted to bottom).
     */
    const getJobCreationTime = (job: Job): number => {
        // Prioritize dateAdded (when job was added)
        const dateAddedTime = parseJobDate(job.dateAdded);
        if (dateAddedTime > 0) {
            return dateAddedTime;
        }

        // Fall back to createdAt if dateAdded is not available or invalid
        const createdAtTime = parseJobDate(job.createdAt);
        if (createdAtTime > 0) {
            return createdAtTime;
        }

        // If both are invalid, return 0 (will be sorted to bottom)
        return 0;
    };


    const getJobSortTimeForStatus = (job: Job, status: JobStatus): number => {
        if (status === "applied") {
            // Sort using the SAME parser + field priority that JobCard's getTimeAgo uses
            // (createdAt → dateAdded → updatedAt). This guarantees the visible
            // "Added X ago" string matches the sort order regardless of mixed
            // en-IN / en-US locale strings stored in legacy data.
            return (
                parseAddedTimestamp(job.createdAt) ||
                parseAddedTimestamp(job.dateAdded) ||
                parseAddedTimestamp(job.updatedAt)
            );
        }

        // For all other columns: prefer updatedAt so recently moved cards stay on top (stack behavior)
        const updatedTime = parseJobDate(job.updatedAt);
        if (updatedTime > 0) return updatedTime;

        return getJobCreationTime(job);
    };


    useEffect(() => {
        if (!showJobModal) setPendingMove(null);
    }, [showJobModal]);

    console.log("Role in job tracker is ", role);

    const handleEditJob = async (jobData: Partial<Job>) => {
        if (!editingJob) return;

        if (role === "operations") {
            try {
                const updatedJobDetails = {
                    ...editingJob,
                    ...jobData,
                    userID: userDetails?.email,
                };
                console.log("operations ");
                const response = await fetch(
                    `${API_BASE_URL}/operations/jobs`,
                    {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            token,
                            jobID: editingJob.jobID,
                            userDetails,
                            jobDetails: updatedJobDetails,
                            action: "edited by " + (name || "operations"),
                        }),
                    }
                );

                const result = await response.json();

                if (result.message === "Jobs updated successfully") {
                    setUserJobs(result.updatedJobs);
                    toastUtils.success(toastMessages.jobUpdated);
                    console.log("Job updated:", result.updatedJobs);
                } else {
                    toastUtils.error(toastMessages.jobError);
                }
            } catch (err) {
                console.error("Failed to update job", err);
                toastUtils.error(toastMessages.jobError);
            } finally {
                setEditingJob(null);
                setShowJobForm(false);
            }
        } else {
            try {
                const updatedJobDetails = {
                    ...editingJob,
                    ...jobData,
                    userID: userDetails?.email,
                };

                const response = await fetch(`${API_BASE_URL}/updatechanges`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        token,
                        jobID: editingJob.jobID,
                        userDetails,
                        jobDetails: updatedJobDetails,
                        action: "edited by ",
                    }),
                });

                const result = await response.json();

                if (result.message === "Jobs updated successfully") {
                    setUserJobs(result.updatedJobs);
                    toastUtils.success(toastMessages.jobUpdated);
                    console.log("Job updated:", result.updatedJobs);
                } else if (result.message === "Removal limit exceeded") {
                    setShowRemovalLimitModal(true);
                } else {
                    toastUtils.error(toastMessages.jobError);
                }
            } catch (err) {
                console.error("Failed to update job", err);
                toastUtils.error(toastMessages.jobError);
            } finally {
                setEditingJob(null);
                setShowJobForm(false);
            }
        }
    };

    const handleAddJob = async (
        jobData: Omit<Job, "jobID" | "createdAt" | "updatedAt">
    ) => {
        try {
            const jobDetails = {
                ...jobData,
                jobID: Date.now().toString(),
                userID: userDetails?.email,
            };

            const saveJobsToDb = await fetch(`${API_BASE_URL}/api/jobs`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ jobDetails, userDetails, token }),
            });

            const responseFromServer = await saveJobsToDb.json().catch(() => ({}));
            if (saveJobsToDb.status === 403) {
                const msg =
                    responseFromServer?.error === "BLOCKED_COMPANY" ||
                    responseFromServer?.error === "BLOCKED_LOCATION"
                        ? responseFromServer?.message ||
                          (responseFromServer?.error === "BLOCKED_COMPANY"
                              ? "This company is blocked for this client."
                              : "This location is blocked for this client.")
                        : responseFromServer?.message || "Cannot add this job.";
                toastUtils.error(msg);
                return;
            }
            if (!saveJobsToDb.ok) {
                toastUtils.error(responseFromServer?.message || "Failed to save job.");
                return;
            }
            setUserJobs(responseFromServer.NewJobList);
            setShowJobForm(false);
            if (responseFromServer.message == 'Job Added Succesfully') {
                setUserJobs(responseFromServer.NewJobList);
                return;
            }
        } catch (err) {
            console.log(err);
            toastUtils.error("Failed to save job. Please try again.");
        }
    }

    // const handleDragStart = (e: React.DragEvent, job: Job) => {
    //   e.dataTransfer.setData('jobId', job.jobID);
    // };

    // Replace your current handleDragStart with this:
    const handleDragStart = (e: React.DragEvent, job: Job) => {
        // Keep backward compatibility with any existing reads
        e.dataTransfer.setData('jobID', job.jobID);   // <-- new (capital D)
        e.dataTransfer.setData('jobId', job.jobID);   // existing key some code may rely on
        // Optional: source status for future-proofing (not strictly needed)
        e.dataTransfer.setData('sourceStatus', job.currentStatus);

        // Enhanced visual feedback for drag start
        const target = e.target as HTMLElement;
        target.style.opacity = '0.8';
        target.style.transform = 'rotate(8deg) scale(1.05)';
        target.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
        target.style.zIndex = '1000';
        target.style.transition = 'none'; // Disable transition during drag for instant feedback
    };

    const handleDragEnd = (e: React.DragEvent) => {
        // Reset visual effects with smooth animation
        const target = e.target as HTMLElement;
        target.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'; // Restore smooth transition
        target.style.opacity = '1';
        target.style.transform = 'none';
        target.style.boxShadow = '';
        target.style.zIndex = '';
    };


    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        // Enhanced visual feedback for drop zones
        const target = e.currentTarget as HTMLElement;
        target.style.borderColor = '#3b82f6';
        target.style.borderWidth = '3px';
        target.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
        target.style.transform = 'scale(1.02)';
        target.style.boxShadow = '0 10px 25px -5px rgba(59, 130, 246, 0.2)';
    };

    const handleDragLeave = (e: React.DragEvent) => {
        // Reset visual feedback when leaving drop zone
        const target = e.currentTarget as HTMLElement;
        target.style.borderColor = '';
        target.style.borderWidth = '';
        target.style.backgroundColor = '';
        target.style.transform = '';
        target.style.boxShadow = '';
    };

    const handleDragOverBoard = (e: React.DragEvent) => {
        e.preventDefault();
        const container = boardRef.current;
        if (!container) return;

        const { clientX } = e;
        const { left, right } = container.getBoundingClientRect();
        const edgeSize = 100; // Reduced for more responsive scrolling

        // Throttle scroll updates for better performance
        const scrollContainer = container as any;
        if (!scrollContainer._scrollTimeout) {
            scrollContainer._scrollTimeout = true;

            if (clientX - left < edgeSize) {
                const distance = clientX - left;
                const intensity = Math.max(0.3, (edgeSize - distance) / edgeSize);
                const scrollSpeed = intensity * 150; // Increased speed
                container.scrollBy({ left: -scrollSpeed, behavior: "auto" }); // Changed to auto for instant scroll
            } else if (right - clientX < edgeSize) {
                const distance = right - clientX;
                const intensity = Math.max(0.3, (edgeSize - distance) / edgeSize);
                const scrollSpeed = intensity * 150; // Increased speed
                container.scrollBy({ left: scrollSpeed, behavior: "auto" }); // Changed to auto for instant scroll
            }

            // Reset throttle after 16ms (60fps)
            setTimeout(() => {
                scrollContainer._scrollTimeout = false;
            }, 16);
        }
    };

    const onDeleteJob = async (jobID: string) => {
        try {
            let Code = prompt("Enter The Code to Delete.");
            if (Code !== import.meta.env.VITE_JOB_DELETION_CODE) return;
            else {
                if (role === "operations") {
                    const response = await fetch(
                        `${API_BASE_URL}/operations/jobs`,
                        {
                            method: "PUT",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                                jobID,
                                userDetails,
                                action: "delete",
                            }),
                        }
                    );

                    const result = await response.json();
                    if (result.message === "Jobs updated successfully") {
                        setUserJobs(result?.updatedJobs);
                        toastUtils.success(toastMessages.jobDeleted);
                        console.log("Job deleted:", result?.updatedJobs);
                    } else {
                        toastUtils.error(toastMessages.jobError);
                    }
                } else {
                    const response = await fetch(
                        `${API_BASE_URL}/updatechanges`,
                        {
                            method: "PUT",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                                jobID,
                                userDetails,
                                token,
                                action: "delete",
                            }),
                        }
                    );

                    const result = await response.json();
                    if (result.message === "Jobs updated successfully") {
                        setUserJobs(result?.updatedJobs);
                        toastUtils.success(toastMessages.jobDeleted);
                        console.log("Job deleted:", result?.updatedJobs);
                    } else {
                        toastUtils.error(toastMessages.jobError);
                    }
                }
            }
        } catch (error) {
            console.error("Error deleting job:", error);
            toastUtils.error("Failed to delete job. Please try again.");
        }
    };


    // Function to send Discord webhook notification
    const sendDiscordNotification = async (job: Job, reason: string) => {
        try {
            // Get client name from multiple sources for robustness
            let clientName = userDetails?.name;
            if (!clientName && userProfile) {
                clientName = userProfile.firstName && userProfile.lastName
                    ? `${userProfile.firstName} ${userProfile.lastName}`
                    : userProfile.firstName || userProfile.lastName || null;
            }
            if (!clientName && userDetails) {
                clientName = userDetails.firstName && userDetails.lastName
                    ? `${userDetails.firstName} ${userDetails.lastName}`
                    : userDetails.firstName || userDetails.lastName || null;
            }
            clientName = clientName || userDetails?.email || 'Unknown Client';
            
            const webhookUrl = 'https://discord.com/api/webhooks/1416080143914635436/culXkTHvJQuPW8rbtdgIUICyJFlXzXH9yNzQ8iDVmM_Ikzw2XoYnv7JD2M7Mrz7oJbo2';
            
            const message = {
                embeds: [{
                    title: 'Job Card Moved to Removed',
                    color: 0xff6b35, // Orange color
                    fields: [
                        {
                            name: 'Job Title',
                            value: job.jobTitle || 'N/A',
                            inline: true
                        },
                        {
                            name: 'Company Name',
                            value: job.companyName || 'N/A',
                            inline: true
                        },
                        {
                            name: 'Client Name',
                            value: clientName,
                            inline: true
                        },
                        {
                            name: 'Reason',
                            value: reason || 'No reason provided',
                            inline: false
                        }
                    ],
                    timestamp: new Date().toISOString()
                }]
            };

            await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(message),
            });
        } catch (error) {
            console.error('Failed to send Discord notification:', error);
            // Don't throw - this is non-blocking
        }
    };

    const onUpdateJobStatus = async (jobID: string, status: JobStatus, userDetails: any, removalReason?: string) => {
        const originalJob = userJobs?.find((job) => job.jobID === jobID);
        if (!originalJob) return;

        const originalStatus = originalJob.currentStatus;
        const statusSuffix = role === "operations" ? " by " + (name || "operations") : " by user";
        const newStatus = status + statusSuffix;

        // OPTIMISTIC UPDATE: Update UI immediately
        setUserJobs((prevJobs) =>
            prevJobs.map((j) =>
                j.jobID === jobID
                    ? {
                        ...j,
                        currentStatus: newStatus,
                        // Update updatedAt so sorting puts this card on top immediately
                        updatedAt: new Date().toLocaleString("en-IN")
                    }
                    : j
            )
        );

        // When a job is moved into "applied", make sure the Applied column
        // shows from the top (page 1) so the user can see the relevant jobs.
        if (status === "applied") {
            setColumnPages((prev) => ({ ...prev, applied: 1 }));
        }

        try {
            const endpoint =
                role === "operations"
                    ? `${API_BASE_URL}/operations/jobs`
                    : `${API_BASE_URL}/updatechanges`;

            let reqToServer = await fetch(endpoint, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    action: "UpdateStatus",
                    status: status,
                    userDetails,
                    token: role !== "operations" ? token : undefined,
                    jobID,
                    removalReason: removalReason || undefined,
                    // Send operations user name and email when operations member updates status
                    ...(role === "operations" && {
                        role: "operations",
                        operationsName: name || "operations",
                        operationsEmail: operationsEmail || "operations@flashfirehq"
                    }),
                }),
            });

            let resFromServer = await reqToServer.json();
            if (resFromServer.message === "Jobs updated successfully") {
                // Server confirmed - update with server data
                setUserJobs(resFromServer?.updatedJobs);
                clearPendingUpdate(jobID);
                toastUtils.success("Job status updated successfully!");
                console.log("Job status updated:", resFromServer?.updatedJobs);
                
                // Send Discord notification if job was moved to deleted and reason is provided
                if (status === "deleted" && removalReason && role !== "operations") {
                    await sendDiscordNotification(originalJob, removalReason);
                }
            } else if (resFromServer.message === "Removal limit exceeded") {
                // Handle removal limit exceeded
                setUserJobs((prevJobs) =>
                    prevJobs.map((j) =>
                        j.jobID === jobID ? { ...j, currentStatus: originalStatus } : j
                    )
                );
                clearPendingUpdate(jobID);
                setShowRemovalLimitModal(true);
                console.log("Removal limit exceeded for user");
            } else {
                // Server failed - revert to original state
                setUserJobs((prevJobs) =>
                    prevJobs.map((j) =>
                        j.jobID === jobID ? { ...j, currentStatus: originalStatus } : j
                    )
                );
                clearPendingUpdate(jobID);
                toastUtils.error("Failed to update job status");
                console.error("Failed to update job status on server");
            }
        } catch (error) {
            console.error("Error updating job status:", error);
            // Network error - revert to original state
            setUserJobs((prevJobs) =>
                prevJobs.map((j) =>
                    j.jobID === jobID ? { ...j, currentStatus: originalStatus } : j
                )
            );
            clearPendingUpdate(jobID);
            toastUtils.error("Network error while updating job status");
        }
    };

    const continueOperationsMoveToRemoved = (job: Job) => {
        const hasAttachments =
            job.attachments && Array.isArray(job.attachments) && job.attachments.length > 0;
        if (!hasAttachments) {
            setSelectedJob(job);
            setPendingMove({ jobID: job.jobID, status: "deleted" });
            setShowJobModal(true);
            toastUtils.error(
                "Please upload at least one image attachment before moving this job card to Removed."
            );
            return;
        }
        onUpdateJobStatus(job.jobID, "deleted", userDetails);
    };

    const checkLockPeriod = async (): Promise<{ isLocked: boolean; message: string | null }> => {
        if (role !== 'operations' || !userDetails?.email) {
            return { isLocked: false, message: null };
        }

        try {
            const response = await fetch(`${API_BASE_URL}/operations/check-lock-period`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    clientEmail: userDetails.email
                }),
            });

            const result = await response.json();
            if (result.success) {
                return {
                    isLocked: result.isLocked || false,
                    message: result.message || null
                };
            }
        } catch (error) {
            console.error('Error checking lock period:', error);
        }

        return { isLocked: false, message: null };
    };

    const handleDrop = async (e: React.DragEvent, status: JobStatus) => {
        e.preventDefault();

        // Reset visual feedback
        const target = e.currentTarget as HTMLElement;
        target.style.borderColor = '';
        target.style.borderWidth = '';
        target.style.backgroundColor = '';
        target.style.transform = '';
        target.style.boxShadow = '';

        const jobID =
            e.dataTransfer.getData("jobID") || e.dataTransfer.getData("jobId");
        if (!jobID) return;

        const job = userJobs?.find((j) => j.jobID === jobID);
        if (!job) return;

        const isOps = role === "operations" || role === "operator";

        // End user: moving to Removed — ask for a reason (existing flow)
        if (status === "deleted" && !isOps) {
            setPendingRemovalJob(job);
            setShowRemovalReasonModal(true);
            return;
        }

        // Operations: client-added job — confirm before Removed (attachments checked after)
        if (status === "deleted" && isOps && isUserOriginatedJob(job)) {
            setPendingOpsUserRemovalJob(job);
            setShowOpsRemoveUserConfirm(true);
            return;
        }

        // Operations: moving to Removed — require at least one attachment
        if (status === "deleted" && isOps) {
            continueOperationsMoveToRemoved(job);
            return;
        }

        // Check lock period for operations moving from saved to applied
        if (role === 'operations' && job.currentStatus === 'saved' && status === 'applied') {
            const lockCheck = await checkLockPeriod();
            if (lockCheck.isLocked) {
                toastUtils.error(lockCheck.message || 'Job card movement is locked during this period');
                return;
            }
        }

        // Gate only when moving out of "saved" to a real status (not deleted/saved)
        // Only ask for attachments if the job doesn't already have them
        if (job.currentStatus === 'saved' && status !== 'deleted' && status !== 'saved') {
            const hasAttachments = job.attachments && Array.isArray(job.attachments) && job.attachments.length > 0;
            
            // If job already has attachments, move directly without opening modal
            if (hasAttachments) {
                onUpdateJobStatus(jobID, status, userDetails);
                return;
            }
            
            // If no attachments, open modal to ask for them
            setSelectedJob(job);
            setPendingMove({ jobID, status });
            setShowJobModal(true);
            return;
        }

        // INSTANT UPDATE: Move immediately in UI, then sync with server
        onUpdateJobStatus(jobID, status, userDetails);
    };

    // Handle removal reason confirmation
    const handleRemovalReasonConfirm = async (reason: string) => {
        if (!pendingRemovalJob) return;
        
        await onUpdateJobStatus(pendingRemovalJob.jobID, 'deleted', userDetails, reason);
        setShowRemovalReasonModal(false);
        setPendingRemovalJob(null);
    };

    const handleOpsRemoveUserJobConfirm = () => {
        setShowOpsRemoveUserConfirm(false);
        const job = pendingOpsUserRemovalJob;
        setPendingOpsUserRemovalJob(null);
        if (job) continueOperationsMoveToRemoved(job);
    };

    const handleShowRemovalReason = async (job: Job) => {
        try {
            const response = await fetch(`${API_BASE_URL}/get-removal-reason`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    jobID: job.jobID,
                    userEmail: userDetails?.email
                }),
            });

            const result = await response.json();
            if (result.success && result.removalReason) {
                setRemovalReasonData({
                    removalReason: result.removalReason,
                    removalDate: result.removalDate || '',
                    removedBy: result.removedBy || 'user',
                    jobTitle: result.jobTitle || job.jobTitle,
                    companyName: result.companyName || job.companyName
                });
                setShowRemovalReasonDisplayModal(true);
            } else {
                toastUtils.error(result.message || 'No removal reason found');
            }
        } catch (error) {
            console.error('Error fetching removal reason:', error);
            toastUtils.error('Failed to fetch removal reason');
        }
    };

    const handleQueueAutoOptimizeSavedJobs = async () => {
        if (autoOptimizeLoading) return;
        if (!(role === "operations" || role === "operator")) return;
        if (!userDetails?.email) {
            toastUtils.error("Client email not found.");
            return;
        }

        setAutoOptimizeLoading(true);
        const loadingToast = toastUtils.loading("Queueing saved jobs for auto-optimization...");

        try {
            const response = await fetch(`${API_BASE_URL}/operations/auto-optimize-saved`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email: userDetails.email,
                    role,
                    operationsEmail,
                }),
            });

            const result = await response.json().catch(() => ({}));

            if (!response.ok || !result?.success) {
                toastUtils.dismissToast(loadingToast);
                toastUtils.error(result?.message || "Failed to queue auto-optimization.");
                return;
            }

            const queuedCount = Number(result?.queuedCount || 0);
            toastUtils.dismissToast(loadingToast);
            if (queuedCount > 0) {
                toastUtils.success(`Queued ${queuedCount} saved job(s) with 5-minute gap.`);
            } else {
                toastUtils.custom(result?.message || "No saved jobs available to queue.", "info");
            }

            // Soft refresh to show new autoOptimization state without blocking UI flow.
            setTimeout(() => refreshJobs(true), 400);
        } catch (error) {
            console.error("Failed to queue saved jobs for auto-optimization:", error);
            toastUtils.dismissToast(loadingToast);
            toastUtils.error("Network error while queueing auto-optimization.");
        } finally {
            setAutoOptimizeLoading(false);
        }
    };



    // Replace your current handleDrop with this:
    // const handleDrop = (e: React.DragEvent, status: JobStatus) => {
    //   e.preventDefault();
    //   const jobID = e.dataTransfer.getData('jobID') || e.dataTransfer.getData('jobId');
    //   if (!jobID) return;

    //   const job = userJobs?.find((j) => j.jobID === jobID);
    //   if (!job) return;

    //   // Gate only when moving out of "saved" to a real status (not deleted/saved)
    //   if (job.currentStatus === 'saved' && status !== 'deleted' && status !== 'saved') {
    //     setSelectedJob(job);
    //     setPendingMove({ jobID, status });
    //     setShowJobModal(true);        // ⬅️ open modal
    //     return;                       // ⛔ do NOT move yet
    //   }

    //   // Normal moves (non-gated)
    //   onUpdateJobStatus(jobID, status, userDetails);
    // };

    const updateColumnPage = (status: JobStatus, page: number) => {
        setColumnPages((prev) => ({ ...prev, [status]: page }));
    };

    const getPaginatedJobs = (jobs: Job[], status: JobStatus) => {
        const currentPage = columnPages[status] || 1;
        const startIndex = (currentPage - 1) * JOBS_PER_PAGE;
        const endIndex = startIndex + JOBS_PER_PAGE;
        return jobs.slice(startIndex, endIndex);
    };

    const getTotalPages = (jobs: Job[]) => {
        return Math.ceil(jobs.length / JOBS_PER_PAGE);
    };

    return (
        <div className="min-h-screen">
            {/* Top Navbar */}
            <div className="relative">
            <div className="bg-white border-b border-gray-200 flex items-center px-5 h-14">
                {/* Logo */}
                <div className="flex items-center gap-2 mr-6 flex-shrink-0">
                    <img src="./logo2.png" alt="FlashFire" className="w-7 h-7 object-contain flex-shrink-0" />
                    <span className="text-base font-extrabold text-orange-500 tracking-wide">FLASHFIRE</span>
                </div>

                {/* Nav tabs — centered, desktop only */}
                <div className="hidden sm:flex flex-1 justify-center">
                    <div className="flex items-center gap-1">
                        {navTabs.map(({ id, label, icon: Icon }) => (
                            <button
                                key={id}
                                onClick={() => onTabChange?.(id)}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                                    (activeTabProp ?? "jobs") === id
                                        ? "bg-orange-500 text-white"
                                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                                }`}
                            >
                                <Icon className="w-4 h-4 flex-shrink-0" />
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right side */}
                <div className="ml-auto flex items-center gap-3">
                    {/* Refer and earn — desktop */}
                    {userDetails?.name && (
                        <button
                            onClick={() => setShowReferAndEarn(true)}
                            className="hidden sm:flex items-center gap-2 px-4 py-2 border border-orange-300 bg-orange-50 text-orange-500 text-sm font-semibold hover:bg-orange-100 transition-colors"
                        >
                            Refer and earn <Gift className="w-4 h-4" />
                        </button>
                    )}

                    {/* User avatar — desktop */}
                    <div className="hidden sm:block relative" ref={userMenuRef}>
                        <button
                            onClick={() => setShowUserMenu((v) => !v)}
                            className="flex items-center gap-1"
                        >
                            <div className="w-8 h-8 bg-indigo-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                                {initials}
                            </div>
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                        </button>
                        {showUserMenu && (
                            <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 shadow-lg z-50">
                                <button
                                    onClick={() => { setShowUserMenu(false); setShowReferAndEarn(true); }}
                                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    <Gift className="w-4 h-4" />
                                    Refer & Earn
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Hamburger — mobile only */}
                    <button
                        data-mobile-trigger
                        onClick={() => setMobileMenuOpen((v) => !v)}
                        className="sm:hidden p-2 border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-colors"
                    >
                        {mobileMenuOpen ? <X className="w-5 h-5 text-gray-700" /> : <Menu className="w-5 h-5 text-gray-700" />}
                    </button>
                </div>
            </div>

            {/* Mobile dropdown menu */}
            {mobileMenuOpen && (
                <div ref={mobileMenuRef} className="sm:hidden absolute top-14 left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-50">
                    {navTabs.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => { onTabChange?.(id); setMobileMenuOpen(false); }}
                            className={`w-full flex items-center gap-3 px-5 py-3 text-sm font-medium text-left transition-colors ${
                                (activeTabProp ?? "jobs") === id
                                    ? "bg-orange-500 text-white"
                                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                            {label}
                        </button>
                    ))}
                    {userDetails?.name && (
                        <button
                            onClick={() => { setShowReferAndEarn(true); setMobileMenuOpen(false); }}
                            className="w-full flex items-center gap-3 px-5 py-3 text-sm font-medium text-orange-500 hover:bg-orange-50 transition-colors border-t border-gray-100"
                        >
                            <Gift className="w-4 h-4" />
                            Refer and earn
                        </button>
                    )}
                </div>
            )}
            </div>{/* end navbar wrapper */}

            <ReferAndEarnCard isOpen={showReferAndEarn} onClose={() => setShowReferAndEarn(false)} />

            <div className="px-4 sm:px-6 lg:px-8 py-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
                <div className="flex flex-col justify-around items-start w-full">
                    <h2 className="text-4xl md:text-4xl font-semibold text-zinc-900 mb-2 tracking-tight leading-[1.1]">Job Tracker</h2>
                    <p className="text-gray-400 text-3x1 ">Track your job applications and manage your career pipeline</p>
                </div>
                <div className="mt-4 sm:mt-0 flex items-center justify-end gap-4 w-full">
                    {role === "operations" && userDetails?.email && (
                        <button
                            onClick={() => {
                                if (notifyCooldown > 0 || notifyLoading) return;
                                setShowNotifyPasswordModal(true);
                            }}
                            disabled={notifyCooldown > 0 || notifyLoading}
                            className={`whitespace-nowrap px-4 py-2 font-medium transition-all duration-200 shadow-sm flex items-center gap-2 ${
                                notifyCooldown > 0
                                    ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                                    : notifyLoading
                                    ? 'bg-green-400 text-white cursor-wait'
                                    : 'bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white hover:shadow-md'
                            }`}
                        >
                            {notifyLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Sending...</span>
                                </>
                            ) : notifyCooldown > 0 ? (
                                <>
                                    <Clock className="w-4 h-4" />
                                    <span>
                                        {Math.floor(notifyCooldown / 3600)}h {Math.floor((notifyCooldown % 3600) / 60)}m
                                    </span>
                                </>
                            ) : (
                                <>
                                    <MessageSquare className="w-4 h-4" />
                                    <span>Notify Client</span>
                                </>
                            )}
                        </button>
                    )}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search jobs..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-6 py-3 border border-orange-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white shadow-sm"
                        />
                        {filteredJobs.length > 0 && (
                            <div className="absolute top-full mt-2 w-full bg-white border border-gray-300 shadow-lg z-50 max-h-60 overflow-y-auto">
                                {filteredJobs.map((job) => (
                                    <div
                                        key={job.jobID}
                                        onClick={() => {
                                            setSelectedJob(job);
                                            setShowJobModal(true);
                                            setSearchQuery(''); // Clear after selection
                                            setFilteredJobs([]); // Hide box
                                        }}
                                        className="p-3 hover:bg-gray-100 cursor-pointer border-b last:border-none"
                                    >
                                        <p className="font-semibold text-gray-900">{job.jobTitle}</p>
                                        <p className="text-sm text-gray-500">{job.companyName}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => setShowJobForm(true)}
                        className="whitespace-nowrap bg-gradient-to-br from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-6 py-3 font-medium transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                        Add Jobs
                    </button>
                    {(role === "operations" || role === "operator") && (
                        <button
                            onClick={handleQueueAutoOptimizeSavedJobs}
                            disabled={autoOptimizeLoading}
                            className={`whitespace-nowrap px-3 py-1.5 text-sm font-medium transition-all duration-200 shadow-sm ${
                                autoOptimizeLoading
                                    ? "bg-purple-300 text-white cursor-wait"
                                    : "bg-gradient-to-br from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white hover:shadow-md"
                            }`}
                            title="Optimize saved jobs only (5-minute spacing)"
                        >
                            {autoOptimizeLoading ? "Queueing..." : "Auto Optimize"}
                        </button>
                    )}
                </div>
            </div>

            {/* Filter */}
            <div className="mb-4 relative inline-block">
                <button
                    onClick={() => setShowFilter((v) => !v)}
                    className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-300 text-gray-400 text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
                >
                    <Filter className="w-4 h-4" />
                    Filter
                    {hiddenStatuses.length > 0 && (
                        <span className="ml-1 bg-[#ff4b00] text-white text-xs w-4 h-4 flex items-center justify-center leading-none">
                            {hiddenStatuses.length}
                        </span>
                    )}
                </button>
                {showFilter && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowFilter(false)} />
                        <div className="absolute top-full mt-2 left-0 bg-white border border-gray-200 shadow-lg z-50 p-3 min-w-[180px]">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Show Columns</p>
                            {statusColumns.map(({ status, label }) => (
                                <label key={status} className="flex items-center gap-2 py-1.5 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={!hiddenStatuses.includes(status)}
                                        onChange={() => {
                                            setHiddenStatuses((prev) =>
                                                prev.includes(status)
                                                    ? prev.filter((s) => s !== status)
                                                    : [...prev, status]
                                            );
                                        }}
                                        className="accent-[#ff4b00] w-4 h-4"
                                    />
                                    <span className="text-sm text-gray-700">{label}</span>
                                </label>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Board */}
            <div
                ref={boardRef}
                className="flex gap-6 overflow-x-auto pb-6"
                onDragOver={handleDragOverBoard}
            >
                {statusColumns.filter(({ status }) => !hiddenStatuses.includes(status)).map(({ status, label, color }) => {
                    const filteredAndSortedJobs =
                        (userJobs && Array.isArray(userJobs))
                            ? userJobs
                                .filter((job) => {
                                    const statusMatch =
                                        job.currentStatus?.startsWith(status);
                                    if (!statusMatch) return false;
                                    if (!searchQuery.trim()) return true;

                                    const query = searchQuery.toLowerCase();
                                    const titleMatch = job.jobTitle
                                        ?.toLowerCase()
                                        .includes(query);
                                    const companyMatch = job.companyName
                                        ?.toLowerCase()
                                        .includes(query);
                                    return titleMatch || companyMatch;
                                })
                                .sort((a, b) => {
                                    // Default: sort by when the job was added (dateAdded/createdAt).
                                    // Applied column: prefer appliedDate (when user applied / attached).
                                    const timeA = getJobSortTimeForStatus(a, status);
                                    const timeB = getJobSortTimeForStatus(b, status);

                                    // Handle unparseable dates (0): put them at the bottom
                                    if (timeA === 0 && timeB === 0) return 0; // Both unparseable, maintain order
                                    if (timeA === 0) return 1; // A is unparseable, put it after B
                                    if (timeB === 0) return -1; // B is unparseable, put it after A

                                    // If times are equal, maintain stable sort
                                    if (timeA === timeB) return 0;

                                    // Newest first: larger timestamp comes first (descending order)
                                    return timeB - timeA;
                                })
                            : [];

                    const paginatedJobs = getPaginatedJobs(
                        filteredAndSortedJobs,
                        status
                    );
                    const totalPages = getTotalPages(filteredAndSortedJobs);
                    const currentPage = columnPages[status] || 1;

                    return (
                        <div
                            key={status}
                            className="bg-white p-4 min-w-[280px] w-80 flex flex-col shadow-sm border border-gray-200 transition-all duration-200"
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, status)}
                        >
                            {/* Column Header */}
                            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
                                <div
                                    className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                                        status === "saved" ? "bg-gray-400"
                                        : status === "applied" ? "bg-blue-500"
                                        : status === "interviewing" ? "bg-amber-500"
                                        : status === "offer" ? "bg-green-500"
                                        : status === "rejected" ? "bg-red-500"
                                        : "bg-gray-700"
                                    }`}
                                />
                                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-widest">{label}</h3>
                            </div>

                            {/* Job Cards */}
                            <div className="flex-1 space-y-3 min-h-[500px]">
                                <Suspense fallback={<LoadingScreen />}>
                                    {paginatedJobs?.map((job) => (
                                        <div key={job.jobID} className="relative">
                                            <JobCard
                                                job={job}
                                                showJobModal={showJobModal}
                                                setShowJobModal={setShowJobModal}
                                                setSelectedJob={setSelectedJob}
                                                onDragStart={handleDragStart}
                                                onDragEnd={handleDragEnd}
                                                onEdit={() =>
                                                    setEditingJob(job)
                                                }
                                                onDelete={() =>
                                                    onDeleteJob(job.jobID)
                                                }
                                                onShowRemovalReason={handleShowRemovalReason}
                                            />
                                        </div>
                                    ))}
                                </Suspense>
                                {filteredAndSortedJobs &&
                                    filteredAndSortedJobs.length === 0 && (
                                        <div className="text-center py-12 text-gray-400">
                                            <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 flex items-center justify-center">
                                                <Plus className="w-5 h-5" />
                                            </div>
                                            <p className="text-sm font-medium">No jobs yet</p>
                                            <p className="text-xs mt-1">Drag jobs here or add new ones</p>
                                        </div>
                                    )}
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="mt-4 pt-3 border-t border-gray-200">
                                    <div className="flex items-center justify-between">
                                        <button
                                            onClick={() =>
                                                updateColumnPage(
                                                    status,
                                                    currentPage - 1
                                                )
                                            }
                                            disabled={currentPage === 1}
                                            className={`px-3 py-1 text-xs font-semibold transition-all duration-200 ${currentPage === 1
                                                    ? "text-gray-400 cursor-not-allowed"
                                                    : "text-gray-700 hover:text-gray-900 hover:bg-white/50"
                                                }`}
                                        >
                                            ← Prev
                                        </button>
                                        <span className="text-xs text-gray-700 font-semibold bg-white/50 px-2 py-1">
                                            {currentPage} of {totalPages}
                                        </span>
                                        <button
                                            onClick={() =>
                                                updateColumnPage(
                                                    status,
                                                    currentPage + 1
                                                )
                                            }
                                            disabled={
                                                currentPage === totalPages
                                            }
                                            className={`px-3 py-1 text-xs font-medium transition-all duration-200 ${currentPage === totalPages
                                                    ? "text-gray-400 cursor-not-allowed"
                                                    : "text-gray-700 hover:text-gray-900 hover:bg-white/50"
                                                }`}
                                        >
                                            Next →
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            {showJobModal && (
                <Suspense fallback={<LoadingScreen />}>
                    <JobModal
                        setShowJobModal={setShowJobModal}
                        jobDetails={selectedJob}
                        initialSection={
                            pendingMove &&
                                selectedJob &&
                                pendingMove.jobID === selectedJob.jobID
                                ? "attachments"
                                : new URLSearchParams(window.location.search).get('section') === 'resume'
                                    ? "resume"
                                    : undefined
                        }
                        onAutoCheckDone={(exists) => {
                            if (
                                exists &&
                                pendingMove &&
                                selectedJob &&
                                pendingMove.jobID === selectedJob.jobID
                            ) {
                                onUpdateJobStatus(
                                    pendingMove.jobID,
                                    pendingMove.status,
                                    userDetails
                                );
                                setPendingMove(null);
                                setShowJobModal(false);
                            }
                        }}
                        onResumeUploaded={() => {
                            if (
                                pendingMove &&
                                selectedJob &&
                                pendingMove.jobID === selectedJob.jobID
                            ) {
                                onUpdateJobStatus(
                                    pendingMove.jobID,
                                    pendingMove.status,
                                    userDetails
                                );
                                setPendingMove(null);
                                setShowJobModal(false);
                            }
                        }}
                        onAttachmentUploaded={(updatedJob) => {
                            if (!updatedJob) return;
                            
                            if (selectedJob && updatedJob.jobID === selectedJob.jobID) {
                                setSelectedJob(updatedJob);
                            }
                            
                            const currentStatus = updatedJob.currentStatus?.toLowerCase() || '';
                            const isSavedStatus = currentStatus === 'saved' || currentStatus.includes('saved');
                            
                            if (
                                pendingMove &&
                                pendingMove.jobID === updatedJob.jobID
                            ) {
                                if (pendingMove.status === 'deleted') {
                                if (updatedJob.attachments && Array.isArray(updatedJob.attachments) && updatedJob.attachments.length > 0) {
                                    onUpdateJobStatus(
                                        pendingMove.jobID,
                                        pendingMove.status,
                                        userDetails
                                    );
                                    setPendingMove(null);
                                    setShowJobModal(false);
                                    toastUtils.success("Attachment uploaded! Job card moved to Removed.");
                                }
                                } else {
                                    onUpdateJobStatus(
                                        pendingMove.jobID,
                                        pendingMove.status,
                                        userDetails
                                    );
                                    setPendingMove(null);
                                    setShowJobModal(false);
                                    const statusMessages: Record<JobStatus, string> = {
                                        'saved': 'Job card moved to Saved.',
                                        'applied': 'Attachment uploaded! Job card moved to Applied.',
                                        'interviewing': 'Attachment uploaded! Job card moved to Interviewing.',
                                        'offer': 'Attachment uploaded! Job card moved to Offer.',
                                        'rejected': 'Attachment uploaded! Job card moved to Rejected.',
                                        'deleted': 'Attachment uploaded! Job card moved to Removed.'
                                    };
                                    toastUtils.success(statusMessages[pendingMove.status] || "Attachment uploaded! Job card moved.");
                                }
                            } else if (isSavedStatus && updatedJob.attachments && Array.isArray(updatedJob.attachments) && updatedJob.attachments.length > 0) {
                                onUpdateJobStatus(
                                    updatedJob.jobID,
                                    'applied',
                                    userDetails
                                );
                                toastUtils.success("Attachment uploaded! Job card automatically moved to Applied.");
                            }
                        }}
                    />
                </Suspense>
            )}
            {(showJobForm || editingJob) && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <Suspense fallback={<LoadingScreen />}>
                            <JobForm
                                setUserJobs={setUserJobs}
                                job={editingJob}
                                onCancel={() => {
                                    setShowJobForm(false);
                                    setEditingJob(null);
                                }}
                            />
                        </Suspense>
                    </div>
                </div>
            )}
            {showRemovalLimitModal && (
                <Suspense fallback={<LoadingScreen />}>
                    <RemovalLimitModal
                        isOpen={showRemovalLimitModal}
                        onClose={() => setShowRemovalLimitModal(false)}
                    />
                </Suspense>
            )}
            {showOpsRemoveUserConfirm && pendingOpsUserRemovalJob && (
                <Suspense fallback={<LoadingScreen />}>
                    <OpsConfirmRemoveUserJobModal
                        isOpen={showOpsRemoveUserConfirm}
                        onClose={() => {
                            setShowOpsRemoveUserConfirm(false);
                            setPendingOpsUserRemovalJob(null);
                        }}
                        onConfirm={handleOpsRemoveUserJobConfirm}
                        jobTitle={pendingOpsUserRemovalJob.jobTitle}
                        companyName={pendingOpsUserRemovalJob.companyName}
                    />
                </Suspense>
            )}
            {showRemovalReasonModal && pendingRemovalJob && (
                <Suspense fallback={<LoadingScreen />}>
                    <RemovalReasonModal
                        isOpen={showRemovalReasonModal}
                        onClose={() => {
                            setShowRemovalReasonModal(false);
                            setPendingRemovalJob(null);
                        }}
                        onConfirm={handleRemovalReasonConfirm}
                        jobTitle={pendingRemovalJob.jobTitle}
                        companyName={pendingRemovalJob.companyName}
                    />
                </Suspense>
            )}
            {showRemovalReasonDisplayModal && removalReasonData && (
                <Suspense fallback={<LoadingScreen />}>
                    <RemovalReasonDisplayModal
                        isOpen={showRemovalReasonDisplayModal}
                        onClose={() => {
                            setShowRemovalReasonDisplayModal(false);
                            setRemovalReasonData(null);
                        }}
                        removalReason={removalReasonData.removalReason}
                        removalDate={removalReasonData.removalDate}
                        removedBy={removalReasonData.removedBy}
                        jobTitle={removalReasonData.jobTitle}
                        companyName={removalReasonData.companyName}
                    />
                </Suspense>
            )}

            <NotifyClientPasswordModal
                isOpen={showNotifyPasswordModal}
                onClose={() => {
                    setShowNotifyPasswordModal(false);
                    setNotifyPasswordError('');
                }}
                onConfirm={async (password) => {
                    if (password !== "flashfire@W") {
                        setNotifyPasswordError("Incorrect password. Please try again.");
                        return;
                    }
                    setShowNotifyPasswordModal(false);
                    setNotifyPasswordError('');
                    
                    if (!userDetails?.email) {
                        toastUtils.error('User email not found');
                        return;
                    }
                    
                    setNotifyLoading(true);
                    try {
                        const response = await fetch(`${API_BASE_URL}/api/whatsapp/send-notification`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                userEmail: userDetails.email,
                                message: `We have added the job cards. Could you please check them once.\n\nCheck your Job Tracker to review the details.\n\n🔗 Access your dashboard: https://portal.flashfirejobs.com/?tab=jobtracker\n\n✨ We're here to support your career journey!\n\nThank you!`,
                                sentBy: name || 'operations'
                            }),
                        });
                        const result = await response.json();
                        if (result.success) {
                            setNotifyCooldown(24 * 3600);
                            toastUtils.success('✅ Notification sent successfully! Client will receive WhatsApp message.');
                        } else {
                            if (response.status === 429) {
                                const remainingHours = result.remainingHours || 24;
                                setNotifyCooldown(Math.ceil(remainingHours) * 3600);
                                toastUtils.error(result.message || 'Notification already sent. Please wait 24 hours.');
                            } else {
                                toastUtils.error(result.message || 'Failed to send notification');
                            }
                        }
                    } catch (error) {
                        console.error('Error sending notification:', error);
                        toastUtils.error('Failed to send notification. Please try again.');
                    } finally {
                        setNotifyLoading(false);
                    }
                }}
                error={notifyPasswordError}
            />

            {/* TESTING: Temporary button to test the modal
            <button
                onClick={() => setShowRemovalLimitModal(true)}
                className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-red-600 transition-colors z-50"
            >
                Test Removal Limit Modal
            </button> */}
            </div>
        </div>
    );
};

export default JobTracker;