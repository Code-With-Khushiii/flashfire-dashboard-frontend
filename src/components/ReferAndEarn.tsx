import { Share2, Gift, CheckCircle2, Copy, Check } from "lucide-react"
import { useState, useContext } from "react"
import { UserContext } from "../state_management/UserContext"
import { PAGE_HEADER_BAR, PAGE_HEADER_INNER, PAGE_MAIN } from "../styles/layout"

const STEPS = [
  {
    icon: Share2,
    title: "Share your name",
    description: "Give your name to a friend who's job hunting. That's your referral code.",
  },
  {
    icon: Gift,
    title: "They name you at signup",
    description: "Your friend types your name into the referral field while onboarding.",
  },
  {
    icon: CheckCircle2,
    title: "Applications land automatically",
    description: "Bonus applications appear in your job tracker. Nothing to claim.",
  },
]

const REWARDS = [
  { amount: 200, plan: "Professional plan" },
  { amount: 300, plan: "Executive plan" },
]

export default function ReferAndEarn() {
  const [copied, setCopied] = useState(false)
  const context = useContext(UserContext)
  const userDetails = context?.userDetails

  const referralName = (userDetails?.name || "").trim()

  const copyName = async () => {
    if (!referralName) return
    try {
      await navigator.clipboard.writeText(referralName)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard API unavailable — no-op
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className={PAGE_HEADER_BAR}>
        <div className={PAGE_HEADER_INNER}>
          <h1 className="text-xl font-bold text-gray-900 leading-tight">Refer n Earn</h1>
          <p className="text-sm text-gray-500 mt-1">
            Your name is your referral code. Every friend who names you at signup adds bonus applications to your plan.
          </p>
        </div>
      </div>

      <div className={PAGE_MAIN}>
        <main className="bg-white border border-gray-300 p-4 sm:p-6 md:p-8 divide-y divide-gray-200">
          {/* HOW IT WORKS */}
          <div className="pb-8">
            <h3 className="text-base font-bold text-gray-900 mb-4">How it works</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {STEPS.map((step, i) => (
                <div
                  key={step.title}
                  className="bg-white border border-gray-900 p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-9 w-9 items-center justify-center bg-orange-50 border border-orange-100 text-orange-600">
                      <step.icon className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-orange-500">
                      Step {i + 1}
                    </span>
                  </div>
                  <p className="mt-4 text-sm font-semibold text-gray-900">{step.title}</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-gray-500">{step.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* REFERRAL REWARDS */}
          <div className="py-8">
            <h3 className="text-base font-bold text-gray-900 mb-4">Referral rewards</h3>
            <div className="flex flex-wrap gap-5">
              {REWARDS.map((reward) => (
                <div
                  key={reward.plan}
                  className="bg-white border border-gray-900 border-t-4 border-t-orange-500 p-5 w-full sm:w-48 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
                >
                  <p className="text-4xl font-extrabold text-gray-900 tabular-nums">{reward.amount}</p>
                  <p className="text-xs text-gray-500 mt-1">applications per referral</p>
                  <p className="text-xs font-semibold text-orange-600 mt-3 pt-3 border-t border-gray-200">{reward.plan}</p>
                </div>
              ))}
            </div>
          </div>

          {/* REFERRAL NAME */}
          <div className="pt-8">
            <h3 className="text-base font-bold text-gray-900 mb-1">Your referral name</h3>
            <p className="text-xs text-gray-500 mb-4">
              Ask your friend to enter this exactly as it appears here.
            </p>
            {referralName ? (
              <div className="flex max-w-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <input
                  readOnly
                  value={referralName}
                  aria-label="Your referral name"
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 min-w-0 border border-gray-900 px-4 py-2.5 text-sm font-semibold text-gray-900 bg-white focus:outline-none"
                />
                <button
                  onClick={copyName}
                  className={`flex items-center gap-2 border border-l-0 border-gray-900 px-4 py-2.5 text-sm font-semibold transition-colors flex-shrink-0 ${
                    copied ? "bg-green-600 text-white" : "bg-orange-500 text-white hover:bg-orange-600"
                  }`}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied!" : "Copy name"}
                </button>
              </div>
            ) : (
              <p className="max-w-xl border border-dashed border-gray-400 bg-gray-50 px-4 py-3 text-sm text-gray-500">
                Add your name in your profile and it will show up here as your referral name.
              </p>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
