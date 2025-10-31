import React, { useState, useEffect } from "react";
import {
    Eye,
    EyeOff,
    Briefcase,
    Users,
    TrendingUp,
    Shield,
    Mail,
    Lock,
    Key,
} from "lucide-react";

const Login: React.FC<{
    onLogin: (token: string, role?: string, userEmail?: string) => void;
}> = ({ onLogin }) => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [sessionKey, setSessionKey] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showSessionKey, setShowSessionKey] = useState(false);
    const [requiresSessionKey, setRequiresSessionKey] = useState(false);
    const [checkingStoredKey, setCheckingStoredKey] = useState(true);

    useEffect(() => {
        const checkStoredSessionKey = async () => {
            const storedSessionKey = localStorage.getItem("sessionKeyOptimizer");
            const storedUsername = localStorage.getItem("userEmail");
            const storedPassword = localStorage.getItem("userPassword"); // We'll need to store this too

            if (storedSessionKey && storedUsername && storedPassword) {
                const API_BASE =
                    import.meta.env.VITE_API_URL ||
                    (import.meta.env.DEV
                        ? import.meta.env.VITE_DEV_API_URL || "http://localhost:8001"
                        : "");

                try {
                    // Verify session key is still valid
                    const verifyRes = await fetch(`${API_BASE}/api/sessions/validate-session-key`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            username: storedUsername,
                            sessionKey: storedSessionKey
                        }),
                    });

                    const verifyData = await verifyRes.json();

                    if (verifyData.valid) {
                        // Session key is still valid, auto-login
                        const loginRes = await fetch(`${API_BASE}/api/login`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                username: storedUsername,
                                password: storedPassword,
                                sessionKey: storedSessionKey
                            }),
                        });

                        if (loginRes.ok) {
                            const data = await loginRes.json();
                            localStorage.setItem("jwt", data.token);
                            if (data.user?.role) {
                                localStorage.setItem("role", data.user.role);
                            }
                            onLogin(data.token, data.user?.role, storedUsername);
                            return;
                        }
                    }
                    // Don't clear stored keys - let user re-enter if expired
                } catch (error) {
                    console.error("Error checking stored session key:", error);
                    // Don't clear stored keys - let user re-enter if expired
                }
            }
            setCheckingStoredKey(false);
        };

        checkStoredSessionKey();
    }, [onLogin]);
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        const API_BASE =
            import.meta.env.VITE_API_URL ||
            (import.meta.env.DEV
                ? import.meta.env.VITE_DEV_API_URL || "http://localhost:8001"
                : "");

        try {
            // Check if there's a stored session key for this user
            const storedSessionKey = localStorage.getItem("sessionKeyOptimizer");
            
            // First try login with stored session key if available
            if (storedSessionKey) {
                const loginWithKeyRes = await fetch(`${API_BASE}/api/login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username, password, sessionKey: storedSessionKey }),
                });

                if (loginWithKeyRes.ok) {
                    // Login successful with stored key
                    const data = await loginWithKeyRes.json();
                    localStorage.setItem("jwt", data.token);
                    localStorage.setItem("userEmail", username);
                    localStorage.setItem("userPassword", password);
                    if (data.user?.role) {
                        localStorage.setItem("role", data.user.role);
                    }
                    onLogin(data.token, data.user?.role, username);
                    return;
                }
                // If stored key failed, continue to ask for new key
            }

            // Try admin login (without session key)
            const adminCheckData = { username, password };

            const adminCheckRes = await fetch(`${API_BASE}/api/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(adminCheckData),
            });

            if (adminCheckRes.ok) {
                // Admin user - login successful without session key
                const data = await adminCheckRes.json();
                localStorage.setItem("jwt", data.token);
                localStorage.setItem("userEmail", username);
                if (data.user?.role) {
                    localStorage.setItem("role", data.user.role);
                }
                onLogin(data.token, data.user?.role, username);
                return;
            } else {
                // Non-admin user - show session key popup
                const errorData = await adminCheckRes.json();
                if (
                    errorData.error &&
                    errorData.error.includes("Session key required")
                ) {
                    setRequiresSessionKey(true);
                    setLoading(false);
                    setError(
                        storedSessionKey 
                            ? "Your stored session key has expired. Please enter a new one."
                            : "Please enter the 8-10 digit session key provided by your admin"
                    );
                    return;
                } else {
                    // Invalid credentials
                    setError(errorData.error || "Invalid username or password");
                    setLoading(false);
                    return;
                }
            }
        } catch {
            setError("Network error. Please try again.");
            setLoading(false);
        }
    };

    const handleSessionKeySubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!sessionKey.trim()) {
            setError(
                "Please enter the 8-10 digit session key provided by your admin"
            );
            return;
        }

        setError("");
        setLoading(true);

        const API_BASE =
            import.meta.env.VITE_API_URL ||
            (import.meta.env.DEV
                ? import.meta.env.VITE_DEV_API_URL || "http://localhost:8001"
                : "");

        try {
            const loginData = { username, password, sessionKey };

            const res = await fetch(`${API_BASE}/api/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(loginData),
            });

            const data = await res.json();

            if (res.ok && data.token) {
                localStorage.setItem("jwt", data.token);
                localStorage.setItem("userEmail", username);
                if (data.user?.role) {
                    localStorage.setItem("role", data.user.role);
                }
                // Store session key and password for auto-login on next visit
                localStorage.setItem("sessionKeyOptimizer", sessionKey);
                localStorage.setItem("userPassword", password);
                onLogin(data.token, data.user?.role, username);
            } else {
                setError(data.error || "Invalid or expired session key");
            }
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // Show loading spinner while checking for stored session key
    if (checkingStoredKey) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl">
                    <div className="flex items-center space-x-4">
                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-lg font-medium text-gray-700">Checking credentials...</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex">
            {/* Left Side - Branding & Features */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700"></div>
                <div className="absolute inset-0 bg-black/20"></div>

                {/* Animated Background Elements */}
                <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-xl animate-pulse"></div>
                <div
                    className="absolute bottom-20 right-20 w-96 h-96 bg-purple-400/20 rounded-full blur-2xl animate-pulse"
                    style={{ animationDelay: "1s" }}
                ></div>
                <div
                    className="absolute top-1/2 left-1/3 w-48 h-48 bg-blue-400/20 rounded-full blur-xl animate-pulse"
                    style={{ animationDelay: "2s" }}
                ></div>

                <div className="relative z-10 flex flex-col justify-center px-12 py-24 text-white">
                    <div className="mb-8">
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                                <Briefcase className="h-8 w-8 text-white" />
                            </div>
                            <h1 className="text-3xl font-bold">
                                Professional Resume Builder
                            </h1>
                        </div>
                        <p className="text-xl text-blue-100 mb-8 leading-relaxed">
                            Build professional resumes with AI-powered
                            optimization and comprehensive admin management
                        </p>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-start space-x-4 group">
                            <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg group-hover:bg-white/30 transition-all duration-300">
                                <TrendingUp className="h-6 w-6 text-blue-200" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg mb-1">
                                    AI-Powered Optimization
                                </h3>
                                <p className="text-blue-100 text-sm">
                                    GPT-4 enhanced resume content tailored to
                                    job descriptions
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start space-x-4 group">
                            <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg group-hover:bg-white/30 transition-all duration-300">
                                <Users className="h-6 w-6 text-purple-200" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg mb-1">
                                    Team Management
                                </h3>
                                <p className="text-blue-100 text-sm">
                                    Complete admin dashboard for user oversight
                                    and analytics
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start space-x-4 group">
                            <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg group-hover:bg-white/30 transition-all duration-300">
                                <Shield className="h-6 w-6 text-indigo-200" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg mb-1">
                                    Enterprise Security
                                </h3>
                                <p className="text-blue-100 text-sm">
                                    Session-based access control with
                                    comprehensive login tracking
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-12 p-6 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
                        <div className="flex items-center justify-between text-sm">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-white">
                                    500+
                                </div>
                                <div className="text-blue-200">
                                    Resumes Created
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-white">
                                    50+
                                </div>
                                <div className="text-blue-200">
                                    Active Users
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-white">
                                    99.9%
                                </div>
                                <div className="text-blue-200">Uptime</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="flex-1 flex items-center justify-center px-6 py-12">
                <div className="w-full max-w-md">
                    <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8">
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl mb-4">
                                <Briefcase className="h-8 w-8 text-white" />
                            </div>
                            <h2 className="text-3xl font-bold text-gray-800 mb-2">
                                Welcome Back
                            </h2>
                            <p className="text-gray-600">
                                {requiresSessionKey
                                    ? "Enter your session key to access"
                                    : "Sign in to access your resume builder"}
                            </p>
                        </div>

                        <form
                            onSubmit={
                                requiresSessionKey
                                    ? handleSessionKeySubmit
                                    : handleSubmit
                            }
                            className="space-y-6"
                        >
                            <div className="space-y-4">
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                                    </div>
                                    <input
                                        type="email"
                                        placeholder="Enter your email"
                                        value={username}
                                        onChange={(e) =>
                                            setUsername(e.target.value)
                                        }
                                        className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-300 bg-white/80 backdrop-blur-sm placeholder-gray-400"
                                        required
                                        disabled={requiresSessionKey}
                                    />
                                </div>

                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                                    </div>
                                    <input
                                        type={
                                            showPassword ? "text" : "password"
                                        }
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) =>
                                            setPassword(e.target.value)
                                        }
                                        className="w-full pl-12 pr-12 py-4 border border-gray-200 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-300 bg-white/80 backdrop-blur-sm placeholder-gray-400"
                                        required
                                        disabled={requiresSessionKey}
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowPassword(!showPassword)
                                        }
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-5 w-5" />
                                        ) : (
                                            <Eye className="h-5 w-5" />
                                        )}
                                    </button>
                                </div>

                                {/* Session Key Input - Only shown when required */}
                                {requiresSessionKey && (
                                    <div className="relative group animate-fadeIn">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Key className="h-5 w-5 text-orange-400 group-focus-within:text-orange-600 transition-colors" />
                                        </div>
                                        <input
                                            type={
                                                showSessionKey
                                                    ? "text"
                                                    : "password"
                                            }
                                            placeholder="Enter 8-digit session key (e.g., 12345678)"
                                            value={sessionKey}
                                            onChange={(e) =>
                                                setSessionKey(
                                                    e.target.value
                                                        .replace(/\D/g, "")
                                                        .slice(0, 8)
                                                )
                                            }
                                            className="w-full pl-12 pr-12 py-4 border border-orange-200 rounded-2xl focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all duration-300 bg-orange-50/80 backdrop-blur-sm placeholder-gray-400"
                                            required
                                            pattern="[0-9]{8}"
                                            title="Enter 8-digit session key"
                                            maxLength={8}
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowSessionKey(
                                                    !showSessionKey
                                                )
                                            }
                                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-orange-400 hover:text-orange-600 transition-colors"
                                        >
                                            {showSessionKey ? (
                                                <EyeOff className="h-5 w-5" />
                                            ) : (
                                                <Eye className="h-5 w-5" />
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Session Key Info */}
                            {requiresSessionKey && (
                                <div className="p-4 bg-orange-50 border border-orange-200 rounded-2xl">
                                    <div className="flex items-start space-x-3">
                                        <Key className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <h4 className="font-medium text-orange-800 text-sm mb-1">
                                                Session Key Required
                                            </h4>
                                            <p className="text-orange-700 text-xs leading-relaxed">
                                                Please enter the 8-digit session
                                                key provided by the
                                                administrator. Contact your
                                                admin if you don't have a valid
                                                session key.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                        <span className="text-red-700 text-sm font-medium">
                                            {error}
                                        </span>
                                    </div>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-2xl font-semibold text-lg shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
                            >
                                {loading ? (
                                    <div className="flex items-center justify-center space-x-2">
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>Signing you in...</span>
                                    </div>
                                ) : requiresSessionKey ? (
                                    "Verify Session Key"
                                ) : (
                                    "Sign In"
                                )}
                            </button>

                            {requiresSessionKey && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setRequiresSessionKey(false);
                                        setSessionKey("");
                                        setError("");
                                    }}
                                    className="w-full text-gray-600 py-2 text-sm hover:text-gray-800 transition-colors"
                                >
                                    ← Back to login
                                </button>
                            )}
                        </form>

                        <div className="mt-8 pt-6 border-t border-gray-200">
                            <div className="text-center text-sm text-gray-600">
                                <div className="bg-gray-50 rounded-xl p-3 text-xs font-mono">
                                    Professional Resume Builder Portal
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Mobile Logo for small screens */}
                    <div className="lg:hidden text-center mt-8">
                        <div className="inline-flex items-center space-x-2 text-gray-600">
                            <Briefcase className="h-6 w-6" />
                            <span className="font-semibold">
                                Professional Resume Builder
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
