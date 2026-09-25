import type React from "react";
import { useEffect, useRef, useContext, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ListChecks,
  FileStack,
  CircleUserRound,
  DoorOpen,
  Users,
  Menu,
  X,
  Settings,
  Handshake,
  Mail,
  PanelLeftClose,
  PanelLeftOpen,
  Edit2,
  Rocket,
} from "lucide-react";
import { UserContext } from "../state_management/UserContext.tsx";
import { useUserProfile } from "../state_management/ProfileContext.tsx";
import { useOperationsStore } from "../state_management/Operations.ts";
import { useDownloadHighlightStore } from "../state_management/DownloadHighlightStore.ts";
import { useSidebarStore } from "../state_management/SidebarStore.ts";
import { toastUtils, toastMessages } from "../utils/toast.ts";
import type { DocumentCategoryId, NavigationProps } from "../types/navigation.ts";

// Client-facing navigation: the collapsible sidebar. Operators get the
// familiar top bar in NavigationOps.tsx instead; Navigation.tsx dispatches.
interface TabItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

const NavigationClient: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  setUserProfileFormVisibility,
  documentCategory = null,
  onDocumentCategoryChange,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isProfileRoute = location.pathname === "/profile";
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

  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const { userProfile } = useUserProfile();
  const hasProfile = !!userProfile?.email;
  const { role, reset: resetOperationsStore } = useOperationsStore();
  const { triggerHighlight } = useDownloadHighlightStore();
  const { isOpen: sidebarOpen, toggle: toggleSidebar } = useSidebarStore();
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
    } catch (e) {
      setRemovedJobsError(e instanceof Error ? e.message : "Failed to load removed jobs count.");
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
    } catch (e) {
      setLimitSaveMsg(e instanceof Error ? e.message : "Failed to update removal limit.");
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
    { id: "dashboard", label: "Overview", icon: LayoutDashboard },
    { id: "jobs", label: "Job Tracker", icon: ListChecks },
    { id: "optimizer", label: "Document", icon: FileStack },
    ...(isOpsRole ? [{ id: "mail", label: "Mail", icon: Mail }] : []),
    ...(isOpsRole ? [{ id: "operations", label: "Operations", icon: Settings }] : []),
  ];

  const documentSubItems: { id: DocumentCategoryId; label: string }[] = [
    { id: "base", label: "Base Resume" },
    { id: "optimized", label: "Optimized Resumes" },
    { id: "cover", label: "Cover Letters" },
    { id: "transcript", label: "Transcripts" },
    ...(isOpsRole ? [{ id: "portfolio" as DocumentCategoryId, label: "Portfolio" }] : []),
  ];

  const selectDocumentCategory = (category: DocumentCategoryId | null) => {
    onTabChange("optimizer");
    onDocumentCategoryChange?.(category);
  };

  // Builds a link back to the main dashboard route that also encodes which
  // tab (and, for Documents, which category) to land on. This matters when
  // navigating from a different route (e.g. /profile, /inbox) since those
  // pages mount their own Navigation instance with its own throwaway
  // activeTab state — MainContent needs the query params to pick up the
  // intended tab on mount instead of always defaulting to "dashboard".
  const tabHref = (id: string, doc?: string | null) => {
    const params = new URLSearchParams({ tab: id });
    if (doc) params.set("doc", doc);
    return `/?${params.toString()}`;
  };

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

  // Clients who never finished onboarding need a way back into the setup modal.
  // Routes that mount their own Navigation (e.g. /profile) pass no setter, so
  // fall back to the profile page there.
  const handleSetupProfile = () => {
    setMenuOpen(false);
    if (setUserProfileFormVisibility) {
      setUserProfileFormVisibility(true);
    } else {
      navigate("/profile");
    }
  };

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
      <aside
        className={`hidden md:flex fixed inset-y-0 left-0 w-56 bg-white border-r border-gray-200 flex-col z-40 transition-transform duration-200 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Collapse toggle tab */}
        <button
          onClick={toggleSidebar}
          title="Collapse sidebar"
          className="hidden md:flex absolute bottom-6 -right-3.5 w-7 h-7 items-center justify-center bg-white border border-gray-200 rounded-full text-gray-500 hover:text-orange-600 hover:border-orange-300 shadow-sm transition-colors"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>

        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-gray-100">
          <img src="./logo2.png" alt="FlashFire" className="w-8 h-8 object-contain flex-shrink-0" />
          <span className="text-base font-extrabold text-orange-500 tracking-wide">FLASHFIRE</span>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-3 pt-4 space-y-0.5 overflow-y-auto">
          {tabs.map(({ id, label, icon: Icon }) => {
            if (id === "optimizer") {
              const docActive = activeTab === "optimizer" && !documentCategory;
              return (
                <div key={id}>
                  <Link
                    to={tabHref("optimizer")}
                    onClick={() => { selectDocumentCategory(null); }}
                    className={`flex items-center gap-3 py-2.5 text-sm font-medium transition-colors ${
                      docActive && !isProfileRoute
                        ? "border-2 border-orange-500 bg-orange-50 text-orange-600 px-3"
                        : "px-3 text-gray-600 border-2 border-transparent hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600"
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {label}
                  </Link>
                  {activeTab === "optimizer" && !isProfileRoute && (
                    <div className="mt-0.5 ml-4 space-y-0.5 border-l border-gray-200 pl-3">
                      {documentSubItems.map((sub) => (
                        <Link
                          key={sub.id}
                          to={tabHref("optimizer", sub.id)}
                          onClick={() => selectDocumentCategory(sub.id)}
                          className={`block border-l-2 py-2 pl-2 text-sm font-medium transition-colors ${
                            documentCategory === sub.id
                              ? "border-orange-500 text-orange-600"
                              : "border-transparent text-gray-600 hover:text-orange-600"
                          }`}
                        >
                          {sub.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={id}
                to={tabHref(id)}
                onClick={() => { onTabChange(id); }}
                onMouseDown={() => handleLongPressStart(id)}
                onMouseUp={handleLongPressEnd}
                onMouseLeave={handleLongPressEnd}
                onTouchStart={() => handleLongPressStart(id)}
                onTouchEnd={handleLongPressEnd}
                className={`flex items-center gap-3 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === id && !isProfileRoute
                    ? "border-2 border-orange-500 bg-orange-50 text-orange-600 px-3"
                    : "px-3 text-gray-600 border-2 border-transparent hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600"
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </Link>
            );
          })}
          <Link
            to="/profile"
            className={`flex items-center gap-3 py-2.5 text-sm font-medium transition-colors ${
              isProfileRoute
                ? "border-2 border-orange-500 bg-orange-50 text-orange-600 px-3"
                : "px-3 text-gray-600 border-2 border-transparent hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600"
            }`}
          >
            <CircleUserRound className="w-4 h-4 flex-shrink-0" />
            Profile
          </Link>
          {user && !hasProfile && (
            <button
              onClick={handleSetupProfile}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 hover:border-amber-300 hover:bg-amber-100 transition-colors"
            >
              <Edit2 className="w-4 h-4 flex-shrink-0" />
              Set up profile
            </button>
          )}
        </nav>

        {/* Bottom actions */}
        <div className="px-3 pb-5 space-y-1">
          {user && (
            <Link
              to={tabHref("upgrade")}
              onClick={() => onTabChange("upgrade")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold border-2 border-orange-500 transition-colors ${
                activeTab === "upgrade" && !isProfileRoute
                  ? "bg-orange-500 text-white"
                  : "text-orange-500 hover:bg-orange-500 hover:text-white"
              }`}
            >
              <Rocket className="w-4 h-4 flex-shrink-0" />
              Upgrade
            </Link>
          )}
          {user && (
            <Link
              to={tabHref("refer")}
              onClick={() => { onTabChange("refer"); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold border transition-colors ${
                activeTab === "refer" && !isProfileRoute
                  ? "bg-orange-600 border-orange-600 text-white"
                  : "bg-orange-500 hover:bg-orange-600 text-white border-orange-500 hover:border-orange-400"
              }`}
            >
              <Handshake className="w-4 h-4 flex-shrink-0" />
              Refer n Earn
            </Link>
          )}
          {user ? (
            role === "operations" ? (
              <button
                onClick={handleSwitchUser}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-600 border-2 border-transparent hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 transition-colors"
              >
                <Users className="w-4 h-4 flex-shrink-0" />
                Switch Client
              </button>
            ) : (
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-600 border-2 border-transparent hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 transition-colors"
              >
                <DoorOpen className="w-4 h-4 flex-shrink-0" />
                Logout
              </button>
            )
          ) : (
            <button
              onClick={handleLogin}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-600 border-2 border-transparent hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 transition-colors"
            >
              <CircleUserRound className="w-4 h-4 flex-shrink-0" />
              Sign In
            </button>
          )}
        </div>
      </aside>

      {/* Reopen tab — visible only when the desktop sidebar is collapsed */}
      {!sidebarOpen && (
        <button
          onClick={toggleSidebar}
          title="Expand sidebar"
          className="hidden md:flex fixed bottom-6 left-0 w-7 h-7 items-center justify-center bg-white border border-gray-200 rounded-r-full text-gray-500 hover:text-orange-600 hover:border-orange-300 shadow-sm z-40 transition-colors"
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>
      )}

      {/* ========== MOBILE TOP NAV ========== */}
      <nav className="md:hidden bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2">
            <img src="./logo2.png" alt="FlashFire" className="w-8 h-8 object-contain" />
            <span className="text-base font-extrabold text-orange-500">FLASHFIRE</span>
          </div>
          <div className="flex items-center gap-2">
            {user && (
              <Link
                to={tabHref("upgrade")}
                onClick={() => { onTabChange("upgrade"); setMenuOpen(false); }}
                className="p-2 border-2 border-orange-500 text-orange-500"
                title="Upgrade"
              >
                <Rocket className="w-4 h-4" />
              </Link>
            )}
            {user && (
              <Link
                to={tabHref("refer")}
                onClick={() => { onTabChange("refer"); setMenuOpen(false); }}
                className="p-2 bg-orange-500 text-white"
                title="Refer & Earn"
              >
                <Handshake className="w-4 h-4" />
              </Link>
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
            {tabs.map(({ id, label, icon: Icon }) => {
              if (id === "optimizer") {
                const docActive = activeTab === "optimizer" && !documentCategory;
                return (
                  <div key={id}>
                    <Link
                      to={tabHref("optimizer")}
                      onClick={() => selectDocumentCategory(null)}
                      className={`w-full flex items-center gap-3 px-5 py-3 text-sm font-medium text-left transition-colors ${
                        docActive && !isProfileRoute
                          ? "border-2 border-orange-500 bg-orange-50 text-orange-600"
                          : "text-gray-600 border-2 border-transparent hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </Link>
                    {activeTab === "optimizer" && !isProfileRoute && (
                      <div className="border-t border-gray-100 bg-gray-50 py-1">
                        {documentSubItems.map((sub) => (
                          <Link
                            key={sub.id}
                            to={tabHref("optimizer", sub.id)}
                            onClick={() => { selectDocumentCategory(sub.id); setMenuOpen(false); }}
                            className={`block w-full border-l-2 py-2 pl-9 pr-5 text-left text-sm font-medium transition-colors ${
                              documentCategory === sub.id
                                ? "border-orange-500 text-orange-600"
                                : "border-transparent text-gray-600 hover:text-orange-600"
                            }`}
                          >
                            {sub.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={id}
                  to={tabHref(id)}
                  onClick={() => { onTabChange(id); setMenuOpen(false); }}
                  onMouseDown={() => handleLongPressStart(id)}
                  onMouseUp={handleLongPressEnd}
                  onTouchStart={() => handleLongPressStart(id)}
                  onTouchEnd={handleLongPressEnd}
                  className={`w-full flex items-center gap-3 px-5 py-3 text-sm font-medium text-left transition-colors ${
                    activeTab === id && !isProfileRoute
                      ? "border-2 border-orange-500 bg-orange-50 text-orange-600"
                      : "text-gray-600 border-2 border-transparent hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              );
            })}
            <Link
              to="/profile"
              onClick={() => setMenuOpen(false)}
              className={`flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors ${
                isProfileRoute
                  ? "border-2 border-orange-500 bg-orange-50 text-orange-600"
                  : "text-gray-600 border-2 border-transparent hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600"
              }`}
            >
              <CircleUserRound className="w-4 h-4" />
              Profile
            </Link>
            {user && !hasProfile && (
              <button
                onClick={handleSetupProfile}
                className="w-full flex items-center gap-3 px-5 py-3 text-sm font-medium text-amber-700 bg-amber-50 border-y border-amber-200 hover:bg-amber-100 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                Set up profile
              </button>
            )}
            {user && (
              <button
                onClick={() => { handleLogout(); setMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-5 py-3 text-sm font-medium text-gray-600 border-t border-gray-100 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 transition-colors"
              >
                <DoorOpen className="w-4 h-4" />
                Logout
              </button>
            )}
          </div>
        )}
      </nav>
    </>
  );
};

export default NavigationClient;
