import { create } from "zustand";
import { persist } from "zustand/middleware";
import { initialData, getInitialData } from "../data/initialData";

type ResumeDataType = typeof initialData;

interface ResumeStore {
     resumeData: ResumeDataType;
     baseResume: ResumeDataType;
     showLeadership: boolean;
     showProjects: boolean;
     showSummary: boolean;
     isSaved: boolean;
     jobDescription: string;
     isOptimizing: boolean;
     optimizedData: ResumeDataType | null;
     currentView: "editor" | "optimized" | "changes";
     showChanges: boolean;
     changedFields: Set<string>;
     showPublications: boolean;

     // Section ordering for drag and drop
     sectionOrder: string[];

     // Persistent resume selection
     lastSelectedResume: ResumeDataType | null;
     lastSelectedResumeId: string | null;

     // actions

     setResumeData: (data: ResumeDataType) => void;
     setBaseResume: (data: ResumeDataType) => void;
     setShowLeadership: (value: boolean) => void;
     setShowProjects: (value: boolean) => void;
     setShowSummary: (value: boolean) => void;
     setShowPublications: (value: boolean) => void;
     setIsSaved: (value: boolean) => void;
     setJobDescription: (value: string) => void;
     setIsOptimizing: (value: boolean) => void;
     setOptimizedData: (
          data:
               | ResumeDataType
               | null
               | ((prev: ResumeDataType | null) => ResumeDataType | null)
     ) => void;
     setCurrentView: (view: "editor" | "optimized" | "changes") => void;
     setShowChanges: (value: boolean) => void;
     setChangedFields: (fields: Set<string>) => void;
     setSectionOrder: (order: string[]) => void;
     resetStore: () => void;

     // Persistent resume selection actions
     setLastSelectedResume: (data: ResumeDataType, resumeId: string) => void;
     clearLastSelectedResume: () => void;
     loadLastSelectedResume: () => boolean;

     // Debug function to manually check and fix localStorage
     debugLocalStorage: () => void;
}


export const useResumeStore = create<ResumeStore>()(
     persist(
          (set, get) => {
               const initialResumeData = getInitialData();
               return {
                    resumeData: initialResumeData,
                    baseResume: initialResumeData,
                    showLeadership: false,
                    showProjects: false, // Will be set based on database check
                    showSummary: false, // Will be set based on database check
                    isSaved: false,
                    jobDescription: "",
                    isOptimizing: false,
                    optimizedData: null,
                    currentView: "editor",
                    showChanges: false,
                    changedFields: new Set(),
                    showPublications: false,

                    // Section ordering for drag and drop
                    sectionOrder: [
                        "personalInfo",
                        "summary", 
                        "workExperience",
                        "projects",
                        "leadership",
                        "skills",
                        "education",
                        "publications"
                    ],

                    // Persistent resume selection
                    lastSelectedResume: null,
                    lastSelectedResumeId: null,

                    setShowPublications: (value) => set({ showPublications: value }),
                    setResumeData: (data) => set({ resumeData: data }),
                    setBaseResume: (data) => set({ baseResume: data }),
                    setShowLeadership: (value) => set({ showLeadership: value }),
                    setShowProjects: (value) => set({ showProjects: value }),
                    setShowSummary: (value) => set({ showSummary: value }),
                    setIsSaved: (value) => set({ isSaved: value }),
                    setJobDescription: (value) => set({ jobDescription: value }),
                    setIsOptimizing: (value) => set({ isOptimizing: value }),
                    setOptimizedData: (data) =>
                         set((state) => ({
                              optimizedData:
                                   typeof data === "function"
                                        ? data(state.optimizedData)
                                        : data,
                         })),
                    setCurrentView: (view) => set({ currentView: view }),
                    setShowChanges: (value) => set({ showChanges: value }),
                    setChangedFields: (fields) => set({ changedFields: fields }),
                    setSectionOrder: (order) => set({ sectionOrder: order }),

                    resetStore: () => {
                         const initialResumeData = getInitialData();
                         set({
                              resumeData: initialResumeData,
                              baseResume: initialResumeData,
                              showLeadership: true,
                              showProjects: false, // Will be set based on database check
                              showSummary: false, // Will be set based on database check
                              isSaved: false,
                              showPublications: false,
                              jobDescription: "",
                              isOptimizing: false,
                              optimizedData: null,
                              currentView: "editor",
                              showChanges: false,
                              changedFields: new Set(),
                              sectionOrder: [
                                  "personalInfo",
                                  "summary", 
                                  "workExperience",
                                  "projects",
                                  "leadership",
                                  "skills",
                                  "education",
                                  "publications"
                              ],
                              // Note: We intentionally don't reset lastSelectedResume and lastSelectedResumeId
                              // to maintain persistence across sessions
                         });
                    },

                    // Persistent resume selection actions
                    setLastSelectedResume: (data, resumeId) => {
                         console.log("🔵 STORING RESUME DATA:", resumeId);
                         console.log("🔵 Resume name:", data.personalInfo?.name);
                         console.log("🔵 Resume title:", data.personalInfo?.title);
                         console.log("🔵 Full personalInfo:", data.personalInfo);

                         set({
                              lastSelectedResume: data,
                              lastSelectedResumeId: resumeId,
                              resumeData: data,
                              baseResume: data
                         });

                         // IMMEDIATELY update localStorage manually to ensure persistence
                         // Use multiple attempts to ensure the data is stored
                         const updateLocalStorage = () => {
                              try {
                                   const currentStorage = localStorage.getItem("resume-storage");
                                   if (currentStorage) {
                                        const parsed = JSON.parse(currentStorage);
                                        console.log("🔵 Before update - localStorage had:", parsed.state?.resumeData?.personalInfo?.name || "No name");

                                        // Update the localStorage directly
                                        parsed.state.lastSelectedResume = data;
                                        parsed.state.lastSelectedResumeId = resumeId;
                                        parsed.state.resumeData = data;
                                        parsed.state.baseResume = data;

                                        localStorage.setItem("resume-storage", JSON.stringify(parsed));

                                        // Verify the update
                                        const verifyStorage = localStorage.getItem("resume-storage");
                                        const verifyParsed = verifyStorage ? JSON.parse(verifyStorage) : null;
                                        console.log("🔵 After update - localStorage now has:", verifyParsed.state?.resumeData?.personalInfo?.name || "No name");
                                        console.log("✅ localStorage updated immediately with resume data");
                                   } else {
                                        // Create new storage entry if none exists
                                        const newStorage = {
                                             state: {
                                                  resumeData: data,
                                                  baseResume: data,
                                                  showLeadership: false,
                                                  showProjects: false,
                                                  showSummary: false,
                                                  isSaved: false,
                                                  jobDescription: "",
                                                  isOptimizing: false,
                                                  optimizedData: null,
                                                  currentView: "editor",
                                                  showChanges: false,
                                                  changedFields: [],
                                                  showPublications: false,
                                                  lastSelectedResume: data,
                                                  lastSelectedResumeId: resumeId
                                             },
                                             version: 0
                                        };
                                        localStorage.setItem("resume-storage", JSON.stringify(newStorage));
                                        console.log("✅ Created new localStorage entry with resume data");
                                   }
                              } catch (error) {
                                   console.error("❌ Error updating localStorage:", error);
                              }
                         };

                         // Update immediately
                         updateLocalStorage();

                         // Update again after a short delay to override any Zustand persist middleware
                         setTimeout(() => {
                              console.log("🔄 Re-updating localStorage to override Zustand persist...");
                              updateLocalStorage();
                         }, 50);

                         console.log("Resume data stored successfully");
                    },

                    clearLastSelectedResume: () => {
                         set({
                              lastSelectedResume: null,
                              lastSelectedResumeId: null
                         });

                         // IMMEDIATELY clear from localStorage as well
                         try {
                              const currentStorage = localStorage.getItem("resume-storage");
                              if (currentStorage) {
                                   const parsed = JSON.parse(currentStorage);
                                   parsed.state.lastSelectedResume = null;
                                   parsed.state.lastSelectedResumeId = null;
                                   localStorage.setItem("resume-storage", JSON.stringify(parsed));
                                   console.log("✅ localStorage cleared of last selected resume");
                              }
                         } catch (error) {
                              console.error("❌ Error clearing localStorage:", error);
                         }
                    },

                    loadLastSelectedResume: () => {
                         const state = get();
                         console.log("loadLastSelectedResume called. Current state:", {
                              lastSelectedResume: state.lastSelectedResume,
                              lastSelectedResumeId: state.lastSelectedResumeId,
                              hasResumeData: !!state.lastSelectedResume,
                              hasResumeId: !!state.lastSelectedResumeId
                         });

                         if (state.lastSelectedResume && state.lastSelectedResumeId) {
                              console.log("Loading last selected resume:", state.lastSelectedResumeId, state.lastSelectedResume);
                              set({
                                   resumeData: state.lastSelectedResume,
                                   baseResume: state.lastSelectedResume
                              });
                              return true; // Indicates resume was loaded
                         }
                         console.log("No last selected resume found to load");
                         return false; // No resume to load
                    },

                    debugLocalStorage: () => {
                         console.log("=== DEBUG LOCALSTORAGE ===");
                         const storedData = localStorage.getItem("resume-storage");
                         if (storedData) {
                              const parsed = JSON.parse(storedData);
                              console.log("Current localStorage state:", {
                                   hasLastSelectedResume: !!parsed.state?.lastSelectedResume,
                                   hasLastSelectedResumeId: !!parsed.state?.lastSelectedResumeId,
                                   lastSelectedResumeId: parsed.state?.lastSelectedResumeId,
                                   hasResumeData: !!parsed.state?.resumeData,
                                   resumeDataName: parsed.state?.resumeData?.personalInfo?.name || "No name"
                              });
                         } else {
                              console.log("No resume-storage found in localStorage");
                         }

                         const currentState = get();
                         console.log("Current store state:", {
                              hasLastSelectedResume: !!currentState.lastSelectedResume,
                              hasLastSelectedResumeId: !!currentState.lastSelectedResumeId,
                              lastSelectedResumeId: currentState.lastSelectedResumeId,
                              hasResumeData: !!currentState.resumeData,
                              resumeDataName: currentState.resumeData?.personalInfo?.name || "No name"
                         });
                         console.log("=== END DEBUG ===");
                    },
               };
          },
          {
               name: "resume-storage", // key in localStorage
               partialize: (state) => {
                    console.log("Partialize function called with state:", {
                         lastSelectedResume: !!state.lastSelectedResume,
                         lastSelectedResumeId: state.lastSelectedResumeId,
                         hasResumeData: !!state.resumeData,
                         hasBaseResume: !!state.baseResume
                    });
                    return {
                         resumeData: state.resumeData,
                         baseResume: state.baseResume,
                         showLeadership: state.showLeadership,
                         showProjects: state.showProjects,
                         showSummary: state.showSummary,
                         isSaved: state.isSaved,
                         jobDescription: state.jobDescription,
                         isOptimizing: state.isOptimizing,
                         optimizedData: state.optimizedData,
                         currentView: state.currentView,
                         showChanges: state.showChanges,
                         changedFields: Array.from(state.changedFields),
                         showPublications: state.showPublications,
                         sectionOrder: state.sectionOrder,
                         // Persist the last selected resume data
                         lastSelectedResume: state.lastSelectedResume,
                         lastSelectedResumeId: state.lastSelectedResumeId,
                    };
               },
               onRehydrateStorage: () => (state) => {
                    console.log("Store rehydration started");
                    if (state) {
                         console.log("Store rehydrated with state:", {
                              lastSelectedResume: !!state.lastSelectedResume,
                              lastSelectedResumeId: state.lastSelectedResumeId,
                              hasResumeData: !!state.lastSelectedResume,
                              hasResumeId: !!state.lastSelectedResumeId,
                              resumeDataName: state.resumeData?.personalInfo?.name || "No name",
                              showPublications: state.showPublications
                         });
                         state.changedFields = new Set(state.changedFields || []);

                         // Ensure boolean values are properly set (fix undefined issues)
                         if (typeof state.showPublications !== 'boolean') {
                              state.showPublications = false;
                         }
                         if (typeof state.showLeadership !== 'boolean') {
                              state.showLeadership = false;
                         }
                         if (typeof state.showProjects !== 'boolean') {
                              state.showProjects = false;
                         }
                         if (typeof state.showSummary !== 'boolean') {
                              state.showSummary = false;
                         }

                         // Ensure sectionOrder is properly set
                         if (!state.sectionOrder || !Array.isArray(state.sectionOrder)) {
                              state.sectionOrder = [
                                   "personalInfo",
                                   "summary", 
                                   "workExperience",
                                   "projects",
                                   "leadership",
                                   "skills",
                                   "education",
                                   "publications"
                              ];
                         }

                         // If we have stored resume data, load it immediately
                         if (state.lastSelectedResume && state.lastSelectedResumeId) {
                              console.log("Auto-loading stored resume data during rehydration");
                              state.resumeData = state.lastSelectedResume;
                              state.baseResume = state.lastSelectedResume;
                         }
                    } else {
                         console.log("Store rehydration failed - no state");
                    }
               },
          }
     )
);
