import {
  Briefcase,
  FileText,
  TrendingUp,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Plus,
} from "lucide-react";
import React, { useEffect, useContext, useState, Suspense, lazy, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useUserJobs } from "../state_management/UserJobs.tsx";
import { UserContext } from "../state_management/UserContext.js";
import { useUserProfile } from "../state_management/ProfileContext.tsx";
import LoadingScreen from "./LoadingScreen.tsx";
import NewUserModal from "./NewUserModal.tsx";
import DashboardManagerDisplay from "./DashboardManagerDisplay.tsx";
import ReferralBenefitsDisplay from "./ReferralBenefitsDisplay.tsx";

const JobForm = lazy(() => import("./JobForm.tsx"));

const parseCustomDate = (dateString: string): Date => {
  if (!dateString) return new Date(0);
  try {
    if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(dateString)) {
      const iso = new Date(dateString);
      if (!isNaN(iso.getTime())) return iso;
    }
    const parts = dateString.trim().split(",");
    if (parts.length === 2) {
      const datePart = parts[0].trim();
      const timePart = parts[1].trim();
      const dateNumbers = datePart.split("/").map((p) => parseInt(p.trim()));
      if (dateNumbers.length === 3) {
        let dd, mm, yyyy;
        if (dateNumbers[0] > 12) { dd = dateNumbers[0]; mm = dateNumbers[1]; yyyy = dateNumbers[2]; }
        else { mm = dateNumbers[0]; dd = dateNumbers[1]; yyyy = dateNumbers[2]; }
        if (dd && mm && yyyy) {
          if (yyyy < 100) yyyy += 2000;
          const date = new Date(yyyy, mm - 1, dd);
          const timeMatch = timePart.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)/i);
          if (timeMatch) {
            let hours = parseInt(timeMatch[1]);
            const minutes = parseInt(timeMatch[2]);
            const seconds = timeMatch[3] ? parseInt(timeMatch[3]) : 0;
            const period = timeMatch[4]?.toLowerCase();
            if (period === "pm" && hours !== 12) hours += 12;
            if (period === "am" && hours === 12) hours = 0;
            date.setHours(hours, minutes, seconds);
          }
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
    navigate("/login");
    return null;
  }

  const { token, userDetails } = context;
  const { userJobs, setUserJobs, loading, refreshJobs } = useUserJobs();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showJobForm, setShowJobForm] = useState(false);

  useEffect(() => {
    if (!token || !userDetails) { navigate("/login"); return; }
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
      if (!job || !job.updatedAt || !job.jobID) return false;
      if (seen.has(job.jobID)) return false;
      seen.add(job.jobID);
      return true;
    });
  }, [userJobs]);

  const recentJobs = useMemo(() => {
    return [...uniqueJobs]
      .sort((a, b) => {
        const dateA = parseCustomDate(a?.dateAdded || a?.createdAt || "");
        const dateB = parseCustomDate(b?.dateAdded || b?.createdAt || "");
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 6);
  }, [uniqueJobs]);

  const successRate = stats.total > 0 ? Math.round((stats.offer / stats.total) * 100) : 0;

  const handleJobFormSuccess = useCallback(() => {
    setShowJobForm(false);
    refreshJobs(true);
  }, [refreshJobs]);

  const handleProfileComplete = useCallback(() => {
    sessionStorage.setItem('hasProfile', 'true');
    setShowProfileModal(false);
  }, []);

  if (loading && userJobs.length === 0) return <LoadingScreen />;

  const userName = userProfile?.firstName || userDetails?.name?.split(" ")?.[0] || "User";
  const fullName = userProfile
    ? `${userProfile.firstName || ""} ${userProfile.lastName || ""}`.trim()
    : userDetails?.name || "User";

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
      <div className="bg-white border-b border-gray-200 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-900 leading-tight">
            Welcome, <span className="text-orange-500">{fullName}</span>
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Track your applications here, success starts today</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="hidden sm:block">
            <DashboardManagerDisplay />
          </div>
          <div className="hidden sm:block">
            <ReferralBenefitsDisplay />
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search"
              className="pl-9 pr-4 py-2 border border-gray-200 text-sm focus:outline-none focus:border-orange-400 w-40 sm:w-48 bg-gray-50"
            />
          </div>
          <button
            onClick={() => setShowJobForm(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Add Jobs
          </button>
        </div>
      </div>

      {/* Main content */}
      <main className="px-5 py-6">
        {/* Overview heading */}
        <h2 className="text-2xl font-bold text-gray-900 mb-5">Overview</h2>

        {/* Empty state */}
        {uniqueJobs.length === 0 && (
          <div className="mb-6 border border-dashed border-gray-300 bg-white p-5">
            <h3 className="text-base font-semibold text-gray-900 mb-1">No jobs yet</h3>
            <p className="text-gray-500 text-sm mb-3">Add your first job application to start tracking.</p>
            <button
              onClick={() => setShowJobForm(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 text-sm font-medium transition-colors"
            >
              Add Your First Job
            </button>
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-gray-200 p-5">
            <div className="w-10 h-10 bg-blue-100 flex items-center justify-center mb-4">
              <FileText className="w-5 h-5 text-blue-500" />
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-1">{stats.total}</h3>
            <p className="text-gray-500 text-sm">Total Applications</p>
          </div>

          <div className="bg-white border border-gray-200 p-5">
            <div className="w-10 h-10 bg-orange-100 flex items-center justify-center mb-4">
              <Users className="w-5 h-5 text-orange-500" />
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-1">{stats.interviewing}</h3>
            <p className="text-gray-500 text-sm">Active Interviews</p>
          </div>

          <div className="bg-white border border-gray-200 p-5">
            <div className="w-10 h-10 bg-green-100 flex items-center justify-center mb-4">
              <Clock className="w-5 h-5 text-green-500" />
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-1">{stats.offer}</h3>
            <p className="text-gray-500 text-sm">Offers Received</p>
          </div>

          <div className="bg-white border border-gray-200 p-5">
            <div className="w-10 h-10 bg-purple-100 flex items-center justify-center mb-4">
              <TrendingUp className="w-5 h-5 text-purple-500" />
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-1">{successRate}%</h3>
            <p className="text-gray-500 text-sm">Success Rate</p>
          </div>
        </div>

        {/* Recent Activities */}
        {recentJobs.length > 0 && <RecentActivity recentJobs={recentJobs} />}

        {/* Welcome message for new users */}
        {uniqueJobs.length === 0 && (
          <div className="mt-6 bg-gradient-to-r from-orange-500 to-orange-600 p-5 text-white">
            <h3 className="text-base font-bold mb-1">Welcome aboard, {userName}!</h3>
            <p className="text-orange-100 text-sm">
              Our team will now begin working on your resume, and we'll share a draft here for your review once it's ready. It usually takes around 2-3 days to create a resume from scratch.
            </p>
          </div>
        )}
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
  return "bg-white text-gray-600 border border-gray-200";
};

const statusIcon = (status: string) => {
  const key = status.toLowerCase().split(" ")[0];
  if (key.startsWith("applied")) return <FileText className="w-4 h-4 text-yellow-500" />;
  if (key.startsWith("interviewing")) return <Users className="w-4 h-4 text-blue-500" />;
  if (key.startsWith("offer")) return <CheckCircle className="w-4 h-4 text-green-500" />;
  if (key.startsWith("rejected")) return <XCircle className="w-4 h-4 text-red-400" />;
  return <Clock className="w-4 h-4 text-gray-400" />;
};

const RecentActivity = React.memo(({ recentJobs }: { recentJobs: any[] }) => (
  <div className="bg-white border border-gray-200 p-5">
    <div className="flex items-center justify-between mb-1">
      <h2 className="text-base font-bold text-gray-900">Recent Activites</h2>
      <button className="text-sm text-gray-400 hover:text-gray-600 transition-colors">View all</button>
    </div>
    <p className="text-sm text-gray-400 mb-5">Track your recent application activities</p>

    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px]">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left text-xs font-semibold text-gray-500 pb-3 w-1/2">Role</th>
            <th className="text-left text-xs font-semibold text-gray-500 pb-3 w-1/4">Company</th>
            <th className="text-left text-xs font-semibold text-gray-500 pb-3 w-1/4">Status</th>
          </tr>
        </thead>
        <tbody>
          {recentJobs.map((job) => (
            <tr key={job.jobID} className="border-b border-gray-50 last:border-0">
              <td className="py-3 pr-4">
                <div className="flex items-center gap-2.5">
                  {statusIcon(job.currentStatus || "saved")}
                  <span className="text-sm text-gray-700 truncate max-w-[200px]">{job.jobTitle}</span>
                </div>
              </td>
              <td className="py-3 pr-4 text-sm text-gray-500 truncate max-w-[120px]">{job.companyName}</td>
              <td className="py-3">
                <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium ${statusBadgeClass(job.currentStatus || "saved")}`}>
                  {job.currentStatus}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
));

export default Dashboard;
