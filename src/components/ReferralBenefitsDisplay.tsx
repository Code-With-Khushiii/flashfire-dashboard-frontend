import React, { useState, useEffect, useContext } from 'react';
import { Gift } from 'lucide-react';
import { UserContext } from '../state_management/UserContext';
import { useOperationsStore } from '../state_management/Operations';

const ReferralBenefitsDisplay: React.FC = () => {
  const context = useContext(UserContext);
  const { role } = useOperationsStore();
  const userDetails = context?.userDetails;
  const [referralApplications, setReferralApplications] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

  // Fetch referral statistics
  useEffect(() => {
    const fetchReferralStats = async () => {
      const email = userDetails?.email;
      if (!email || !API_BASE || role === "operations") {
        setReferralApplications(0);
        return;
      }

      try {
        setLoading(true);
        // Try to fetch referral stats from API
        const res = await fetch(`${API_BASE}/get-referral-stats`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data?.referralApplicationsAdded) {
            setReferralApplications(Number(data.referralApplicationsAdded));
          }
        }
      } catch (error) {
        // Silently fail - API endpoint might not exist yet
        // Use userDetails if available
        if (userDetails?.referralApplicationsAdded) {
          setReferralApplications(Number(userDetails.referralApplicationsAdded));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchReferralStats();
  }, [userDetails?.email, API_BASE, role, userDetails?.referralApplicationsAdded]);

  // Don't show for operations role
  if (role === "operations") {
    return null;
  }

  const applicationsCount = userDetails?.referralApplicationsAdded || referralApplications || 0;

  if (loading) {
    return (
      <div className="flex min-w-0 flex-1 items-center space-x-2 rounded-xl border border-white/20 bg-white/80 px-3 py-2 shadow-lg backdrop-blur-sm sm:w-auto sm:flex-none sm:space-x-3 sm:px-4">
        <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse"></div>
        <div className="flex min-w-0 flex-col">
          <div className="h-3 bg-gray-200 rounded animate-pulse w-24 mb-1"></div>
          <div className="h-2 bg-gray-200 rounded animate-pulse w-20"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 items-center space-x-2 rounded-xl border border-white/20 bg-white/80 px-3 py-2 shadow-lg backdrop-blur-sm sm:w-auto sm:flex-none sm:space-x-3 sm:px-4">
      {/* Gift Icon */}
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center flex-shrink-0 shadow">
        <Gift className="w-4 h-4 text-white" />
      </div>

      {/* Referral Info */}
      <div className="flex min-w-0 flex-col items-start">
        <span className="max-w-full truncate text-xs font-medium text-gray-900 sm:text-sm">
          + {applicationsCount}  Applications
        </span>
        <span className="text-xs text-gray-500">
          From Referrals
        </span>
      </div>
    </div>
  );
};

export default ReferralBenefitsDisplay;
