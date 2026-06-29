import React, { useState, useEffect, useContext } from 'react';
import { useUserProfile } from '../state_management/ProfileContext';
import { UserContext } from '../state_management/UserContext';

interface DashboardManager {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  profilePhoto: string;
}

const getApiBaseUrl = () => {
  const raw = import.meta.env.VITE_API_BASE_URL;
  if (typeof raw === "string" && raw.trim()) {
    return raw.replace(/\/$/, "");
  }
  if (import.meta.env.DEV) {
    return "http://localhost:8086";
  }
  return "";
};

const cardClass = "flex items-center gap-3 border border-gray-200 bg-white px-3 py-2";

const DashboardManagerDisplay: React.FC = () => {
  const { userProfile } = useUserProfile();
  const { userDetails } = useContext(UserContext);
  const [managerData, setManagerData] = useState<DashboardManager | null>(null);
  const [loading, setLoading] = useState(() => {
    const name = (userProfile?.dashboardManager || userDetails?.dashboardManager || "").trim();
    return Boolean(name);
  });
  const [photoLoadFailed, setPhotoLoadFailed] = useState(false);
  const [effectiveManagerName, setEffectiveManagerName] = useState(
    (userProfile?.dashboardManager || userDetails?.dashboardManager || '').trim()
  );

  useEffect(() => {
    const nextName = (userProfile?.dashboardManager || userDetails?.dashboardManager || '').trim();
    setEffectiveManagerName(nextName);
    if (!nextName) {
      setLoading(false);
      setManagerData(null);
    } else {
      setLoading(true);
    }
  }, [userProfile?.dashboardManager, userDetails?.dashboardManager]);

  useEffect(() => {
    setPhotoLoadFailed(false);
  }, [managerData?._id]);

  useEffect(() => {
    const fetchManagerDetails = async () => {
      try {
        const API_BASE_URL = getApiBaseUrl();
        if (!API_BASE_URL) {
          setManagerData(null);
          setLoading(false);
          return;
        }

        setLoading(true);
        setPhotoLoadFailed(false);

        let managerName = (userProfile?.dashboardManager || userDetails?.dashboardManager || '').trim();
        const currentEmail = (userDetails?.email || userProfile?.email || '').trim();

        if (currentEmail) {
          const userRes = await fetch(`${API_BASE_URL}/get-updated-user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: currentEmail })
          });

          if (userRes.ok) {
            const latestUser = await userRes.json();
            const latestAssignedManager = String(latestUser?.dashboardManager || '').trim();
            if (latestAssignedManager) {
              managerName = latestAssignedManager;
            }
          }
        }

        setEffectiveManagerName(managerName);
        if (!managerName) {
          setManagerData(null);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/dashboard-managers/${encodeURIComponent(managerName)}`);
        if (!response.ok) {
          setManagerData(null);
          return;
        }

        const data = await response.json();
        if (data.success && data.data) {
          setManagerData(data.data);
          setPhotoLoadFailed(false);
        } else {
          setManagerData(null);
        }
      } catch (error) {
        console.error('Error fetching manager details:', error);
        setManagerData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchManagerDetails();
  }, [userProfile?.dashboardManager, userDetails?.dashboardManager, userDetails?.email, userProfile?.email]);

  if (!effectiveManagerName) {
    return (
      <div className={cardClass}>
        <div className="w-9 h-9 overflow-hidden bg-gray-200 flex-shrink-0 flex items-center justify-center">
          <span className="text-gray-500 text-sm">?</span>
        </div>
        <div className="flex flex-col items-start">
          <span className="text-sm font-semibold text-gray-900">No Manager Assigned</span>
          <span className="text-xs text-gray-500">Contact Support</span>
        </div>
      </div>
    );
  }

  if (loading && !managerData) {
    return (
      <div className={cardClass}>
        <div className="w-9 h-9 bg-gray-200 animate-pulse flex-shrink-0"></div>
        <div className="flex flex-col gap-1">
          <div className="h-3 bg-gray-200 animate-pulse w-20"></div>
          <div className="h-2 bg-gray-200 animate-pulse w-16"></div>
        </div>
      </div>
    );
  }

  if (!managerData) {
    const initials = effectiveManagerName
      .split(' ')
      .filter(Boolean)
      .map((n: string) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    return (
      <div className={cardClass}>
        <div className="w-9 h-9 overflow-hidden bg-orange-500 text-white flex-shrink-0 flex items-center justify-center text-xs font-semibold">
          {initials || '?'}
        </div>
        <div className="flex flex-col items-start">
          <span className="text-sm font-semibold text-gray-900">{effectiveManagerName}</span>
          <span className="text-xs text-gray-500">Dashboard manager</span>
        </div>
      </div>
    );
  }

  const initialsFromName = managerData.fullName
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const photoUrl = (managerData.profilePhoto || "").trim();

  return (
    <div className={cardClass}>
      <div className="w-9 h-9 overflow-hidden bg-gray-200 flex-shrink-0">
        {!photoUrl || photoLoadFailed ? (
          <div className="w-full h-full bg-orange-500 text-white flex items-center justify-center text-xs font-semibold">
            {initialsFromName || "?"}
          </div>
        ) : (
          <img
            src={photoUrl}
            alt={managerData.fullName}
            className="w-full h-full object-cover"
            loading="eager"
            decoding="async"
            onLoad={() => setPhotoLoadFailed(false)}
            onError={() => setPhotoLoadFailed(true)}
          />
        )}
      </div>
      <div className="flex flex-col items-start">
        <span className="text-sm font-semibold text-gray-900">{managerData.fullName}</span>
        <span className="text-xs text-gray-500">Dashboard manager</span>
      </div>
    </div>
  );
};

export default DashboardManagerDisplay;
