// import React from "react";

// interface GuidePopupProps {
//   title: string;
//   message: string;
//   onExit: () => void;
//   onNext?: () => void;
//   showNext?: boolean;
//   logo?: string;
//   position?: "dashboard" | "jobs" | "optimizer" | "addJobs" | "profile"; // determines position below nav button
// }

// const GuidePopup: React.FC<GuidePopupProps> = ({
//   title,
//   message,
//   onExit,
//   onNext,
//   showNext = true,
//   logo = "/Logo.png",
//   position = "dashboard",
// }) => {
//   // Responsive positioning for popup
//   const positionClasses = {
//     dashboard: "left-[100px] sm:left-[230px] md:left-[440px]",
//     jobs: "left-[100px] sm:left-[340px] md:left-[560px]",
//     optimizer: "left-[100px] sm:left-[480px] md:left-[740px]",
//     profile: "left-[100px] sm:left-[100px] md:left-[880px]",
//     addJobs: "left-[100px] sm:left-[600px] md:left-[500px]",

//   };

//   return (
//     <>
//       {/* 🌫️ Full-page dim + blur overlay */}
//       <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[9998]"></div>

//       {/* 🎯 Popup itself */}
//       <div className="fixed top-[70px] z-[9999] animate-fade-in">
//         <div
//           className={`absolute ${positionClasses[position]} bg-white border border-gray-200 shadow-xl rounded-2xl p-5 w-[240px] sm:w-[260px]`}
//         >
         
//           {/* Pointer Arrow */}
//           <div
//             className={`absolute -top-2 ${position === "profile" ? "right-8" : "left-8"
//               } w-4 h-4 bg-white border-l border-t border-gray-300 rotate-45`}
//           ></div>

//           {/* Logo */}
//           <div className="flex justify-center mb-2">
//             <img src={logo} alt="logo" className="w-8 h-8 rounded-full" />
//           </div>

//           {/* Title + Message */}
//           <h2 className="text-base font-bold text-gray-800 mb-1 text-center">
//             {title}
//           </h2>
//           <p className="text-sm text-gray-600 leading-relaxed text-center mb-4">
//             {message}
//           </p>

//           {/* Buttons */}
//           <div className="flex justify-end text-xs font-semibold">
//             {/* <button
//               onClick={onExit}
//               className="text-gray-600 hover:text-gray-800 transition"
//             >
//               EXIT
//             </button> */}
//             {showNext && (
//               <button
//                 onClick={onExit}
//                 className="bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600 transition"
//               >
//                 Got it
//               </button>
//             )}
//           </div>
//         </div>
//       </div>
//     </>
//   );
// };

// export default GuidePopup;


import { useEffect } from "react";
import "./guide-popup.css";
import Joyride, { Placement } from "react-joyride";

type GuidePopupProps = {
  run?: boolean;
  onExit?: () => void;
  onStepChange?: (index: number, action?: string, type?: string) => void;
  currentStep?: number;
  totalSteps?: number;
};

const GuidePopup = ({ run = false, onExit, onStepChange }: GuidePopupProps) => {
  const steps = [
    {
      target: ".nav-dashboard",
      content: (
        <div>
          <h2 className="font-semibold mb-1">Welcome to your Career Dashboard 🎯</h2>
          <p>
            Here you can see your total applications, interviews, offers, and
            success rate — all in one place.
          </p>
        </div>
      ),
    placement: "bottom" as Placement,
    },
    {
      target: ".nav-job-tracker",
      content: (
        <div>
          <h2 className="font-semibold mb-1">Track Your Job Applications 📋</h2>
          <p>
            This is where you can add and monitor every job you’ve applied to.
          </p>
        </div>
      ),
    placement: "bottom" as Placement,
    },
    {
      target: ".nav-documents",
      content: (
        <div>
          <h2 className="font-semibold mb-1">Documents Section 📂</h2>
          <p>
            Upload and manage resumes, cover letters, and transcripts here.
          </p>
          {/* <div className="mt-3 text-right">
            <button
              onClick={() => onExit && onExit()}
              className="inline-flex items-center rounded bg-gradient-to-r from-orange-500 to-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-90 transition-opacity duration-200"
            >
              Exit tour
            </button>
          </div> */}
        </div>
      ),
    placement: "bottom" as Placement,
    }
    // {
    //   target: ".nav-profile",
    //   content: (
    //     <div>
    //       <h2 className="font-semibold mb-1">Profile Section 📂</h2>
    //       <p>
    //         Keep your profile updated so that our AI can match you with your dream job .
    //       </p>
    //       <div className="mt-3 text-right">
    //         <button
    //           onClick={() => onExit && onExit()}
    //           className="inline-flex items-center rounded bg-gradient-to-r from-orange-500 to-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-90 transition-opacity duration-200"
    //         >
    //           Exit tour
    //         </button>
    //       </div>
    //     </div>
    //   ),
    // placement: "bottom" as Placement,
    // }
  ];

  useEffect(() => {
    // no local side-effects here: parent controls `run`. Keep effect to sync if needed later.
  }, [run]);

  const handleJoyrideCallback = (data: any) => {
    // Use the 'step:before' lifecycle event so parent can switch tabs
    // before Joyride renders the tooltip for the step.
    const { type, action, index } = data || {};
    if (type === "step:before") {
      if (typeof index === "number") {
        onStepChange && onStepChange(index, action, type);
      }
    }

    // For explicit close/skip events also inform parent
    if (action === "close" || action === "skip") {
      onExit && onExit();
    }
  };
  // inside GuidePopup.tsx (above the default export)
  const CustomBeacon = ({ onClick }: any) => {
    return (
      <div
        onClick={onClick}
        className="custom-beacon"
        role="button"
        aria-label="Open guide"
      >
        <span className="custom-beacon-ring" />
        <div className="custom-beacon-inner" />
        <div className="custom-beacon-arrow" />
      </div>
    );
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      beaconComponent={CustomBeacon}
      continuous
      showProgress
      showSkipButton
      scrollToFirstStep
      
      styles={{
        options: {
          primaryColor: "#f97316", // your brand orange
          zIndex: 10000,
          // textColor: "#111827",
          // arrowColor: "#fff",
          
        },
        
      }}
      callback={handleJoyrideCallback}
    />
  );
};

export default GuidePopup;
