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



import { useState, useEffect, useContext, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
const Navigation = lazy(()=>import('./Navigation'))
const Dashboard = lazy(()=>import('./Dashboard'))
const JobTracker = lazy(()=>import('./JobTracker'))
const ResumeOptimizer = lazy(()=>import('./ResumeOptimizer1'))
import { UserContext } from '../state_management/UserContext';
import LoadingScreen from './LoadingScreen';
import { useOperationsStore } from "../state_management/Operations";



export default function MainContent() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const context = useContext(UserContext);
  const navigate = useNavigate();
  const { role } = useOperationsStore();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';
  
  const userDetails = context?.userDetails;
  const token = context?.token;
  const setData = context?.setData;
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
      if (setData) {
        setData({
          userDetails: updatedAuth.userDetails,
          token: updatedAuth.token || token, // ensure token not lost
        });
      }

      console.log("✅ userDetails updated successfully:", data);
    } catch (error) {
      console.error("Error updating userDetails:", error);
    }
  };

  updateUserDetails();
}, []);



  // Dashboard now manages its own profile modal

  return (
    <div className="min-h-screen bg-gray-50">
       <Suspense fallback={<LoadingScreen />}>
        <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
        </Suspense> 
        <main>
          {/* Dashboard now manages its own profile modal */}
          {activeTab === 'dashboard' && <Suspense fallback={<LoadingScreen />}><Dashboard /></Suspense>}
          
          {activeTab === 'jobs' && (
          <Suspense fallback={<LoadingScreen />}>  
            <JobTracker />
          </Suspense>
          )}

          {activeTab === 'optimizer' && (
            <Suspense fallback={<LoadingScreen />}>
            <ResumeOptimizer />
            </Suspense>
          )}
        </main>
      </div>
  )
}


