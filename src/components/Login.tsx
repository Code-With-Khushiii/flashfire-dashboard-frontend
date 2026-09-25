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
import { shouldHidePasswordFromManager, guardedPasswordInputProps } from "../utils/passwordManagerGuard"
import { postJsonWithRetry } from "../utils/postJson"
import { reportNetworkError } from "../utils/reportNetworkError"
import { GoogleLogin } from "@react-oauth/google"

interface LoginResponse {
  message: string
  code?: string
  token?: string
  userDetails?: unknown
  userProfile?: unknown
  hasProfile?: boolean
  user?: {
    name: string
    email: string
    role: string
    managedUsers: { _id: string; name: string; email: string; userID: string }[]
  }
}

// Google sign-in only works for accounts that already exist - the backend never
// creates one. Map its refusal codes to something a client can act on.
const googleLoginErrorMessage = (data: LoginResponse | null): string => {
  switch (data?.code) {
    case "ACCOUNT_NOT_FOUND":
      return "No FlashFire account exists for this Google address. Please contact your account manager."
    case "EMAIL_NOT_VERIFIED":
      return "This Google account's email is not verified. Verify it with Google and try again."
    case "INVALID_CREDENTIAL":
    case "MISSING_CREDENTIAL":
      return "Google sign-in could not be verified. Please try again."
    case "GOOGLE_NOT_CONFIGURED":
      return "Google sign-in is temporarily unavailable. Please use your email and password."
    default:
      // Older backend builds answered with this message and no code.
      if (data?.message === "User not found") {
        return "No FlashFire account exists for this Google address. Please contact your account manager."
      }
      return data?.message || toastMessages.networkError
  }
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
  // After a client login, return to the screen they originally wanted (e.g.
  // /?tab=upgrade). Only same-origin internal paths are honoured to avoid an
  // open-redirect; anything else falls back to the dashboard root.
  const clientRedirectTarget = () => {
    try {
      const r = new URLSearchParams(window.location.search).get('redirect')
      if (r && r.startsWith('/') && !r.startsWith('//')) return r
    } catch { /* ignore */ }
    return '/'
  }
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
    } catch {
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
    } catch {
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
    } catch {
      toastUtils.dismissToast(loadingToast)
      toastUtils.error('Network error while verifying key')
    }
  }

  // Force Google button to refresh on component mount to clear any cached state
  useEffect(() => {
    // Clear any existing Google OAuth state immediately
    try {
      const google = (window as { google?: { accounts?: { id?: { cancel?: () => void } } } }).google
      google?.accounts?.id?.cancel?.()
    } catch {
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
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
    const loginEndpoint = normalizedEmail.includes("@flashfirehq") ? "/operations/login" : "/login"
    try {
      const { data } = await postJsonWithRetry<LoginResponse>(
        `${API_BASE_URL}${loginEndpoint}`,
        { email: normalizedEmail, password },
      )
      setResponse(data)

      if (loginEndpoint === "/operations/login") {
        if (data?.message === "Login successful" && data.user) {
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
            } catch { /* corrupt stored key — fall through to OTP */ }
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
            } catch { /* corrupt stored trust token — fall through to OTP */ }
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
          navigate(clientRedirectTarget())
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
      reportNetworkError("Login", normalizedEmail, err, `${API_BASE_URL}${loginEndpoint}`)
      toastUtils.dismissToast(loadingToast)
      toastUtils.error(toastMessages.networkError)
    } finally {
      setIsLoading(false)
    }
  }

  // Ops accounts must never be captured by Google Password Manager (the shared
  // Google profile handed to clients would expose them). Hidden by default so
  // the browser never classifies this as a login form until the typed domain
  // is clearly a client's, not flashfirehq.
  const hidePasswordFromManager = shouldHidePasswordFromManager(email)

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
            Designed to Get You Hired
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-900 leading-tight mb-4 lg:mb-5">
            Focus on<br />
            Interviews.<br />
            <span className="text-[#ff4b00]">We'll Handle the<br />Rest.</span>
          </h2>
          <p className="text-gray-500 text-sm lg:text-base leading-relaxed mb-6 lg:mb-10">
            Spend less time applying and more time preparing for the opportunities that matter.
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
        <p className="text-gray-500 text-sm mb-8">Login to your Flashfire account</p>

        {/* Google Login Button */}
        <div className="group relative w-full h-11 mb-6" id="google-button-wrapper">
          <style>{`
            /* Google's real button sits underneath at full opacity, covered by
               our skin. It must NOT be transparent: GSI refuses to start the
               sign-in flow for a button it considers hidden - an
               anti-clickjacking guard - which is why the old opacity:0 version
               did nothing in production. Covering an opaque button passes that
               check while the user still sees our design.

               Stretching is needed because Google hard-caps the widget at
               400px. Matched by id and role="button" rather than its generated
               class names, which change without notice. */
            #google-button-wrapper > div,
            #google-button-wrapper > div > div,
            #google-button-wrapper > div > div > div,
            #google-button-wrapper > div > div > div > div,
            #google-button-wrapper iframe,
            #google-button-wrapper [role="button"] {
              width: 100% !important;
              max-width: 100% !important;
            }

            /* Pin Google's subtree to the wrapper box and clip it. While GSI
               initialises, its container is ~88px tall (a 40px button plus a
               48px iframe stacked beneath), which spilled 44px past our 44px
               skin - so for roughly half a second on every load a second,
               fully rendered Google button appeared underneath. Clipping here
               rather than on the wrapper keeps the skin's shadow and focus
               ring from being cut off too. */
            #google-button-wrapper > div:not(.gsi-skin) {
              position: absolute;
              inset: 0;
              overflow: hidden;
            }

            /* Google paints a 2px blue focus ring on its own button, which
               shows around the edges of our skin on click. Suppress it there
               and redraw the indicator on the skin, so keyboard users still
               get one. */
            #google-button-wrapper [role="button"]:focus,
            #google-button-wrapper [role="button"]:focus-visible {
              outline: none !important;
            }
            #google-button-wrapper:has([role="button"]:focus-visible) .gsi-skin {
              outline: 2px solid #ea580c;
              outline-offset: 2px;
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
                const { ok, data } = await postJsonWithRetry<LoginResponse>(
                  `${import.meta.env.VITE_API_BASE_URL}/google-oauth`,
                  { token: credentialResponse.credential },
                )

                // Only a 2xx with a token is a login. Anything else used to fall
                // through to the success branch and write an empty session.
                if (!ok || !data?.token) {
                  toastUtils.dismissToast(loadingToast)
                  toastUtils.error(googleLoginErrorMessage(data))
                  return
                }

                // The backend attaches `user` only on the operations branch, so
                // its presence - not the email domain - distinguishes the two.
                if (data?.user) {
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
                  navigate(clientRedirectTarget())
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

          {/* Our skin, painted over Google's button. The button underneath
              keeps opacity 1 so GSI still counts it as visible; this layer is
              pointer-events-none so every click passes straight through to it.
              Also hides Google's personalised "Continue as <name>" variant,
              which otherwise shows whenever the visitor has a live Google
              session. */}
          <div className="gsi-skin pointer-events-none absolute inset-0 z-10 flex items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 shadow-sm transition-colors group-hover:border-gray-400 group-hover:bg-gray-50">
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Continue with Google</span>
          </div>
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
              autoComplete={hidePasswordFromManager ? "off" : "email"}
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
                {...guardedPasswordInputProps(hidePasswordFromManager, showPassword)}
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
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto transform transition-all">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
            <span className="inline-flex flex-shrink-0 items-center justify-center w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700">🔑</span>
            <span className="min-w-0 break-words">Verify access for {email}</span>
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
