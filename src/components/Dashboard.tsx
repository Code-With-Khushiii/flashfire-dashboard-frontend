import {
  Briefcase,
  FileText,
  TrendingUp,
  Users,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import type React from "react";
import { useEffect, useContext, useState, Suspense, lazy } from "react";
import { useNavigate } from "react-router-dom";
import { useUserJobs } from "../state_management/UserJobs.tsx";
import { UserContext } from "../state_management/UserContext.js";
import { useUserProfile } from "../state_management/ProfileContext.tsx";
import LoadingScreen from "./LoadingScreen.tsx";
import NewUserModal from "./NewUserModal.tsx";
import DashboardManagerDisplay from "./DashboardManagerDisplay.tsx";
import { useOperationsStore } from "../state_management/Operations.ts";
import { useJobsSessionStore } from "../state_management/JobsSessionStore";

const JobForm = lazy(() => import("./JobForm"));

const Dashboard: React.FC = () => {
  const context = useContext(UserContext);
  const navigate = useNavigate();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const { userProfile, isProfileComplete } = useUserProfile();
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showJobForm, setShowJobForm] = useState(false);
  const { role } = useOperationsStore();
  const { userJobs, setUserJobs } = useUserJobs();
  const { getDashboardStats } = useJobsSessionStore();
  const dashboardStats = getDashboardStats();

  // -------------------- Fetch Jobs --------------------
  async function FetchAllJobs(localToken: string, localUserDetails: any) {
    if (!localToken || !localUserDetails) return;
    try {
      setLoadingDetails(true);
      const endpoint =
        role === "operations"
          ? `${API_BASE_URL}/operations/getalljobs`
          : `${API_BASE_URL}/getalljobs`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localToken}`,
        },
        body: JSON.stringify({ email: localUserDetails.email }),
      });
      const data = await res.json();
      if (res.ok) {
        setUserJobs(data?.allJobs || []);
      } else if (
        data.message === "invalid token please login again" ||
        data.message === "Invalid token or expired"
      ) {
        if (context?.refreshToken) {
          const refreshed = await context.refreshToken();
          if (refreshed) {
            setTimeout(
              () => FetchAllJobs(context.token!, context.userDetails!),
              200
            );
            return;
          }
        }
        localStorage.clear();
        navigate("/login");
      }
    } catch (err) {
      console.error("Error fetching jobs:", err);
    } finally {
      setLoadingDetails(false);
    }
  }

  // -------------------- Lifecycle --------------------
  useEffect(() => {
    if (!context) {
      navigate("/login");
      return;
    }

    const { token, userDetails } = context;

    const welcomeFlag = localStorage.getItem("welcomeShown");
    if (!welcomeFlag) {
      setShowWelcome(true);
      localStorage.setItem("welcomeShown", "true");
    }

    if (!isProfileComplete()) setShowProfileModal(true);
    else setShowProfileModal(false);

    if (userJobs.length === 0) FetchAllJobs(token, userDetails);
  }, [context, userJobs, isProfileComplete]);

  // -------------------- Helpers --------------------
  const stats = dashboardStats;
  const successRate =
    stats.total > 0 ? Math.round((stats.offer / stats.total) * 100) : 0;

  const parseCustomDate = (dateString: string): Date => {
    if (!dateString) return new Date(0);
    try {
      const standard = new Date(dateString);
      if (!isNaN(standard.getTime())) return standard;
      const cleaned = dateString.replace(/,/g, "").trim();
      const parts = cleaned.split(" ");
      if (parts.length >= 2) {
        const datePart = parts[0];
        const timePart = parts.slice(1).join(" ");
        const [day, month, year] = datePart.split("/");
        if (day && month && year) {
          const date = new Date(
            Number(year),
            Number(month) - 1,
            Number(day)
          );
          const match = timePart.match(
            /(\d{1,2}):(\d{2}):(\d{2})\s*(am|pm)?/i
          );
          if (match) {
            let [_, h, m, s, period] = match;
            let hours = Number(h);
            const minutes = Number(m);
            const seconds = Number(s);
            if (period?.toLowerCase() === "pm" && hours !== 12) hours += 12;
            if (period?.toLowerCase() === "am" && hours === 12) hours = 0;
            date.setHours(hours, minutes, seconds);
          }
          return date;
        }
      }
      const iso = new Date(dateString);
      if (!isNaN(iso.getTime())) return iso;
    } catch (err) {
      console.warn("Date parse failed:", dateString, err);
    }
    return new Date(0);
  };

  const uniqueJobs =
    userJobs?.filter(
      (job, index, self) =>
        job &&
        job.updatedAt &&
        job.jobID &&
        self.findIndex((j) => j.jobID === job.jobID) === index
    ) || [];

  const recentJobs =
    uniqueJobs
      ?.sort((a, b) => {
        const dateA = parseCustomDate(
          a?.updatedAt || a?.createdAt || a?.dateAdded || ""
        );
        const dateB = parseCustomDate(
          b?.updatedAt || b?.createdAt || b?.dateAdded || ""
        );
        return dateB.getTime() - dateA.getTime();
      })
      ?.slice(0, 6) || [];

  useEffect(() => {
    console.log("userJobs updated, recalculating recent jobs");
  }, [userJobs]);

  if (loadingDetails) return <LoadingScreen />;
    return (
    <div className="relative min-h-dvh text-zinc-900 overflow-x-hidden">
      {/* NewUserModal */}
      {showProfileModal && (
        <NewUserModal
          setUserProfileFormVisibility={setShowProfileModal}
          mode="create"
          startSection="personal"
        />
      )}

      {/* Job Form Modal */}
      {showJobForm && (
        <Suspense fallback={<LoadingScreen />}>
          <JobForm
            job={null}
            onCancel={() => setShowJobForm(false)}
            onSuccess={() => {
              setShowJobForm(false);
              if (context?.token && context?.userDetails) {
                FetchAllJobs(context.token, context.userDetails);
              }
            }}
            setUserJobs={setUserJobs}
          />
        </Suspense>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row items-start justify-between gap-4">
            <div className="flex-1 border-l-4 border-orange-600 pl-4 md:pl-6 py-2">
              <h1 className="mt-2 text-3xl md:text-4xl font-extrabold tracking-tight leading-[1.15]">
                <span className="text-zinc-900">Welcome to Your</span>{" "}
                <span className="inline-block bg-gradient-to-r from-[#FF5722] to-[#FF6B00] bg-clip-text text-transparent">
                  Career Dashboard
                </span>
              </h1>
              <p className="text-base md:text-lg text-gray-600 leading-relaxed max-w-3xl">
                Track your job applications, monitor your progress, and optimize your career journey with{" "}
                <span className="font-semibold text-orange-600">AI-powered insights</span>.
              </p>
            </div>

            {/* Dashboard Manager Display */}
            <div className="w-full md:w-auto">
              <DashboardManagerDisplay />
            </div>
          </div>
        </div>

        {/* Zero jobs hint */}
        {uniqueJobs.length === 0 && (
          <div className="mb-8 rounded-xl border border-dashed border-gray-300 bg-white p-5 md:p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">You have no jobs yet</h3>
            <p className="text-gray-600 mb-4">
              Start by adding your first job application to kick off tracking and insights.
            </p>
            <button
              onClick={() => setShowJobForm(true)}
              className="w-full sm:w-auto bg-gradient-to-r from-orange-300 to-red-300 hover:from-orange-600 hover:to-red-700 text-gray hover:text-white px-5 py-2 rounded-lg font-medium transition-all duration-200"
            >
              Add Your First Job
            </button>
          </div>
        )}

        {/* Stats Cards (same visuals; stack on mobile, 2-col on md, 4-col on lg) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6 mb-8">
          {/* Total Applications */}
          <div className="bg-white rounded-xl shadow-sm p-5 md:p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">
              {userJobs?.length -
                userJobs.filter((items) =>
                  items.currentStatus?.toLowerCase().startsWith("deleted")
                ).length}
            </h3>
            <p className="text-gray-600 text-sm">Total Applications</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${Math.min(100, (stats.total / 50) * 100)}%` }}
              />
            </div>
          </div>

          {/* Active Interviews */}
          <div className="bg-white rounded-xl shadow-sm p-5 md:p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.interviewing}</h3>
            <p className="text-gray-600 text-sm">Active Interviews</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
              <div
                className="bg-orange-600 h-2 rounded-full"
                style={{ width: `${Math.min(100, (stats.interviewing / 10) * 100)}%` }}
              />
            </div>
          </div>

          {/* Offers Received */}
          <div className="bg-white rounded-xl shadow-sm p-5 md:p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">
              {userJobs?.filter((item) => item.currentStatus.startsWith("offer")).length}
            </h3>
            <p className="text-gray-600 text-sm">Offers Received</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
              <div
                className="bg-green-600 h-2 rounded-full"
                style={{ width: `${Math.min(100, (stats.offer / 5) * 100)}%` }}
              />
            </div>
          </div>

          {/* Success Rate */}
          <div className="bg-white rounded-xl shadow-sm p-5 md:p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{successRate}%</h3>
            <p className="text-gray-600 text-sm">Success Rate</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
              <div
                className="bg-purple-600 h-2 rounded-full"
                style={{ width: `${successRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Secondary Stats (unchanged visuals; responsive spacing) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-5 md:p-6 border border-gray-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{stats.applied}</h3>
                <p className="text-gray-600">Applications Sent</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5 md:p-6 border border-gray-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  {userJobs?.filter((item) =>
                    item.currentStatus?.toLowerCase().startsWith("saved")
                  ).length}
                </h3>
                <p className="text-gray-600">Jobs Saved</p>
              </div>
            </div>
          </div>
        </div>

        {/* Application Pipeline (full-page vertical scroll; stacks on mobile) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 md:p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Application Pipeline</h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
            {/* Saved */}
            <div className="flex flex-col items-center space-y-2">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                <Clock className="w-8 h-8 text-gray-400" />
              </div>
              <span className="text-sm font-medium text-gray-600">Saved</span>
              <span className="text-lg font-bold text-gray-900">
                {userJobs?.filter((item) =>
                  item.currentStatus?.toLowerCase().startsWith("saved")
                ).length}
              </span>
            </div>

            {/* Applied */}
            <div className="flex flex-col items-center space-y-2">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-gray-600">Applied</span>
              <span className="text-lg font-bold text-gray-900">{stats.applied}</span>
            </div>

            {/* Interview */}
            <div className="flex flex-col items-center space-y-2">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                <Users className="w-8 h-8 text-orange-600" />
              </div>
              <span className="text-sm font-medium text-gray-600">Interview</span>
              <span className="text-lg font-bold text-gray-900">{stats.interviewing}</span>
            </div>

            {/* Offer */}
            <div className="flex flex-col items-center space-y-2">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <span className="text-sm font-medium text-gray-600">Offer</span>
              <span className="text-lg font-bold text-gray-900">{stats.offer}</span>
            </div>

            {/* Rejected */}
            <div className="flex flex-col items-center space-y-2">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <span className="text-sm font-medium text-gray-600">Rejected</span>
              <span className="text-lg font-bold text-gray-900">{stats.rejected}</span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        {recentJobs.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 md:p-6 mt-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Recent Activity</h2>
            <div className="space-y-4">
              {recentJobs?.map((job) => {
                const key = (job.currentStatus || "saved").toLowerCase().split(" ")[0];

                const statusConfig: Record<
                  string,
                  {
                    color: string;
                    icon: React.ComponentType<any>;
                    label: string;
                    bgColor: string;
                    textColor: string;
                  }
                > = {
                  saved: {
                    color: "bg-gray-100 text-gray-700 border-gray-200",
                    bgColor: "bg-gray-100",
                    textColor: "text-gray-600",
                    icon: Clock,
                    label: "Saved",
                  },
                  applied: {
                    color: "bg-blue-100 text-blue-700 border-blue-200",
                    bgColor: "bg-blue-100",
                    textColor: "text-blue-800",
                    icon: FileText,
                    label: "Applied",
                  },
                  interviewing: {
                    color: "bg-amber-100 text-amber-700 border-amber-200",
                    bgColor: "bg-yellow-100",
                    textColor: "text-yellow-800",
                    icon: Users,
                    label: "Interviewing",
                  },
                  offer: {
                    color: "bg-green-100 text-green-700 border-green-200",
                    bgColor: "bg-green-100",
                    textColor: "text-green-800",
                    icon: CheckCircle,
                    label: "Offer",
                  },
                  rejected: {
                    color: "bg-red-100 text-red-700 border-red-200",
                    bgColor: "bg-red-100",
                    textColor: "text-red-800",
                    icon: XCircle,
                    label: "Rejected",
                  },
                  deleted: {
                    color: "bg-gray-100 text-gray-700 border-gray-200",
                    bgColor: "bg-gray-100",
                    textColor: "text-gray-600",
                    icon: XCircle,
                    label: "Deleted",
                  },
                };

                const config = statusConfig[key] || statusConfig.saved;
                const Icon = config.icon;

                return (
                  <div key={job.jobID} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                    <div className={`w-10 h-10 ${config.bgColor} rounded-full flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{job.jobTitle}</p>
                      <p className="text-sm text-gray-500">{job.companyName}</p>
                    </div>
                    <div className="flex-shrink-0">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`}
                      >
                        {job.currentStatus}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Welcome Message - (original condition kept) */}
        {uniqueJobs.length === 0 && (
          <div className="mt-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-5 md:p-6 text-white">
            <h3 className="text-lg md:text-xl font-bold mb-2">
              Welcome aboard, {userProfile?.firstName || context?.userDetails?.name?.split(" ")?.[0] || "User"}! 🎉
            </h3>
            <p className="text-orange-100">
              Our team will now begin working on your resume, and we'll share a draft here for your review once it's ready. It usually takes
              around 2-3 days to create a resume from scratch.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
