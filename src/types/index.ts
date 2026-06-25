export type JobStatus = 'saved' | 'applied' | 'interviewing' | 'offer' | 'rejected' | 'deleted';

export interface Job {
  _id?: string; // MongoDB _id
  jobID: string;
  jobTitle: string;
  companyName: string;
  /** Optional; used for exclusion matching (manual add + extension) */
  jobLocation?: string;
  jobDescription: string;
  dateApplied: string;
  joblink: string;
  currentStatus: JobStatus;
  attachments : [string]; 
  dateAdded : string;
  // matchScore?: number;
  userID?: string; // Add user association
  createdAt: string;
  updatedAt: string;
  // Optional, populated when optimizer saves comparison
  changesMade?: any;
  timeline?: string[];
  operatorName?: string;
  operatorEmail?: string;
  /** Operator display name from extension code (returned to clients; extensionCode is not) */
  addedBy?: string;
  /** Dashboard creator: client vs operations (extension jobs may omit). */
  createdByRole?: "user" | "operations";
  appliedDate?: string | null;
  optimizedResume?: { hasResume?: boolean; [key: string]: any };
  optimizedResumeSeen?: boolean;
  downloaded?: boolean;
  autoOptimization?: {
    status?: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
    attempts?: number;
    error?: string;
    [key: string]: any;
  };
  // Second-stage screening (real employer-site re-judge). 'failed' jobs are
  // moved to the removed column; the reason is operator-only.
  secondJudge?: {
    status?: 'pending' | 'processing' | 'passed' | 'failed' | 'skipped';
    attempts?: number;
    score?: number | null;
    reason?: string | null;
    error?: string | null;
    [key: string]: any;
  };
  removalReason?: string | null;
  removedBy?: string | null;
  removalDate?: string | null;
}

export interface OptimizedResume {
  id: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  content: string;
  originalContent: string;
  matchScore: number;
  suggestions: string[];
  keywords: string[];
  userId?: string; // Add user association
  createdAt: string;
  updatedAt: string;
}

export interface BaseResume {
  id: string;
  name: string;
  content: string;
  skills: string[];
  experience: string[];
  education: string[];
  userId?: string; // Add user association
  createdAt: string;
  updatedAt: string;
}

export interface User {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  photoURL?: string;
  createdAt: string;
}

export interface DashboardStats {
  total: number;
  saved: number;
  applied: number;
  interviewing: number;
  offer: number;
  rejected: number;
  deleted: number;
}

export interface BulkJobImport {
  jobUrls: string[];
  optimizeResumes: boolean;
  autoApply: boolean;
}

export interface ApplicationProgress {
  total: number;
  processed: number;
  applied: number;
  pending: number;
  errors: number;
  status: 'processing' | 'paused' | 'completed';
}

// Resume type for backward compatibility
export interface Resume extends OptimizedResume {}