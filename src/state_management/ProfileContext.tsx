import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/** =====================
 * Types – keep in sync with backend
 * ===================== */
export interface UserProfile {
  userId?: string; // MongoDB ObjectId string
  firstName: string;
  lastName: string;
  contactNumber: string;
  dob: string; // ISO date string

  // Education
  bachelorsUniDegree: string;
  bachelorsGradMonthYear: string; // ISO (YYYY-MM)
  bachelorsGPA: string; // GPA field for bachelor's degree
  mastersUniDegree: string;
  mastersGradMonthYear: string; // ISO (YYYY-MM)
  mastersGPA: string; // GPA field for master's degree
  transcriptUrl: string; // URL for uploaded transcript

  // Immigration
  visaStatus:
    | "CPT"
    | "F1"
    | "F1 OPT"
    | "F1 STEM OPT"
    | "H1B"
    | "Green Card"
    | "U.S. Citizen"
    | "Other";

  // Address
  address: string;

  // Preferences & Experience
  preferredRoles: string[];
  experienceLevel:
    | "Entry level"
    | "0-2 Years"
    | "0-3 Years"
    | "0-4 Years"
    | "0-5 Years"
    | "0-6 Years"
    | "0-7 Years"
    | "Other";
  expectedSalaryRange: "60k-100k" | "100k-150k" | "150k-200k" | "Other";
  preferredLocations: string[];
  targetCompanies: string[];
  reasonForLeaving: string;

  // Links & Documents
  linkedinUrl: string;
  githubUrl: string;
  portfolioUrl: string;
  coverLetterUrl: string;
  resumeUrl: string;
  portfolioFileUrl: string;

  // Consent
  confirmAccuracy: boolean;
  agreeTos: boolean;

  // Optional
  email?: string;
  status?: "new" | "in_review" | "complete" | "rejected";
  ssnNumber?: string;
  expectedSalaryNarrative?: string;
  availabilityNote?: string;
  joinTime?: string;
  references?: string;
}

/**
 * Shape we expose through context
 */
export type UserProfileContextType = {
  userProfile: UserProfile | null;
  setProfile: (profile: UserProfile | null) => void;
  updateProfile: (patch: Partial<UserProfile>) => void; // shallow merge
  clearProfile: () => void;
  setProfileFromApi: (apiPayload: unknown) => void; // normalize + set
  isProfileComplete: () => boolean;
};

/** =====================
 * LocalStorage helpers
 * ===================== */
const STORAGE_KEY = "userAuth";

function safeParse<T = any>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function persist(profile: UserProfile | null) {
  if (typeof window === "undefined") return;
  try {
    const existing = safeParse(localStorage.getItem(STORAGE_KEY)) || {};
    if (profile) {
      existing.userProfile = profile;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    } else {
      delete existing.userProfile;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    }
  } catch (err) {
    console.warn("Failed to persist profile:", err);
  }
}

/** =====================
 * Context
 * ===================== */
const UserProfileContext = createContext<UserProfileContextType | null>(null);

export function UserProfileProvider({ children }: { children: React.ReactNode }) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    if (typeof window === "undefined") return null;
    const userAuth = safeParse(localStorage.getItem(STORAGE_KEY));
    console.log('ProfileContext initialization:', { 
      userAuth, 
      userProfile: userAuth?.userProfile,
      localStorageKeys: Object.keys(localStorage),
      userAuthRaw: localStorage.getItem(STORAGE_KEY)
    });
    return userAuth?.userProfile || null;
  });

  console.log('ProfileContext render:', { userProfile, STORAGE_KEY });

  const setProfile = useCallback((profile: UserProfile | null) => {
    setUserProfile(profile);
    persist(profile);
  }, []);

  const updateProfile = useCallback((patch: Partial<UserProfile>) => {
    setUserProfile((prev) => {
      const updated = prev ? { ...prev, ...patch } : (patch as UserProfile);
      persist(updated);
      return updated;
    });
  }, []);

  const clearProfile = useCallback(() => {
    setUserProfile(null);
    persist(null);
  }, []);

  const setProfileFromApi = useCallback((apiPayload: unknown) => {
    if (!apiPayload || typeof apiPayload !== "object") {
      setProfile(null);
      return;
    }

    const payload = apiPayload as any;

     const safeIsoFromDateLike = (value: unknown): string => {
      if (!value || typeof value !== "string") return "";
      const trimmed = value.trim();
      if (!trimmed || /^(n\/a|na|none|null|undefined)$/i.test(trimmed)) return "";
      const monthYearMatch = /^\d{4}-\d{2}$/.test(trimmed);
      const candidate = monthYearMatch ? `${trimmed}-01` : trimmed;
      const d = new Date(candidate);
      return isNaN(d.getTime()) ? "" : d.toISOString();
    };

    // Coerce string fields to arrays when backend returns a comma/semicolon separated string
    const toArray = (v: unknown): string[] => {
      if (Array.isArray(v)) return v.filter(Boolean);
      if (typeof v === "string") {
        const trimmed = v.trim();
        if (!trimmed) return [];
        return trimmed
          .split(/[;,]/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
      }
      return [];
    };
    const normalized: UserProfile = {
      userId: payload.userId || payload._id,
      firstName: payload.firstName || "",
      lastName: payload.lastName || "",
      contactNumber: payload.contactNumber || "",
      dob: safeIsoFromDateLike(payload.dob),
      bachelorsUniDegree: payload.bachelorsUniDegree || "",
      bachelorsGradMonthYear: safeIsoFromDateLike(payload.bachelorsGradMonthYear),
      bachelorsGPA: payload.bachelorsGPA || "",
      mastersUniDegree: payload.mastersUniDegree || "",
      mastersGradMonthYear: safeIsoFromDateLike(payload.mastersGradMonthYear),
      mastersGPA: payload.mastersGPA || "",
      transcriptUrl: payload.transcriptUrl || "",
      visaStatus: payload.visaStatus || "Other",
      address: payload.address || "",
      preferredRoles: toArray(payload.preferredRoles),
      experienceLevel: payload.experienceLevel || "Entry level",
      expectedSalaryRange: payload.expectedSalaryRange || "60k-100k",
      preferredLocations: toArray(payload.preferredLocations),
      targetCompanies: toArray(payload.targetCompanies),
      reasonForLeaving: payload.reasonForLeaving || "",
      linkedinUrl: payload.linkedinUrl || "",
      githubUrl: payload.githubUrl || "",
      portfolioUrl: payload.portfolioUrl || "",
      coverLetterUrl: payload.coverLetterUrl || "",
      resumeUrl: payload.resumeUrl || "",
      portfolioFileUrl: payload.portfolioFileUrl || "",
      confirmAccuracy: Boolean(payload.confirmAccuracy),
      agreeTos: Boolean(payload.agreeTos),
      email: payload.email,
      status: payload.status || "new",
      ssnNumber: payload.ssnNumber || "",
      expectedSalaryNarrative: payload.expectedSalaryNarrative || "",
      availabilityNote: payload.availabilityNote || "in 2 weeks.",
      references: payload.references || "",
      dashboardManager: payload.dashboardManager || "",
      dashboardManagerContact: payload.dashboardManagerContact || "",
    };

    setProfile(normalized);
  }, [setProfile]);

  const isProfileComplete = useCallback(() => {
    if (!userProfile) return false;
    
    // Check if all required fields are filled (excluding optional file uploads)
    const requiredFields = [
      'firstName', 'lastName', 'contactNumber', 'dob',
      'bachelorsUniDegree', 'bachelorsGradMonthYear',
      'mastersUniDegree', 'mastersGradMonthYear',
      'visaStatus', 'address',
      'preferredRoles', 'experienceLevel', 'expectedSalaryRange',
      'preferredLocations', 'targetCompanies',
      'linkedinUrl', 'resumeUrl'
      // Note: reasonForLeaving, githubUrl, portfolioUrl, coverLetterUrl are optional
    ];

    return requiredFields.every(field => {
      const value = userProfile[field as keyof UserProfile];
      if (Array.isArray(value)) return value.length > 0;
      return value && String(value).trim() !== '';
    }) && userProfile.confirmAccuracy && userProfile.agreeTos;
  }, [userProfile]);

  const value = useMemo(
    () => ({
      userProfile,
      setProfile,
      updateProfile,
      clearProfile,
      setProfileFromApi,
      isProfileComplete,
    }),
    [userProfile, setProfile, updateProfile, clearProfile, setProfileFromApi, isProfileComplete]
  );

  return (
    <UserProfileContext.Provider value={value}>
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile(): UserProfileContextType {
  const context = useContext(UserProfileContext);
  if (!context) {
    throw new Error("useUserProfile must be used within a UserProfileProvider");
  }
  return context;
}
