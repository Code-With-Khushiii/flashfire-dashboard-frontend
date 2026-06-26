// import { useState, useContext, type FormEvent } from "react"
// import { useNavigate } from "react-router-dom"
// import { Eye, EyeOff } from "lucide-react"
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
//                   className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ff4b00]/30 focus:border-orange-500 transition-all text-sm"
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
//                   className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ff4b00]/30 focus:border-orange-500 transition-all text-sm"
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

import { useState, useContext, useEffect, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { Eye, EyeOff } from "lucide-react"
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

const normalizeEmail = (value: string) => value.trim().toLowerCase()

export default function Login() {
  const [email, setEmail] = useState<string>("")
  const [password, setPassword] = useState<string>("")
  const [showPassword, setShowPassword] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [, setResponse] = useState<LoginResponse | null>(null)
  const [googleButtonKey, setGoogleButtonKey] = useState<number>(Date.now())
  const [requireSessionKey, setRequireSessionKey] = useState<boolean>(false)
  const [sessionKeyInput, setSessionKeyInput] = useState<string>("")
  const [otpInput, setOtpInput] = useState<string>("")
  const [otpSent, setOtpSent] = useState<boolean>(false)
  const [sendingOtp, setSendingOtp] = useState<boolean>(false)
  const [useSessionKey, setUseSessionKey] = useState<boolean>(false)
  const [rememberFor30Days, setRememberFor30Days] = useState<boolean>(true)

  const navigate = useNavigate()
  const { setName, setEmailOperations, setRole, setManagedUsers, setOperatorNamesMap, reset: resetOperationsStore } = useOperationsStore()
  const userContext = useContext(UserContext)
  const setData = userContext?.setData
  const { setProfileFromApi } = useUserProfile()

  const requestOtp = async () => {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
    const normalizedEmail = normalizeEmail(email)
    setSendingOtp(true)
    const loadingToast = toastUtils.loading('Sending OTP...')
    try {
      const res = await fetch(`${API_BASE_URL}/operations/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, password })
      })
      const data = await res.json()
      toastUtils.dismissToast(loadingToast)
      if (data?.success) {
        toastUtils.success('OTP sent to your email')
        setOtpSent(true)
      } else {
        toastUtils.error(data?.error || 'Failed to send OTP')
      }
    } catch (e) {
      toastUtils.dismissToast(loadingToast)
      toastUtils.error('Network error while sending OTP')
    } finally {
      setSendingOtp(false)
    }
  }

  const verifyOtp = async () => {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
    const normalizedEmail = normalizeEmail(email)
    const loadingToast = toastUtils.loading('Verifying OTP...')
    try {
      const res = await fetch(`${API_BASE_URL}/operations/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, otp: otpInput })
      })
      const data = await res.json()
      if (res.ok && data?.success) {
        toastUtils.dismissToast(loadingToast)
        toastUtils.success('Verified. Welcome to Operations Dashboard!')
        if (data?.trustToken) {
          if (rememberFor30Days) {
            localStorage.setItem('opsOtpTrust', JSON.stringify({
              email: normalizedEmail,
              trustToken: data.trustToken,
              verifiedAt: Date.now(),
            }))
          } else {
            localStorage.removeItem('opsOtpTrust')
          }
        }
        setRequireSessionKey(false)
        setOtpInput("")
        setOtpSent(false)
        navigate('/manage')
      } else {
        toastUtils.dismissToast(loadingToast)
        toastUtils.error(data?.error || 'Invalid or expired OTP')
      }
    } catch (e) {
      toastUtils.dismissToast(loadingToast)
      toastUtils.error('Network error while verifying OTP')
    }
  }

  const verifySessionKey = async () => {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
    const normalizedEmail = normalizeEmail(email)
    const loadingToast = toastUtils.loading('Verifying session key...')
    try {
      const res = await fetch(`${API_BASE_URL}/operations/verify-session-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, sessionKey: sessionKeyInput })
      })
      const data = await res.json()
      if (res.ok) {
        toastUtils.dismissToast(loadingToast)
        toastUtils.success('Verified. Welcome to Operations Dashboard!')
        // persist key for future logins (store lowercase email)
        localStorage.setItem('opsSessionKey', JSON.stringify({ email: normalizedEmail, sessionKey: sessionKeyInput, verifiedAt: Date.now() }))
        setRequireSessionKey(false)
        setSessionKeyInput("")
        navigate('/manage')
      } else {
        toastUtils.dismissToast(loadingToast)
        toastUtils.error(data?.error || 'Invalid or expired session key')
      }
    } catch (e) {
      toastUtils.dismissToast(loadingToast)
      toastUtils.error('Network error while verifying key')
    }
  }

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
    const normalizedEmail = normalizeEmail(email)
    if (!normalizedEmail || !password) {
      toastUtils.error("Email and Password are required!")
      return
    }
    setEmail(normalizedEmail)

    setIsLoading(true)
    const loadingToast = toastUtils.loading(toastMessages.loggingIn)
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
      const loginEndpoint = normalizedEmail.includes("@flashfirehq") ? "/operations/login" : "/login"
      const res = await fetch(`${API_BASE_URL}${loginEndpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, password }),
      })
      const data: LoginResponse = await res.json()
      setResponse(data)

      if (loginEndpoint === "/operations/login") {
        if (data?.message === "Login successful") {
          setName(data.user.name)
          setEmailOperations(data.user.email)
          setRole(data.user.role)
          setManagedUsers(data.user.managedUsers)
          const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
          fetch(`${API_BASE_URL}/admin/list/operations`)
            .then((r) => r.json())
            .then((d) => {
              const map: Record<string, string> = {}
              ;(d.operations || []).forEach((o: { email?: string; name?: string }) => {
                if (o.email) map[o.email.toLowerCase()] = o.name || o.email
              })
              setOperatorNamesMap(map)
            })
            .catch(() => {})
          toastUtils.dismissToast(loadingToast)
          const operatorEmail = normalizeEmail(data?.user?.email || normalizedEmail || '')

          const storedSessionKey = localStorage.getItem('opsSessionKey')
          if (storedSessionKey) {
            try {
              const parsed = JSON.parse(storedSessionKey)
              if (parsed?.sessionKey && parsed?.email && parsed.email === operatorEmail) {
                const resVerify = await fetch(`${API_BASE_URL}/operations/verify-session-key`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email: operatorEmail, sessionKey: parsed.sessionKey })
                })
                if (resVerify.ok) {
                  toastUtils.success('Verified with saved session key')
                  navigate('/manage')
                  return
                }
              }
            } catch {}
          }

          const storedOtpTrust = localStorage.getItem('opsOtpTrust')
          if (storedOtpTrust) {
            try {
              const parsed = JSON.parse(storedOtpTrust)
              if (parsed?.trustToken && parsed?.email && parsed.email === operatorEmail) {
                const resTrust = await fetch(`${API_BASE_URL}/operations/validate-otp-trust`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email: operatorEmail, trustToken: parsed.trustToken })
                })
                const trustData = await resTrust.json()
                if (resTrust.ok && trustData?.valid) {
                  toastUtils.success('Welcome back! (Trusted for 30 days)')
                  navigate('/manage')
                  return
                }
              }
            } catch {}
          }

          setRequireSessionKey(true)
        } else {
          toastUtils.dismissToast(loadingToast)
          toastUtils.error(data?.message || toastMessages.loginError)
        }
      } else {
        if (data?.message === "Login Success..!") {
          resetOperationsStore()
          localStorage.removeItem("role")
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
          resetOperationsStore()
          localStorage.removeItem("role")
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
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* LEFT PANEL */}
      <div className="flex flex-col justify-between px-6 sm:px-10 lg:px-16 py-8 lg:py-10 bg-white min-h-screen lg:min-h-0 lg:flex-1">
        {/* Logo */}
        <div className="flex items-center gap-0.5">
          <img src="/logo2.png" alt="Flashfire Logo" className="w-8 h-8" />
          <span className="text-[#ff4b00] font-extrabold text-base tracking-widest uppercase">Flashfire</span>
        </div>

        {/* Main content */}
        <div className="max-w-lg py-8 lg:py-12">
          <p className="text-[#ff4b00] text-xs font-semibold tracking-widest uppercase mb-4 lg:mb-6">
            Career Intelligence Platform
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-900 leading-tight mb-4 lg:mb-5">
            Your next job<br />starts with a<br />
            <span className="text-[#ff4b00]">better resume.</span>
          </h2>
          <p className="text-gray-500 text-sm lg:text-base leading-relaxed mb-6 lg:mb-10">
            AI that rewrites, scores, and tailors your resume to beat
            ATS filters — so recruiters actually see you.
          </p>

          {/* Stats - 3 column */}
          <div className="flex border border-gray-200 rounded-lg overflow-hidden">
            <div className="flex-1 p-3 lg:p-5 text-center border-r border-gray-200">
              <div className="text-xl lg:text-2xl font-bold text-gray-700">95<span className="text-[#ff4b00]">%</span></div>
              <div className="text-xs text-gray-500 mt-1">Success Rate</div>
            </div>
            <div className="flex-1 p-3 lg:p-5 text-center border-r border-gray-200">
              <div className="text-xl lg:text-2xl font-bold text-gray-700">
                300<span className="text-[#ff4b00]">k+</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">Applications Sent</div>
            </div>
            <div className="flex-1 p-3 lg:p-5 text-center">
              <div className="text-xl lg:text-2xl font-bold text-gray-700">97<span className="text-[#ff4b00]">%</span></div>
              <div className="text-xs text-gray-500 mt-1">Avg ATS Score</div>
            </div>
          </div>
        </div>

        {/* Bottom text */}
        <p className="text-gray-400 text-xs lg:text-sm">End-to-end encrypted • Your data is never sold</p>
      </div>

      {/* RIGHT PANEL */}
      <div className="w-full lg:w-[480px] xl:w-[520px] flex flex-col justify-center px-6 sm:px-10 lg:px-16 py-10 bg-gray-100 min-h-screen lg:min-h-0">
        <h3 className="text-3xl font-bold text-gray-900 mb-1">Welcome back</h3>
        <p className="text-gray-500 text-sm mb-8">Sign in to your Flashfire account</p>

        {/* Google Login Button */}
        <div className="w-full mb-6 overflow-hidden" id="google-button-wrapper">
          <style>{`
            #google-button-wrapper > div > div,
            #google-button-wrapper > div {
              width: 100% !important;
            }
            #google-button-wrapper iframe {
              width: 100% !important;
              border-radius: 8px !important;
            }
            #google-button-wrapper div[role="button"] {
              width: 100% !important;
              min-width: 100% !important;
              border: 1px solid #d1d5db !important;
              border-radius: 8px !important;
              background: #ffffff !important;
              box-shadow: none !important;
              height: 44px !important;
              min-height: 44px !important;
            }
            #google-button-wrapper div[role="button"]:hover {
              border-color: #9ca3af !important;
              background: #f9fafb !important;
            }
            #google-button-wrapper div[role="button"] > div {
              justify-content: center !important;
              width: 100% !important;
            }
            #google-button-wrapper > div:empty,
            #google-button-wrapper > div > div:empty {
              display: none !important;
              height: 0 !important;
            }
            #google-button-wrapper > div[style*="display: none"],
            #google-button-wrapper iframe[style*="display: none"] {
              display: none !important;
              height: 0 !important;
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
                  resetOperationsStore()
                  localStorage.removeItem("role")
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

        {/* Divider */}
        <div className="flex items-center mb-6">
          <hr className="flex-1 border-gray-300" />
          <span className="mx-4 text-gray-400 text-xs font-medium">OR</span>
          <hr className="flex-1 border-gray-300" />
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              placeholder="eg. johnfrans@gmail.com"
              value={email}
              onChange={(e) => setEmail(normalizeEmail(e.target.value))}
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ff4b00]/30 focus:border-[#ff4b00] transition-all text-base sm:text-sm"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 pr-10 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ff4b00]/30 focus:border-[#ff4b00] transition-all text-base sm:text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember me + Forgot password */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberFor30Days}
                onChange={(e) => setRememberFor30Days(e.target.checked)}
                className="w-4 h-4 accent-[#ff4b00] rounded"
              />
              <span className="text-sm text-gray-600">Remember me</span>
            </label>
            <button type="button" className="text-sm text-[#ff4b00] hover:text-[#cc3d00] font-medium">
              Forgot password?
            </button>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#ff4b00] hover:bg-[#cc3d00] text-white font-semibold py-3 rounded-lg flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm mt-2"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {/* No account */}
        <p className="text-center text-sm text-gray-500 mt-5">
          No account yet?{" "}
          <button
            type="button"
            onClick={() => navigate("/signup")}
            className="text-[#ff4b00] hover:text-[#cc3d00] font-medium"
          >
            Create one free
          </button>
        </p>
      </div>
      <SessionKeyModal 
        visible={requireSessionKey}
        onClose={() => { setRequireSessionKey(false); setSessionKeyInput(""); setOtpInput(""); setOtpSent(false); setUseSessionKey(false) }}
        onVerifyOtp={verifyOtp}
        onVerifySessionKey={verifySessionKey}
        onRequestOtp={requestOtp}
        otpInput={otpInput}
        setOtpInput={setOtpInput}
        otpSent={otpSent}
        sendingOtp={sendingOtp}
        sessionKeyInput={sessionKeyInput}
        setSessionKeyInput={setSessionKeyInput}
        useSessionKey={useSessionKey}
        setUseSessionKey={setUseSessionKey}
        email={email}
        rememberFor30Days={rememberFor30Days}
        setRememberFor30Days={setRememberFor30Days}
      />
    </div>
  )
}

function SessionKeyModal({
  visible,
  onClose,
  onVerifyOtp,
  onVerifySessionKey,
  onRequestOtp,
  otpInput,
  setOtpInput,
  otpSent,
  sendingOtp,
  sessionKeyInput,
  setSessionKeyInput,
  useSessionKey,
  setUseSessionKey,
  email,
  rememberFor30Days,
  setRememberFor30Days,
}: {
  visible: boolean
  onClose: () => void
  onVerifyOtp: () => void
  onVerifySessionKey: () => void
  onRequestOtp: () => void
  otpInput: string
  setOtpInput: (v: string) => void
  otpSent: boolean
  sendingOtp: boolean
  sessionKeyInput: string
  setSessionKeyInput: (v: string) => void
  useSessionKey: boolean
  setUseSessionKey: (v: boolean) => void
  email: string
  rememberFor30Days: boolean
  setRememberFor30Days: (v: boolean) => void
}) {
  if (!visible) return null
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md transform transition-all">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700">🔑</span>
            <span>Verify access for {email}</span>
          </h3>
          <p className="text-sm text-gray-500 mt-1">Use OTP (sent to your email) or session key as backup.</p>
        </div>
        <div className="p-6 space-y-6">
          {!useSessionKey ? (
            <>
              {!otpSent ? (
                <button
                  type="button"
                  onClick={onRequestOtp}
                  disabled={sendingOtp}
                  className="w-full px-4 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl hover:from-emerald-600 hover:to-green-700 disabled:opacity-50 transition-all"
                >
                  {sendingOtp ? "Sending OTP..." : "Send OTP to my email"}
                </button>
              ) : (
                <form onSubmit={(e)=>{ e.preventDefault(); onVerifyOtp(); }} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">4-digit OTP</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={otpInput}
                      onChange={(e)=> setOtpInput(e.target.value.replace(/[^0-9]/g, '').slice(0,4))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent tracking-widest text-center text-lg"
                      placeholder="••••"
                      autoComplete="one-time-code"
                    />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={rememberFor30Days}
                      onChange={(e) => setRememberFor30Days(e.target.checked)}
                      className="rounded"
                    />
                    Remember for 30 days (skip OTP next time)
                  </label>
                  <button type="submit" className="w-full px-4 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl hover:from-emerald-600 hover:to-green-700">
                    Verify OTP
                  </button>
                </form>
              )}
              <button
                type="button"
                onClick={() => setUseSessionKey(true)}
                className="w-full text-sm text-gray-500 hover:text-gray-700 py-2"
              >
                Use session key instead
              </button>
            </>
          ) : (
            <>
              <form onSubmit={(e)=>{ e.preventDefault(); onVerifySessionKey(); }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">8-digit Session Key</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={8}
                    value={sessionKeyInput}
                    onChange={(e)=> setSessionKeyInput(e.target.value.replace(/[^0-9]/g, '').slice(0,8))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent tracking-widest text-center"
                    placeholder="########"
                  />
                </div>
                <button type="submit" className="w-full px-4 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl hover:from-emerald-600 hover:to-green-700">
                  Verify Session Key
                </button>
              </form>
              <button
                type="button"
                onClick={() => setUseSessionKey(false)}
                className="w-full text-sm text-gray-500 hover:text-gray-700 py-2"
              >
                ← Back to OTP
              </button>
            </>
          )}
          <button type="button" onClick={onClose} className="w-full px-4 py-2 text-gray-600 hover:text-gray-800 text-sm">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
