
import { ArrowLeftCircle, Trash2, HardDriveDownload } from "lucide-react";
import React, { useEffect, useState, useContext } from "react";
import { UserContext } from '../state_management/UserContext.js';
import GuidePopup from "./GuidePopup.js";
import { uploadFilesToR2 } from "../utils/uploadToR2";
type PendingType = "optimized" | "coverLetter" | null;

type Entry = {
  jobRole: string;
  companyName: string;
  jobLink?: string;
  url: string;
  createdAt?: string | Date;
  jobId?: string;
  name: string
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


const fmtDate = (d?: string | Date) =>
  d
    ? new Date(d).toLocaleDateString(undefined, {
      month: "short",
      day: "2-digit",
      year: "numeric",
    })
    : "—";

// Small download icon (no external deps)
const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M12 3a1 1 0 011 1v9.586l2.293-2.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4A1 1 0 118.707 11.293L11 13.586V4a1 1 0 011-1z"></path>
    <path d="M5 18a1 1 0 011-1h12a1 1 0 110 2H6a1 1 0 01-1-1z"></path>
  </svg>
);

// using shared uploadFilesToR2 from ../utils/uploadToR2

export default function DocumentUpload() {
  const [activeTab, setActiveTab] = useState<"base" | "optimized" | "cover" | "transcript">("base");
  const [fileNamePrompt, setFileNamePrompt] = useState<string>("");
  const context = useContext(UserContext);
  const [baseResume, setBaseResume] = useState([]);
  const [optimizedList, setOptimizedList] = useState<Entry[]>([]);
  const [coverList, setCoverList] = useState<Entry[]>([]);
  const [transcriptList, setTranscriptList] = useState([]);
  const [showGuide, setShowGuide] = useState(false);

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
    const isPdf = file.type === "application/pdf";
    const formData = new FormData();
    formData.append("file", file);
    formData.append(
      "upload_preset",
      import.meta.env.VITE_CLOUDINARY_CLOUD_PRESET_PDF
    );

    // Use the correct endpoint for PDFs so we get a clean PDF URL
    const resource = isPdf ? "raw" : "auto";
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
      }/${resource}/upload`,
      { method: "POST", body: formData }
    );
    if (!res.ok) throw new Error("Cloudinary upload failed");
    const data = await res.json();
    if (!data?.secure_url) throw new Error("No secure_url returned");

    const url: string = isPdf
      ? (data.secure_url as string).replace(
        "/image/upload/",
        "/raw/upload/"
      )
      : (data.secure_url as string);

    return url;
  };

  const persistToBackend = async (payload: any) => {
    console.log("persistToBackend payload:", payload);
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/plans/select`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      // try to read response body for a helpful error message
      let text = "";
      try {
        text = await res.json();
      } catch (e) {
        // ignore
      }
      console.error("persistToBackend failed", { status: res.status, body: text });
      throw new Error(`Backend save failed: ${res.status} ${text}`);
    }
    return res.json(); // -> { userDetails: {..., resumeLink, optimizedResumes, coverLetters } }
  };
  const handleExit = () => {
    setShowGuide(false);
    localStorage.setItem("ResumeGuideSeen", "true");
  };
  useEffect(() => {
    const isNewUser = !localStorage.getItem("ResumeGuideSeen");
    if (isNewUser) setShowGuide(true);
  }, []);

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


    setOptimizedList(Array.isArray(u.optimizedResumes) ? u.optimizedResumes : []);
    setCoverList(Array.isArray(u.coverLetters) ? u.coverLetters : []);
    setTranscriptList(Array.isArray(u.transcript) ? u.transcript : []);

  }, []);

  // Default preview per tab (only when in preview mode AND no preview selected yet)
  useEffect(() => {
    if (!previewMode) return;
    if (activePreviewUrl) return; // don't override a user-selected preview
    setIframeError(null);

    let defaultUrl: string | null = null;
    if (activeTab === "base") {
      const last = Array.isArray(baseResume) && baseResume.length > 0 ? baseResume[baseResume.length - 1] : null;
      defaultUrl = (last?.link || last?.url) ?? null;
    }
    else if (activeTab === "optimized") defaultUrl = optimizedList[0]?.url || null;
    else if (activeTab === "cover") defaultUrl = coverList[0]?.url || null;
    else if (activeTab === "transcript") defaultUrl = transcriptList[0]?.url || null;


    setActivePreviewUrl(toRawPdfUrl(defaultUrl));
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
        // setSelectedFile(file);
        // setFileNamePrompt(name);
        // setPendingUploadType(type);

        if (type === "base") {
          await uploadBaseResume(file, name);
          setPreviewMode(false);
        } else if (type === "coverLetter") {
          await uploadCoverLetter(file, name);
        } else if (type === "optimized") {
          await uploadOptimizedResume(file, name);
        }
        else if (type === "transcript") {
          await uploadTranscript(file, name);
        }

        return;
      }

    };
  }

  const uploadBaseResume = async (file: File, name: string) => {
    const uploadedURLs = await uploadFilesToR2([file], (readAuth()?.userDetails?.email) || 'frontend', 'pdf');
    const uploadedURL = uploadedURLs[0];
    if (!uploadedURL) {
      console.error("uploadBaseResume: no uploaded URL returned", { uploadedURLs });
      alert("Upload failed: no URL returned from storage service.");
      return;
    }
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

  // 1. Upload to R2
  const uploadedURLs = await uploadFilesToR2([file], (readAuth()?.userDetails?.email) || 'frontend', 'pdf');
  const uploadedURL = uploadedURLs[0];

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

  // 1. Upload to R2
  const uploadedURLs = await uploadFilesToR2([file], (readAuth()?.userDetails?.email) || 'frontend', 'pdf');
  const uploadedURL = uploadedURLs[0];

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
  const uploadedURLs = await uploadFilesToR2([file], (readAuth()?.userDetails?.email) || 'frontend', 'pdf');
  const uploadedURL = uploadedURLs[0];
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
      setTranscriptList(Array.isArray(serverUser.transcript) ? serverUser.transcript : []);

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
  //     const DocsTable = ({
  //         items,
  //         category,
  //         onPick,
  //     }: {
  //         items: Entry[];
  //         category: "Resume" | "Cover Letter" | "Base" | "Transcript";
  //         onPick: (item: Entry) => void;
  //     }) => (
  //       <div className="border rounded-lg overflow-hidden">
  //         <div className="grid grid-cols-10 bg-gray-100 text-sm font-bold px-4 py-3 ">
  //           <div className="col-span-6">Title</div>
  //           {/* <div className="col-span-6">Created On</div> */}
  //           <div className="col-span-2">Category</div>
  // {(activeTab !== "base" && activeTab !== "cover") && (
  //   <div className="col-span-1">Job links</div>
  // )}
  //           <div className="col-span-1 text-right">Quick actions</div>
  //         </div>

  //         {items.length === 0 ? (
  //           <div className="px-4 py-6 text-sm text-gray-500">No documents yet.</div>
  //         ) : (
  //           <ul className="divide-y flex flex-col flex-col-reverse">
  //             {items.map((it, i) => (
  //               <li
  //                 key={i}
  //                 className="grid grid-cols-10 items-center px-4 py-4 hover:bg-gray-50 cursor-pointer"
  //                 onClick={() => onPick(it)}
  //                 title="Click to preview"
  //               >
  //                 <div className="col-span-6 min-w-0">
  //   <p className="truncate">
  //     {category === "Base"|| category == "Cover Letter" || category == "Transcript"
  //       ? (`${it.name} ` || "Unnamed Resume")   // ✅ show stored name
  //       : `${it.jobRole || "—"} At ${it.companyName || "—"}`}
  //   </p>
  // </div>
  //                 <div className="col-span-2">{it.createdAt.slice(0,10)}</div>

  //                 <div className="col-span-2">{category} {category=="Base"? "Resume": ""}</div>
  //                 <div className="col-span-1">
  //                   {it.jobLink ? (
  //                     <a
  //                       href={it.jobLink.startsWith('http') ? it.jobLink : `https://${it.jobLink}`}
  //                       target="_blank"
  //                       rel="noopener noreferrer"
  //                       className="text-blue-600 hover:underline"
  //                     >
  //                       Click Here
  //                     </a>
  //                   ) : (
  //                     ''
  //                   )}
  //                 </div>
  //                 <div className="col-span-1 flex justify-end">
  //                   <a
  //                     href={toRawPdfUrl(it?.url) || it.link}
  //                     target="_blank"
  //                     rel="noreferrer"
  //                     className="text-gray-700 hover:text-blue-600 p-2"
  //                     onClick={(e) => e.stopPropagation()}
  //                     title="Download"
  //                   >
  //                     <DownloadIcon className="text-gray-700 hover:text-blue-600 m-2 "  />
  //                   </a>

  //                   {/* <button
  //   onClick={(e) => {
  //     e.stopPropagation(); // prevent triggering preview
  //     handleDelete(it, category === "Base" ? "base" : category === "Resume" ? "optimized" : "cover");
  //   }}
  //   className="text-gray-600-600 hover:text-red-600 m-2 "
  //   title="Delete"
  // >
  //   <Trash2 className="size-5" />
  // </button> */}
  //                 </div>
  //               </li>
  //             ))}
  //           </ul>
  //         )}
  //       </div>
  //     );
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
      {/* ✅ Scrollable Container */}
      <div className="overflow-x-auto">
        <div className="min-w-[500px]"> {/* ensures proper column spacing */}
          {/* ✅ Header */}
          <div className="grid grid-cols-12 bg-gray-100 text-sm font-bold px-4 py-3 sticky top-0 z-10">
            <div className="col-span-5">Title</div>
            <div className="col-span-3">Created On</div>
            <div className="col-span-2">Category</div>
            {activeTab !== "base" &&
              activeTab !== "cover" &&
              activeTab !== "transcript" && (
                <div className="col-span-1">Job Link</div>
              )}
            <div className="col-span-1 text-right">Actions</div>
          </div>

          {/* ✅ Body */}
          {items.length === 0 ? (
            <div className="px-4 py-6 text-sm text-gray-500">No documents yet.</div>
          ) : (
            <ul className="divide-y flex flex-col flex-col-reverse">
              {items.map((it, i) => (
                <li
                  key={i}
                  className="grid grid-cols-12 items-center px-2 py-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => onPick(it)}
                  title="Click to preview"
                >
                  {/* Title */}
                  <div className="col-span-5 truncate w-full">
                    {category === "Base" ||
                      category === "Cover Letter" ||
                      category === "Transcript"
                      ? it.name || "Unnamed"
                      : `${it.jobRole || it.name} ${it.companyName? 'at': ''} ${it.companyName || ""}`}
                  </div>

                  {/* Created On */}
                  <div className="col-span-3 text-sm text-gray-600 whitespace-nowrap">
                    {it.createdAt
                      ? new Date(it.createdAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })
                      : "—"}
                  </div>

                  {/* Category */}
                  <div className="col-span-2 whitespace-nowrap">
                    {category} {category == "Base" ? "Resume" : ""}
                  </div>

                  {/* Job Link */}
                  {activeTab !== "base" &&
                    activeTab !== "cover" &&
                    activeTab !== "transcript" && (
                      <div className="col-span-1 whitespace-nowrap">
                        {it.jobLink ? (
                          <a
                            href={
                              it.jobLink.startsWith("http")
                                ? it.jobLink
                                : `https://${it.jobLink}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Link
                          </a>
                        ) : (
                          "—"
                        )}
                      </div>
                    )}

                  {/* Actions */}
                  <div className="col-span-1 flex justify-end gap-2 whitespace-nowrap">
                    <a
                      href={toRawPdfUrl(it.link || it.url) || it.link || it.url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      title="Download"
                    >
                      <DownloadIcon />
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
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
        <div className="border shadow mb-4 w-full h-[70vh] md:h-[80vh] bg-gray-50">
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

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex flex-col md:grid md:grid-cols-12 gap-4 ">
        {showGuide && (
          <GuidePopup
            message="Upload your base resume and the job description to get an AI-optimized version tailored for ATS and recruiters."
            title="Resume Optimizer Guide"
            onExit={handleExit}
            position="optimizer"
          />
        )}

        {/* Sidebar */}
        <aside className="md:col-span-3 bg-white rounded-lg shadow border  top-20 ">
          <h2 className="px-4 py-3 font-semibold border-b">Documents</h2>
          <nav className="flex flex-wrap md:flex-col">
            {[
              { id: "base", label: "Base Resume" },
              { id: "optimized", label: "Optimized Resumes" },
              { id: "cover", label: "Cover Letters" },
              { id: "transcript", label: "Transcripts" },
            ].map((tab) => (
              <button
                key={tab.id}
                className={`px-4 py-3 text-left w-full hover:bg-gray-50 transition ${activeTab === tab.id ? "bg-blue-50 text-blue-700 font-medium" : ""
                  }`}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setPreviewMode(false);
                  setActivePreviewUrl(null);
                }}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="md:col-span-9  rounded-lg shadow border p-4 md:p-6">
          {/* Base Resume */}
          {activeTab === "base" && (
            <section>
              <div className="flex items-center justify-between flex-wrap mb-4 gap-2">
                <h3 className="text-lg font-semibold">Base Resume</h3>
                {baseResume && previewMode && (
                  <button
                    onClick={() => setPreviewMode(false)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700"
                  >
                    <ArrowLeftCircle className="w-4 h-4" /> View All Docs
                  </button>
                )}
              </div>

              {baseResume && previewMode ? (
                <PreviewPanel
                  url={toRawPdfUrl(activePreviewUrl)}
                  onChange={() => setPreviewMode(true)}
                />
              ) : (
                <>
                  <DocsTable
                    items={Array.isArray(baseResume) ? baseResume : [baseResume]}
                    category="Base"
                    onPick={(it) => {
                      setActivePreviewUrl(toRawPdfUrl(it.link || it.url)!);
                      setPreviewMode(true);
                    }}
                  />

                  <div className="mt-4">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <span className="text-sm font-medium">Upload / Replace Base Resume</span>
                      <input
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, "base")}
                        disabled={isUploading}
                      />
                      <span className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm">
                        Choose File
                      </span>
                    </label>
                  </div>
                </>
              )}
            </section>
          )}

          {/* Optimized / Cover / Transcript (reused layout) */}
          {["optimized", "cover", "transcript"].map(
            (tab) =>
              activeTab === tab && (
                <section key={tab}>
                  <div className="flex items-center justify-between flex-wrap mb-4 gap-2">
                    <h3 className="text-lg font-semibold capitalize">
                      {tab === "optimized"
                        ? "Optimized Resumes"
                        : tab === "cover"
                          ? "Cover Letters"
                          : "Transcripts"}
                    </h3>

                    {previewMode ? (
                      <button
                        onClick={() => setPreviewMode(false)}
                        className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700"
                      >
                        <ArrowLeftCircle className="w-4 h-4" /> View All Docs
                      </button>
                    ) : (
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <span className="text-sm font-medium">Upload New</span>
                        <input
                          type="file"
                          accept="application/pdf"
                          multiple={tab === "optimized"}
                          className="hidden"
                          onChange={(e) =>
                            handleFileUpload(
                              e,
                              tab === "optimized"
                                ? "optimized"
                                : tab === "cover"
                                  ? "coverLetter"
                                  : "transcript"
                            )
                          }
                        />
                        <span className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm">
                          Choose File
                        </span>
                      </label>
                    )}
                  </div>

                  {(() => {
                    const list =
                      tab === "optimized"
                        ? optimizedList
                        : tab === "cover"
                          ? coverList
                          : transcriptList;

                    return list.length === 0 ? (
                      <p className="text-sm text-gray-500">No documents yet.</p>
                    ) : previewMode && activePreviewUrl ? (
                      <PreviewPanel
                        url={toRawPdfUrl(activePreviewUrl) as string}
                        onChange={() => setPreviewMode(false)}
                      />
                    ) : (
                      <DocsTable
                        items={list}
                        category={
                          tab === "optimized"
                            ? "Resume"
                            : tab === "cover"
                              ? "Cover Letter"
                              : "Transcript"
                        }
                        onPick={(it) => {
                          setActivePreviewUrl(toRawPdfUrl(it.url)!);
                          setPreviewMode(true);
                        }}
                      />
                    );
                  })()}
                </section>
              )
          )}
        </main>
      </div>


      {/* {/* Metadata modal */}
      {/* {showMetaModal && ( */}
      {/* <div
                  className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
                  role="dialog"
                  aria-modal="true"
              > */}
      {/* <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-4"> */}
      {/* <div className="flex items-center justify-between mb-2"> */}
      {/* <h2 className="text-lg font-semibold"> */}
      {/* {showMetaModal === "optimized"
                                  ? "Optimized Resume Details"
                                  : "Cover Letter Details"} */}
      {/* </h2> */}
      {/* <button
                              type="button"
                              className="text-gray-500 hover:text-gray-800"
                              // onClick={() => {
                              //     if (!isUploading) {
                              //         // setShowMetaModal(null);
                              //         setPendingUploadType(null);
                              //         setSelectedFile(null);
                              //         setMetadata({
                              //             jobRole: "",
                              //             companyName: "",
                              //             jobLink: "",
                              //         });
                              //     }
                              // }}
                              aria-label="Close"
                          >
                              ✕
                          </button> */}
      {/* </div> */}

      {/* <form
                          // onSubmit={(e) => handleMetadataSubmit(e, false)}
                          className="space-y-3"
                      > */}
      {/* <div>
                              <label className="block text-sm font-medium">
                                  Job Role
                              </label>
                              <input
                                  type="text"
                                  // value={metadata.jobRole}
                                  // onChange={(e) =>
                                  //     setMetadata((prev) => ({
                                  //         ...prev,
                                  //         jobRole: e.target.value,
                                  //     }))
                                  // }
                                  className="w-full border p-2 rounded"
                                  disabled={isUploading}
                                  placeholder="e.g., Data Analyst"
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-medium">
                                  Company Name
                              </label>
                              <input
                                  type="text"
                                  // value={metadata.companyName}
                                  // onChange={(e) =>
                                  //     setMetadata((prev) => ({
                                  //         ...prev,
                                  //         companyName: e.target.value,
                                  //     }))
                                  // }
                                  className="w-full border p-2 rounded"
                                  disabled={isUploading}
                                  placeholder="e.g., Acme Corp"
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-medium">
                                  Job Link
                              </label>
                              <input
                                  type="url"
                                  // value={metadata.jobLink}
                                  // onChange={(e) =>
                                  //     setMetadata((prev) => ({
                                  //         ...prev,
                                  //         jobLink: e.target.value,
                                  //     }))
                                  // }
                                  className="w-full border p-2 rounded"
                                  disabled={isUploading}
                                  placeholder="https://careers.example.com/job/123"
                              />
                          </div> */}

      {/* <div className="flex gap-2 pt-1"> */}
      {/* <button
                                    type="submit"
                                    disabled={isUploading}
                                    className="bg-blue-600 text-white px-4 py-2 rounded w-1/2"
                                >
                                    {isUploading
                                        ? "Uploading..."
                                        : "Save & Upload"}
                                </button> */}
      {/* <button
                                    type="button"
                                    disabled={isUploading}
                                    onClick={() =>
                                        handleMetadataSubmit(undefined, true)
                                    }
                                    className="bg-gray-600 text-white px-4 py-2 rounded w-1/2"
                                >
                                    {isUploading
                                        ? "Uploading..."
                                        : "Skip Metadata"}
                                </button> */}
      {/* </div> */}
      {/* </form> */}
      {/* </div> */}
      {/* </div> */}
      {/* )}  */}
    </div>
  );
}