
import { Briefcase, FileText, TrendingUp, Users, Target, CheckCircle, XCircle, Clock, Award } from 'lucide-react';
import React, { useEffect, useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserJobs } from '../state_management/UserJobs.tsx';
import { UserContext } from '../state_management/UserContext.js';
import { useUserProfile } from '../state_management/ProfileContext.tsx';
import LoadingScreen from './LoadingScreen.tsx';
import { calculateDashboardStats } from '../utils/storage.ts';
import NewUserModal from './NewUserModal.tsx'

const Dashboard: React.FC = ({ setUserProfileFormVisibility }) => {
  const context = useContext(UserContext);
  const navigate = useNavigate();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const { userProfile, isProfileComplete } = useUserProfile();

  if (!context) {
    console.error("UserContext is null");
    navigate('/login');
    return null;
  }

  const { token, userDetails, setData } = context;
  const { userJobs, setUserJobs, loading } = useUserJobs();
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  async function FetchAllJobs(localToken, localUserDetails) {
    try {
      setLoadingDetails(true);
      const res = await fetch(`${API_BASE_URL}/getalljobs`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localToken}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setUserJobs(data?.allJobs);
      } else if (data.message === 'invalid token please login again' || data.message === 'Invalid token or expired') {
        console.log('Token invalid, attempting refresh...');

        // Try to refresh token
        if (context?.refreshToken) {
          const refreshSuccess = await context.refreshToken();
          if (refreshSuccess) {
            // Retry the request with new token
            console.log('Token refreshed, retrying job fetch...');
            setTimeout(() => FetchAllJobs(context.token, context.userDetails), 100);
            return;
          }
        }

        console.log('Token refresh failed, clearing storage and redirecting to login');
        localStorage.clear();
        navigate('/login');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetails(false);
    }
  }

  useEffect(() => {
    if (!token || !userDetails) {
      navigate('/login');
      return;
    }

    // Check if profile is complete
    console.log('Dashboard - Profile completion check:', {
      userProfile: userProfile,
      isComplete: isProfileComplete(),
      hasProfile: !!userProfile
    });

    if (!isProfileComplete()) {
      console.log('Profile incomplete, showing modal');
      setShowProfileModal(true);
    } else {
      console.log('Profile complete, hiding modal');
      setShowProfileModal(false);
    }

    FetchAllJobs(token, userDetails);
  }, [token, userDetails, isProfileComplete]);
  const stats = calculateDashboardStats(userJobs);

  const recentJobs = userJobs
    .sort((a, b) => new Date(b?.updatedAt).getTime() - new Date(a?.updatedAt).getTime())
    .slice(0, 6);

  const successRate = stats.total > 0 ? Math.round((stats.offer / stats.total) * 100) : 0;
  const responseRate = stats.total > 0 ? Math.round(((stats.interviewing + stats.offer) / stats.total) * 100) : 0;



  if (loadingDetails) {
    return <LoadingScreen />;
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {showProfileModal && (
        <NewUserModal
          setUserProfileFormVisibility={setShowProfileModal}
          onProfileComplete={() => setShowProfileModal(false)}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl lg:text-5xl font-bold font-bold text-gray-900 mb-6 leading-tight">
            Welcome to Your Career Dashboard
          </h1>
          <p className="text-xl lg:text-2xl text-slate-600 max-w-3xl mx-auto leading-relaxed font-light">
            Track your job applications, monitor your progress, and optimize your career journey with AI-powered insights.
          </p>
        </div>
        {/* {userDetails.planType === 'Free Trial' && (
  <div className="rounded-2xl p-2 m-4 border-2 absolute w-1/4 top-[10%] left-[70%] border-yellow-400 border-dashed bg-yellow-50 shadow-md">
    <h1 className="text-lg font-semibold text-yellow-800 mb-2">
      You’re on the <span className="underline">Free Plan</span>. Upgrade to a <span className="font-bold">Paid Plan</span> to automate your entire job search!
    </h1>
    <p className="text-sm text-gray-700">
      <span className="font-medium">Job Applications Remaining:</span>{" "}
      {
        userJobs.filter(
          (item) =>
            item.currentStatus !== "saved" &&
            item.currentStatus !== "deleted"
        ).length
      }
    </p>
  </div>
)} */}

        {/* Main Stats Grid */}
       {/* Main Stats Grid */}
        <div data-aos="fade-right" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Total Applications */}
          <div className="group bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg shadow-blue-100/50 border border-white/50 p-8 hover:shadow-2xl hover:shadow-blue-200/30 transition-all duration-500 transform hover:-translate-y-2 hover:scale-105">
            <div className="flex items-center justify-between mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-all duration-300">
                <Briefcase className="w-7 h-7 text-white" />
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-900">
                  {userJobs?.length - userJobs.filter((items) => items.currentStatus == "deleted").length}
                </p>
                <p className="text-sm font-medium text-gray-500">Total Applications</p>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (stats.total / 50) * 100)}%` }}
              />
            </div>
          </div>

          {/* Active Interviews */}
          <div className="group bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg shadow-amber-100/50 border border-white/50 p-8 hover:shadow-2xl hover:shadow-amber-200/30 transition-all duration-500 transform hover:-translate-y-2 hover:scale-105">
            <div className="flex items-center justify-between mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/25 group-hover:shadow-amber-500/40 transition-all duration-300">
                <Users className="w-7 h-7 text-white" />
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-900">
                  {userJobs?.filter((item) => item.currentStatus == "interviewing").length}
                </p>
                <p className="text-sm font-medium text-gray-500">Active Interviews</p>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (stats.interviewing / 10) * 100)}%` }}
              />
            </div>
          </div>

          {/* Offers Received */}
          <div className="group bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg shadow-emerald-100/50 border border-white/50 p-8 hover:shadow-2xl hover:shadow-emerald-200/30 transition-all duration-500 transform hover:-translate-y-2 hover:scale-105">
            <div className="flex items-center justify-between mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/25 group-hover:shadow-emerald-500/40 transition-all duration-300">
                <Award className="w-7 h-7 text-white" />
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-900">
                  {userJobs?.filter((item) => item.currentStatus == "offer").length}
                </p>
                <p className="text-sm font-medium text-gray-500">Offers Received</p>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (stats.offer / 5) * 100)}%` }}
              />
            </div>
          </div>

          {/* Success Rate */}
          <div className="group bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg shadow-purple-100/50 border border-white/50 p-8 hover:shadow-2xl hover:shadow-purple-200/30 transition-all duration-500 transform hover:-translate-y-2 hover:scale-105">
            <div className="flex items-center justify-between mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/25 group-hover:shadow-purple-500/40 transition-all duration-300">
                <TrendingUp className="w-7 h-7 text-white" />
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-900">{successRate}%</p>
                <p className="text-sm font-medium text-gray-500">Success Rate</p>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${successRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Secondary Stats */}
        <div className="flex justify-center gap-8 mb-12">
          <div className="w-1/3 bg-white rounded-xl shadow-md border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold text-gray-900">{userJobs?.filter(item => item.currentStatus == 'applied').length}</p>
                <p className="text-sm text-gray-600">Applications Sent</p>
              </div>
              <FileText className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          {/* <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold text-gray-900">
                  {(
                    (
                      userJobs?.filter(item => item.currentStatus === 'interviewing').length +
                      userJobs?.filter(item => item.currentStatus === 'offer').length +
                      userJobs?.filter(item => item.currentStatus === 'rejected').length
                    ) / userJobs?.length * 100
                  ).toFixed(0)}%
                </p>
                <p className="text-sm text-gray-600">Response Rate</p>
              </div>
              <Target className="w-8 h-8 text-green-500" />
            </div>
          </div> */}

          <div className="w-1/3 bg-white rounded-xl shadow-md border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold text-gray-900">{userJobs?.filter(item => item.currentStatus == 'saved').length}</p>
                <p className="text-sm text-gray-600">Jobs Saved</p>
              </div>
              <Clock className="w-8 h-8 text-amber-500" />
            </div>
          </div>
        </div>

        {/* Application Pipeline */}
        <div data-aos='fade-up' className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 mb-12">
          <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">Application Pipeline</h3>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            {[
              { status: 'saved', label: 'Saved', count: userJobs?.filter(item => item.currentStatus == 'saved').length, color: 'bg-gray-500', icon: Clock },
              { status: 'applied', label: 'Applied', count: userJobs?.filter(item => item.currentStatus == 'applied').length, color: 'bg-blue-500', icon: FileText },
              { status: 'interviewing', label: 'Interviewing', count: userJobs?.filter(item => item.currentStatus == 'interviewing').length, color: 'bg-amber-500', icon: Users },
              { status: 'offer', label: 'Offers', count: userJobs?.filter(item => item.currentStatus == 'offer').length, color: 'bg-green-500', icon: CheckCircle },
              { status: 'rejected', label: 'Rejected', count: userJobs?.filter(item => item.currentStatus == 'rejected').length, color: 'bg-red-500', icon: XCircle },
            ].map(({ status, label, count, color, icon: Icon }) => (
              <div key={status} className="text-center">
                <div className={`w-16 h-16 ${color} rounded-full flex items-center justify-center mx-auto mb-3`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{count}</p>
                <p className="text-sm font-medium text-gray-600">{label}</p>
              </div>
            ))}
          </div>
        </div>

        

        {/* …inside your component… */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">Recent Activity</h3>

          {recentJobs.length > 0 ? (
            <div className="space-y-4">
              {recentJobs?.map((job) => {
                // Determine status key from the same field you use elsewhere
                const key = (job.updatedAt || 'saved').toLowerCase();

                // Configuration for each status
                const statusConfig: Record<string, {
                  color: string;
                  icon: React.ComponentType<any>;
                  label: string;
                }> = {
                  saved: {
                    color: 'bg-gray-100 text-gray-700 border-gray-200',
                    icon: Clock,
                    label: 'Saved',
                  },
                  applied: {
                    color: 'bg-blue-100 text-blue-700 border-blue-200',
                    icon: FileText,
                    label: 'Applied',
                  },
                  interviewing: {
                    color: 'bg-amber-100 text-amber-700 border-amber-200',
                    icon: Users,
                    label: 'Interviewing',
                  },
                  offer: {
                    color: 'bg-green-100 text-green-700 border-green-200',
                    icon: CheckCircle,
                    label: 'Offer',
                  },
                  rejected: {
                    color: 'bg-red-100 text-red-700 border-red-200',
                    icon: XCircle,
                    label: 'Rejected',
                  },
                  deleted: {
                    color: 'bg-gray-100 text-gray-700 border-gray-200',
                    icon: XCircle,
                    label: 'Deleted',
                  },
                };

                const config = statusConfig[key] || statusConfig.saved;
                const Icon = config.icon;

                // Parse the ISO timestamp
                const date = new Date(job.updatedAt);
                const displayDate = isNaN(date.getTime())
                  ? 'Invalid Date'
                  : date.toLocaleDateString();

                return (
                  <div
                    key={job.jobID}
                    className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    {/* Icon + Title/Company */}
                    <div className="flex items-center space-x-4">
                      <div
                        className={`w-12 h-12 rounded-xl border flex items-center justify-center ${config.color}`}
                      >
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {job.jobTitle}
                        </p>
                        <p className="text-sm text-gray-600">
                          {job.companyName}
                        </p>
                      </div>
                    </div>

                    {/* Status Pill + Date */}
                    <div className="text-right">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize border ${config.color}`}
                      >
                        {job.currentStatus}
                      </span>
                      {/* <p className="text-xs text-gray-500 mt-1">
                        {job.updatedAt}
                      </p> */}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Briefcase className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                No applications yet
              </h4>
              <p className="text-gray-600 mb-6">
                Start by adding your first job application to see your progress here.
              </p>
              <button className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 transform hover:scale-105">
                Add Your First Job
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;