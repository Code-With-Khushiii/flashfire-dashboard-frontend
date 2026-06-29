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

  useEffect(() => {
    const fetchReferralStats = async () => {
      const email = userDetails?.email;
      if (!email || !API_BASE || role === "operations") {
        setReferralApplications(0);
        return;
      }

      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/get-referral-stats`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data?.referralApplicationsAdded) {
            setReferralApplications(Number(data.referralApplicationsAdded));
          }
        }
      } catch (error) {
        if (userDetails?.referralApplicationsAdded) {
          setReferralApplications(Number(userDetails.referralApplicationsAdded));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchReferralStats();
  }, [userDetails?.email, API_BASE, role, userDetails?.referralApplicationsAdded]);

  if (role === "operations") {
    return null;
  }

  const applicationsCount = userDetails?.referralApplicationsAdded || referralApplications || 0;

  if (loading) {
    return (
      <div className="flex items-center gap-3 border border-green-500 bg-green-50 px-3 py-2">
        <div className="w-6 h-6 bg-gray-200 animate-pulse flex-shrink-0"></div>
        <div className="flex flex-col gap-1">
          <div className="h-3 bg-gray-200 animate-pulse w-24"></div>
          <div className="h-2 bg-gray-200 animate-pulse w-20"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 border border-green-500 bg-green-50 px-3 py-2">
      <Gift className="w-6 h-6 text-green-500 flex-shrink-0" />
      <div className="flex flex-col items-start">
        <span className="text-sm font-semibold text-gray-900">{applicationsCount}+ Applications</span>
        <span className="text-xs text-gray-500">From Referral</span>
      </div>
    </div>
  );
};

export default ReferralBenefitsDisplay;
