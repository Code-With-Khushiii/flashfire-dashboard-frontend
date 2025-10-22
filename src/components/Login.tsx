// import { useState, useContext, type FormEvent } from "react"
// import { useNavigate } from "react-router-dom"
// import { Eye, EyeOff, Mail, Lock, CheckCircle, TrendingUp, Users, Award, Clock, ArrowRight } from "lucide-react"
// import { UserContext } from "../state_management/UserContext"
// import { useUserProfile } from "../state_management/ProfileContext"
// import { useOperationsStore } from "../state_management/Operations"
// import { toastUtils, toastMessages } from "../utils/toast"
// import { GoogleLogin } from "@react-oauth/google"

// interface LoginResponse {
//   message: string
//   token?: string
//   userDetails?: any
//   userProfile?: any
//   hasProfile?: boolean
//   user?: any
// }

// const statsData = [
//   {
//     value: "95%",
//     label: "Success Rate",
//     icon: <TrendingUp className="w-5 h-5" />,
//     color: "text-emerald-600",
//   },
//   {
//     value: "300K+",
//     label: "Applications Sent",
//     icon: <Users className="w-5 h-5" />,
//     color: "text-blue-600",
//   },
//   {
//     value: "97%",
//     label: "ATS Score",
//     icon: <Award className="w-5 h-5" />,
//     color: "text-orange-600",
//   },
//   {
//     value: "24/7",
//     label: "AI Working",
//     icon: <Clock className="w-5 h-5" />,
//     color: "text-purple-600",
//   },
// ]

// export default function Login() {
//   const [email, setEmail] = useState<string>("")
//   const [password, setPassword] = useState<string>("")
//   const [showPassword, setShowPassword] = useState<boolean>(false)
//   const [isLoading, setIsLoading] = useState<boolean>(false)
//   const [, setResponse] = useState<LoginResponse | null>(null)

//   const navigate = useNavigate()
//   const { setName, setEmailOperations, setRole, setManagedUsers } = useOperationsStore()
//   const userContext = useContext(UserContext)
//   const setData = userContext?.setData
//   const { setProfileFromApi } = useUserProfile()

//   const handleLogin = async (e: FormEvent) => {
//     e.preventDefault()
//     if (!email || !password) {
//       toastUtils.error("Email and Password are required!")
//       return
//     }

//     setIsLoading(true)
//     const loadingToast = toastUtils.loading(toastMessages.loggingIn)
//     try {
//       const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
//       const loginEndpoint = email.toLowerCase().includes("@flashfirehq") ? "/operations/login" : "/login"
//       const res = await fetch(`${API_BASE_URL}${loginEndpoint}`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ email, password }),
//       })
//       const data: LoginResponse = await res.json()
//       setResponse(data)

//       if (loginEndpoint === "/operations/login") {
//         if (data?.message === "Login successful") {
//           setName(data.user.name)
//           setEmailOperations(data.user.email)
//           setRole(data.user.role)
//           setManagedUsers(data.user.managedUsers)
//           toastUtils.dismissToast(loadingToast)
//           toastUtils.success("Welcome to Operations Dashboard!")
//           navigate("/manage")
//         } else {
//           toastUtils.dismissToast(loadingToast)
//           toastUtils.error(data?.message || toastMessages.loginError)
//         }
//       } else {
//         if (data?.message === "Login Success..!") {
//           setData?.({
//             userDetails: data?.userDetails,
//             token: data?.token || "",
//           })
//           setProfileFromApi(data?.userProfile)
          
//           sessionStorage.setItem('hasProfile', data?.hasProfile ? 'true' : 'false')
          
//           localStorage.setItem(
//             "userAuth",
//             JSON.stringify({
//               token: data?.token,
//               userDetails: data?.userDetails,
//               userProfile: data?.userProfile,
//             }),
//           )
//           toastUtils.dismissToast(loadingToast)
//           toastUtils.success(toastMessages.loginSuccess)
//           navigate("/")
//         } else {
//           setData?.({
//             userDetails: null,
//             token: "",
//           })
//           toastUtils.dismissToast(loadingToast)
//           toastUtils.error(data?.message || toastMessages.loginError)
//         }
//       }
//     } catch (err) {
//       console.error(err)
//       toastUtils.dismissToast(loadingToast)
//       toastUtils.error(toastMessages.networkError)
//     } finally {
//       setIsLoading(false)
//     }
//   }

//   return (
//     <div className="min-h-screen flex flex-col lg:flex-row bg-gradient-to-br from-orange-50 via-white to-red-50">
//       {/* LEFT PANEL */}
//       <div className="flex-1 flex flex-col justify-center px-6 md:px-12 lg:px-16 py-12 lg:py-16 relative border-b lg:border-b-0 lg:border-r border-gray-200">
//         <div className="absolute inset-0 overflow-hidden">
//           <div className="absolute top-1/4 -left-20 w-96 h-96 bg-orange-200/30 rounded-full blur-3xl"></div>
//           <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-red-200/30 rounded-full blur-3xl"></div>
//         </div>

//         <div className="relative z-10 max-w-xl mx-auto lg:mx-0">
//           <div className="flex items-center gap-3 mb-2">
//             <img src="/Logo.png" alt="Flashfire Logo" className="w-10 h-10 md:w-12 md:h-12" />
//             <div>
//               <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-orange-600 via-red-600 to-orange-700 bg-clip-text text-transparent">
//                 FLASHFIRE
//               </h1>
//               <p className="text-xs text-gray-600">AI-Powered Resume Optimization</p>
//             </div>
//           </div>

//           <div className="mb-4">
//             <p className="text-sm font-medium text-orange-600 mb-1 tracking-wide uppercase">Welcome Back</p>
//             <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-3">
//               Transform Your{" "}
//               <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
//                 Career Journey
//               </span>
//             </h2>
//             <p className="text-lg text-gray-700 leading-relaxed">
//               Join professionals who landed dream jobs with AI-optimized resumes that beat ATS.
//             </p>
//           </div>

//           <div className="grid grid-cols-2 gap-4 mb-8">
//             {statsData.map((stat, i) => (
//               <div
//                 key={i}
//                 className="group bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl p-5 hover:bg-white hover:border-orange-300 hover:shadow-lg transition-all duration-300 cursor-default"
//               >
//                 <div className="flex items-center gap-3 mb-1">
//                   <div className={`${stat.color} transition-transform group-hover:scale-110`}>{stat.icon}</div>
//                   <span className="text-2xl font-bold text-gray-900">{stat.value}</span>
//                 </div>
//                 <p className="text-sm text-gray-600">{stat.label}</p>
//               </div>
//             ))}
//           </div>

//           <div className="flex items-center gap-2 text-sm text-gray-600">
//             <CheckCircle className="w-4 h-4 text-emerald-600" />
//             <span>Secure & Private</span>
//           </div>
//         </div>
//       </div>

//       {/* RIGHT PANEL - WHITE CARD */}
//       <div className="w-full lg:w-[480px] xl:w-[560px] flex flex-col justify-center px-6 md:px-12 py-12 bg-gray-50">
//         <div className="max-w-md mx-auto w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-7 md:p-8">
//           {/* Header */}
//           <div className="mb-6">
//             <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Sign In</h3>
//             <p className="text-sm text-gray-600">Enter your credentials to access your account</p>
//           </div>

//           {/* Tabs */}
//           <div className="flex justify-center mb-6 border-b border-gray-200">
//             <button className="px-4 py-2 text-orange-600 font-semibold border-b-2 border-orange-600 -mb-[2px] text-sm">
//               Login
//             </button>
//           </div>

//           {/* Google Login Button */}
//           <div className="w-full my-6 flex justify-center pl-15">
//             <GoogleLogin
//               theme="outline"
//               size="large"
//               onSuccess={async (credentialResponse) => {
//                 const loadingToast = toastUtils.loading(toastMessages.loggingIn)
//                 try {
//                   const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/google-oauth`, {
//                     method: "POST",
//                     headers: { "Content-Type": "application/json" },
//                     body: JSON.stringify({ token: credentialResponse.credential }),
//                   })
//                   const data = await res.json()

//                   if (data?.message === "User not found") {
//                     toastUtils.error(data?.message)
//                     toastUtils.dismissToast(loadingToast)
//                     return
//                   }

//                   if (data?.user?.email?.includes("@flashfirehq")) {
//                     setName(data.user.name)
//                     setEmailOperations(data.user.email)
//                     setRole(data.user.role)
//                     setManagedUsers(data.user.managedUsers)
//                     toastUtils.dismissToast(loadingToast)
//                     toastUtils.success("Welcome to Operations Dashboard!")
//                     navigate("/manage")
//                   } else {
//                     setData?.({
//                       userDetails: data?.userDetails,
//                       token: data?.token || "",
//                     })
//                     setProfileFromApi(data?.userProfile)
                    
//                     sessionStorage.setItem('hasProfile', data?.hasProfile ? 'true' : 'false')
                    
//                     localStorage.setItem(
//                       "userAuth",
//                       JSON.stringify({
//                         token: data?.token,
//                         userDetails: data?.userDetails,
//                         userProfile: data?.userProfile,
//                       }),
//                     )
//                     toastUtils.dismissToast(loadingToast)
//                     toastUtils.success(toastMessages.loginSuccess)
//                     navigate("/")
//                   }
//                 } catch (err) {
//                   console.error(err)
//                   toastUtils.dismissToast(loadingToast)
//                   toastUtils.error(toastMessages.networkError)
//                 }
//               }}
//               onError={() => {
//                 toastUtils.error("Google login failed. Please try again.")
//               }}
//               useOneTap
//             />
//           </div>

//           {/* Divider */}
//           <div className="flex items-center justify-center mb-6">
//             <hr className="flex-1 border-gray-300" />
//             <span className="mx-3 text-gray-500 text-xs font-medium">OR</span>
//             <hr className="flex-1 border-gray-300" />
//           </div>

//           {/* Form */}
//           <form onSubmit={handleLogin} className="space-y-4">
//             {/* Email */}
//             <div>
//               <label className="block text-xs font-semibold text-gray-900 mb-1">Email *</label>
//               <div className="relative">
//                 <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
//                 <input
//                   type="email"
//                   placeholder="example@email.com"
//                   value={email}
//                   onChange={(e) => setEmail(e.target.value)}
//                   className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all text-sm"
//                 />
//               </div>
//             </div>

//             {/* Password */}
//             <div>
//               <label className="block text-xs font-semibold text-gray-900 mb-1">Password *</label>
//               <div className="relative">
//                 <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
//                 <input
//                   type={showPassword ? "text" : "password"}
//                   placeholder="Password"
//                   value={password}
//                   onChange={(e) => setPassword(e.target.value)}
//                   className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all text-sm"
//                 />
//                 <button
//                   type="button"
//                   onClick={() => setShowPassword(!showPassword)}
//                   className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
//                 >
//                   {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
//                 </button>
//               </div>
//             </div>

//             {/* Sign In Button */}
//             <button
//               type="submit"
//               disabled={isLoading}
//               className="w-full mt-5 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed group text-sm"
//             >
//               {isLoading ? (
//                 <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
//               ) : (
//                 <>
//                   <span className="text-sm">Sign In</span>
//                   <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
//                 </>
//               )}
//             </button>
//           </form>

//         </div>
//       </div>
//     </div>
//   )
// }

import React, { useState, useContext, useEffect, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { Eye, EyeOff, Mail, Lock, CheckCircle, TrendingUp, Users, Award, Clock, ArrowRight } from "lucide-react"
import { UserContext } from "../state_management/UserContext"
import { useUserProfile } from "../state_management/ProfileContext"
import { useOperationsStore } from "../state_management/Operations"
import { toastUtils, toastMessages } from "../utils/toast"
import { GoogleLogin } from "@react-oauth/google"

interface LoginResponse {
  message: string
  token?: string
  userDetails?: any
  userProfile?: any
  hasProfile?: boolean
  user?: any
}

const statsData = [
  {
    value: "95%",
    label: "Success Rate",
    icon: <TrendingUp className="w-5 h-5" />,
    color: "text-emerald-600",
  },
  {
    value: "300K+",
    label: "Applications Sent",
    icon: <Users className="w-5 h-5" />,
    color: "text-blue-600",
  },
  {
    value: "97%",
    label: "ATS Score",
    icon: <Award className="w-5 h-5" />,
    color: "text-orange-600",
  },
  {
    value: "24/7",
    label: "AI Working",
    icon: <Clock className="w-5 h-5" />,
    color: "text-purple-600",
  },
]

export default function Login() {
  const [email, setEmail] = useState<string>("")
  const [password, setPassword] = useState<string>("")
  const [showPassword, setShowPassword] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [, setResponse] = useState<LoginResponse | null>(null)
  const [googleButtonKey, setGoogleButtonKey] = useState<number>(Date.now())

  const navigate = useNavigate()
  const { setName, setEmailOperations, setRole, setManagedUsers } = useOperationsStore()
  const userContext = useContext(UserContext)
  const setData = userContext?.setData
  const { setProfileFromApi } = useUserProfile()

  // Force Google button to refresh on component mount to clear any cached state
  useEffect(() => {
    // Clear any existing Google OAuth state immediately
    try {
      const google = (window as any).google
      if (google && google.accounts && google.accounts.id && google.accounts.id.cancel) {
        google.accounts.id.cancel()
      }
    } catch (e) {
      // Ignore errors
    }
    
    // Small delay to ensure proper rendering and clear any cached Google OAuth state
    const timer = setTimeout(() => {
      setGoogleButtonKey(Date.now())
    }, 100)
    
    return () => clearTimeout(timer)
  }, [])

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toastUtils.error("Email and Password are required!")
      return
    }

    setIsLoading(true)
    const loadingToast = toastUtils.loading(toastMessages.loggingIn)
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
      const loginEndpoint = email.toLowerCase().includes("@flashfirehq") ? "/operations/login" : "/login"
      const res = await fetch(`${API_BASE_URL}${loginEndpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const data: LoginResponse = await res.json()
      setResponse(data)

      if (loginEndpoint === "/operations/login") {
        if (data?.message === "Login successful") {
          setName(data.user.name)
          setEmailOperations(data.user.email)
          setRole(data.user.role)
          setManagedUsers(data.user.managedUsers)
          toastUtils.dismissToast(loadingToast)
          toastUtils.success("Welcome to Operations Dashboard!")
          navigate("/manage")
        } else {
          toastUtils.dismissToast(loadingToast)
          toastUtils.error(data?.message || toastMessages.loginError)
        }
      } else {
        if (data?.message === "Login Success..!") {
          setData?.({
            userDetails: data?.userDetails,
            token: data?.token || "",
          })
          setProfileFromApi(data?.userProfile)
          
          sessionStorage.setItem('hasProfile', data?.hasProfile ? 'true' : 'false')
          
          localStorage.setItem(
            "userAuth",
            JSON.stringify({
              token: data?.token,
              userDetails: data?.userDetails,
              userProfile: data?.userProfile,
            }),
          )
          toastUtils.dismissToast(loadingToast)
          toastUtils.success(toastMessages.loginSuccess)
          navigate("/")
        } else {
          setData?.({
            userDetails: null,
            token: "",
          })
          toastUtils.dismissToast(loadingToast)
          toastUtils.error(data?.message || toastMessages.loginError)
        }
      }
    } catch (err) {
      console.error(err)
      toastUtils.dismissToast(loadingToast)
      toastUtils.error(toastMessages.networkError)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gradient-to-br from-orange-50 via-white to-red-50">
      {/* LEFT PANEL */}
      <div className="flex-1 flex flex-col justify-center px-6 md:px-12 lg:px-16 py-12 lg:py-16 relative border-b lg:border-b-0 lg:border-r border-gray-200">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 -left-20 w-96 h-96 bg-orange-200/30 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-red-200/30 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 max-w-xl mx-auto lg:mx-0">
          <div className="flex items-center gap-3 mb-2">
            <img src="/Logo.png" alt="Flashfire Logo" className="w-10 h-10 md:w-12 md:h-12" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-orange-600 via-red-600 to-orange-700 bg-clip-text text-transparent">
                FLASHFIRE
              </h1>
              <p className="text-xs text-gray-600">AI-Powered Resume Optimization</p>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-sm font-medium text-orange-600 mb-1 tracking-wide uppercase">Welcome Back</p>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-3">
              Transform Your{" "}
              <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                Career Journey
              </span>
            </h2>
            <p className="text-lg text-gray-700 leading-relaxed">
              Join professionals who landed dream jobs with AI-optimized resumes that beat ATS.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            {statsData.map((stat, i) => (
              <div
                key={i}
                className="group bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl p-5 hover:bg-white hover:border-orange-300 hover:shadow-lg transition-all duration-300 cursor-default"
              >
                <div className="flex items-center gap-3 mb-1">
                  <div className={`${stat.color} transition-transform group-hover:scale-110`}>{stat.icon}</div>
                  <span className="text-2xl font-bold text-gray-900">{stat.value}</span>
                </div>
                <p className="text-sm text-gray-600">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>Secure & Private</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL - WHITE CARD */}
      <div className="w-full lg:w-[480px] xl:w-[560px] flex flex-col justify-center px-6 md:px-12 py-12 bg-gray-50">
        <div className="max-w-md mx-auto w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-7 md:p-8">
          {/* Header */}
          <div className="mb-6">
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Sign In</h3>
            <p className="text-sm text-gray-600">Enter your credentials to access your account</p>
          </div>

          {/* Tabs */}
          <div className="flex justify-center mb-6 border-b border-gray-200">
            <button className="px-4 py-2 text-orange-600 font-semibold border-b-2 border-orange-600 -mb-[2px] text-sm">
              Login
            </button>
          </div>

         {/* Google Login Button */}
<div className="w-full my-6">
  <div 
    className="relative w-full google-button-container overflow-hidden rounded-lg"
    id="google-button-wrapper"
  >
    <style>{`
      /* Reset and force consistent styling */
      #google-button-wrapper {
        display: block !important;
        width: 100% !important;
        height: 42px !important;
        border-radius: 8px !important;
        overflow: hidden !important;
        background: transparent !important;
        border: none !important;
      }
      
      /* Remove all background elements and lines */
      #google-button-wrapper > div,
      #google-button-wrapper > div > div,
      #google-button-wrapper iframe {
        background: transparent !important;
        border: none !important;
        outline: none !important;
        box-shadow: none !important;
      }
      
      /* Force full width container */
      #google-button-wrapper > div {
        width: 100% !important;
        display: block !important;
        background: transparent !important;
      }
      
      /* Target the iframe container */
      #google-button-wrapper > div > div {
        width: 100% !important;
        display: block !important;
        background: transparent !important;
        border: none !important;
      }
      
      /* Target the actual button with role="button" - both states */
      #google-button-wrapper div[role="button"],
      #google-button-wrapper iframe {
        width: 100% !important;
        max-width: 100% !important;
        min-width: 100% !important;
        display: block !important;
        background: transparent !important;
        border: none !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      
      /* Main button styling - match email input exactly */
      #google-button-wrapper div[role="button"] {
        border: 1px solid #d1d5db !important; /* Orange border for main state */
        border-radius: 8px !important;
        background: #f9fafb !important; /* Light orange background */
        box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05) !important;
        transition: all 0.2s ease !important;
        padding: 0 !important;
        min-height: 42px !important;
        height: 42px !important;
        font-family: inherit !important;
        box-sizing: border-box !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }
      
      /* Hover state */
      #google-button-wrapper div[role="button"]:hover {
        border-color: #ea580c !important;
        background: #ffffff !important;
        box-shadow: 0 1px 3px 0 rgba(234, 88, 12, 0.1), 0 1px 2px 0 rgba(234, 88, 12, 0.06) !important;
      }
      
      /* Active state */
      #google-button-wrapper div[role="button"]:active {
        transform: translateY(0px) !important;
        box-shadow: 0 1px 2px 0 rgba(234, 88, 12, 0.05) !important;
      }
      
      /* Inner content wrapper - left-aligned for standard look */
      #google-button-wrapper div[role="button"] > div {
        width: 100% !important;
        display: flex !important;
        align-items: center !important;
        justify-content: flex-start !important; /* Changed to flex-start for left alignment */
        gap: 12px !important;
        margin: 0 !important;
        padding: 0 20px !important; /* Add horizontal padding for better spacing */
      }
      
      /* Text styling - orange tint */
      #google-button-wrapper div[role="button"] div[style*="color"],
      #google-button-wrapper div[role="button"] span {
        color: #374151 !important; /* Darker orange for text */
        font-weight: 500 !important;
        font-size: 14px !important;
        letter-spacing: 0.025em !important;
        white-space: nowrap !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      }
      
      /* Hover text color */
      #google-button-wrapper div[role="button"]:hover div[style*="color"],
      #google-button-wrapper div[role="button"]:hover span {
        color: #ea580c !important;
      }
      
      /* Google icon styling */
      #google-button-wrapper div[role="button"] svg {
        width: 18px !important;
        height: 18px !important;
        flex-shrink: 0 !important;
      }
      
      /* User profile image (after authentication) - fixed size */
      #google-button-wrapper div[role="button"] img {
        width: 20px !important;
        height: 20px !important;
        min-width: 20px !important;
        min-height: 20px !important;
        max-width: 20px !important;
        max-height: 20px !important;
        border-radius: 50% !important;
        flex-shrink: 0 !important;
        object-fit: cover !important;
      }
      
      /* Ensure iframe has consistent width and no borders */
      #google-button-wrapper iframe {
        height: 42px !important;
        border-radius: 8px !important;
        border: none !important;
        background: transparent !important;
      }
      
      /* Hide any shadow DOM elements that might cause lines */
      #google-button-wrapper ::before,
      #google-button-wrapper ::after,
      #google-button-wrapper *::before,
      #google-button-wrapper *::after {
        display: none !important;
        content: none !important;
      }
      
      /* Nuclear option: hide any element that might be causing the line */
      #google-button-wrapper div[style*="border"],
      #google-button-wrapper div[style*="background"],
      #google-button-wrapper div[style*="line"] {
        border: none !important;
        background: transparent !important;
        display: none !important;
      }
    `}</style>
    <GoogleLogin
      key={`google-login-button-${googleButtonKey}`}
      theme="outline"
      size="large"
      shape="rectangular"
      text="continue_with"
      width="400"
      useOneTap={false}
      auto_select={false}
      cancel_on_tap_outside={true}
      prompt="select_account"
      ux_mode="popup"
      onSuccess={async (credentialResponse) => {
        const loadingToast = toastUtils.loading(toastMessages.loggingIn)
        try {
          const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/google-oauth`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: credentialResponse.credential }),
          })
          const data = await res.json()

          if (data?.message === "User not found") {
            toastUtils.dismissToast(loadingToast)
            toastUtils.error("Account does not exist. Please register first.")
            return
          }

          if (data?.user?.email?.includes("@flashfirehq")) {
            setName(data.user.name)
            setEmailOperations(data.user.email)
            setRole(data.user.role)
            setManagedUsers(data.user.managedUsers)
            toastUtils.dismissToast(loadingToast)
            toastUtils.success("Welcome to Operations Dashboard!")
            navigate("/manage")
          } else {
            setData?.({
              userDetails: data?.userDetails,
              token: data?.token || "",
            })
            setProfileFromApi(data?.userProfile)
            
            sessionStorage.setItem('hasProfile', data?.hasProfile ? 'true' : 'false')
            
            localStorage.setItem(
              "userAuth",
              JSON.stringify({
                token: data?.token,
                userDetails: data?.userDetails,
                userProfile: data?.userProfile,
              }),
            )
            toastUtils.dismissToast(loadingToast)
            toastUtils.success(toastMessages.loginSuccess)
            navigate("/")
          }
        } catch (err) {
          console.error(err)
          toastUtils.dismissToast(loadingToast)
          toastUtils.error(toastMessages.networkError)
        }
      }}
      onError={() => {
        toastUtils.error("Google login failed. Please try again.")
      }}
    />
  </div>
</div>

          {/* Divider */}
          <div className="flex items-center justify-center mb-6">
            <hr className="flex-1 border-gray-300" />
            <span className="mx-3 text-gray-500 text-xs font-medium">OR</span>
            <hr className="flex-1 border-gray-300" />
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-900 mb-1">Email *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="email"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all text-sm"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-900 mb-1">Password *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-5 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed group text-sm"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span className="text-sm">Sign In</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  )
}



