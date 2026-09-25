import {
  ArrowRight,
  Award,
  Briefcase,
  FileText,
  Plus,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import React, { useEffect, useContext, useState, Suspense, lazy, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useUserJobs } from "../state_management/UserJobs.tsx";
import { UserContext } from "../state_management/UserContext.js";
import { useUserProfile } from "../state_management/ProfileContext.tsx";
import LoadingScreen from "./LoadingScreen.tsx";
import NewUserModal from "./NewUserModal.tsx";
import DashboardManagerDisplay from "./DashboardManagerDisplay.tsx";
import { PAGE_HEADER_BAR, PAGE_HEADER_INNER, PAGE_MAIN } from "../styles/layout.ts";
import ReferralBenefitsDisplay from "./ReferralBenefitsDisplay.tsx";

const JobForm = lazy(() => import("./JobForm.tsx"));

/**
 * Epoch ms for ordering a job card, most trustworthy source first.
 *
 * The backend now sends `activityAt` (see Utils/jobActivityTime.js): creation
 * time read straight out of the ObjectId, merged with the latest update or
 * applied time. Use it whenever it is there.
 *
 * The string parsing below is only a fallback for a cached payload from before
 * that shipped. It exists because the stored dates are locale strings in three
 * different formats, and the previous version of this function assumed MM/DD
 * whenever the first number was <= 12 - which misread 98 of one client's 265
 * cards and is why April cards outranked May ones in Recent Activities.
 */
interface JobTimeFields {
  activityAt?: number | string | null;
  updatedAt?: string | null;
  dateAdded?: string | null;
  createdAt?: string | null;
}

const jobActivityMs = (job: JobTimeFields | null | undefined): number => {
  const direct = Number(job?.activityAt);
  if (Number.isFinite(direct) && direct > 0) return direct;
  return Math.max(
    parseCustomDate(job?.updatedAt || "").getTime(),
    parseCustomDate(job?.dateAdded || job?.createdAt || "").getTime()
  );
};

const parseCustomDate = (dateString: string): Date => {
  if (!dateString) return new Date(0);
  try {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(dateString)) {
      const iso = new Date(dateString);
      if (!isNaN(iso.getTime())) return iso;
    }
    const parts = dateString.trim().split(",");
    if (parts.length === 2) {
      const nums = parts[0].trim().split("/").map((p) => parseInt(p.trim(), 10));
      const timeMatch = parts[1].trim().match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm|AM|PM)?/);
      if (nums.length === 3 && !nums.some((n) => isNaN(n)) && timeMatch) {
        const rawMeridiem = timeMatch[4] || "";
        let dd: number;
        let mm: number;
        let yyyy = nums[2];
        if (nums[0] > 12) {
          dd = nums[0]; mm = nums[1];            // only DD/MM is legal
        } else if (nums[1] > 12) {
          mm = nums[0]; dd = nums[1];            // only MM/DD is legal
        } else if (rawMeridiem && rawMeridiem === rawMeridiem.toLowerCase()) {
          dd = nums[0]; mm = nums[1];            // lowercase meridiem = en-IN = D/M
        } else {
          mm = nums[0]; dd = nums[1];            // uppercase or absent = en-US = M/D
        }
        if (yyyy < 100) yyyy += 2000;
        if (dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12) {
          let hours = parseInt(timeMatch[1], 10);
          const minutes = parseInt(timeMatch[2], 10);
          const seconds = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
          const meridiem = rawMeridiem.toLowerCase();
          if (meridiem === "pm" && hours !== 12) hours += 12;
          if (meridiem === "am" && hours === 12) hours = 0;
          const date = new Date(yyyy, mm - 1, dd);
          date.setHours(hours, minutes, seconds);
          return date;
        }
      }
    }
    const native = new Date(dateString);
    if (!isNaN(native.getTime())) return native;
  } catch { /* fall through */ }
  return new Date(0);
};

const Dashboard: React.FC = () => {
  const context = useContext(UserContext);
  const navigate = useNavigate();
  const { userProfile } = useUserProfile();

  if (!context) {
    // navigate("/login");
    return null;
  }

  const { token, userDetails } = context;
  const { userJobs, setUserJobs, loading, refreshJobs } = useUserJobs();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showJobForm, setShowJobForm] = useState(false);

  useEffect(() => {
    const hasProfileValue = sessionStorage.getItem('hasProfile');
    if (hasProfileValue === 'false') setShowProfileModal(true);
  }, []);

  const stats = useMemo(() => {
    const safeJobs = Array.isArray(userJobs) ? userJobs : [];
    return safeJobs.reduce((acc, job) => {
      const status = job?.currentStatus?.toLowerCase() || '';
      if (status.startsWith('saved')) acc.saved++;
      else if (status.startsWith('applied')) acc.applied++;
      else if (status.startsWith('interviewing')) acc.interviewing++;
      else if (status.startsWith('offer')) acc.offer++;
      else if (status.startsWith('rejected')) acc.rejected++;
      else if (status.startsWith('deleted')) acc.deleted++;
      acc.total = acc.saved + acc.applied + acc.interviewing + acc.offer + acc.rejected;
      return acc;
    }, { total: 0, saved: 0, applied: 0, interviewing: 0, offer: 0, rejected: 0, deleted: 0 });
  }, [userJobs]);

  const uniqueJobs = useMemo(() => {
    if (!userJobs) return [];
    const seen = new Set<string>();
    return userJobs.filter((job) => {
      // Previously also required updatedAt, which silently hid any card that
      // had never been moved. jobID is the only field actually needed to dedupe.
      if (!job || !job.jobID) return false;
      if (seen.has(job.jobID)) return false;
      seen.add(job.jobID);
      return true;
    });
  }, [userJobs]);

  const recentJobs = useMemo(() => {
    return uniqueJobs
      // A card the client removed, or that the AI screened out, is not
      // "recent activity" - it is the opposite. These used to sit at the top of
      // the panel showing a bare "removed" badge with no explanation.
      .filter((job) => !/^(deleted|removed)/i.test(String(job?.currentStatus || "")))
      // Rank by the LATEST thing that happened to the card, not by when it was
      // added. A card added nine days ago that reached Interviewing this morning
      // is more recent activity than one added today and never touched.
      .map((job) => ({ job, at: jobActivityMs(job) }))
      .sort((a, b) => b.at - a.at)
      .slice(0, 6)
      .map((entry) => entry.job);
  }, [uniqueJobs]);

  const successRate = stats.total > 0 ? Math.round((stats.offer / stats.total) * 100) : 0;

  const handleJobFormSuccess = useCallback(() => {
    setShowJobForm(false);
    refreshJobs(true);
  }, [refreshJobs]);

  // MainContent only reads ?tab= on mount, so a full navigation is needed to
  // actually switch tabs.
  const goToJobTracker = useCallback(() => {
    window.location.href = "/?tab=jobs";
  }, []);

  const handleProfileComplete = useCallback(() => {
    sessionStorage.setItem('hasProfile', 'true');
    setShowProfileModal(false);
  }, []);

  if (loading && userJobs.length === 0) return <LoadingScreen />;

  const userName = userProfile?.firstName || userDetails?.name?.split(" ")?.[0] || "User";
  const fullName = userProfile
    ? `${userProfile.firstName || ""} ${userProfile.lastName || ""}`.trim()
    : userDetails?.name || "User";

  const statCards = [
    { label: "Total Applications", value: stats.total, icon: FileText, accent: "border-l-blue-500", iconClass: "bg-blue-50 text-blue-600" },
    { label: "Active Interviews", value: stats.interviewing, icon: Users, accent: "border-l-orange-500", iconClass: "bg-orange-50 text-orange-600" },
    { label: "Offers Received", value: stats.offer, icon: Award, accent: "border-l-green-500", iconClass: "bg-green-50 text-green-600" },
    { label: "Success Rate", value: `${successRate}%`, icon: TrendingUp, accent: "border-l-purple-500", iconClass: "bg-purple-50 text-purple-600" },
  ];

  return (
    <div className="relative min-h-dvh text-zinc-900 bg-gray-50">
      {showProfileModal && (
        <NewUserModal
          setUserProfileFormVisibility={setShowProfileModal}
          mode="create"
          startSection="personal"
          onProfileComplete={handleProfileComplete}
        />
      )}
      {showJobForm && (
        <Suspense fallback={<LoadingScreen />}>
          <JobForm
            job={null}
            onCancel={() => setShowJobForm(false)}
            onSuccess={handleJobFormSuccess}
            setUserJobs={setUserJobs}
          />
        </Suspense>
      )}

      {/* Header bar */}
      <div className={PAGE_HEADER_BAR}>
        <div className={`${PAGE_HEADER_INNER} flex flex-col md:flex-row md:items-center md:justify-between gap-4`}>
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-orange-500 text-white flex items-center justify-center text-xl sm:text-2xl font-bold uppercase flex-shrink-0">
              {(fullName || "U").charAt(0)}
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight truncate">
                Welcome, <span className="text-orange-500">{fullName}</span>
              </h1>
              <p className="text-sm text-gray-500 mt-1">Track your applications here, success starts today</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:items-stretch gap-3 [&>*]:min-w-0">
            <DashboardManagerDisplay />
            <ReferralBenefitsDisplay />
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className={PAGE_MAIN}>
        <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 mb-5 border-l-4 border-orange-500 pl-3 leading-tight">Overview</h2>

        {/* Empty state / welcome for new users */}
        {uniqueJobs.length === 0 && (
          <div className="mb-8 bg-gradient-to-r from-orange-500 to-orange-600 p-5 sm:p-6 text-white flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 bg-white/15 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold mb-1">Welcome aboard, {userName}!</h3>
                <p className="text-orange-100 text-sm max-w-2xl">
                  Our team will now begin working on your resume, and we'll share a draft here for your review once it's ready. It usually takes around 2-3 days to create a resume from scratch.
                </p>
              </div>
            </div>
            <div className="flex-shrink-0 md:text-right">
              <p className="text-sm font-semibold">No jobs yet</p>
              <p className="text-orange-100 text-xs mb-3">Add your first job application to start tracking.</p>
              <button
                onClick={() => setShowJobForm(true)}
                className="inline-flex w-full md:w-auto items-center justify-center gap-2 bg-white text-orange-600 hover:bg-orange-50 px-5 py-2.5 text-sm font-semibold transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Your First Job
              </button>
            </div>
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {statCards.map(({ label, value, icon: Icon, accent, iconClass }) => (
            <div
              key={label}
              className={`bg-white border border-gray-200 border-l-4 ${accent} p-5 transition-shadow hover:shadow-md`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-gray-500">{label}</p>
                <div className={`w-9 h-9 flex items-center justify-center flex-shrink-0 ${iconClass}`}>
                  <Icon className="w-[18px] h-[18px]" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 mt-2 tabular-nums">{value}</p>
            </div>
          ))}
        </div>

        {/* Recent Activities */}
        {recentJobs.length > 0 && <RecentActivity recentJobs={recentJobs} onViewAll={goToJobTracker} />}
      </main>
    </div>
  );
};

const statusBadgeClass = (status: string): string => {
  const key = status.toLowerCase().split(" ")[0];
  if (key.startsWith("applied")) return "bg-yellow-50 text-yellow-700 border border-yellow-200";
  if (key.startsWith("interviewing")) return "bg-blue-50 text-blue-700 border border-blue-200";
  if (key.startsWith("offer")) return "bg-green-50 text-green-700 border border-green-200";
  if (key.startsWith("rejected")) return "bg-red-50 text-red-700 border border-red-200";
  return "bg-white text-gray-600 border border-gray-300";
};

const statusDotClass = (status: string): string => {
  const key = status.toLowerCase();
  if (key.startsWith("applied")) return "bg-yellow-500";
  if (key.startsWith("interviewing")) return "bg-blue-500";
  if (key.startsWith("offer")) return "bg-green-500";
  if (key.startsWith("rejected")) return "bg-red-500";
  return "bg-gray-400";
};

// Client-facing status text.
//
// currentStatus carries an operator attribution suffix - UpdateChanges.js turns
// "applied" into "applied by Shubhangi" so operations can see who moved a card.
// That is internal. This panel rendered it verbatim, so clients were reading the
// name of the staff member working their account. Strip it here, and collapse
// every removal variant ("removed by ai", "deleted by <operator>") to a plain
// "removed" the way the backend's own /^(deleted|removed)/i test does.
const clientStatusLabel = (status: string | undefined): string => {
  const s = String(status || "saved").trim().toLowerCase();
  if (/^(deleted|removed)/.test(s)) return "removed";
  const stripped = s.replace(/\s+by\s+.*$/i, "").trim();
  return stripped || "saved";
};

const RecentActivity = React.memo(({ recentJobs, onViewAll }: { recentJobs: any[]; onViewAll: () => void }) => (
  <div className="bg-white border border-gray-200">
    {/* Header */}
    <div className="flex items-start justify-between gap-4 px-4 sm:px-6 pt-5 sm:pt-6 pb-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Recent Activities</h2>
        <p className="text-sm text-gray-400 mt-0.5">Track your recent application activities</p>
      </div>
      <button
        onClick={onViewAll}
        className="inline-flex items-center gap-1 text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors mt-1 flex-shrink-0"
      >
        View all
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>

    <ul className="divide-y divide-gray-100 border-t border-gray-100">
      {recentJobs.map((job) => {
        const label = clientStatusLabel(job.currentStatus);
        const company = String(job.companyName || "").trim();
        return (
          <li key={job.jobID} className="flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3.5 hover:bg-gray-50 transition-colors">
            <div className="w-9 h-9 bg-orange-50 text-orange-600 border border-orange-100 flex items-center justify-center text-sm font-bold uppercase flex-shrink-0">
              {company ? company[0] : <Briefcase className="w-4 h-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate" title={job.jobTitle}>{job.jobTitle}</p>
              <p className="text-xs text-gray-500 truncate">{job.companyName}</p>
            </div>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium capitalize flex-shrink-0 ${statusBadgeClass(label)}`}>
              <span className={`w-1.5 h-1.5 ${statusDotClass(label)}`} />
              {label}
            </span>
          </li>
        );
      })}
    </ul>
  </div>
));

export default Dashboard;
