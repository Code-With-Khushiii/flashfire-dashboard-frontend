import { ArrowLeftCircle, Trash2 } from "lucide-react";
import React, { useEffect, useState, useContext } from "react";
import { UserContext } from '../state_management/UserContext.js';
import { ResumePreview } from './AiOprimizer/components/ResumePreview.tsx';
import { ResumePreview1 } from './AiOprimizer/components/ResumePreview1.tsx';
import { ResumePreviewMedical } from './AiOprimizer/components/ResumePreviewMedical.tsx';

// type PendingType = "optimized" | "coverLetter" | null;

type Entry = {
  jobRole: string;
  companyName: string;
  jobLink?: string;
  url: string;
  link?: string;
  createdAt?: string | Date;
  jobId?: string;
  jobID?: string;
  hasResume?: boolean;
  isJobBased?: boolean;
  name: string;
  title?: string;
  version?: number;
  resumeData?: any;
  showSummary?: boolean;
  showProjects?: boolean;
  showLeadership?: boolean;
  showPublications?: boolean;
};

// Cloudinary sometimes serves PDFs under `image/upload`.
// For iframes, we want the original bytes. Convert to `raw/upload`.
// Cloudinary sometimes serves PDFs under `image/upload`.
// For preview (iframe), use `/raw/upload/`
// For download, add `/fl_attachment/`
function toRawPdfUrl(
  resume: string | { url?: string; link?: string },
  opts: { download?: boolean } = {}
) {
  let pdfUrl = "";

  if (typeof resume === "string") {
    pdfUrl = resume;
  } else if (resume && typeof resume === "object") {
    pdfUrl = resume.link || resume.url || "";
  }

  if (!pdfUrl) return "";

  if (opts.download) {
    return pdfUrl.replace("/upload/", "/upload/fl_attachment/");
  }
  return pdfUrl.replace("/upload/", "/upload/"); // ✅ preview inline
}


// const fmtDate = (d?: string | Date) =>
//     d
//         ? new Date(d).toLocaleDateString(undefined, {
//               month: "short",
//               day: "2-digit",
//               year: "numeric",
//           })
//         : "—";

// Small download icon (no external deps)
const DownloadIcon = () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M12 3a1 1 0 011 1v9.586l2.293-2.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4A1 1 0 118.707 11.293L11 13.586V4a1 1 0 011-1z"></path>
        <path d="M5 18a1 1 0 011-1h12a1 1 0 110 2H6a1 1 0 01-1-1z"></path>
    </svg>
);

export default function DocumentUpload() {
  const [activeTab, setActiveTab] = useState<"base" | "optimized" | "cover" | "transcript">("base");
  // const [fileNamePrompt, setFileNamePrompt] = useState<string>("");
    const context = useContext(UserContext);
  const [baseResume, setBaseResume] = useState<any[]>([]);
  const [optimizedList, setOptimizedList] = useState<Entry[]>([]);
  const [coverList, setCoverList] = useState<Entry[]>([]);
  const [transcriptList, setTranscriptList] = useState<any[]>([]);

    // const [showMetaModal, setShowMetaModal] = useState<PendingType>(null);
    // const [pendingUploadType, setPendingUploadType] = useState<PendingType>(null);
    // const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    // const [metadata, setMetadata] = useState({ jobRole: "", companyName: "", jobLink: "" });

    // Preview state
    const [previewMode, setPreviewMode] = useState<boolean>(true); // true = show iframe; false = list/upload (table)
    const [activePreviewUrl, setActivePreviewUrl] = useState<string | null>(
        null
    );
    const [iframeError, setIframeError] = useState<string | null>(null);

    // Job-based resume state
    const [resumeData, setResumeData] = useState<any>(null);
    const [resumeLoading, setResumeLoading] = useState(false);
    const [fetchingResumes, setFetchingResumes] = useState(false);
    
    // Search and filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredResumes, setFilteredResumes] = useState<Entry[]>([]);

    // ---- helpers ----
    const readAuth = () => {
        const storedAuth = localStorage.getItem("userAuth");
        if (!storedAuth) {
            alert("Not logged in");
            return null;
        }
        try {
            return JSON.parse(storedAuth);
        } catch {
            alert("Auth data corrupted. Please login again.");
            return null;
        }
    };

    // Merge into existing userAuth: replace userDetails, keep/refresh token, preserve other keys
    const writeAuth = (serverUser: any, token?: string) => {
        const existingRaw = localStorage.getItem("userAuth");
        const existing = existingRaw ? JSON.parse(existingRaw) : {};
        const finalToken = token || existing?.token || "";

        const updated = {
            ...existing, // keep any other fields living in userAuth
            userDetails: serverUser, // replace with latest server copy
            token: finalToken, // prefer provided token, else keep old
        };

        localStorage.setItem("userAuth", JSON.stringify(updated));
    };

    const uploadToCloudinary = async (file: File) => {
        try {
            // Use the new unified upload service
            const { uploadProfileFile } = await import('../utils/uploadService');
            const url = await uploadProfileFile(file, 'resume');
            return url;
        } catch (error) {
            console.error("Upload failed:", error);
            throw new Error("Upload failed");
        }
    };

  const persistToBackend = async (payload: any) => {
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/plans/select`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Backend save failed");
    return res.json(); // -> { userDetails: {..., resumeLink, optimizedResumes, coverLetters } }
  };
  useEffect(() => {
  const parsed = readAuth();
  if (!parsed) return;
  const u = parsed.userDetails || {};

  // 🔹 Handle resumeLink migration (string → array of objects)
  if (Array.isArray(u.resumeLink)) {
    setBaseResume(u.resumeLink);
  } else if (typeof u.resumeLink === "string" && u.resumeLink.startsWith("http")) {
  setBaseResume([
    {
      name: u.resumeLink.split("/").pop() || "Imported Resume",
      createdAt: new Date().toISOString(),
      link: u.resumeLink,
      url: u.resumeLink
    },
  ]);
} else {
  setBaseResume([]);
}


  // Don't set optimizedList here - let fetchAllOptimizedResumes handle it
  // setOptimizedList(Array.isArray(u.optimizedResumes) ? u.optimizedResumes : []);
  setCoverList(Array.isArray(u.coverLetters) ? u.coverLetters : []);
  setTranscriptList(Array.isArray(u.transcripts) ? u.transcripts : []);

  // Fetch all optimized resumes (both old and new - this will include Cloudinary resumes too)
  console.log('ResumeOptimizer component mounted, fetching all optimized resumes...');
  fetchAllOptimizedResumes();

}, []);

// Function to fetch all optimized resumes (both old and new)
const fetchAllOptimizedResumes = async () => {
  setFetchingResumes(true);
  try {
    const auth = readAuth();
    if (!auth || !auth.userDetails) {
      console.error('No user authentication found');
      return;
    }

    console.log('Fetching all optimized resumes for user:', auth.userDetails.email);

    // Fetch job-based optimized resumes using the new endpoint
    const jobResumesResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/getOptimizedResumesForDocuments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        email: auth.userDetails.email,
        userDetails: auth.userDetails
      })
    });

    let allResumes: any[] = [];

    if (jobResumesResponse.ok) {
      const jobData = await jobResumesResponse.json();
      console.log('Job-based resumes response:', jobData);
      console.log('Number of job-based resumes found:', jobData.optimizedResumes?.length || 0);
      
      if (jobData.success && jobData.optimizedResumes) {
        console.log('Mapping job resumes...');
        const jobResumes = jobData.optimizedResumes.map((resume: any) => {
          console.log('Processing resume:', {
            jobID: resume.jobID,
            title: resume.title,
            hasResumeData: !!resume.resumeData,
            version: resume.version
          });
          return {
            id: resume.id,
            jobID: resume.jobID,
            name: resume.title,
            jobRole: resume.jobRole,
            companyName: resume.companyName,
            jobLink: resume.jobLink,
            createdAt: resume.createdAt,
            category: resume.category,
            version: resume.version,
            hasResume: resume.hasResume,
            url: `#${resume.jobID}`,
            resumeUrl: `#${resume.jobID}`,
            link: `#${resume.jobID}`,
            isJobBased: true,
            resumeData: resume.resumeData,
            showSummary: resume.showSummary,
            showProjects: resume.showProjects,
            showLeadership: resume.showLeadership,
            showPublications: resume.showPublications
          };
        });
        allResumes = [...allResumes, ...jobResumes];
        console.log('Job-based resumes added:', jobResumes.length);
      } else {
        console.log('No optimized resumes in response or success=false');
      }
    } else {
      console.error('Failed to fetch job-based resumes:', jobResumesResponse.status);
      const errorText = await jobResumesResponse.text();
      console.error('Error response:', errorText);
    }

    // Also get old Cloudinary resumes from user profile
    const oldResumes = Array.isArray(auth.userDetails.optimizedResumes) ? auth.userDetails.optimizedResumes : [];
    const cloudinaryResumes = oldResumes.map((resume: any) => ({
      id: resume.id || Math.random().toString(),
      jobID: null,
      name: resume.name || 'Untitled Resume',
      jobRole: resume.jobRole || '',
      companyName: resume.companyName || '',
      jobLink: resume.jobLink || '',
      createdAt: resume.createdAt || new Date().toISOString(),
      category: 'Resume',
      version: 0,
      hasResume: true,
      url: resume.url || resume.link,
      resumeUrl: resume.url || resume.link,
      link: resume.url || resume.link,
      isJobBased: false
    }));

    allResumes = [...allResumes, ...cloudinaryResumes];

    console.log('All optimized resumes:', allResumes);
    
    // Sort resumes by date (most recent first)
    const sortedResumes = allResumes.sort((a, b) => {
      console.log('Sorting dates:', { 
        a: a.createdAt, 
        b: b.createdAt,
        aDate: new Date(a.createdAt || 0),
        bDate: new Date(b.createdAt || 0)
      });
      
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      
      // Handle invalid dates
      if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
      if (isNaN(dateA.getTime())) return 1; // Put invalid dates at end
      if (isNaN(dateB.getTime())) return -1; // Put invalid dates at end
      
      return dateB.getTime() - dateA.getTime(); // Most recent first
    });
    
    setOptimizedList(sortedResumes);
    setFilteredResumes(sortedResumes); // Initialize filtered list
    
  } catch (error) {
    console.error('Error fetching all optimized resumes:', error);
  } finally {
    setFetchingResumes(false);
  }
};

// Function to filter resumes based on search term
const filterResumes = (searchTerm: string) => {
  if (!searchTerm.trim()) {
    setFilteredResumes(optimizedList);
    return;
  }

  const filtered = optimizedList.filter(resume => {
    const searchLower = searchTerm.toLowerCase();
    return (
      resume.jobRole?.toLowerCase().includes(searchLower) ||
      resume.companyName?.toLowerCase().includes(searchLower) ||
      resume.name?.toLowerCase().includes(searchLower) ||
      resume.title?.toLowerCase().includes(searchLower)
    );
  });

  setFilteredResumes(filtered);
};

// Effect to filter resumes when search term changes
useEffect(() => {
  filterResumes(searchTerm);
}, [searchTerm, optimizedList]);

// Function to fetch resume data from a job
const fetchResumeDataFromJob = async (jobId: string) => {
  setResumeLoading(true);
  try {
    console.log('Fetching resume data for job ID:', jobId);
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/getOptimizedResume/${jobId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    console.log('Fetch resume response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Resume data received:', data);
      if (data.success && data.resumeData) {
        setResumeData(data);
        setPreviewMode(true);
        console.log('Fetched resume data from job:', data);
      } else {
        console.error('No resume data found for job:', jobId);
        alert('No resume data found for this job');
      }
    } else {
      console.error('Failed to fetch resume data, status:', response.status);
      const errorText = await response.text();
      console.error('Error response:', errorText);
      alert('Failed to fetch resume data');
    }
  } catch (error) {
    console.error('Error fetching resume data:', error);
    alert('Error fetching resume data');
  } finally {
    setResumeLoading(false);
  }
};


    // Default preview per tab (only when in preview mode AND no preview selected yet)
    useEffect(() => {
        if (!previewMode) return;
        if (activePreviewUrl) return; // don't override a user-selected preview
        setIframeError(null);

    let defaultUrl: string | null = null;
if (activeTab === "base") defaultUrl = baseResume[0]?.link || null;
    else if (activeTab === "optimized") defaultUrl = optimizedList[0]?.url || null;
    else if (activeTab === "cover") defaultUrl = coverList[0]?.url || null;
    else if (activeTab === "transcript") defaultUrl = transcriptList[0]?.url || null;


        setActivePreviewUrl(defaultUrl ? toRawPdfUrl(defaultUrl) : null);
    }, [
        activeTab,
        baseResume,
        optimizedList,
        coverList,
        previewMode,
        activePreviewUrl,
    ]);

    // ---- handlers ----
    const handleFileUpload = async (
        e: React.ChangeEvent<HTMLInputElement>,
        type: "base" | "optimized" | "coverLetter" | "transcript"
    ) => {
        const files = Array.from(e.target.files || []);
        e.currentTarget.value = ""; // allow reselecting same file
        if (files.length === 0) return;

        if (type !== "base" && !baseResume) {
            alert("Please upload Base Resume first.");
            return;
        }

        for (const file of files) {
            if (type === "base" || type === "coverLetter" || type === "optimized" || type === "transcript") {
                const name = prompt("Enter a name for this file:");
                if (!name) return;

                if (type === "base") {
                    await uploadBaseResume(file, name);
                    setPreviewMode(false);
                } else if (type === "coverLetter") {
                    await uploadCoverLetter(file, name);
                } else if (type === "optimized") {
                    await uploadOptimizedResume(file, name);
                } else if (type === "transcript") {
                    await uploadTranscript(file, name);
                }

                return;
            }
        }
    };

const uploadBaseResume = async (file: File, name: string) => {
  const uploadedURL = await uploadToCloudinary(file);
  const parsed = readAuth();
  if (!parsed) return;

  const newEntry = {
    name,
    createdAt: new Date().toISOString(),
    link: uploadedURL,
  };

  const payload = {
    token: parsed.token,
    userDetails: parsed.userDetails,
    resumeLink: newEntry,
  };

  const backendData = await persistToBackend(payload);
  const serverUser = backendData.userDetails || parsed.userDetails;

  writeAuth(serverUser, parsed.token);
  setBaseResume(serverUser.resumeLink);
};


const uploadOptimizedResume = async (file: File, name: string) => {
  try {
    setIsUploading(true);

    // 1. Upload to Cloudinary
    const uploadedURL = await uploadToCloudinary(file);

    // 2. Read auth
    const parsed = readAuth();
    if (!parsed) return;

    // 3. Build new entry (only name + url + createdAt)
    const newEntry: Entry = {
      name,
      url: uploadedURL,
      createdAt: new Date().toISOString(),
      jobRole: "",      // left blank since you’re not collecting metadata
      companyName: "",
      jobLink: "",
    };

    // 4. Prepare payload
    const payload = {
      token: parsed.token,
      userDetails: {
        ...parsed.userDetails,
        email: parsed.userDetails?.email, // ✅ ensure email present
      },
      optimizedResumeEntry: newEntry,
    };

    console.log("Payload for optimized resume upload:", payload);

    // 5. Save to backend
    const backendData = await persistToBackend(payload);
    const serverUser = backendData.userDetails || parsed.userDetails;

    // 6. Persist & hydrate
    writeAuth(serverUser, parsed.token);
    setOptimizedList(Array.isArray(serverUser.optimizedResumes) ? serverUser.optimizedResumes : []);

    // 7. Update preview
    setPreviewMode(true);
    setActivePreviewUrl(toRawPdfUrl(uploadedURL));
    setIframeError(null);

    alert("✅ Optimized resume uploaded successfully!");
  } catch (err) {
    console.error("Upload optimized resume failed:", err);
    alert("❌ Upload failed.");
  } finally {
    setIsUploading(false);
  }
};



const uploadCoverLetter = async (file: File, name: string) => {
  try {
    setIsUploading(true);

    // 1. Upload to Cloudinary
    const uploadedURL = await uploadToCloudinary(file);

    // 2. Read auth
    const parsed = readAuth();
    if (!parsed) return;

    // 3. Build new entry
    const newEntry: Entry = {
      name,
      url: uploadedURL,
      createdAt: new Date().toISOString(),
      jobRole: "",
      companyName: "",
      jobLink: "",
    };

    // 4. Prepare payload for backend
    const payload = {
      token: parsed.token,
      userDetails: {
        ...parsed.userDetails,
        email: parsed.userDetails?.email, // ✅ ensure email is always sent
      },
      coverLetterEntry: newEntry,
    };

    console.log("Payload for cover letter upload:", payload);

    // 5. Save to backend
    const backendData = await persistToBackend(payload);
    const serverUser = backendData.userDetails || parsed.userDetails;

    // 6. Persist & hydrate
    writeAuth(serverUser, parsed.token);
    setCoverList(Array.isArray(serverUser.coverLetters) ? serverUser.coverLetters : []);

    // 7. Update preview
    setPreviewMode(true);
    setActivePreviewUrl(toRawPdfUrl(uploadedURL));
    setIframeError(null);

    alert("✅ Cover letter uploaded successfully!");
  } catch (err) {
    console.error("Upload cover letter failed:", err);
    alert("❌ Upload failed.");
  } finally {
    setIsUploading(false);
  }
};

const uploadTranscript = async (file: File, name: string) => {
  try {
    setIsUploading(true);
    const uploadedURL = await uploadToCloudinary(file);
    const parsed = readAuth();
    if (!parsed) return;

    const newEntry: Entry = {
      name,
      url: uploadedURL,
      createdAt: new Date().toISOString(),
      jobRole: "",
      companyName: "",
      jobLink: "",
    };

    const payload = {
      token: parsed.token,
      userDetails: {
        ...parsed.userDetails,
        email: parsed.userDetails?.email,
      },
      transcriptEntry: newEntry,
    };

    const backendData = await persistToBackend(payload);
    const serverUser = backendData.userDetails || parsed.userDetails;

    writeAuth(serverUser, parsed.token);
    setTranscriptList(Array.isArray(serverUser.transcripts) ? serverUser.transcripts : []);

    setPreviewMode(true);
    setActivePreviewUrl(toRawPdfUrl(uploadedURL));
    setIframeError(null);

    alert("✅ Transcript uploaded successfully!");
  } catch (err) {
    console.error("Upload transcript failed:", err);
    alert("❌ Upload failed.");
  } finally {
    setIsUploading(false);
  }
};



const handleDelete = async (item: Entry, category: "base" | "optimized" | "cover") => {
  const DELETE_PASSCODE = import.meta.env.VITE_EDIT_PASSCODE; // simple hardcoded passcode for demo
  const input = prompt("Enter passcode to delete:");
  if (!input || input !== DELETE_PASSCODE) {
    alert("❌ Wrong passcode. Deletion cancelled.");
    return;
  }

  const parsed = readAuth();
  if (!parsed) return;

  try {
    const payload: any = {
      token: parsed.token,
      userDetails: parsed.userDetails,
    };

    if (category === "base") {
      payload.deleteBaseResume = item; // backend should know how to handle
    } else if (category === "optimized") {
      payload.deleteOptimizedResume = item;
    } else if (category === "cover") {
      payload.deleteCoverLetter = item;
    }
    else if (category === "transcript") {
  payload.deleteTranscript = item;
}


    const backendData = await persistToBackend(payload);
    const serverUser = backendData.userDetails || parsed.userDetails;

    // Update local auth + state
    writeAuth(serverUser, parsed.token);
    setBaseResume(serverUser.resumeLink || []);
    setOptimizedList(Array.isArray(serverUser.optimizedResumes) ? serverUser.optimizedResumes : []);
    setCoverList(Array.isArray(serverUser.coverLetters) ? serverUser.coverLetters : []);
    setTranscriptList(Array.isArray(serverUser.transcripts) ? serverUser.transcripts : []);

    alert("✅ Document deleted successfully!");
  } catch (err) {
    console.error(err);
    alert("❌ Failed to delete document.");
  }
};


    // // Save with or without metadata
    // const handleMetadataSubmit = async (e?: React.FormEvent<HTMLFormElement>, skip = false) => {
    //   if (e) e.preventDefault();
    //   if (!selectedFile || !pendingUploadType) return;
    //   if (isUploading) return;

    //   setIsUploading(true);
    //   try {
    //     const uploadedURL = await uploadToCloudinary(selectedFile);
    //     const parsed = readAuth();
    //     if (!parsed) return;

    //     const entry: Entry = skip
    //       ? { jobRole: "", companyName: "", jobLink: "", url: uploadedURL, createdAt: new Date().toISOString() }
    //       : { ...metadata, url: uploadedURL, createdAt: new Date().toISOString() };

    //     const payload: any = {
    //       token: parsed.token,
    //       userDetails: parsed.userDetails,
    //       resumeLink: baseResume,
    //     };

    //     if (pendingUploadType === "optimized") {
    //       payload.optimizedResumeEntry = entry;
    //     } else {
    //       payload.coverLetterEntry = entry;
    //     }

    //     const backendData = await persistToBackend(payload);
    //     const serverUser = backendData.userDetails || parsed.userDetails;

    //     // Persist and hydrate from server (merge style)
    //     writeAuth(serverUser, parsed.token);

    //     setBaseResume(serverUser.resumeLink || baseResume);
    //     setOptimizedList(Array.isArray(serverUser.optimizedResumes) ? serverUser.optimizedResumes : []);
    //     setCoverList(Array.isArray(serverUser.coverLetters) ? serverUser.coverLetters : []);

    //     // Immediately preview the doc we just uploaded
    //     setPreviewMode(true);
    //     setActivePreviewUrl(toRawPdfUrl(uploadedURL));
    //     setIframeError(null);

    //     alert(`✅ ${pendingUploadType === "optimized" ? "Optimized resume" : "Cover letter"} uploaded successfully!`);

    //     // reset modal state
    //     setMetadata({ jobRole: "", companyName: "", jobLink: "" });
    //     setShowMetaModal(null);
    //     setPendingUploadType(null);
    //     setSelectedFile(null);
    //   } catch (err) {
    //     console.error(err);
    //     alert("Upload failed.");
    //   } finally {
    //     setIsUploading(false);
    //   }
    // };

    // ---- Reusable Table (list view when View All Docs) ----
    const DocsTable = ({
        items,
        category,
        onPick,
    }: {
        items: Entry[];
        category: "Resume" | "Cover Letter" | "Base" | "Transcript";
        onPick: (item: Entry) => void;
    }) => (
      <div className="border rounded-lg overflow-hidden">
        <div className="grid grid-cols-10 bg-gray-100 text-sm font-bold px-4 py-3 ">
          <div className="col-span-6">Title</div>
          <div className="col-span-2">Category</div>
{(activeTab !== "base" && activeTab !== "cover") && (
  <div className="col-span-1">Job links</div>
)}
          <div className="col-span-1 text-right">Quick actions</div>
        </div>

        {items.length === 0 ? (
          <div className="px-4 py-6 text-sm text-gray-500">No documents yet.</div>
        ) : (
          <ul className="divide-y flex flex-col">
            {items.map((it, i) => (
              <li
                key={i}
                className="grid grid-cols-10 items-center px-4 py-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => onPick(it)}
                title="Click to preview"
              >
                <div className="col-span-6 min-w-0">
  <p className="truncate">
    {category === "Base"|| category == "Cover Letter"
      ? (`${it.name} -- Added on :  ${it.createdAt ? (typeof it.createdAt === 'string' ? it.createdAt.slice(0,10) : it.createdAt.toISOString().slice(0,10)) : 'Unknown'}` || "Unnamed Resume")   // ✅ show stored name
      : `${it.jobRole || "—"} at ${it.companyName || "—"}`}
  </p>
  {category === "Resume" && it.createdAt && (
    <p className="text-xs text-gray-500 mt-1">
      Created: {(() => {
        try {
          const date = new Date(it.createdAt);
          if (isNaN(date.getTime())) {
            console.warn('Invalid date format:', it.createdAt);
            return String(it.createdAt || "Unknown");
          }
          return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
        } catch (error) {
          console.error('Error parsing date:', it.createdAt, error);
          return String(it.createdAt || "Unknown");
        }
      })()}
    </p>
  )}
</div>
                <div className="col-span-2">{category}</div>
                <div className="col-span-1">
                  {it.jobLink ? (
                    <a
                      href={it.jobLink.startsWith('http') ? it.jobLink : `https://${it.jobLink}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Click Here
                    </a>
                  ) : (
                    ''
                  )}
                </div>
                <div className="col-span-1 flex justify-end">
                  {/* Only show download for non-job-based resumes */}
                  {!it.isJobBased && (
                    <a
                      href={toRawPdfUrl(it?.url) || it.link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-gray-700 hover:text-blue-600 p-2"
                      onClick={(e) => e.stopPropagation()}
                      title="Download"
                    >
                      <DownloadIcon />
                    </a>
                  )}

                  <button
  onClick={(e) => {
    e.stopPropagation(); // prevent triggering preview
    handleDelete(it, category === "Base" ? "base" : category === "Resume" ? "optimized" : "cover");
  }}
  className="text-gray-600-600 hover:text-red-600 m-2 "
  title="Delete"
>
  <Trash2 className="size-5" />
</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    );

    // ---- Reusable Preview Panel (iframe) ----
    const PreviewPanel = ({
        url,
        onChange,
    }: {
        url: string;
        onChange: () => void;
    }) => {
        if (!url) return null;
        const src = `${url}#toolbar=1&navpanes=0&scrollbar=1`; // tweak viewer UI

        return (
            <div className="flex flex-col items-center">
                <div className="border shadow mb-4 w-full max-w-3xl h-[80vh] bg-gray-50">
                    <iframe
                        key={url} // force reload when URL changes
                        title="pdf-preview"
                        src={src}
                        className="w-full h-full"
                        onLoad={() => setIframeError(null)}
                    />
                </div>

                {iframeError && (
                    <div className="text-sm text-red-600 mb-2">
                        Couldn’t preview this PDF here. You can still download
                        it below.
                    </div>
                )}

                <div className="flex gap-2">
                    <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-blue-600 text-white px-4 py-2 rounded"
                    >
                        Download
                    </a>
                    <button
                        onClick={onChange}
                        className="bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded"
                    >
                        View All Docs
                    </button>
                </div>
            </div>
        );
    };

    // ---- UI ----
    return (
        <div className="max-w-5xl mx-auto p-4">
            <div className="grid grid-cols-12 gap-4 h-fit overflow-y-scroll">
                {/* Left sidebar */}
                <aside className="col-span-12 md:col-span-3 fixed top-25 ml-4 w-1/5 left-0 ">
                    <div className="bg-white rounded-lg shadow border">
                        <h2 className="px-4 py-3 font-semibold border-b">
                            Documents
                        </h2>
                        <nav className="flex md:flex-col">
                            <button
                                className={`px-4 py-3 text-left w-full hover:bg-gray-50 ${
                                    activeTab === "base"
                                        ? "bg-blue-50 text-blue-700 font-medium"
                                        : ""
                                }`}
                                onClick={() => {
                                    setActiveTab("base");
                                    setPreviewMode(false);
                                    setActivePreviewUrl(null);
                                }}
                            >
                                Base Resume
                            </button>
                            <button
                                className={`px-4 py-3 text-left w-full hover:bg-gray-50 ${
                                    activeTab === "optimized"
                                        ? "bg-blue-50 text-blue-700 font-medium"
                                        : ""
                                }`}
                                onClick={() => {
                                    setActiveTab("optimized");
                                    setPreviewMode(false);
                                    setActivePreviewUrl(null);
                                }}
                            >
                                Optimized Resumes
                            </button>
                            <button
                                className={`px-4 py-3 text-left w-full hover:bg-gray-50 ${
                                    activeTab === "cover"
                                        ? "bg-blue-50 text-blue-700 font-medium"
                                        : ""
                                }`}
                                onClick={() => {
                                    setActiveTab("cover");
                                    setPreviewMode(false);
                                    setActivePreviewUrl(null);
                                }}
                            >
                                Cover Letters
                            </button>
                            <button
                                className={`px-4 py-3 text-left w-full hover:bg-gray-50 ${
                                    activeTab === "transcript" ? "bg-blue-50 text-blue-700 font-medium" : ""
                                }`}
                                onClick={() => {
                                    setActiveTab("transcript");
                                    setPreviewMode(false);
                                    setActivePreviewUrl(null);
                                }}
                                >
                                Transcripts
                            </button>

                        </nav>
                    </div>
                </aside>

                {/* Main content */}
                <main className="col-span-12 md:col-span-9 w-3/4 fixed right-10">
                    <div className="bg-white rounded-lg shadow border p-4 w-[70vw] h-[90vh] overflow-y-scroll">
                        {/* BASE TAB */}
                        {activeTab === "base" && (
                            <section>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-lg font-semibold">
                                        Base Resume
                                    </h3>
                                    {baseResume && previewMode && (
                                        <button
                                            className="px-3 py-1.5 rounded bg-blue-500 hover:bg-blue-700 text-white text-sm"
                                            onClick={() =>{
                                                setActiveTab('base');
                                                setPreviewMode(false);
                                            }}
                                        >
                                            <ArrowLeftCircle />
                                            View All Docs
                                        </button>
                                    )}
                                </div>

                                {baseResume && previewMode ? (
                                   <PreviewPanel
  url={toRawPdfUrl(activePreviewUrl || '')} // 👈 no download flag, pure preview
  onChange={() => setPreviewMode(true)}
/>
                                ) : (
                                    <>
                                        {/* Base table (single row if exists) */}
                                        {baseResume ? (
                                            <DocsTable
                                                items={Array.isArray(baseResume) ? baseResume : [baseResume]}
                                                category="Base"
                                                onPick={(it) => {
                                                    setActivePreviewUrl(
                                                        toRawPdfUrl(it.url)!
                                                    );
                                                    setPreviewMode(true);
                                                    setIframeError(null);
                                                }}
                                            />
                                        ) : (
                                            <p className="text-sm text-gray-500 mb-4">
                                                No base resume uploaded yet.
                                            </p>
                                        )}

                                        <div className="mt-4">
                                            <label className="inline-flex items-center gap-2 cursor-pointer">
                                                <span className="text-sm font-medium">
                                                    Upload / Replace Base Resume
                                                </span>
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    accept="application/pdf,.pdf"
                                                    onChange={(e) =>
                                                        handleFileUpload(
                                                            e,
                                                            "base"
                                                        )
                                                    }
                                                    disabled={isUploading}
                                                />
                                                <span className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm">
                                                    Choose File
                                                </span>
                                            </label>
                                        </div>
                                    </>
                                )}
                            </section>
                        )}

                        {/* OPTIMIZED TAB */}
                        {activeTab === "optimized" && (
                            <section>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-lg font-semibold">
                                        Optimized Resumes
                                    </h3>
                                    {previewMode ? (
                                        // <div className="flex gap-4 px-3 py-1.5 rounded">
                                        //   <button type="button" className="p-2 m-2 rounded bg-blue-400 hover:bg-blue-700 flex"><a href=""><DownloadCloud /> Download  </a></button>
                                        <button
                                            className="p-2 m-2 rounded bg-blue-500 hover:bg-blue-700 text-white text-sm"
                                            onClick={() => {
                                                setPreviewMode(false);
                                                setResumeData(null);
                                                setActivePreviewUrl(null);
                                            }}
                                        >
                                            <ArrowLeftCircle />
                                            View All Docs
                                        </button>
                                    ) : (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={fetchAllOptimizedResumes}
                                                className="px-3 py-1.5 rounded bg-green-600 hover:bg-green-700 text-white text-sm"
                                            >
                                                Refresh
                                            </button>
                                            <label className="inline-flex items-center gap-2 cursor-pointer">
                                                <span className="text-sm font-medium">
                                                    Upload New
                                                </span>
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    accept="application/pdf,.pdf"
                                                    multiple
                                                    onChange={(e) =>
                                                        handleFileUpload(
                                                            e,
                                                            "optimized"
                                                        )
                                                    }
                                                    disabled={isUploading}
                                                />
                                                <span className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm">
                                                    Choose File
                                                </span>
                                            </label>
                                        </div>
                                    )}
                                </div>

                                {fetchingResumes ? (
                                    <div className="flex items-center justify-center py-8">
                                        <div className="text-sm text-gray-500">Loading optimized resumes...</div>
                                    </div>
                                ) : optimizedList.length === 0 ? (
                                    <p className="text-sm text-gray-500">
                                        No optimized resumes yet.
                                    </p>
                                ) : previewMode && resumeData && !resumeLoading ? (
                                    <div className="resume-preview-container">
                                        {resumeData.version === 0 && (
                                            <ResumePreview
                                                data={resumeData.resumeData}
                                                showLeadership={resumeData.showLeadership}
                                                showProjects={resumeData.showProjects}
                                                showSummary={resumeData.showSummary}
                                                showPublications={resumeData.showPublications}
                                                showChanges={false}
                                                changedFields={new Set()}
                                                showPrintButtons={context?.userDetails?.role !== "user" && localStorage.getItem("role") !== "user"}
                                            />
                                        )}
                                        
                                        {resumeData.version === 1 && (
                                            <ResumePreview1
                                                data={resumeData.resumeData}
                                                showLeadership={resumeData.showLeadership}
                                                showProjects={resumeData.showProjects}
                                                showSummary={resumeData.showSummary}
                                                showChanges={false}
                                                changedFields={new Set()}
                                                showPrintButtons={context?.userDetails?.role !== "user" && localStorage.getItem("role") !== "user"}
                                            />
                                        )}
                                        
                                        {resumeData.version === 2 && (
                                            <ResumePreviewMedical
                                                data={resumeData.resumeData}
                                                showLeadership={resumeData.showLeadership}
                                                showProjects={resumeData.showProjects}
                                                showSummary={resumeData.showSummary}
                                                showPublications={resumeData.showPublications}
                                                showPrintButtons={context?.userDetails?.role !== "user" && localStorage.getItem("role") !== "user"}
                                            />
                                        )}
                                    </div>
                                ) : previewMode && activePreviewUrl ? (
                                    <PreviewPanel
                                        url={
                                            toRawPdfUrl(
                                                activePreviewUrl
                                            ) as string
                                        }
                                        onChange={() => setPreviewMode(false)}
                                    />
                                ) : resumeLoading ? (
                                    <div className="flex items-center justify-center py-8">
                                        <div className="text-sm text-gray-500">Loading resume...</div>
                                    </div>
                                ) : (
                                    <DocsTable
                                        items={[...optimizedList].sort((a, b) => {
                                            // ALWAYS sort by date at display time (newest first)
                                            const dateA = new Date(a.createdAt || 0);
                                            const dateB = new Date(b.createdAt || 0);
                                            
                                            // Handle invalid dates
                                            if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
                                            if (isNaN(dateA.getTime())) return 1; // Invalid dates go to end
                                            if (isNaN(dateB.getTime())) return -1; // Invalid dates go to end
                                            
                                            // NEWEST FIRST: dateB - dateA
                                            return dateB.getTime() - dateA.getTime();
                                        })}
                                        category="Resume"
                                        onPick={(it) => {
                                            // For job-specific optimized resumes, show resume data directly
                                            if (it.isJobBased && it.resumeData) {
                                                // We already have the resume data, show it directly
                                                setResumeData({
                                                    resumeData: it.resumeData,
                                                    version: it.version,
                                                    showSummary: it.showSummary,
                                                    showProjects: it.showProjects,
                                                    showLeadership: it.showLeadership,
                                                    showPublications: it.showPublications
                                                });
                                                setPreviewMode(true);
                                            } else if (it.isJobBased && (it.jobID || it.jobId) && it.hasResume) {
                                                // Fetch resume data from job if not already available
                                                fetchResumeDataFromJob(it.jobID || it.jobId || '');
                                            } else {
                                                // Fallback to preview for legacy resumes (Cloudinary links)
                                                setActivePreviewUrl(
                                                    toRawPdfUrl(it.url || it.link || '')!
                                                );
                                                setPreviewMode(true);
                                                setIframeError(null);
                                            }
                                        }}
                                    />
                                )}
                            </section>
                        )}

                        {/* COVER TAB */}
                        {activeTab === "cover" && (
                            <section>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-lg font-semibold">
                                        Cover Letters
                                    </h3>
                                    {previewMode ? (
                                        <button
                                            className="px-3 py-1.5 rounded bg-blue-500 hover:bg-blue-700 text-white text-sm"
                                            onClick={() =>
                                                setPreviewMode(false)
                                            }
                                        >
                                            <ArrowLeftCircle />
                                            View All Docs
                                        </button>
                                    ) : (
                                        <label className="inline-flex items-center gap-2 cursor-pointer">
                                            <span className="text-sm font-medium">
                                                Upload New
                                            </span>
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="application/pdf,.pdf"
                                                onChange={(e) =>
                                                    handleFileUpload(
                                                        e,
                                                        "coverLetter"
                                                    )
                                                }
                                                disabled={isUploading}
                                            />
                                            <span className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm">
                                                Choose File
                                            </span>
                                        </label>
                                    )}
                                </div>

                                {coverList.length === 0 ? (
                                    <p className="text-sm text-gray-500">
                                        No cover letters yet.
                                    </p>
                                ) : previewMode && activePreviewUrl ? (
                                    <PreviewPanel
                                        url={
                                            toRawPdfUrl(
                                                activePreviewUrl
                                            ) as string
                                        }
                                        onChange={() => setPreviewMode(false)}
                                    />
                                ) : (
                                    <DocsTable
                                        items={coverList}
                                        category="Cover Letter"
                                        onPick={(it) => {
                                            setActivePreviewUrl(
                                                toRawPdfUrl(it.url)!
                                            );
                                            setPreviewMode(true);
                                            setIframeError(null);
                                        }}
                                    />
                                )}
                            </section>
                        )}
                        {activeTab === "transcript" && (
                            <section>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-lg font-semibold">Transcripts</h3>
                                    {previewMode ? (
                                        <button
                                            className="px-3 py-1.5 rounded bg-blue-500 hover:bg-blue-700 text-white text-sm"
                                            onClick={() => setPreviewMode(false)}
                                        >
                                            <ArrowLeftCircle />
                                            View All Docs
                                        </button>
                                    ) : (
                                        <label className="inline-flex items-center gap-2 cursor-pointer">
                                            <span className="text-sm font-medium">Upload New</span>
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="application/pdf,.pdf"
                                                onChange={(e) => handleFileUpload(e, "transcript")}
                                                disabled={isUploading}
                                            />
                                            <span className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm">
                                                Choose File
                                            </span>
                                        </label>
                                    )}
                                </div>

                                {transcriptList.length === 0 ? (
                                    <p className="text-sm text-gray-500">No transcripts yet.</p>
                                ) : previewMode && activePreviewUrl ? (
                                    <PreviewPanel
                                        url={toRawPdfUrl(activePreviewUrl || '') as string}
                                        onChange={() => setPreviewMode(false)}
                                    />
                                ) : (
                                    <DocsTable
                                        items={transcriptList}
                                        category="Transcript"
                                        onPick={(it) => {
                                            setActivePreviewUrl(toRawPdfUrl(it.url || it.link || '')!);
                                            setPreviewMode(true);
                                            setIframeError(null);
                                        }}
                                    />
                                )}
                            </section>
                        )}

                    </div>
                </main>
            </div>

        </div>
    );
  }