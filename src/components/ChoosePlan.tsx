import { useContext, useEffect } from "react";
import { X, ArrowUpRight, Plus, CheckCircle2 } from "lucide-react";
import { UserContext } from "../state_management/UserContext";
import { PAGE_CONTAINER, PAGE_HEADER_BAR, PAGE_MAIN } from "../styles/layout";

type PlanKey = "prime" | "ignite" | "professional" | "executive";
type Currency = "USD" | "CAD" | "GBP";

const PLAN_LABELS: Record<PlanKey, string> = {
  prime: "Prime", ignite: "Ignite", professional: "Professional", executive: "Executive",
};
const PLAN_APPS: Record<PlanKey, number> = {
  prime: 160, ignite: 250, professional: 500, executive: 1200,
};
const PLAN_FEATURES: Record<PlanKey, string[]> = {
  prime: ["No Time Constraint", "We Find Jobs", "AI Custom Resumes", "Expert Resume Writing"],
  ignite: ["No Time Constraint", "We Find Jobs", "AI Custom Resumes", "Expert Resume Writing"],
  professional: ["No Time Constraint", "We Find Jobs", "LinkedIn Makeover", "Interview Prep Material"],
  executive: ["Cover Letter Included", "Emailing Recruiters", "Portfolio Website"],
};

const CURRENCY_SYMBOL: Record<Currency, string> = { USD: "$", CAD: "CA$", GBP: "£" };

// Upgrade links: { to, priceUSD, priceCAD, priceGBP, urlUSD, urlCAD, urlGBP }
const UPGRADES_DATA: Record<string, { to: PlanKey; priceUSD: number; priceCAD: number; priceGBP: number; urlUSD: string; urlCAD: string; urlGBP: string }[]> = {
  prime: [
    {
      to: "professional",
      priceUSD: 240, urlUSD: "https://buy.stripe.com/7sY7sN2128uS1DWdcz3AY08",
      priceCAD: 240, urlCAD: "https://buy.stripe.com/bJe28t9tu26u96o5K73AY0q",
      priceGBP: 220, urlGBP: "https://buy.stripe.com/5kQbJ36hi5iG96o3BZ3AY0Q",
    },
    {
      to: "executive",
      priceUSD: 490, urlUSD: "https://buy.stripe.com/fZu3cx6hi9yW82k0pN3AY09",
      priceCAD: 490, urlCAD: "https://buy.stripe.com/6oU8wRcFG4eC5Uc1tR3AY0r",
      priceGBP: 420, urlGBP: "https://buy.stripe.com/9B6aEZbBCeTg82k0pN3AY0R",
    },
  ],
  ignite: [
    {
      to: "professional",
      priceUSD: 170, urlUSD: "https://buy.stripe.com/28E6oJ9tu7qOfuM3BZ3AY0d",
      priceCAD: 170, urlCAD: "https://buy.stripe.com/00w9AV212eTg6YgfkH3AY0n",
      priceGBP: 150, urlGBP: "https://buy.stripe.com/6oU14pdJK26udmE7Sf3AY0V",
    },
    {
      to: "executive",
      priceUSD: 420, urlUSD: "https://buy.stripe.com/5kQcN7eNO7qO2I06Ob3AY0e",
      priceCAD: 420, urlCAD: "https://buy.stripe.com/fZu5kF9tueTg82kc8v3AY0v",
      priceGBP: 350, urlGBP: "https://buy.stripe.com/bJe8wRaxy8uS5Uc0pN3AY0W",
    },
  ],
  professional: [
    {
      to: "executive",
      priceUSD: 285, urlUSD: "https://buy.stripe.com/00w7sNgVW4eCbew1tR3AY0f",
      priceCAD: 285, urlCAD: "https://buy.stripe.com/5kQ5kF212aD0eqIfkH3AY0x",
      priceGBP: 200, urlGBP: "https://buy.stripe.com/14A28t8pq26u0zSdcz3AY11",
    },
  ],
  executive: [],
};

// Booster links per plan per currency
const BOOSTERS_DATA: Record<PlanKey, { apps: number; priceUSD: number; priceCAD: number; priceGBP: number; urlUSD: string; urlCAD: string; urlGBP: string }[]> = {
  prime: [
    { apps: 250, priceUSD: 120, priceCAD: 170, priceGBP: 95, urlUSD: "https://buy.stripe.com/dRmeVf7lm8uSaas6Ob3AY05", urlCAD: "https://buy.stripe.com/00w9AV212eTg6YgfkH3AY0n", urlGBP: "https://buy.stripe.com/eVq6oJdJK26u6Yg7Sf3AY0M" },
    { apps: 500, priceUSD: 200, priceCAD: 280, priceGBP: 160, urlUSD: "https://buy.stripe.com/28E5kF3567qObewegD3AY06", urlCAD: "https://buy.stripe.com/00w7sN2124eCdmE0pN3AY0o", urlGBP: "https://buy.stripe.com/00w9AVcFGdPcciA6Ob3AY0N" },
    { apps: 1000, priceUSD: 350, priceCAD: 490, priceGBP: 275, urlUSD: "https://buy.stripe.com/00w28t35626udmE2xV3AY07", urlCAD: "https://buy.stripe.com/00w14pcFGfXk96o7Sf3AY0p", urlGBP: "https://buy.stripe.com/eVqbJ38pq5iGeqI2xV3AY0O" },
  ],
  ignite: [
    { apps: 250, priceUSD: 130, priceCAD: 180, priceGBP: 105, urlUSD: "https://buy.stripe.com/28E7sN9tufXk6Yga0n3AY0a", urlCAD: "https://buy.stripe.com/cNi3cx49ah1odmEc8v3AY0s", urlGBP: "https://buy.stripe.com/8x2bJ3bBC12q2I0dcz3AY0S" },
    { apps: 500, priceUSD: 220, priceCAD: 305, priceGBP: 175, urlUSD: "https://buy.stripe.com/eVqaEZ5debH4fuM7Sf3AY0b", urlCAD: "https://buy.stripe.com/9B65kF9tu12qfuM0pN3AY0t", urlGBP: "https://buy.stripe.com/aFa5kF8pqdPcgyQb4r3AY0T" },
    { apps: 1000, priceUSD: 380, priceCAD: 530, priceGBP: 300, urlUSD: "https://buy.stripe.com/9B69AVfRS6mKdmEgoL3AY0c", urlCAD: "https://buy.stripe.com/9B69AV7lmbH46Yg8Wj3AY0u", urlGBP: "https://buy.stripe.com/6oU7sN212fXk3M48Wj3AY0U" },
  ],
  professional: [
    { apps: 250, priceUSD: 120, priceCAD: 170, priceGBP: 95, urlUSD: "https://buy.stripe.com/dRmeVf7lm8uSaas6Ob3AY05", urlCAD: "https://buy.stripe.com/00w9AV212eTg6YgfkH3AY0n", urlGBP: "https://buy.stripe.com/9B6bJ3bBC3ay4Q86Ob3AY0Y" },
    { apps: 500, priceUSD: 200, priceCAD: 280, priceGBP: 160, urlUSD: "https://buy.stripe.com/28E5kF3567qObewegD3AY06", urlCAD: "https://buy.stripe.com/7sYcN7eNObH41DW8Wj3AY0w", urlGBP: "https://buy.stripe.com/00w7sN8pqaD096ogoL3AY0Z" },
    { apps: 1000, priceUSD: 350, priceCAD: 490, priceGBP: 275, urlUSD: "https://buy.stripe.com/00w28t35626udmE2xV3AY07", urlCAD: "https://buy.stripe.com/00w14pcFGfXk96o7Sf3AY0p", urlGBP: "https://buy.stripe.com/fZucN7gVW12q1DWgoL3AY10" },
  ],
  executive: [
    { apps: 250, priceUSD: 110, priceCAD: 155, priceGBP: 88, urlUSD: "https://buy.stripe.com/28EfZj9tu9yW2I0goL3AY0g", urlCAD: "https://buy.stripe.com/14A8wRfRS9yWdmEb4r3AY0y", urlGBP: "https://buy.stripe.com/dRm9AV2123ayfuM3BZ3AY13" },
    { apps: 500, priceUSD: 190, priceCAD: 265, priceGBP: 150, urlUSD: "https://buy.stripe.com/fZu6oJdJK7qObew1tR3AY0h", urlCAD: "https://buy.stripe.com/5kQ6oJ356fXk1DWc8v3AY0z", urlGBP: "https://buy.stripe.com/fZufZj6hi9yW6Yg2xV3AY14" },
    { apps: 1000, priceUSD: 330, priceCAD: 460, priceGBP: 260, urlUSD: "https://buy.stripe.com/4gM5kF9tu6mK1DW3BZ3AY0i", urlCAD: "https://buy.stripe.com/eVqaEZ3565iG3M4dcz3AY0A", urlGBP: "https://buy.stripe.com/28EeVfcFG6mKaas6Ob3AY15" },
  ],
};

function normalizePlan(raw: string | undefined): PlanKey {
  const l = (raw || "").toLowerCase();
  if (l.includes("executive")) return "executive";
  if (l.includes("professional")) return "professional";
  if (l.includes("ignite")) return "ignite";
  return "prime";
}

function detectCurrency(currency: string | undefined): Currency {
  if (!currency) return "USD";
  const c = currency.toUpperCase();
  if (c === "CAD") return "CAD";
  if (c === "GBP") return "GBP";
  return "USD";
}

// Append email as prefilled_email and client_reference_id so the Stripe webhook knows who paid
function withEmail(url: string, email: string | undefined): string {
  if (!email || url === "#") return url;
  const encoded = encodeURIComponent(email);
  return `${url}?prefilled_email=${encoded}&client_reference_id=${encoded}`;
}

interface Props { open: boolean; onClose: () => void; inline?: boolean; }

export default function ChoosePlan({ open, onClose, inline = false }: Props) {
  const context = useContext(UserContext);
  const userDetails = context?.userDetails;
  const currentPlan = normalizePlan(userDetails?.planType);
  const currency = detectCurrency(userDetails?.currency);
  const email = userDetails?.email;
  const sym = CURRENCY_SYMBOL[currency];

  const upgradesRaw = UPGRADES_DATA[currentPlan] || [];
  const boostersRaw = BOOSTERS_DATA[currentPlan];

  useEffect(() => {
    if (!open || inline) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose, inline]);

  if (!open) return null;

  const inner = (
    <div className={inline ? "w-full bg-gray-50 min-h-screen" : "fixed right-0 top-0 h-full w-full max-w-xl bg-gray-50 z-50 shadow-2xl flex flex-col overflow-hidden"}>

      {/* ── Header ── */}
      <div className={PAGE_HEADER_BAR}>
        <div className={`flex items-center justify-between gap-4 py-5 ${inline ? PAGE_CONTAINER : "px-6"}`}>
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">
              {currentPlan === "executive" ? "Boost Your Plan" : "Choose a Plan"}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Currently on <span className="font-semibold text-orange-600">{PLAN_LABELS[currentPlan]}</span> · {PLAN_APPS[currentPlan].toLocaleString()} Applications
            </p>
          </div>
          {!inline && (
            <button
              onClick={onClose}
              aria-label="Close"
              className="p-2 border border-transparent hover:border-gray-900 hover:bg-gray-50 text-gray-500 hover:text-gray-900 transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div className={inline ? `${PAGE_MAIN} w-full` : "flex-1 overflow-y-auto px-6 py-6"}>
      <main className={inline ? "bg-white border border-gray-300 p-4 sm:p-6 md:p-8 space-y-8" : "space-y-8"}>

        {/* UPGRADE */}
        {upgradesRaw.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex h-6 w-6 items-center justify-center bg-orange-50 border border-orange-100 text-orange-600">
                <ArrowUpRight className="w-3.5 h-3.5" />
              </span>
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Upgrade Plan</h2>
            </div>
            <p className="text-xs text-gray-500 mb-4">Unlock more applications and premium features</p>
            <div className={`grid gap-5 ${inline ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
              {upgradesRaw.map(({ to, priceUSD, priceCAD, priceGBP, urlUSD, urlCAD, urlGBP }) => {
                const isPopular = to === "executive";
                const price = currency === "CAD" ? priceCAD : currency === "GBP" ? priceGBP : priceUSD;
                const url = withEmail(currency === "CAD" ? urlCAD : currency === "GBP" ? urlGBP : urlUSD, email);
                return (
                  <div key={to} className={`relative overflow-hidden border border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ${isPopular ? "" : "bg-white"}`}>
                    {isPopular && (
                      <div className="bg-orange-500 px-5 py-1.5 flex items-center justify-between">
                        <span className="text-white text-[11px] font-bold uppercase tracking-widest">Most Popular</span>
                        <span className="text-orange-100 text-[11px]">Best value</span>
                      </div>
                    )}
                    <div className={`p-5 ${isPopular ? "bg-orange-50/40" : "bg-white"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-lg font-extrabold text-gray-900">{PLAN_LABELS[to]}</span>
                            <span className="text-[11px] font-semibold text-white bg-gray-800 px-2 py-0.5">{PLAN_APPS[to].toLocaleString()} apps</span>
                          </div>
                          <ul className="space-y-1.5">
                            {PLAN_FEATURES[to].map((f) => (
                              <li key={f} className="flex items-center gap-1.5 text-xs text-gray-600">
                                <CheckCircle2 className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                                {f}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="flex flex-col items-end gap-3 flex-shrink-0">
                          <div className="text-right">
                            <div className="text-3xl font-extrabold text-gray-900 tabular-nums">{sym}{price}</div>
                            <div className="text-[10px] text-gray-400">upgrade price</div>
                          </div>
                          <a href={url} target="_blank" rel="noopener noreferrer"
                            className={`flex items-center gap-1 px-4 py-2 text-sm font-bold transition-colors whitespace-nowrap text-white ${isPopular ? "bg-orange-500 hover:bg-orange-600" : "bg-gray-900 hover:bg-gray-800"}`}>
                            Upgrade <ArrowUpRight className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* BOOSTER */}
        <section className={upgradesRaw.length > 0 ? "pt-8 border-t border-gray-200" : ""}>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-6 w-6 items-center justify-center bg-orange-50 border border-orange-100 text-orange-600">
              <Plus className="w-3.5 h-3.5" />
            </span>
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Booster Add-On</h2>
          </div>
          <p className="text-xs text-gray-500 mb-5">Add more applications to your {PLAN_LABELS[currentPlan]} plan — no tier change</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {boostersRaw.map(({ apps, priceUSD, priceCAD, priceGBP, urlUSD, urlCAD, urlGBP }, i) => {
              const isBest = i === 2;
              const price = currency === "CAD" ? priceCAD : currency === "GBP" ? priceGBP : priceUSD;
              const url = withEmail(currency === "CAD" ? urlCAD : currency === "GBP" ? urlGBP : urlUSD, email);
              return (
                <a key={apps} href={url} target="_blank" rel="noopener noreferrer"
                  className={`group relative flex flex-col items-center border border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] pt-6 pb-5 px-3 transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-center ${isBest ? "bg-orange-50/40" : "bg-white"}`}>
                  {isBest && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-[9px] font-bold px-2.5 py-0.5 uppercase tracking-wider whitespace-nowrap">
                      Best Value
                    </span>
                  )}
                  <span className="text-3xl font-extrabold text-gray-900 tabular-nums">+{apps}</span>
                  <span className="text-[11px] text-gray-500 mt-0.5">Applications</span>
                  <div className="w-full border-t border-gray-200 mt-4 pt-3">
                    <span className="text-xl font-extrabold text-gray-900 tabular-nums">{sym}{price}</span>
                  </div>
                  <span className={`mt-3 text-xs font-bold px-4 py-1 border transition-colors ${isBest ? "bg-orange-500 text-white border-orange-500 group-hover:bg-orange-600" : "bg-white text-gray-900 border-gray-900 group-hover:bg-gray-900 group-hover:text-white"}`}>
                    Add On
                  </span>
                </a>
              );
            })}
          </div>
        </section>

        {/* Footer */}
        <p className="text-xs text-gray-500 text-center pt-6 pb-1 border-t border-gray-200">
          All plans include <span className="font-semibold text-gray-600">no time constraint</span> — applications run until completed.
        </p>
      </main>
      </div>
    </div>
  );

  if (inline) return inner;
  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      {inner}
    </>
  );
}
