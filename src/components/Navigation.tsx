import type React from "react";
import { useEffect, useRef, useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Home,
  Briefcase,
  FileText,
  User,
  LogOut,
  ChevronDown,
  Edit2Icon,
  Mail,
  CreditCard,
  Menu,
  X,
} from "lucide-react";
import { UserContext } from "../state_management/UserContext.tsx";
import { useUserProfile } from "../state_management/ProfileContext";
import { useOperationsStore } from "../state_management/Operations.ts";
import { toastUtils, toastMessages } from "../utils/toast";
import GuidePopup from "./GuidePopup";

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  setUserProfileFormVisibility?: any; // Optional now
}

interface TabItem {
  id: string;
  label: string;
  icon: React.ElementType;
  className: string;
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
  const [profileDropDown, setProfileDropDown] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showProfileGuide, setShowProfileGuide] = useState(false);
  const [blurBackground, setBlurBackground] = useState(false);


  // Refs
  const desktopDropdownRef = useRef<HTMLDivElement>(null);   // desktop profile dropdown area
  const mobileProfileRef = useRef<HTMLDivElement>(null);      // mobile profile dropdown container
  const mobileMenuRef = useRef<HTMLDivElement>(null);         // mobile menu dropdown container

  const { userProfile } = useUserProfile();
  const { role } = useOperationsStore();
  const hasProfile = !!userProfile?.email;

  const tabs: TabItem[] = [
    { id: "dashboard", label: "Dashboard", icon: Home, className: "nav-dashboard active" },
    { id: "jobs", label: "Job Tracker", icon: Briefcase , className: "nav-job-tracker" },
    { id: "optimizer", label: "Documents", icon: FileText, className: "nav-documents" },
  ];

  useEffect(() => {
    setUser(userDetails?.name || "");
  }, [userDetails]);

  // CLICK-OUTSIDE: keep dropdowns open when clicking inside them or on triggers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      const clickedInsideDesktop =
        !!desktopDropdownRef.current &&
        desktopDropdownRef.current.contains(target);

      const clickedInsideMobileProfile =
        !!mobileProfileRef.current &&
        mobileProfileRef.current.contains(target);

      const clickedInsideMobileMenu =
        !!mobileMenuRef.current &&
        mobileMenuRef.current.contains(target);

      const clickedOnTrigger = !!target.closest("[data-nav-trigger]");

      if (
        !clickedInsideDesktop &&
        !clickedInsideMobileProfile &&
        !clickedInsideMobileMenu &&
        !clickedOnTrigger
      ) {
        setProfileDropDown(false);
        setMenuOpen(false);
      }
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
    localStorage.clear();
    sessionStorage.clear();
    setUser("");
    toastUtils.success(toastMessages.logoutSuccess);
    navigate("/login");
  };

  const handleLogin = () => navigate("/login");

  const getInitials = (name: string) => {
    if (!name || typeof name !== 'string') return "U";
    const trimmed = name.trim();
    if (!trimmed) return "U";
    const parts = trimmed.split(" ");
    if (parts.length === 1) {
      return parts[0] && parts[0][0] ? parts[0][0].toUpperCase() : "U";
    }
    const first = parts[0] && parts[0][0] ? parts[0][0].toUpperCase() : "";
    const second = parts[1] && parts[1][0] ? parts[1][0].toUpperCase() : "";
    return first + second || "U";
  };

  return (
    <>
      <nav className="bg-card border-b border-border sticky top-0 z-50 backdrop-blur-[10px] bg-card/90">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center shadow-lg">
                {/* <FileText className="w-7 h-7 text-white" /> */}
                <img src="./Logo.png" alt="" className='rounded-xl' />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  FLASHFIRE
                </h1>
                <p className="text-xs text-gray-500 font-medium -mt-1">Complete Workflow Optimization</p>
              </div>
            </div>
            {/* Desktop Tabs */}
            <div className="hidden md:flex items-center gap-4">
              {tabs.map(({ id, label, icon: Icon, className }) => (
                <Link
                  key={id}
                  to="/"
                  onClick={() => onTabChange(id)}
                  className={`relative flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 overflow-hidden group ${activeTab === id
                    ? "bg-gradient-to-r from-orange-500 to-red-500 text-white border shadow-md"
                    : " text-gray-700 hover:text-gray-900 hover:bg-gray-200  hover:shadow hover:scale-[1.02] active:scale-[0.98]"
                    } ${className}`}
                >
                  <Icon
                    className={`w-4 h-4 relative z-10 ${activeTab === id ? "text-gray" : "group-hover:text-gray"
                      }`}
                  />
                  <span
                    className={`hidden sm:block relative z-10 ${activeTab === id ? "text-gray" : "group-hover:text-gray"
                      }`}
                  >
                    {label}
                  </span>
                </Link>
              ))}
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-3">
              {/* Mobile Buttons */}
              <div className="flex md:hidden items-center gap-2">
                <button
                  data-nav-trigger
                  onClick={() => {
                    setMenuOpen(!menuOpen);
                    setProfileDropDown(false);
                  }}
                  className="p-2 rounded-md border border-border/50 hover:bg-orange-50 transition-all duration-200"
                >
                  {menuOpen ? (
                    <X className="w-5 h-5 text-gray-700" />
                  ) : (
                    <Menu className="w-5 h-5 text-gray-700" />
                  )}
                </button>

                {user && (
                  <button
                    data-nav-trigger
                    onClick={() => {
                      setProfileDropDown(!profileDropDown);
                      setMenuOpen(false);
                    }}
                    className={`${'.nav-profile'} w-9 h-9 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center text-white font-bold text-sm shadow hover:opacity-90 transition-all`}
                  >
                    {getInitials(user)}
                  </button>
                )}
              </div>

              {/* Desktop Profile Section */}
              {user ? (
                <div className={` relative hidden md:block`} ref={desktopDropdownRef}>
                  <button
                    onClick={() => {
                      setProfileDropDown(!profileDropDown);
                      const hasSeenProfileGuide = localStorage.getItem("profileGuideSeen");
                      if (!hasSeenProfileGuide) {
                        setShowProfileGuide(true);
                        setBlurBackground(true);
                      }
                    }}

                    className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-all duration-200 border border-gray-200"
                  >
                    <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center shadow">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <div className="hidden md:block text-left">
                      <p className="text-sm font-semibold text-gray-700">{user}</p>
                      <p className="text-xs text-gray-500">Account</p>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${profileDropDown ? 'rotate-180' : ''}`} />
                  </button>

                  {profileDropDown && (
                    <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 py-6 px-6 z-50">
                      {/* Arrow */}
                      <div className="absolute -top-2 right-8 w-4 h-4 bg-white border-l border-t border-gray-200 transform rotate-45"></div>

                      {/* User Header */}
                      <Link to="/profile" target="_blank" rel="noopener noreferrer">
                        <div className="flex items-center space-x-4 pb-6 border-b border-gray-100">
                          <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg">
                            <User className="w-7 h-7 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="text-lg font-bold text-gray-900">{user}</p>
                            <p className="text-sm text-gray-500 underline">View Profile</p>
                          </div>
                        </div>
                      </Link>
                      {/* User Details */}
                      {role == "operations" ? null : (
                        <div className="py-6 space-y-4">
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                              Email Address
                            </p>
                            <p className="text-sm text-gray-900 font-medium bg-gray-50 px-3 py-2 rounded-lg">
                              {userDetails?.email}
                            </p>
                          </div>
                          {/* <div className='flex justify-between'> */}
                          {!hasProfile && (
                            <div
                              className="w-fit"
                              onClick={() =>
                                setUserProfileFormVisibility(
                                  true
                                )
                              }
                            >
                              <div className="hover:cursor-pointer inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-amber-50 to-yellow-200 text-amber-700 border-2 border-amber-200">
                                <Edit2Icon className="h-3 w-3 m-2" />{" "}
                                Edit/ Setup Profile
                              </div>
                            </div>
                          )}
                          {/* <Link to="/profile" target="_blank" rel="noopener noreferrer">
                          <h1><User2Icon /></h1>
                        </Link> */}

                          {role == "operations" ? null : (
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                Current Plan
                              </p>
                              <div className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 border-2 border-amber-200">
                                <div className="w-2 h-2 bg-amber-500 rounded-full mr-3"></div>
                                {userDetails?.planType ||
                                  "Free"}
                              </div>
                            </div>
                          )}

                          {/* Dashboard Manager Dropdown - HIDDEN */}
                          {/* {role == "operations" ? null : (
                          <div className="space-y-3">
                            Dashboard Manager section is now hidden
                          </div>
                        )} */}
                        </div>
                      )}

                      {/* Action Buttons */}
                      {role == "operations" ? (
                        <div className="pt-6 border-t border-gray-100 space-y-2">
                          <button
                            onClick={handleSwitchUser}
                            className="flex items-center space-x-3 w-full px-4 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                          >
                            <LogOut className="w-4 h-4" />
                            <span>Switch Client</span>
                          </button>
                        </div>
                      ) : (
                        <div className="pt-6 border-t border-gray-100 space-y-2">
                          <button
                            onClick={handleLogout}
                            className="flex items-center space-x-3 w-full px-4 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                          >
                            <LogOut className="w-4 h-4" />
                            <span>Sign Out</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={handleLogin}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg font-semibold transition-all duration-200 shadow"
                >
                  <User className="w-4 h-4" />
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Absolute Mobile Menu */}
        {menuOpen && (
          <div
            ref={mobileMenuRef}
            className="absolute top-16 right-3 w-48 bg-white rounded-xl shadow-lg border border-gray-200 z-50 animate-fade-in md:hidden"
          >
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => {
                  onTabChange(id);
                  setMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-5 py-3 text-sm font-medium text-left transition-all ${activeTab === id
                  ? "bg-gradient-to-r from-orange-100 to-red-100 text-gray-900"
                  : "text-gray-600 hover:bg-gray-50"
                  }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Absolute Mobile Profile Dropdown */}
        {profileDropDown && (
          <div
            ref={mobileProfileRef}
            className="absolute top-16 right-3 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 animate-fade-in p-5 space-y-5 md:hidden"
          >
            <div className="absolute -top-2 right-8 w-4 h-4 bg-white border-l border-t border-gray-200 transform rotate-45"></div>

            <Link to="/profile" target="_blank" rel="noopener noreferrer">
              <div className="flex items-center space-x-4 pb-6 border-b border-gray-100">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <User className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-lg font-bold text-gray-900">{user}</p>
                  <p className="text-sm text-gray-500 underline">View Profile</p>
                </div>
              </div>
            </Link>
            {/* User Details */}
            {role == "operations" ? null : (
              <div className="py-6 space-y-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Email Address
                  </p>
                  <p className="text-sm text-gray-900 font-medium bg-gray-50 px-3 py-2 rounded-lg">
                    {userDetails?.email}
                  </p>
                </div>
                {/* <div className='flex justify-between'> */}
                {!hasProfile && (
                  <div
                    className="w-fit"
                    onClick={() =>
                      setUserProfileFormVisibility(
                        true
                      )
                    }
                  >
                    <div className="hover:cursor-pointer inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-amber-50 to-yellow-200 text-amber-700 border-2 border-amber-200">
                      <Edit2Icon className="h-3 w-3 m-2" />{" "}
                      Edit/ Setup Profile
                    </div>
                  </div>
                )}
                {/* <Link to="/profile" target="_blank" rel="noopener noreferrer">
  <h1><User2Icon /></h1>
</Link> */}

                {role == "operations" ? null : (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      Current Plan
                    </p>
                    <div className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 border-2 border-amber-200">
                      <div className="w-2 h-2 bg-amber-500 rounded-full mr-3"></div>
                      {userDetails?.planType ||
                        "Free"}
                    </div>
                  </div>
                )}

                {/* Dashboard Manager Dropdown - HIDDEN */}
                {/* {role == "operations" ? null : (
                          <div className="space-y-3">
                            Dashboard Manager section is now hidden
                          </div>
                        )} */}
              </div>
            )}

            {/* Action Buttons */}
            {role == "operations" ? (
              <div className="pt-6 border-t border-gray-100 space-y-2">
                <button
                  onClick={handleSwitchUser}
                  className="flex items-center space-x-3 w-full px-4 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Switch Client</span>
                </button>
              </div>
            ) : (
              <div className="pt-6 border-t border-gray-100 space-y-2">
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-3 w-full px-4 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        )}

      </nav>
      {showProfileGuide && (
      <GuidePopup
        title="Profile"
        message="👤 Manage your personal details, view your plan, and update your profile settings easily here."
        onExit={() => {
          setShowProfileGuide(false);
          setBlurBackground(false);
          localStorage.setItem("profileGuideSeen", "true");
        }}
        position="profile"
      />
    )}
    </>
  );
};

export default Navigation;
