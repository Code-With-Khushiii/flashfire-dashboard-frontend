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
    localStorage.setItem("dashboardGuideDone", "Yes");
    localStorage.removeItem("dashboardGuideSeen");
  } catch (e) {}
      console.log(currentStep);

};


// Run the guide automatically for new users
  const dashboardGuideSeen = localStorage.getItem("dashboardGuideSeen");
useEffect(() => {
  // let dashboardGuideSeen = JSON.parse(localStorage.getItem("dashboardGuideSeen"));

  // Show the guide if the stored flag explicitly indicates 'false' (legacy) or 'no' (new value used by NewUserModal).
  // This preserves the value 'no' set by NewUserModal while still ensuring the guide auto-opens for new users.
  if (dashboardGuideSeen == 'false' || dashboardGuideSeen == 'no') {
    setShowGuide(true);
  }
  // else if(dashboardGuideSeen == 'true')
  else setShowGuide(false);
}, [dashboardGuideSeen]);


// Highlight elements visually
useEffect(() => {
  const selector = guideSteps[currentStep]?.highlightSelector;
  if (selector) {
    const el = document.querySelector(selector);
    if (el) el.classList.add("highlighted");
  }

  return () => {
    document
      .querySelectorAll(".highlighted")
      .forEach((el) => el.classList.remove("highlighted"));
  };
}, [currentStep]);

// When the guide step changes, open the corresponding tab/route so the
// user sees the content the guide is describing (not just a highlight).
useEffect(() => {
  const selector = guideSteps[currentStep]?.highlightSelector || "";
  const openTabForSelector = (sel: string) => {
    if (sel.includes("nav-dashboard")) setActiveTab("dashboard");
    else if (sel.includes("nav-job-tracker")) setActiveTab("jobs");
    else if (sel.includes("nav-documents")) setActiveTab("optimizer");
    else if (sel.includes("nav-profile")) navigate("/profile");
  };

  openTabForSelector(selector);
}, [currentStep]);

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
      onNext={handleNext}
      onBack={handleBack}
      onExit={handleExit}
      onStepChange={(index:number) => {
        // Set step exactly to avoid double-increment bugs
        setCurrentStep(index);
        // map step index to tab
        if (index === 0) setActiveTab('dashboard');
        else if (index === 1) setActiveTab('jobs');
        else if (index === 2) setActiveTab('optimizer');
        else if (index === 3) setActiveTab('');
      }}
    />

{/* Floating Guide Button */}
{(localStorage.getItem("dashboardGuideSeen") === "false" || localStorage.getItem("dashboardGuideSeen") === "no") && !showGuide && (
  <button
    onClick={() => {
      setShowGuide(true);
      setCurrentStep(0);
    }}
    className="fixed bottom-6 right-6 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-blue-700 z-50"
  >
    Show Guide
  </button>
)}


       <Suspense fallback={<LoadingScreen />}>
        <Navigation activeTab={activeTab} onTabChange={setActiveTab} setUserProfileFormVisibility={setUserProfileFormVisibility} />
        </Suspense> 
        <main>
          {userProfileFormVisibility && (
            <NewUserModal
              setUserProfileFormVisibility={setUserProfileFormVisibility}
              onProfileComplete={() => {
                const v = localStorage.getItem("dashboardGuideSeen");
                if (v === "false" || v === "no") {
                  setCurrentStep(0);
                  setShowGuide(true);
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


