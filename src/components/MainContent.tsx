// import React, { useState, useEffect, useContext, lazy, Suspense } from 'react';
// import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom';
// // import Navigation from './Navigation';
// const Navigation = lazy(()=>import('./Navigation'))
// // import Dashboard from './Dashboard';
// const Dashboard = lazy(()=>import('./Dashboard'))
// // import JobTracker from './JobTracker';
// const JobTracker = lazy(()=>import('./JobTracker'))
// // import ResumeOptimizer from './ResumeOptimizer';
// const ResumeOptimizer = lazy(()=>import('./ResumeOptimizer1'))
// import { UserContext } from '../state_management/UserContext';
// import LoadingScreen from './LoadingScreen';
// import NewUserModal from './NewUserModal';
// import { useOperationsStore } from "../state_management/Operations";
// import { useUserProfile } from '../state_management/ProfileContext';
// // import {BaseResume} from '../types/index'


// export default function MainContent() {
//   const [activeTab, setActiveTab] = useState('dashboard');
//   const [showPDFUploader, setShowPDFUploader] = useState(false);
//   // const [userProfileFormVisibility, setUserProfileFormVisibility] = useState(false);
//   const [baseResume, setBaseResume] = useState(null);
//   const {userDetails, token} = useContext(UserContext);
//   const navigate = useNavigate();
//   const { role } = useOperationsStore();
//   useEffect(()=>{
//   if ((!token || token.length == 0) && role != "operations") {
//       console.log("navigating to login");
//       navigate("/login");
//   }
//   },[])
//   const { userProfile } = useUserProfile();
//   // const [userProfileFormVisibility, setUserProfileFormVisibility] = useState(false);
// const [userProfileFormVisibility, setUserProfileFormVisibility] = useState(false);
// const [welcomeShown, setWelcomeShown] = useState(()=>{
//     return localStorage.getItem("welcomeShown")? true: false
//   });
// useEffect(() => {
//   if (!userProfile) setUserProfileFormVisibility(true);
//   else setUserProfileFormVisibility(false);
//   console.log(userProfile)
// }, [userProfile]);

// // console.log(userProfileFormVisibility,'vfcd')
  
  

//   return (
//     <div className="min-h-screen bg-gray-50">
//        <Suspense fallback={<LoadingScreen />}>
//         <Navigation activeTab={activeTab} onTabChange={setActiveTab} setUserProfileFormVisibility={setUserProfileFormVisibility} />
//         </Suspense> 
//         <main>
//           {userProfileFormVisibility && <NewUserModal setUserProfileFormVisibility={setUserProfileFormVisibility} />}
//           {activeTab === 'dashboard' && <Suspense fallback={<LoadingScreen />}><Dashboard setUserProfileFormVisibility={setUserProfileFormVisibility}/></Suspense>}
          
          
//           {activeTab === 'jobs' && (
//           <Suspense fallback={<LoadingScreen />}>  
//             <JobTracker
//               // jobs={jobs}
//               // baseResume={baseResume}
//               // optimizedResumes={optimizedResumes}
//               // onAddJob={addJob}
//               // onUpdateJob={updateJob}
//               // onDeleteJob={deleteJob}
//               // onUpdateJobStatus={updateJobStatus}
//               // onAddOptimizedResume={addOptimizedResume}
//               // onShowPDFUploader={() => setShowPDFUploader(true)}
//             />
//           </Suspense>
//           )}

//           {activeTab === 'optimizer' && (
//             <Suspense fallback={<LoadingScreen />}>
//             <ResumeOptimizer
//               baseResume={baseResume}
//               onShowPDFUploader={() => setShowPDFUploader(true)}
//             />
//             </Suspense>
//           )}
//         </main>

//         {/* PDF Uploader Modal */}
//         {showPDFUploader && (
//           <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
//             <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
//               <PDFUploader
//                 onResumeUploaded={handleUploadPDFResume}
//                 onCancel={() => setShowPDFUploader(false)}
//               />
//             </div>
//           </div>
//         )}
//       </div>
//   )
// }



import React, { useState, useEffect, useContext, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom';
// import Navigation from './Navigation';
const Navigation = lazy(()=>import('./Navigation'))
// import Dashboard from './Dashboard';
const Dashboard = lazy(()=>import('./Dashboard'))
// import JobTracker from './JobTracker';
const JobTracker = lazy(()=>import('./JobTracker'))
// import ResumeOptimizer from './ResumeOptimizer';
const ResumeOptimizer = lazy(()=>import('./ResumeOptimizer1'))
import { UserContext } from '../state_management/UserContext';
import LoadingScreen from './LoadingScreen';
import NewUserModal from './NewUserModal';
import { useOperationsStore } from "../state_management/Operations";
import { useUserProfile } from '../state_management/ProfileContext';
// import {BaseResume} from '../types/index'
import { useUserJobs } from "../state_management/UserJobs.tsx";
import GuidePopup from './GuidePopup.tsx';



export default function MainContent() {
  const [activeTab, setActiveTab] = useState('dashboard');


  const [showPDFUploader, setShowPDFUploader] = useState(false);
  // const [userProfileFormVisibility, setUserProfileFormVisibility] = useState(false);
  const [baseResume, setBaseResume] = useState(null);
  const {userDetails, token, setData} = useContext(UserContext);
  const [showGuide, setShowGuide] = useState(false);
const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();
  const { role } = useOperationsStore();
    const { userJobs, setUserJobs } = useUserJobs();
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';
  useEffect(()=>{
  if ((!token || token.length == 0) && role != "operations") {
      console.log("navigating to login");
      navigate("/login");
  }
  },[])
useEffect(() => { 
  const updateUserDetails = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/get-updated-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userDetails?.email }),
      });

      if (!response.ok) throw new Error("Failed to fetch updated user data");

      const data = await response.json();

      // 1️⃣ Read current userAuth from localStorage
      const storedAuth = localStorage.getItem("userAuth");
      const parsed = storedAuth ? JSON.parse(storedAuth) : {};

      // 2️⃣ Merge new userDetails into existing object
      const updatedAuth = {
        ...parsed,
        userDetails: data,  // only replace this key
      };

      // 3️⃣ Save it back to localStorage
      localStorage.setItem("userAuth", JSON.stringify(updatedAuth));

      // 4️⃣ Sync with context
      setData({
        userDetails: updatedAuth.userDetails,
        token: updatedAuth.token || token, // ensure token not lost
      });

      console.log("✅ userDetails updated successfully:", data);
    } catch (error) {
      console.error("Error updating userDetails:", error);
    }
  };

  updateUserDetails();
}, []);

// const [showGuide, setShowGuide] = useState(false);
// const [currentStep, setCurrentStep] = useState(0);

const guideSteps = [
  {
    title: "Welcome to Your Dashboard 🎯",
    message:
      "This is your main workspace to track job applications and view overall stats." + " You can also see recent activities of you applications here.. !",
    highlightSelector: ".nav-dashboard", // will highlight Dashboard tab
    nextTab : 'jobs'
  },
  {
    title: "Job Tracker",
    message: "Here you can add, edit, and monitor all your job applications.",
    highlightSelector: ".nav-job-tracker",
    nextTab : 'optimizer'
  },
  {
    title: "Documents Section",
    message: "Upload and manage resumes, cover letters, and transcripts here.",
    highlightSelector: ".nav-documents",
    nextRoute : 'profile'
  },
  {
    title: "Profile Section",
    message: "Keep your profile updated to help us match the best opportunities for you efficiently..",
    highlightSelector: ".nav-profile",
  }
];

// const handleNext = () => {
//   if (currentStep < guideSteps.length - 1) {
//     setCurrentStep((prev) => prev + 1);
//     console.log(currentStep);
//   } else {
//     handleExit(); // close after last step
//   }
// };

const handleNext = () => {
  setCurrentStep(prev => {
    const next = Math.min(prev + 1, guideSteps.length - 1);

    // map next step to tab
    if (next === 0) setActiveTab('dashboard');
    else if (next === 1) setActiveTab('jobs');
    else if (next === 2) setActiveTab('optimizer'); // or 'documents' depending on your naming
    else if (next === 3) setActiveTab('profile');

    return next;
  });
};
// const handleBack = () => {
//   if (currentStep > 0) setCurrentStep((prev) => prev - 1);
//       console.log(currentStep);

// };
const handleBack = () => {
  setCurrentStep(prev => {
    const prevStep = Math.max(prev - 1, 0);

    if (prevStep === 0) setActiveTab('dashboard');
    else if (prevStep === 1) setActiveTab('jobs');
    else if (prevStep === 2) setActiveTab('optimizer');
    else if (prevStep === 3) navigate('/profile');

    return prevStep;
  });
};
const handleExit = () => {
  setShowGuide(false);
   console.log(currentStep);
  // Remove the flag so the guide won't show again unless explicitly reset
  try {
    localStorage.setItem("dashboardGuideSeen", "true");

  } catch (e) {}
      console.log(currentStep);

};


// Show guide ONLY after profile form completion - for new users only
  useEffect(() => {
    const handleProfileCompleted = (event: CustomEvent) => {
      if (event.detail?.showGuide) {
        // Double check user is new (hasn't seen guide before)
        const guideSeen = localStorage.getItem("dashboardGuideSeen");
        if (guideSeen !== "true") {
          console.log("🎯 Profile completed - showing guide for new user");
          setCurrentStep(0);
          setShowGuide(true);
        }
        // Clear the flag
        localStorage.removeItem("showGuideAfterProfile");
      }
    };

    // Listen for custom event from Dashboard when profile is completed
    window.addEventListener('profileCompleted', handleProfileCompleted as EventListener);

    // Also check localStorage flag on mount (in case event was missed or page refreshed)
    const showGuideFlag = localStorage.getItem("showGuideAfterProfile");
    if (showGuideFlag === "true") {
      const guideSeen = localStorage.getItem("dashboardGuideSeen");
      // Only show if user is new (hasn't seen guide before)
      if (guideSeen !== "true") {
        console.log("🎯 Profile completed (from localStorage) - showing guide for new user");
        setCurrentStep(0);
        setShowGuide(true);
      }
      localStorage.removeItem("showGuideAfterProfile");
    }

    return () => {
      window.removeEventListener('profileCompleted', handleProfileCompleted as EventListener);
    };
  }, []);
  

// DISABLED: These useEffect hooks were interfering with Joyride step progression
// Tab switching is now handled by the onStepChange callback in GuidePopup
// Highlight elements visually
// useEffect(() => {
//   const selector = guideSteps[currentStep]?.highlightSelector;
//   if (selector) {
//     const el = document.querySelector(selector);
//     if (el) el.classList.add("highlighted");
//   }

//   return () => {
//     document
//       .querySelectorAll(".highlighted")
//       .forEach((el) => el.classList.remove("highlighted"));
//   };
// }, [currentStep]);

// When the guide step changes, open the corresponding tab/route so the
// user sees the content the guide is describing (not just a highlight).
// DISABLED: This was causing navigation to profile when step 3 was reached
// Tab switching is now handled by step:before and advanceTo functions
// useEffect(() => {
//   const selector = guideSteps[currentStep]?.highlightSelector || "";
//   const openTabForSelector = (sel: string) => {
//     if (sel.includes("nav-dashboard")) setActiveTab("dashboard");
//     else if (sel.includes("nav-job-tracker")) setActiveTab("jobs");
//     else if (sel.includes("guide-add-job")) setActiveTab("jobs");
//     else if (sel.includes("guide-job-card")) setActiveTab("jobs");
//     else if (sel.includes("nav-documents")) setActiveTab("optimizer");
//     else if (sel.includes("nav-profile")) navigate("/profile");
//   };

//   openTabForSelector(selector);
// }, [currentStep]);

  const { userProfile } = useUserProfile();
  // const [userProfileFormVisibility, setUserProfileFormVisibility] = useState(false);
const [userProfileFormVisibility, setUserProfileFormVisibility] = useState(false);
const [welcomeShown, setWelcomeShown] = useState(()=>{
    return localStorage.getItem("welcomeShown")? true: false
  });
// useEffect(() => {
//  if (JSON.parse(localStorage.getItem('userAuth')).userProfile!=null) {console.log(userProfileFormVisibility,JSON.parse(localStorage.getItem('userAuth')).userProfile);setUserProfileFormVisibility(true);}
//   else setUserProfileFormVisibility(false);
//   console.log(userProfile)
// }, [userProfile]);

// console.log(userProfileFormVisibility,'vfcd')
  
  

  return (
    <div className="min-h-screen bg-gray-50">
    <GuidePopup
      run={showGuide}
      onExit={handleExit}
      stepIndex={currentStep}
      onStepChange={(index:number, action?: string, type?: string) => {
        // Keep Joyride controlled: only advance when targets exist
        const waitFor = (selector: string, timeout = 10000) => new Promise<boolean>((resolve) => {
          const start = Date.now();
          const timer = setInterval(() => {
            if (document.querySelector(selector)) {
              clearInterval(timer);
              resolve(true);
            } else if (Date.now() - start > timeout) {
              clearInterval(timer);
              console.warn(`Target not found: ${selector}`);
              resolve(false);
            }
          }, 50);
        });

        const advanceTo = async (nextIndex: number, ensureSelector?: string, tab?: 'dashboard'|'jobs'|'optimizer') => {
          console.log(`advanceTo called: step ${nextIndex}, selector: ${ensureSelector}, tab: ${tab}`);
          
          // Switch tab first
          if (tab) {
            setActiveTab(tab);
            // Wait for tab switch to complete and DOM to update
            await new Promise(r => setTimeout(r, 400));
          }
          
          // Wait for target element to appear
          if (ensureSelector) {
            console.log(`Waiting for element: ${ensureSelector}`);
            const ok = await waitFor(ensureSelector, 12000);
            if (ok) {
              console.log(`✅ Element found: ${ensureSelector}`);
              try {
                const el = document.querySelector(ensureSelector) as HTMLElement | null;
                if (el) {
                  // Scroll element into view
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  // Additional delay to ensure scroll completes and layout settles
                  await new Promise(r => setTimeout(r, 500));
                  
                  // Verify element is still visible after scroll
                  const rect = el.getBoundingClientRect();
                  const isVisible = rect.top >= 0 && rect.left >= 0 && 
                                  rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                                  rect.right <= (window.innerWidth || document.documentElement.clientWidth);
                  console.log(`Element visibility check: ${isVisible ? 'visible' : 'not fully visible'}`);
                }
              } catch (e) {
                console.error('Error scrolling to element:', e);
              }
            } else {
              console.error(`❌ Could not find target ${ensureSelector} for step ${nextIndex} - will retry`);
              // Don't advance if target not found - let error handler retry
              return;
            }
          } else {
            // Small delay even if no selector to wait for
            await new Promise(r => setTimeout(r, 300));
          }
          
          // Update step index only after everything is ready
          console.log(`Setting currentStep to ${nextIndex}`);
          setCurrentStep(nextIndex);
          
          // Force Joyride to recalculate positions after a brief delay
          setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
            window.dispatchEvent(new Event('scroll'));
            // Force a repaint
            requestAnimationFrame(() => {
              window.dispatchEvent(new Event('resize'));
            });
          }, 150);
        };

        // Ensure correct tab before each step renders
        if (type === 'step:before') {
          // Prepare the environment (tab and elements) before step renders
          // Note: Don't set currentStep here - it's controlled by stepIndex prop
          // step:before just prepares the environment
          const setupStep = async () => {
            console.log(`step:before fired for step ${index}`);
            if (index === 0) {
              setActiveTab('dashboard');
              await new Promise(r => setTimeout(r, 200));
            } else if (index === 1) {
              // Step 1 is nav-job-tracker, can be on any tab since nav is always visible
              await new Promise(r => setTimeout(r, 100));
            } else if (index === 2) {
              setActiveTab('jobs');
              await new Promise(r => setTimeout(r, 400));
              // Wait for the add job button to appear
              const found = await waitFor('.guide-add-job', 10000);
              if (found) {
                console.log('✅ Add job button found for step 2');
              } else {
                console.warn('⚠️ Add job button not found in step:before');
              }
            } else if (index === 3) {
              setActiveTab('jobs');
              await new Promise(r => setTimeout(r, 400));
              // Wait for job card to appear (could be in any column, but we target saved)
              const found = await waitFor('.guide-job-card', 12000);
              if (found) {
                console.log('✅ Job card found for step 3 in step:before');
                // Scroll to make sure it's visible
                const el = document.querySelector('.guide-job-card') as HTMLElement;
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  await new Promise(r => setTimeout(r, 400));
                }
              } else {
                console.error('❌ Job card not found for step 3 in step:before - this will cause issues');
              }
            } else if (index === 4) {
              setActiveTab('optimizer');
              await new Promise(r => setTimeout(r, 400));
              // Wait for documents nav to appear
              const found = await waitFor('.nav-documents', 12000);
              if (found) {
                console.log('✅ Documents nav found for step 4 in step:before');
                // Scroll to make sure it's visible
                const el = document.querySelector('.nav-documents') as HTMLElement;
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  await new Promise(r => setTimeout(r, 400));
                }
              } else {
                console.error('❌ Documents nav not found for step 4 in step:before - this will cause issues');
              }
            }
            // Don't set currentStep here - stepIndex prop controls it
            // This prevents conflicts with advanceTo
          };
          setupStep();
        }

        // Move to the next step only after targets exist
        if (type === 'step:after' && action === 'next') {
          console.log(`Step ${index} completed, advancing to next step...`);
          if (index === 0) {
            // From dashboard nav, go to job tracker nav (step 1)
            // nav-job-tracker is always visible, so we can proceed
            setCurrentStep(1);
          } else if (index === 1) {
            // From job tracker nav, go to add job button (step 2)
            console.log('Advancing to step 2 (Add Jobs button)...');
            advanceTo(2, '.guide-add-job', 'jobs');
          } else if (index === 2) {
            // From add job button, go to job card (step 3)
            // Add a small delay to ensure step 2 is fully visible before advancing
            console.log('Step 2 completed, preparing to advance to step 3 (Job Card)...');
            setTimeout(async () => {
              console.log('Now advancing to step 3 (Job Card)...');
              // Double-check we're on jobs tab
              setActiveTab('jobs');
              await new Promise(r => setTimeout(r, 200));
              
              // Verify job card element exists before advancing
              const jobCardExists = document.querySelector('.guide-job-card');
              if (jobCardExists) {
                console.log('✅ Job card element found, proceeding to step 3');
                advanceTo(3, '.guide-job-card', 'jobs');
              } else {
                console.error('❌ Job card element not found, but still proceeding to step 3');
                // Still proceed to step 3 - the error handler will retry
                advanceTo(3, '.guide-job-card', 'jobs');
              }
            }, 300); // Small delay to ensure step 2 message is visible
          } else if (index === 3) {
            // From job card, go to documents nav (step 4)
            console.log('Step 3 completed, preparing to advance to step 4 (Documents)...');
            setTimeout(async () => {
              console.log('Now advancing to step 4 (Documents)...');
              // Ensure we're on optimizer tab
              setActiveTab('optimizer');
              await new Promise(r => setTimeout(r, 400));
              
              // Verify documents nav element exists before advancing
              const documentsNavExists = document.querySelector('.nav-documents');
              if (documentsNavExists) {
                console.log('✅ Documents nav element found, proceeding to step 4');
                advanceTo(4, '.nav-documents', 'optimizer');
              } else {
                console.error('❌ Documents nav element not found, but still proceeding to step 4');
                // Still proceed to step 4 - the error handler will retry
                advanceTo(4, '.nav-documents', 'optimizer');
              }
            }, 300); // Small delay to ensure step 3 message is visible
          } else if (index === 4) {
            // Last step - finish the tour
            console.log('Tour completed! Finishing...');
            handleExit();
          }
        }

        if (type === 'step:after' && action === 'prev') {
          console.log(`Back button clicked on step ${index}`);
          if (index === 4) {
            // From Documents (step 4), go back to Job Card (step 3)
            console.log('Going back from Documents to Job Card (step 3)...');
            setActiveTab('jobs');
            setTimeout(async () => {
              // Wait for job card to be available
              const found = await waitFor('.guide-job-card', 5000);
              if (found) {
                setCurrentStep(3);
              } else {
                console.warn('Job card not found when going back, but continuing...');
                setCurrentStep(3);
              }
            }, 300);
          } else if (index === 3) {
            // From Job Card (step 3), go back to Add Jobs (step 2)
            console.log('Going back from Job Card to Add Jobs (step 2)...');
            setActiveTab('jobs');
            setTimeout(async () => {
              const found = await waitFor('.guide-add-job', 5000);
              if (found) {
                setCurrentStep(2);
              } else {
                console.warn('Add Jobs button not found when going back, but continuing...');
                setCurrentStep(2);
              }
            }, 300);
          } else if (index === 2) {
            // From Add Jobs (step 2), go back to Job Tracker nav (step 1)
            console.log('Going back from Add Jobs to Job Tracker nav (step 1)...');
            setCurrentStep(1);
          } else if (index === 1) {
            // From Job Tracker nav (step 1), go back to Dashboard nav (step 0)
            console.log('Going back from Job Tracker to Dashboard (step 0)...');
            setActiveTab('dashboard');
            setTimeout(() => setCurrentStep(0), 300);
          }
        }

        // If Joyride can't find the target, retry after ensuring tab is correct
        if (type === 'error:target_not_found') {
          console.error(`❌ Target not found for step ${index}, retrying...`);
          if (index === 2) {
            // Add Jobs button on Job Tracker
            (async () => {
              setActiveTab('jobs');
              await new Promise(r => setTimeout(r, 400));
              const found = await waitFor('.guide-add-job', 10000);
              if (found) {
                console.log('✅ Retry successful for step 2');
                setCurrentStep(2); // retry this step
              } else {
                console.error('❌ Retry failed for step 2 - element still not found');
              }
            })();
          } else if (index === 3) {
            // Job Card on Job Tracker - IMPORTANT: Don't skip this step!
            console.error('⚠️ Job card not found - this is critical, retrying...');
            (async () => {
              setActiveTab('jobs');
              await new Promise(r => setTimeout(r, 500));
              
              // Try to find job card - could be in saved column or any column with jobs
              let found = await waitFor('.guide-job-card', 10000);
              
              if (!found) {
                // If no job cards exist, check if saved column empty state has the class
                console.log('Checking for job card in saved column empty state...');
                found = await waitFor('.guide-job-card', 5000);
              }
              
              if (found) {
                console.log('✅ Retry successful for step 3 - job card found');
                const el = document.querySelector('.guide-job-card') as HTMLElement;
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  await new Promise(r => setTimeout(r, 400));
                }
                setCurrentStep(3); // retry this step - DON'T skip to step 4
              } else {
                console.error('❌ Retry failed for step 3 - job card still not found');
                // Still set step 3 to prevent skipping, even if element not found
                // The user can see the tooltip even if targeting is off
                setCurrentStep(3);
              }
            })();
          } else if (index === 4) {
            // Documents nav - IMPORTANT: Don't skip this step!
            console.error('⚠️ Documents nav not found - this is critical, retrying...');
            (async () => {
              setActiveTab('optimizer');
              await new Promise(r => setTimeout(r, 500));
              const found = await waitFor('.nav-documents', 12000);
              if (found) {
                console.log('✅ Retry successful for step 4 - documents nav found');
                const el = document.querySelector('.nav-documents') as HTMLElement;
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  await new Promise(r => setTimeout(r, 400));
                }
                setCurrentStep(4); // retry this step - DON'T skip or end tour
              } else {
                console.error('❌ Retry failed for step 4 - documents nav still not found');
                // Still set step 4 to prevent tour from ending prematurely
                // The user can see the tooltip even if targeting is off
                setCurrentStep(4);
              }
            })();
          }
        }
        
        // Prevent tour from ending prematurely
        if (type === 'tour:end' || (type === 'step:after' && action === 'next' && index === 3)) {
          // If we're on step 3 and trying to advance, make sure we go to step 4, not end
          if (index === 3 && action === 'next') {
            console.log('Step 3 completed, ensuring we go to step 4 (Documents)...');
            // This should already be handled above, but ensure it happens
          }
        }
      }}
    />

{/* Floating Guide Button */}
{/* {(localStorage.getItem("dashboardGuideSeen") === "false" || localStorage.getItem("dashboardGuideSeen") === "no") && !showGuide && (
  <button
    onClick={() => {
      setShowGuide(true);
      setCurrentStep(0);
    }}
    className="fixed bottom-6 right-6 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-blue-700 z-50"
  >
    Show Guide
  </button>
)} */}


       <Suspense fallback={<LoadingScreen />}>
        <Navigation activeTab={activeTab} onTabChange={setActiveTab} setUserProfileFormVisibility={setUserProfileFormVisibility} />
        </Suspense> 
        <main>
                     {userProfileFormVisibility && (
             <NewUserModal
               setUserProfileFormVisibility={setUserProfileFormVisibility}
               onProfileComplete={() => {
                 // Trigger guide ONLY for new users after profile completion
                 const guideSeen = localStorage.getItem("dashboardGuideSeen");
                 if (guideSeen !== "true") {
                   console.log("✅ Profile completed in MainContent - showing guide for new user");
                   setCurrentStep(0);
                   setShowGuide(true);
                 } else {
                   console.log("ℹ️ User has already seen the guide - skipping");
                 }
               }}
             />
           )}
          {activeTab === 'dashboard' && <Suspense fallback={<LoadingScreen />}><Dashboard setUserProfileFormVisibility={setUserProfileFormVisibility}/></Suspense>}
          
          
          {activeTab === 'jobs' && (
          <Suspense fallback={<LoadingScreen />}>  
            <JobTracker
              // jobs={jobs}
              // baseResume={baseResume}
              // optimizedResumes={optimizedResumes}
              // onAddJob={addJob}
              // onUpdateJob={updateJob}
              // onDeleteJob={deleteJob}
              // onUpdateJobStatus={updateJobStatus}
              // onAddOptimizedResume={addOptimizedResume}
              // onShowPDFUploader={() => setShowPDFUploader(true)}
            />
          </Suspense>
          )}

          {activeTab === 'optimizer' && (
            <Suspense fallback={<LoadingScreen />}>
            <ResumeOptimizer
              baseResume={baseResume}
              onShowPDFUploader={() => setShowPDFUploader(true)}
            />
            </Suspense>
          )}
        </main>

        {/* PDF Uploader Modal */}
        {showPDFUploader && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <PDFUploader
                onResumeUploaded={handleUploadPDFResume}
                onCancel={() => setShowPDFUploader(false)}
              />
            </div>
          </div>
        )}
      </div>
  )
}


