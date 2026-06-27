import type React from "react";
import { useEffect, useRef, useContext, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import {
  Home,
  Briefcase,
  FileText,
  User,
  LogOut,
  Menu,
  X,
  Settings,
  Gift,
  Mail,
} from "lucide-react";
import { UserContext } from "../state_management/UserContext.tsx";
import { useUserProfile } from "../state_management/ProfileContext.tsx";
import { useOperationsStore } from "../state_management/Operations.ts";
import { useDownloadHighlightStore } from "../state_management/DownloadHighlightStore.ts";
import { toastUtils, toastMessages } from "../utils/toast.ts";
import ReferAndEarnCard from "./ReferAndEarnCard.tsx";

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  setUserProfileFormVisibility?: any;
}

interface TabItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  setUserProfileFormVisibility,
}) => {
  const navigate = useNavigate();
  const ctx = useContext(UserContext);
  const userDetails = ctx?.userDetails;
  const [user, setUser] = useState(userDetails?.name || "");
  const [menuOpen, setMenuOpen] = useState(false);
  const [showRemovedJobsModal, setShowRemovedJobsModal] = useState(false);
  const [removedJobsCount, setRemovedJobsCount] = useState<number | null>(null);
  const [removedJobsLoading, setRemovedJobsLoading] = useState(false);
  const [removedJobsError, setRemovedJobsError] = useState<string | null>(null);
  const [removalLimit, setRemovalLimit] = useState<number>(100);
  const [extraInput, setExtraInput] = useState<string>("");
  const [savingLimit, setSavingLimit] = useState(false);
  const [limitSaveMsg, setLimitSaveMsg] = useState<string | null>(null);
  const [showReferAndEarnCard, setShowReferAndEarnCard] = useState(false);

  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const { userProfile } = useUserProfile();
  const { role, reset: resetOperationsStore } = useOperationsStore();
  const { triggerHighlight } = useDownloadHighlightStore();
  const isOpsRole = role === "operations" || role === "operator";
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTargetRef = useRef<string | null>(null);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

  const openRemovedJobsModal = async () => {
    if (role !== "operations") return;
    const email = userDetails?.email;
    if (!email || !API_BASE) {
      setRemovedJobsError("User email or API URL not available.");
      setRemovedJobsCount(null);
      setShowRemovedJobsModal(true);
      return;
    }
    setShowRemovedJobsModal(true);
    setRemovedJobsLoading(true);
    setRemovedJobsError(null);
    setRemovedJobsCount(null);
    setLimitSaveMsg(null);
    try {
      const res = await fetch(`${API_BASE}/get-removed-jobs-count`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
      const extra = Number(data?.extraRemovalLimit ?? 0);
      setRemovedJobsCount(Number(data?.removedJobsCount ?? 0));
      setRemovalLimit(Number(data?.removalLimit ?? 100 + extra));
      setExtraInput(extra ? String(extra) : "");
    } catch (e: any) {
      setRemovedJobsError(e?.message || "Failed to load removed jobs count.");
    } finally {
      setRemovedJobsLoading(false);
    }
  };

  const saveRemovalLimit = async () => {
    const email = userDetails?.email;
    if (!email || !API_BASE) { setLimitSaveMsg("User email or API URL not available."); return; }
    const bonus = Number(extraInput);
    if (!Number.isFinite(bonus) || bonus < 0) { setLimitSaveMsg("Enter a valid non-negative number."); return; }
    setSavingLimit(true);
    setLimitSaveMsg(null);
    try {
      const res = await fetch(`${API_BASE}/update-removal-limit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, extraRemovalLimit: Math.floor(bonus) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
      const extra = Number(data?.extraRemovalLimit ?? Math.floor(bonus));
      setRemovalLimit(Number(data?.removalLimit ?? 100 + extra));
      setExtraInput(extra ? String(extra) : "");
      setLimitSaveMsg("Saved.");
    } catch (e: any) {
      setLimitSaveMsg(e?.message || "Failed to update removal limit.");
    } finally {
      setSavingLimit(false);
    }
  };

  const handleLongPressStart = (tabId: string) => {
    if (tabId === "jobs" && (role === "operator" || role === "operations")) {
      longPressTargetRef.current = tabId;
      longPressTimerRef.current = setTimeout(() => { triggerHighlight(); longPressTargetRef.current = null; }, 1500);
    }
    if (tabId === "optimizer" && role === "operations") {
      longPressTargetRef.current = tabId;
      longPressTimerRef.current = setTimeout(() => { openRemovedJobsModal(); longPressTargetRef.current = null; }, 1500);
    }
  };

  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
    longPressTargetRef.current = null;
  };

  useEffect(() => {
    return () => { if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current); };
  }, []);

  const tabs: TabItem[] = [
    { id: "dashboard", label: "Overview", icon: Home },
    { id: "jobs", label: "Job tracker", icon: Briefcase },
    { id: "optimizer", label: "Document", icon: FileText },
    ...(isOpsRole ? [{ id: "mail", label: "Mail", icon: Mail }] : []),
    ...(isOpsRole ? [{ id: "operations", label: "Operations", icon: Settings }] : []),
  ];

  useEffect(() => { setUser(userDetails?.name || ""); }, [userDetails]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const clickedInsideMobileMenu = !!mobileMenuRef.current && mobileMenuRef.current.contains(target);
      const clickedOnTrigger = !!target.closest("[data-nav-trigger]");
      if (!clickedInsideMobileMenu && !clickedOnTrigger) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSwitchUser = () => {
    localStorage.removeItem("userAuth");
    toastUtils.success("Switching to operations view...");
    navigate("/manage");
  };

  const handleLogout = () => {
    resetOperationsStore();
    localStorage.clear();
    sessionStorage.clear();
    setUser("");
    toastUtils.success(toastMessages.logoutSuccess);
    navigate("/login");
  };

  const handleLogin = () => navigate("/login");

  return (
    <>
      {/* Removed Jobs Modal (ops only) */}
      {showRemovedJobsModal && role === "operations" && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowRemovedJobsModal(false); }}
        >
          <div className="w-full max-w-md max-h-[90vh] flex flex-col bg-white shadow-xl border border-gray-200 overflow-hidden">
            <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="font-semibold text-gray-900">Removed Jobs</div>
              <button className="p-2 hover:bg-gray-100 transition-colors" onClick={() => setShowRemovedJobsModal(false)}>
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="px-5 py-4 overflow-y-auto">
              <div className="text-sm text-gray-600 mb-3">
                {userDetails?.email
                  ? <span>User: <span className="font-medium text-gray-900">{userDetails.email}</span></span>
                  : <span>User: <span className="font-medium text-gray-900">Unknown</span></span>}
              </div>
              {removedJobsLoading ? (
                <div className="text-sm text-gray-700">Loading…</div>
              ) : removedJobsError ? (
                <div className="text-sm text-red-600">{removedJobsError}</div>
              ) : (
                <>
                  <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3 text-sm text-gray-800">
                    User removed{" "}
                    <span className="font-bold text-gray-900 text-base">{removedJobsCount ?? 0}</span>{" "}
                    of{" "}
                    <span className="font-bold text-gray-900 text-base">{removalLimit}</span> allowed.
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Extra removals (on top of base 100)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number" min={0} value={extraInput}
                        onChange={(e) => { setExtraInput(e.target.value); setLimitSaveMsg(null); }}
                        placeholder="e.g. 50"
                        className="w-32 px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
                      />
                      <button type="button" disabled={savingLimit} onClick={saveRemovalLimit}
                        className="px-3 py-2 bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50">
                        {savingLimit ? "Saving…" : "Set cap"}
                      </button>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      New cap will be{" "}
                      <span className="font-semibold text-gray-700">
                        {100 + (Number(extraInput) > 0 ? Math.floor(Number(extraInput)) : 0)}
                      </span> removals.
                    </div>
                    {limitSaveMsg && (
                      <div className={`mt-2 text-xs ${limitSaveMsg === "Saved." ? "text-green-600" : "text-red-600"}`}>
                        {limitSaveMsg}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="flex-shrink-0 px-5 py-4 border-t border-gray-100 flex justify-end">
              <button className="px-4 py-2 bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors" onClick={() => setShowRemovedJobsModal(false)}>
                OK
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ========== DESKTOP SIDEBAR ========== */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-56 bg-white border-r border-gray-200 flex-col z-40">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-gray-100">
          <img src="./logo2.png" alt="FlashFire" className="w-8 h-8 object-contain flex-shrink-0" />
          <span className="text-base font-extrabold text-orange-500 tracking-wide">FLASHFIRE</span>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-3 pt-4 space-y-0.5 overflow-y-auto">
          {tabs.map(({ id, label, icon: Icon }) => (
            <Link
              key={id}
              to="/"
              onClick={() => onTabChange(id)}
              onMouseDown={() => handleLongPressStart(id)}
              onMouseUp={handleLongPressEnd}
              onMouseLeave={handleLongPressEnd}
              onTouchStart={() => handleLongPressStart(id)}
              onTouchEnd={handleLongPressEnd}
              className={`flex items-center gap-3 py-2.5 text-sm font-medium transition-colors ${
                activeTab === id
                  ? "border-2 border-orange-500 bg-orange-50 text-orange-600 px-3"
                  : "px-3 text-gray-600 border border-transparent hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          ))}
          <Link
            to="/profile"
            className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-600 border border-transparent hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 transition-colors"
          >
            <User className="w-4 h-4 flex-shrink-0" />
            Profile
          </Link>
        </nav>

        {/* Bottom actions */}
        <div className="px-3 pb-5 space-y-1">
          {user && (
            <button
              onClick={() => setShowReferAndEarnCard(true)}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white border border-orange-500 hover:border-orange-400 transition-colors"
            >
              <Gift className="w-4 h-4 flex-shrink-0" />
              Refer n Earn
            </button>
          )}
          {user ? (
            role === "operations" ? (
              <button
                onClick={handleSwitchUser}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-600 border border-transparent hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 transition-colors"
              >
                <LogOut className="w-4 h-4 flex-shrink-0" />
                Switch Client
              </button>
            ) : (
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-600 border border-transparent hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 transition-colors"
              >
                <LogOut className="w-4 h-4 flex-shrink-0" />
                Logout
              </button>
            )
          ) : (
            <button
              onClick={handleLogin}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-600 border border-transparent hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 transition-colors"
            >
              <User className="w-4 h-4 flex-shrink-0" />
              Sign In
            </button>
          )}
        </div>
      </aside>

      {/* ========== MOBILE TOP NAV ========== */}
      <nav className="md:hidden bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2">
            <img src="./logo2.png" alt="FlashFire" className="w-8 h-8 object-contain" />
            <span className="text-base font-extrabold text-orange-500">FLASHFIRE</span>
          </div>
          <div className="flex items-center gap-2">
            {user && (
              <button
                onClick={() => { setShowReferAndEarnCard(true); setMenuOpen(false); }}
                className="p-2 bg-orange-500 text-white"
                title="Refer & Earn"
              >
                <Gift className="w-4 h-4" />
              </button>
            )}
            <button
              data-nav-trigger
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-colors"
            >
              {menuOpen ? <X className="w-5 h-5 text-gray-700" /> : <Menu className="w-5 h-5 text-gray-700" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div ref={mobileMenuRef} className="absolute top-14 left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-50">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => { onTabChange(id); setMenuOpen(false); }}
                onMouseDown={() => handleLongPressStart(id)}
                onMouseUp={handleLongPressEnd}
                onTouchStart={() => handleLongPressStart(id)}
                onTouchEnd={handleLongPressEnd}
                className={`w-full flex items-center gap-3 px-5 py-3 text-sm font-medium text-left transition-colors ${
                  activeTab === id
                    ? "border-2 border-orange-500 bg-orange-50 text-orange-600"
                    : "text-gray-600 border border-transparent hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
            <Link
              to="/profile"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-5 py-3 text-sm font-medium text-gray-600 border border-transparent hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 transition-colors"
            >
              <User className="w-4 h-4" />
              Profile
            </Link>
            {user && (
              <button
                onClick={() => { handleLogout(); setMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-5 py-3 text-sm font-medium text-gray-600 border-t border-gray-100 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            )}
          </div>
        )}
      </nav>

      <ReferAndEarnCard isOpen={showReferAndEarnCard} onClose={() => setShowReferAndEarnCard(false)} />
    </>
  );
};

export default Navigation;
