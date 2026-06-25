
import React, { createContext, useState, useEffect, useContext, useRef, useCallback } from 'react';
import { UserContext } from './UserContext.tsx';
import { useNavigate } from 'react-router-dom';
import { useOperationsStore } from "./Operations.ts";
import { useJobsSessionStore, useShouldFetchJobs } from './JobsSessionStore.ts';

type Job = any;

interface UserJobsContextType {
  userJobs: Job[];
  setUserJobs: React.Dispatch<React.SetStateAction<Job[]>>;
  loading: boolean;
  refreshJobs: (silent?: boolean) => void;
}

const UserJobsContext = createContext<UserJobsContextType | null>(null);

export const useUserJobs = () => {
  const context = useContext(UserJobsContext);
  if (!context) {
    throw new Error('useUserJobs must be used within a UserJobsProvider');
  }
  return context;
};

export const UserJobsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const context = useContext(UserContext);
  const navigate = useNavigate();

  const userDetails = context?.userDetails;
  const token = context?.token;
  const { role } = useOperationsStore();

  // Use session storage store
  const {
    jobs: userJobs,
    setJobs,
    setUserEmail,
  } = useJobsSessionStore();

  const lastManualUpdateRef = useRef<number>(0);
  const fetchingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasFetchedRef = useRef(false);

  // Stable reference to latest values for use in callbacks
  const latestRef = useRef({ token, userDetails, role, context });
  latestRef.current = { token, userDetails, role, context };

  const fetchJobsInBackground = useCallback(async (silent = true) => {
    const { token: currentToken, userDetails: currentUser, role: currentRole, context: currentContext } = latestRef.current;

    if (!currentUser?.email) return;

    // Prevent concurrent requests
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    // Abort any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    if (!silent) setLoading(true);

    try {
      let data;
      const API_BASE = import.meta.env.VITE_API_BASE_URL;

      if (currentRole === "operations") {
        const res = await fetch(
          `${API_BASE}/operations/getalljobs`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${currentToken}`,
            },
            body: JSON.stringify({ email: currentUser.email }),
            signal: controller.signal,
          }
        );
        data = await res.json();
      } else {
        const res = await fetch(
          `${API_BASE}/getalljobs`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${currentToken}`,
            },
            body: JSON.stringify({ email: currentUser.email }),
            signal: controller.signal,
          }
        );

        data = await res.json();

        if (
          data?.message === "Token or user details missing" ||
          data?.message === "Invalid token or expired" ||
          data?.message === "invalid token please login again"
        ) {
          // Try to refresh token
          if (currentContext?.refreshToken) {
            const refreshSuccess = await currentContext.refreshToken();
            if (refreshSuccess) {
              // Will be retried on next effect trigger from token change
              return;
            }
          }
          navigate("/login");
          return;
        }
      }

      // Only update if no recent manual update
      const timeSinceLastUpdate = Date.now() - lastManualUpdateRef.current;
      if (timeSinceLastUpdate > 2000) {
        setJobs(data?.allJobs || []);
      }

    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      console.error('Error fetching jobs:', err);
    } finally {
      fetchingRef.current = false;
      if (!silent) setLoading(false);
    }
  }, [navigate, setJobs]);

  // Fetch on mount and when user email changes (NOT on every token change)
  useEffect(() => {
    if (!userDetails?.email) return;

    // Only fetch once on mount, or when email/role changes
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    const timeoutId = setTimeout(() => {
      fetchJobsInBackground(false);
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [userDetails?.email, role, fetchJobsInBackground]);

  // Reset fetch flag when user changes
  useEffect(() => {
    hasFetchedRef.current = false;
  }, [userDetails?.email]);

  // Set user email in session store
  useEffect(() => {
    if (userDetails?.email) {
      setUserEmail(userDetails.email);
    }
  }, [userDetails?.email, setUserEmail]);

  // Background refresh every 60 seconds
  useEffect(() => {
    if (!userDetails?.email) return;

    const id = setInterval(() => {
      fetchJobsInBackground(true);
    }, 2 * 60 * 1000);

    return () => clearInterval(id);
  }, [userDetails?.email, fetchJobsInBackground]);

  // Wrapper function to maintain compatibility with existing code
  const setUserJobs = useCallback((jobs: Job[] | ((prevJobs: Job[]) => Job[])) => {
    lastManualUpdateRef.current = Date.now();

    try {
      if (typeof jobs === 'function') {
        const currentJobs = Array.isArray(userJobs) ? userJobs : [];
        const nextJobs = jobs(currentJobs);
        setJobs(nextJobs);
      } else {
        setJobs(jobs);
      }
    } catch (error: any) {
      if (error?.name === 'QuotaExceededError' || error?.message?.includes('quota')) {
        console.warn('Storage quota exceeded - clearing old jobs data and retrying');
        try {
          sessionStorage.removeItem('jobs-session-storage');
          if (typeof jobs === 'function') {
            const currentJobs = Array.isArray(userJobs) ? userJobs : [];
            const nextJobs = jobs(currentJobs);
            setJobs(nextJobs);
          } else {
            setJobs(jobs);
          }
        } catch (retryError) {
          console.error('Failed to update jobs even after clearing storage:', retryError);
        }
      } else {
        throw error;
      }
    }
  }, [userJobs, setJobs]);

  // Manual refresh function exposed to children
  const refreshJobs = useCallback((silent = true) => {
    hasFetchedRef.current = false;
    fetchingRef.current = false;
    fetchJobsInBackground(silent);
  }, [fetchJobsInBackground]);

  // Ensure userJobs is always an array
  const safeUserJobs = Array.isArray(userJobs) ? userJobs : [];

  return (
    <UserJobsContext.Provider value={{ userJobs: safeUserJobs, setUserJobs, loading, refreshJobs }}>
      {children}
    </UserJobsContext.Provider>
  );
};
