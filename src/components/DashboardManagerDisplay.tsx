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
  // Local dev: Vite runs on :3000, API often on :8086 — avoid silent fetch to "undefined/..."
  if (import.meta.env.DEV) {
    return "http://localhost:8086";
  }
  return "";
};

const DashboardManagerDisplay: React.FC = () => {
  const { userProfile } = useUserProfile();
  const { userDetails } = useContext(UserContext);
  const [managerData, setManagerData] = useState<DashboardManager | null>(null);
  /** Start true when we might fetch a manager so we don't flash initials before the first request. */
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
      // Avoid one frame of initials before the fetch effect runs.
      setLoading(true);
    }
  }, [userProfile?.dashboardManager, userDetails?.dashboardManager]);

  useEffect(() => {
    setPhotoLoadFailed(false);
  }, [managerData?._id]);

  // Fetch manager details when component mounts
  useEffect(() => {
    const fetchManagerDetails = async () => {
      try {
        const API_BASE_URL = getApiBaseUrl();
        if (!API_BASE_URL) {
          console.warn("DashboardManagerDisplay: VITE_API_BASE_URL is not set");
          setManagerData(null);
          setLoading(false);
          return;
        }

        setLoading(true);
        setPhotoLoadFailed(false);

        // Do not call GET /sync/managers from the browser: if the API returns 502 (e.g. upstream
        // unreachable), Cloudflare serves HTML without CORS headers and the console shows a CORS
        // error. Sync is for server/cron; manager lookup uses GET /dashboard-managers/:name which
        // can hydrate from DB or clients-tracking on the server.

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
  
  // Show fallback if no manager is assigned
  if (!effectiveManagerName) {
    return (
      <div className="flex min-w-0 flex-1 items-center space-x-2 rounded-xl border border-white/20 bg-white/80 px-3 py-2 shadow-lg backdrop-blur-sm sm:w-auto sm:flex-none sm:space-x-3 sm:px-4">
        <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0 flex items-center justify-center">
          <span className="text-gray-500 text-sm">?</span>
        </div>
        <div className="flex min-w-0 flex-col items-start">
          <span className="max-w-full truncate text-xs font-medium text-gray-900 sm:text-sm">
            No Manager Assigned
          </span>
          <span className="text-xs text-gray-500">
            Contact Support
          </span>
        </div>
      </div>
    );
  }

  if (loading && !managerData) {
    return (
      <div className="flex min-w-0 flex-1 items-center space-x-2 rounded-xl border border-white/20 bg-white/80 px-3 py-2 shadow-lg backdrop-blur-sm sm:w-auto sm:flex-none sm:space-x-3 sm:px-4">
        <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse"></div>
        <div className="flex min-w-0 flex-col">
          <div className="h-3 bg-gray-200 rounded animate-pulse w-20 mb-1"></div>
          <div className="h-2 bg-gray-200 rounded animate-pulse w-16"></div>
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
      <div className="flex min-w-0 flex-1 items-center space-x-2 rounded-xl border border-white/20 bg-white/80 px-3 py-2 shadow-lg backdrop-blur-sm sm:w-auto sm:flex-none sm:space-x-3 sm:px-4">
        <div className="w-8 h-8 rounded-full overflow-hidden bg-orange-500 text-white flex-shrink-0 flex items-center justify-center text-xs font-semibold">
          {initials || '?'}
        </div>
        <div className="flex min-w-0 flex-col items-start">
          <span className="max-w-full truncate text-xs font-medium text-gray-900 sm:text-sm">
            {effectiveManagerName}
          </span>
          <span className="text-xs text-gray-500">
            Your Dashboard Manager
          </span>
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
    <div className="flex min-w-0 flex-1 items-center space-x-2 rounded-xl border border-white/20 bg-white/80 px-3 py-2 shadow-lg backdrop-blur-sm sm:w-auto sm:flex-none sm:space-x-3 sm:px-4">
      {/* Manager Photo */}
      <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
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

      {/* Manager Name */}
      <div className="flex min-w-0 flex-col items-start">
        <span className="max-w-full truncate text-xs font-medium text-gray-900 sm:text-sm">
          {managerData.fullName}
        </span>
        <span className="text-xs text-gray-500">
          Your Dashboard Manager
        </span>
      </div>
    </div>
  );
};

export default DashboardManagerDisplay;
