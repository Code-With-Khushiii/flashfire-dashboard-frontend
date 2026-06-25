import { useState, useEffect } from 'react';
import {
  Users, Activity, UserPlus, Edit, Trash2, Shield,
  FileText, TrendingUp, Search, Filter,
  Calendar, Clock, MapPin, Settings,
  BarChart3, RefreshCw, CheckCircle,
  Mail, LogOut, Key, ChevronDown, ChevronRight, Copy, Check
} from 'lucide-react';
import RegisterOPS from './Operations/RegisterOPS';
import AddignUser from './Operations/AddignUser';
import OperationsDirectory from './Operations/OperationsDirectory';
import RecruiterEmailGroups from './Operations/RecruiterEmailGroups';
import AssignResumeModal from '../../Admin/AssignResumeModal';
import ActivityMonitor from './ActivityMonitor';

interface User {
  id: string;
  username: string;
  name?: string;
  email: string;
  role: string;
  created: string;
  assignedResumeId?: string | null;
}

interface Resume {
  _id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  personalInfo?: {
    name?: string;
  };
}

interface LoginEvent {
  _id: string;
  username: string;
  ipAddress: string;
  userAgent: string;
  location: string;
  createdAt: string;
  lastActivity: string;
  isActive: boolean;
}

interface SessionKey {
  _id: string;
  username: string;
  sessionKey: string;
  createdBy: string;
  duration: number;
  expiresAt: string;
  isUsed: boolean;
  isActive: boolean;
  createdAt: string;
  source?: 'optimizer' | 'dashboard' | 'extension';
}

interface ExtensionCodeItem {
  name: string;
  code: string;
  createdAt: string;
}

interface Statistics {
  totalUsers: number;
  totalResumes: number;
  totalAdmins: number;
  totalLogins: number;
  recentLogins24h: number;
  lastUpdated: string;
}

interface AdminDashboardProps {
  token: string;
  onLogout: () => void;
  onSwitchToResumeBuilder?: () => void;
}

export default function AdminDashboard({ token, onLogout, onSwitchToResumeBuilder }: AdminDashboardProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginEvent[]>([]);
  const [sessionKeys, setSessionKeys] = useState<SessionKey[]>([]);
  const [extensionCodes, setExtensionCodes] = useState<ExtensionCodeItem[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'history' | 'sessions' | 'Admin' | 'resume' | 'recruiters' | 'activity'>('overview');
  const [showAddUser, setShowAddUser] = useState(false);
  const [showGenerateSessionKey, setShowGenerateSessionKey] = useState(false);
  const [showAssignResumeModal, setShowAssignResumeModal] = useState(false);
  const [assignModalUserEmail, setAssignModalUserEmail] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isActiveSessionsExpanded, setIsActiveSessionsExpanded] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user'
  });

  const [sessionKeyForm, setSessionKeyForm] = useState({
    username: '',
    duration: 720,
    target: 'optimizer' as 'optimizer' | 'dashboard' | 'extension'
  });
  const [extensionForm, setExtensionForm] = useState({ name: '', generatedCode: '' });
  const [codeCopied, setCodeCopied] = useState(false);

  const API_OPTIMIZER = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? import.meta.env.VITE_DEV_API_URL || 'http://localhost:8001' : '');
  const API_DASHBOARD = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:8086' : '');

  const authFetch = (base: string, url: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = options.headers ? { ...options.headers as Record<string, string> } : {};
    headers['Authorization'] = `Bearer ${token}`;
    headers['Content-Type'] = 'application/json';
    return fetch(`${base}${url}`, { ...options, headers });
  };

  const loadAllData = async () => {
    try {
      await Promise.all([
        loadUsers(),
        loadResumes(),
        loadLoginHistory(),
        loadSessionKeys(),
        loadStatistics()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadResumes = async () => {
    try {
      // Fetch all resumes to map IDs to names
      // The /api/resumes/all endpoint returns ResumeIndex documents with _id, firstName, lastName
      const response = await authFetch(API_OPTIMIZER, '/api/resumes/all');
      if (response.ok) {
        const data = await response.json();
        const resumesList = Array.isArray(data) ? data : [];
        // Ensure _id is converted to string for consistent matching
        const normalizedResumes = resumesList.map((r: any) => ({
          ...r,
          _id: r._id?.toString() || r._id,
          firstName: r.firstName || '',
          lastName: r.lastName || ''
        }));
        setResumes(normalizedResumes);
      }
    } catch (error) {
      console.error('Failed to load resumes:', error);
    }
  };

  // Map of userEmail -> resumeId (verified from API)
  const [verifiedAssignments, setVerifiedAssignments] = useState<Record<string, string>>({});

  const loadUsers = async () => {
    try {
      // Use the list endpoint which includes assignedResumeId
      const response = await authFetch(API_DASHBOARD, '/admin/list/users');
      if (response.ok) {
        const data = await response.json();
        const rawList = data.users || [];
        const userList: User[] = rawList.map((u: any) => ({
          ...u,
          // normalize
          username: u.username || u.name || u.email || '',
          name: u.name || u.username || u.email || '',
          role: u.role || 'user',
          created: u.created || u.createdAt || new Date().toISOString(),
        }));

        // Sort alphabetically
        userList.sort((a: User, b: User) => {
          const nameA = (a.name || a.username || a.email).toLowerCase();
          const nameB = (b.name || b.username || b.email).toLowerCase();
          return nameA.localeCompare(nameB);
        });

        setUsers(userList);

        // After loading users, verify their assignments from the resume service
        verifyResumeAssignments(userList);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const verifyResumeAssignments = async (usersToVerify: User[]) => {
    const assignments: Record<string, string> = {};
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

    // We'll process in batches to avoid overwhelming the server check
    const verifyUser = async (user: User) => {
      try {
        const res = await fetch(`${apiUrl}/api/resume-by-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: user.email }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.resumeId) {
            assignments[user.email] = data.resumeId;
          }
        }
      } catch (e) {
        console.error(`Failed to verify resume for ${user.email}`, e);
      }
    };

    // Run all checks (using Promise.all for parallelism)
    await Promise.all(usersToVerify.map(u => verifyUser(u)));
    setVerifiedAssignments(assignments);
  };

  const loadLoginHistory = async () => {
    try {
      const response = await authFetch(API_OPTIMIZER, '/api/sessions/active-sessions');
      if (response.ok) {
        const data = await response.json();
        setLoginHistory(data);
      }
    } catch (error) {
      console.error('Failed to load login history:', error);
    }
  };

  const loadSessionKeys = async () => {
    try {
      const requests: Promise<Response>[] = [];
      requests.push(authFetch(API_OPTIMIZER, '/api/sessions/session-keys'));
      if (API_DASHBOARD) {
        requests.push(authFetch(API_DASHBOARD, '/api/sessions/session-keys'));
        const extRes = await authFetch(API_DASHBOARD, '/api/extension-codes');
        if (extRes.ok) {
          const extList: ExtensionCodeItem[] = await extRes.json();
          setExtensionCodes(extList);
        }
      }

      const responses = await Promise.allSettled(requests);
      const merged: SessionKey[] = [];
      for (const res of responses) {
        if (res.status === 'fulfilled') {
          const r = res.value;
          if (r.ok) {
            const data: SessionKey[] = await r.json();
            const source: 'optimizer' | 'dashboard' = r.url.startsWith(API_DASHBOARD) ? 'dashboard' : 'optimizer';
            merged.push(...data.map(k => ({ ...k, source })));
          }
        }
      }
      merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setSessionKeys(merged);
    } catch (error) {
      console.error('Failed to load session keys:', error);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await authFetch(API_OPTIMIZER, '/api/admin/statistics');
      if (response.ok) {
        const data = await response.json();
        setStatistics(data);
      }
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Reset session key + extension code form when modal opens
  useEffect(() => {
    if (showGenerateSessionKey) {
      setSessionKeyForm({ username: '', duration: 720, target: 'optimizer' });
      setExtensionForm({ name: '', generatedCode: '' });
      setCodeCopied(false);
    }
  }, [showGenerateSessionKey]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await authFetch(API_OPTIMIZER, '/api/admin/add-user', {
        method: 'POST',
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setShowAddUser(false);
        setFormData({ username: '', email: '', password: '', role: 'user' });
        loadUsers();
        loadStatistics();
      } else {
        const error = await response.text();
        alert(`Failed to add user: ${error}`);
      }
    } catch (error) {
      console.error('Failed to add user:', error);
      alert('Failed to add user');
    }
  };

  const handleDeleteUser = async (username: string) => {
    if (!confirm(`Are you sure you want to delete user ${username}?`)) return;

    try {
      const response = await authFetch(API_OPTIMIZER, `/api/admin/delete-user?username=${encodeURIComponent(username)}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        loadUsers();
        loadStatistics();
        alert(`User ${username} deleted successfully`);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        alert(`Failed to delete user: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('Failed to delete user');
    }
  };

  const handleGenerateSessionKey = async () => {
    try {
      if (sessionKeyForm.target === 'extension') {
        if (!extensionForm.name.trim()) {
          alert('Please enter operator name.');
          return;
        }
        if (!API_DASHBOARD) {
          alert('Dashboard API not configured.');
          return;
        }
        const response = await authFetch(API_DASHBOARD, '/api/extension-codes/generate', {
          method: 'POST',
          body: JSON.stringify({ name: extensionForm.name.trim() })
        });
        if (response.ok) {
          const data = await response.json();
          const code = data.code || '';
          setExtensionForm((prev) => ({ ...prev, generatedCode: code }));
          if (code) {
            try {
              await navigator.clipboard.writeText(code);
              setCodeCopied(true);
              setTimeout(() => setCodeCopied(false), 3500);
            } catch {
              /* clipboard may be denied; inline copy still available */
            }
          }
          loadSessionKeys();
        } else {
          const err = await response.json();
          alert(err.error || 'Failed to generate extension code');
        }
        return;
      }
      const base = sessionKeyForm.target === 'dashboard' && API_DASHBOARD ? API_DASHBOARD : API_OPTIMIZER;
      const response = await authFetch(base, '/api/sessions/generate-session-key', {
        method: 'POST',
        body: JSON.stringify({
          username: sessionKeyForm.username,
          duration: sessionKeyForm.duration,
          createdBy: 'admin',
          target: sessionKeyForm.target
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.sessionKey) {
          alert(`Session key generated: ${data.sessionKey}\n\nThis 8-digit key is valid for ${sessionKeyForm.duration} hours.\n\nPlease provide this key to the intern for login.`);
          loadSessionKeys();
        } else {
          alert('No session key required for optimizer');
        }
        setShowGenerateSessionKey(false);
        setSessionKeyForm({ username: '', duration: 720, target: 'dashboard' });
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to generate session key');
      }
    } catch (error) {
      console.error('Failed to generate session key:', error);
      alert('Failed to generate session key');
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to revoke this session?')) return;

    try {
      const response = await authFetch(API_OPTIMIZER, '/api/sessions/revoke-session', {
        method: 'POST',
        body: JSON.stringify({ sessionId })
      });

      if (response.ok) {
        loadLoginHistory();
        alert('Session revoked successfully');
      } else {
        alert('Failed to revoke session');
      }
    } catch (error) {
      console.error('Failed to revoke session:', error);
      alert('Failed to revoke session');
    }
  };

  const handleRevokeUserSessions = async (username: string) => {
    if (!confirm(`Are you sure you want to revoke all sessions for ${username}?`)) return;

    try {
      const response = await authFetch(API_OPTIMIZER, '/api/sessions/revoke-user-sessions', {
        method: 'POST',
        body: JSON.stringify({ username })
      });

      if (response.ok) {
        loadLoginHistory();
        alert(`All sessions revoked for ${username}`);
      } else {
        alert('Failed to revoke user sessions');
      }
    } catch (error) {
      console.error('Failed to revoke user sessions:', error);
      alert('Failed to revoke user sessions');
    }
  };

  const handleDeleteUserAccount = async (username: string) => {
    if (!confirm(`Are you sure you want to delete ${username}'s account? This will log them out from all devices.`)) return;

    try {
      const response = await authFetch(API_OPTIMIZER, '/api/sessions/delete-user', {
        method: 'DELETE',
        body: JSON.stringify({ username })
      });

      if (response.ok) {
        loadUsers();
        loadLoginHistory();
        alert(`User ${username} deleted and all sessions revoked`);
      } else {
        alert('Failed to delete user');
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('Failed to delete user');
    }
  };

  const filteredUsers = users?.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl">
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-lg font-medium text-gray-700">Loading admin dashboard...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/70 backdrop-blur-xl border-b border-white/20 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  Admin Control Center
                </h1>
                <p className="text-gray-600 mt-1">Advanced system management & analytics</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={loadAllData}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
              <div className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-100 to-blue-100 rounded-2xl">
                <Shield className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-semibold text-purple-800">Super Admin</span>
              </div>
              {onSwitchToResumeBuilder && (
                <button
                  onClick={onSwitchToResumeBuilder}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center space-x-2"
                >
                  <FileText className="h-4 w-4" />
                  <span>Resume Builder</span>
                </button>
              )}
              <button
                onClick={onLogout}
                className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-2xl hover:from-red-600 hover:to-pink-700 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl p-6 border border-white/20 hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Users</p>
                  <p className="text-3xl font-bold text-gray-900">{statistics.totalUsers}</p>
                </div>
                <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl">
                  <Users className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl p-6 border border-white/20 hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Resumes</p>
                  <p className="text-3xl font-bold text-gray-900">{statistics.totalResumes}</p>
                </div>
                <div className="p-3 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl">
                  <FileText className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl p-6 border border-white/20 hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Admin Users</p>
                  <p className="text-3xl font-bold text-gray-900">{statistics.totalAdmins}</p>
                </div>
                <div className="p-3 bg-gradient-to-r from-red-500 to-red-600 rounded-2xl">
                  <Shield className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl p-6 border border-white/20 hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Recent Activity</p>
                  <p className="text-3xl font-bold text-gray-900">{statistics.recentLogins24h}</p>
                </div>
                <div className="p-3 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 mb-8">
          <div className="border-b border-gray-200/50">
            <nav className="flex space-x-1 px-6">
              {[
                { key: 'overview', label: 'Overview', icon: BarChart3 },
                { key: 'users', label: 'User Management', icon: Users },
                { key: 'history', label: 'Login Activity', icon: Activity },
                { key: 'sessions', label: 'Session Management', icon: Shield },
                { key: 'Admin', label: 'Operations management', icon: Shield },
                { key: 'recruiters', label: 'Recruiter Email Groups', icon: Mail },
                { key: 'resume', label: 'Resume Management', icon: FileText },
                { key: 'activity', label: 'Activity Monitor', icon: Activity }
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as 'overview' | 'users' | 'history' | 'sessions' | 'Admin' | 'resume' | 'recruiters' | 'activity')}
                  className={`flex items-center space-x-2 py-4 px-6 text-sm font-medium border-b-2 transition-all duration-200 ${activeTab === key
                    ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'
                    }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-8">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-gray-900">System Overview</h3>
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <Clock className="h-4 w-4" />
                    <span>Last updated: {statistics ? new Date(statistics.lastUpdated).toLocaleString() : 'Never'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-semibold mb-2">Quick Actions</h4>
                        <p className="text-blue-100 text-sm">Manage your system efficiently</p>
                      </div>
                      <Settings className="h-8 w-8 text-blue-200" />
                    </div>
                    <div className="mt-4 space-y-2">
                      <button
                        onClick={() => setActiveTab('users')}
                        className="w-full text-left px-3 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors text-sm"
                      >
                        Add New User
                      </button>
                      <button
                        onClick={() => setActiveTab('history')}
                        className="w-full text-left px-3 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors text-sm"
                      >
                        View Activity
                      </button>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold text-gray-900">Recent Activity</h4>
                      <Activity className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="space-y-3">
                      {loginHistory?.slice(0, 3).map((login, index) => (
                        <div key={index} className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <div className="text-sm">
                            <span className="font-medium">{login.username}</span>
                            <span className="text-gray-500 ml-2">logged in</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sessions Tab */}
            {activeTab === 'sessions' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                  <h3 className="text-2xl font-bold text-gray-900">Session Management</h3>
                  <button
                    onClick={() => setShowGenerateSessionKey(true)}
                    className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center space-x-2"
                  >
                    <Key className="h-4 w-4" />
                    <span>Generate Session Key</span>
                  </button>
                </div>

                {/* Active Sessions - Collapsible */}
                <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 overflow-hidden">
                  <button
                    onClick={() => setIsActiveSessionsExpanded(!isActiveSessionsExpanded)}
                    className="w-full p-6 flex items-center justify-between hover:bg-gray-50/50 transition-colors duration-200 group"
                  >
                    <div className="flex items-center space-x-3">
                      {isActiveSessionsExpanded ? (
                        <ChevronDown className="h-5 w-5 text-gray-500 group-hover:text-gray-700 transition-colors" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-500 group-hover:text-gray-700 transition-colors" />
                      )}
                      <Activity className="h-5 w-5 text-blue-600" />
                      <h4 className="text-lg font-semibold text-gray-900">Active Sessions</h4>
                      {loginHistory && loginHistory.length > 0 && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                          {loginHistory.length}
                        </span>
                      )}
                    </div>
                  </button>

                  {isActiveSessionsExpanded && (
                    <div className="px-6 pb-6">
                      {loginHistory && loginHistory.length > 0 ? (
                        <div className="space-y-4">
                          {loginHistory.map((session) => (
                            <div key={session._id} className="bg-gray-50 rounded-2xl p-4 border border-gray-100 hover:border-gray-200 transition-colors">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-3 mb-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                    <span className="font-semibold text-gray-900">{session.username}</span>
                                    <span className="text-sm text-gray-500">•</span>
                                    <span className="text-sm text-gray-500">{session.ipAddress}</span>
                                  </div>
                                  <div className="text-sm text-gray-600 space-y-1">
                                    <div>Location: {session.location}</div>
                                    <div>Last Activity: {new Date(session.lastActivity).toLocaleString()}</div>
                                    <div>Session Started: {new Date(session.createdAt).toLocaleString()}</div>
                                  </div>
                                </div>
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => handleRevokeSession(session._id)}
                                    className="px-3 py-1 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
                                  >
                                    Revoke
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <p>No active sessions found.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Session Keys - Fixed Height with Scroll */}
                <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                    <Key className="h-5 w-5 text-purple-600" />
                    <span>Generated Session Keys</span>
                    {sessionKeys && sessionKeys.length > 0 && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
                        {sessionKeys.length}
                      </span>
                    )}
                  </h4>

                  {sessionKeys && sessionKeys.length > 0 ? (
                    <div className="max-h-[600px] overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                      {sessionKeys.map((sessionKey) => (
                        <div key={sessionKey._id} className="bg-gray-50 rounded-2xl p-4 border border-gray-100 hover:border-gray-200 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2 flex-wrap gap-2">
                                <span className="font-semibold text-gray-900">{sessionKey.username}</span>
                                <span className="text-sm text-gray-500">•</span>
                                <span className="text-sm text-gray-500">{sessionKey.duration}h</span>
                                <span className="text-sm text-gray-500">•</span>
                                <span className={`text-sm px-2 py-1 rounded-full ${sessionKey.isUsed
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-green-100 text-green-700'
                                  }`}>
                                  {sessionKey.isUsed ? 'Used' : 'Active'}
                                </span>
                                {sessionKey.source && (
                                  <span className={`text-xs px-2 py-1 rounded-full border ${sessionKey.source === 'dashboard' ? 'border-purple-300 text-purple-700 bg-purple-50' : 'border-blue-300 text-blue-700 bg-blue-50'}`}>
                                    {sessionKey.source === 'dashboard' ? 'Dashboard' : 'Optimizer'}
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-600 space-y-1">
                                <div>Session Key: <code className="bg-gray-200 px-2 py-1 rounded font-mono text-lg">{sessionKey.sessionKey}</code></div>
                                <div>Expires: {new Date(sessionKey.expiresAt).toLocaleString()}</div>
                                <div>Created: {new Date(sessionKey.createdAt).toLocaleString()}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Key className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No session keys generated yet.</p>
                    </div>
                  )}

                  {extensionCodes.length > 0 && (
                    <>
                      <h4 className="text-lg font-semibold text-gray-900 mt-8 mb-4 flex items-center space-x-2">
                        <Key className="h-5 w-5 text-amber-600" />
                        <span>Extension codes (5-digit)</span>
                        <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                          {extensionCodes.length}
                        </span>
                      </h4>
                      <div className="max-h-[300px] overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                        {extensionCodes.map((ec, idx) => (
                          <div key={idx} className="bg-amber-50/70 rounded-2xl p-4 border border-amber-100">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-gray-900">{ec.name}</span>
                              <code className="bg-amber-100 px-2 py-1 rounded font-mono text-lg">{ec.code}</code>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">Created: {new Date(ec.createdAt).toLocaleString()}</div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                  <h3 className="text-2xl font-bold text-gray-900">User Management</h3>
                  <button
                    onClick={() => setShowAddUser(true)}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center space-x-2"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Add New User</span>
                  </button>
                </div>

                {/* Search and Filters */}
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                  <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search users by username or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div className="relative">
                      <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="pl-10 pr-8 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                      >
                        <option value="all">All Roles</option>
                        <option value="admin">Admins</option>
                        <option value="user">Users</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Users Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredUsers?.map((user) => (
                    <div key={user.id} className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className={`p-3 rounded-2xl ${user.role === 'admin' ? 'bg-red-100' : 'bg-blue-100'}`}>
                            {user.role === 'admin' ?
                              <Shield className="h-6 w-6 text-red-600" /> :
                              <Users className="h-6 w-6 text-blue-600" />
                            }
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{user.username}</h4>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${user.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                              }`}>
                              {user.role}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Mail className="h-4 w-4" />
                          <span>{user.email}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span>Joined {new Date(user.created).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="mt-6 flex items-center space-x-3">
                        <button
                          onClick={() => handleDeleteUser(user.username)}
                          className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {(filteredUsers?.length || 0) === 0 && (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
                    <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
                  </div>
                )}
              </div>
            )}

            {/* Login History Tab */}
            {activeTab === 'history' && (
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-gray-900">Login Activity Monitor</h3>

                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            User & Device
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Location & Time
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {loginHistory?.map((event) => {
                          const user = users.find(u => u.username === event.username);
                          return (
                            <tr key={event._id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center space-x-3">
                                  <div className={`p-2 rounded-xl ${user?.role === 'admin' ? 'bg-red-100' : 'bg-blue-100'}`}>
                                    {user?.role === 'admin' ?
                                      <Shield className="h-4 w-4 text-red-600" /> :
                                      <Users className="h-4 w-4 text-blue-600" />
                                    }
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">{event.username}</div>
                                    <div className="text-xs text-gray-500">
                                      {event.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900 flex items-center space-x-2">
                                  <MapPin className="h-4 w-4 text-gray-400" />
                                  <span>{event.ipAddress}</span>
                                </div>
                                <div className="text-xs text-gray-500 flex items-center space-x-2 mt-1">
                                  <Clock className="h-3 w-3" />
                                  <span>{new Date(event.createdAt).toLocaleString()}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full flex items-center space-x-1 w-fit">
                                  <CheckCircle className="h-3 w-3" />
                                  <span>Success</span>
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {(loginHistory?.length || 0) === 0 && (
                  <div className="text-center py-12">
                    <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No login activity</h3>
                    <p className="text-gray-600">Login events will appear here as they occur.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'Admin' && (
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-gray-900">Operations Management Dashboard</h3>

                <div className="flex flex-wrap gap-1">
                  <RegisterOPS />
                  <AddignUser />
                </div>

                <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Operations Directory</h4>
                  <OperationsDirectory />
                </div>
              </div>
            )}

            {activeTab === 'recruiters' && (
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-gray-900">Recruiter Email Groups</h3>
                <p className="text-sm text-gray-600">
                  Create themed groups like tech, non-tech, or medical and manage large recruiter email lists for outreach automation.
                </p>
                <RecruiterEmailGroups apiDashboardBase={API_DASHBOARD} token={token} />
              </div>
            )}

            {/* Resume Management Tab */}
            {activeTab === 'resume' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                  <h3 className="text-2xl font-bold text-gray-900">Resume Management</h3>
                  <button
                    onClick={() => {
                      setAssignModalUserEmail(null);
                      setShowAssignResumeModal(true);
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center space-x-2"
                  >
                    <FileText className="h-4 w-4" />
                    <span>Assign Resume</span>
                  </button>
                </div>

                <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-purple-600" />
                    <span>Assigned Resumes</span>
                  </h4>

                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-gray-50/50">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Resume</th>
                          <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user) => {
                          // Use verified assignment if available, fallback to user.assignedResumeId
                          const verifiedResumeId = verifiedAssignments[user.email];
                          const effectiveResumeId = verifiedResumeId || user.assignedResumeId;

                          // Match by _id (convert both to strings for reliable comparison)
                          const assignedResume = effectiveResumeId
                            ? resumes.find((r) => {
                                const resumeId = r._id?.toString() || r._id;
                                const targetId = effectiveResumeId?.toString() || effectiveResumeId;
                                return resumeId === targetId;
                              })
                            : null;

                          return (
                            <tr key={user.id} className="hover:bg-gray-50 transition-colors duration-200 border-b border-gray-100 last:border-0">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="h-10 w-10 flex-shrink-0">
                                    <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-blue-100 to-indigo-100 text-blue-600 flex items-center justify-center font-bold text-lg shadow-inner">
                                      {(user.name || user.email).charAt(0).toUpperCase()}
                                    </div>
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-sm font-medium text-gray-900">{user.name || 'No Name'}</div>
                                    <div className="text-sm text-gray-500">{user.email}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {assignedResume ? (
                                  <div className="flex items-center space-x-2">
                                    <FileText className="h-4 w-4 text-blue-500" />
                                    <span className="text-sm text-gray-900 font-medium">
                                      {(() => {
                                        // Prioritize firstName + lastName (even if lastName is empty)
                                        if (assignedResume.firstName) {
                                          const lastName = assignedResume.lastName?.trim() || '';
                                          return lastName 
                                            ? `${assignedResume.firstName} ${lastName}`
                                            : assignedResume.firstName;
                                        }
                                        // Fallback to name field if firstName not available
                                        if (assignedResume.name) {
                                          return assignedResume.name;
                                        }
                                        // Last resort: try to extract from personalInfo if available
                                        if (assignedResume.personalInfo?.name) {
                                          return assignedResume.personalInfo.name;
                                        }
                                        return "Untitled Resume";
                                      })()}
                                    </span>
                                    <span className="text-xs text-gray-400">({effectiveResumeId})</span>
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    No resume assigned
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex items-center justify-end space-x-2">
                                  <button
                                    onClick={() => {
                                      // Open modal to assign/change resume for this user
                                      setAssignModalUserEmail(user.email);
                                      setShowAssignResumeModal(true);
                                    }}
                                    className="px-3 py-1 rounded-lg transition-colors text-green-700 hover:text-green-900 bg-green-50 hover:bg-green-100"
                                  >
                                    {assignedResume ? 'Assign another' : 'Assign'}
                                  </button>
                                  {/* Only show Unlink when we actually display an assigned resume (avoids "No resume assigned" + Unlink) */}
                                  {assignedResume && (
                                    <button
                                      onClick={async () => {
                                        if (confirm(`Are you sure you want to unlink the assigned resume for ${user.name || user.email}?`)) {
                                          try {
                                            const response = await authFetch(API_DASHBOARD, '/admin/unassign-resume', {
                                              method: 'POST',
                                              body: JSON.stringify({ userEmail: user.email })
                                            });
                                            if (response.ok) {
                                              // Update local verify state to remove assignment immediately
                                              const newAssignments = { ...verifiedAssignments };
                                              delete newAssignments[user.email];
                                              setVerifiedAssignments(newAssignments);
                                              // Refresh list so UI stays in sync with backend (dashboard + resume service)
                                              await loadUsers();
                                              alert('Resume unlinked successfully');
                                            } else {
                                              const data = await response.json().catch(() => ({}));
                                              alert(data.message || 'Failed to unlink resume');
                                            }
                                          } catch (e) {
                                            console.error(e);
                                            alert('Error unlinking resume');
                                          }
                                        }
                                      }}
                                      className="text-red-600 hover:text-red-900 bg-red-50 px-3 py-1 rounded-lg hover:bg-red-100 transition-colors"
                                    >
                                      Unlink
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Activity Monitor Tab */}
            {activeTab === 'activity' && (
              <ActivityMonitor apiBase={API_DASHBOARD} token={token} />
            )}
          </div>
        </div>

        {/* Assign Resume Modal */}
        <AssignResumeModal
          open={showAssignResumeModal}
          onClose={() => setShowAssignResumeModal(false)}
          onAssignSuccess={() => {
            setShowAssignResumeModal(false);
            // Optionally refresh data or show success message
            loadUsers();
          }}
          defaultUserEmail={assignModalUserEmail}
        />

        {/* Generate Session Key Modal */}
        {showGenerateSessionKey && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md transform transition-all">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
                  <Key className="h-5 w-5" />
                  <span>Generate Session Key</span>
                </h3>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleGenerateSessionKey(); }} className="p-6 space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Target</label>
                    <select
                      value={sessionKeyForm.target}
                      onChange={(e) => {
                        const nextTarget = e.target.value as 'optimizer' | 'dashboard' | 'extension';
                        setSessionKeyForm({ ...sessionKeyForm, target: nextTarget });
                        if (nextTarget !== 'extension') setExtensionForm({ name: '', generatedCode: '' });
                      }}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="optimizer">Optimizer</option>
                      <option value="dashboard">Dashboard</option>
                      <option value="extension">Extension</option>
                    </select>
                  </div>

                  {sessionKeyForm.target === 'extension' ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Operator name</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            type="text"
                            value={extensionForm.name}
                            onChange={(e) => setExtensionForm((prev) => ({ ...prev, name: e.target.value }))}
                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="e.g. John Doe"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Generated code (5-digit)</label>
                        <div className="relative">
                          <input
                            type="text"
                            readOnly
                            value={extensionForm.generatedCode}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 font-mono text-lg pr-12"
                            placeholder="Generate to see code"
                          />
                          {extensionForm.generatedCode && (
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(extensionForm.generatedCode);
                                setCodeCopied(true);
                                setTimeout(() => setCodeCopied(false), 2000);
                              }}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                              title="Copy code"
                            >
                              {codeCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-gray-400" />}
                            </button>
                          )}
                        </div>
                        {extensionForm.generatedCode && codeCopied && (
                          <p className="text-xs text-emerald-600 mt-1.5 font-medium">Copied to clipboard — paste into the extension if needed.</p>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Username/Email</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            type="email"
                            required
                            value={sessionKeyForm.username}
                            onChange={(e) => setSessionKeyForm({ ...sessionKeyForm, username: e.target.value })}
                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="user@example.com"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Duration (hours)</label>
                        <input
                          type="number"
                          min="1"
                          max="9999"
                          required
                          value={sessionKeyForm.duration}
                          onChange={(e) => setSessionKeyForm({ ...sessionKeyForm, duration: parseInt(e.target.value) || 720 })}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="720 (default: 30 days)"
                        />
                        <p className="text-xs text-gray-500 mt-1">Default: 720 hours (30 days). You can change this as needed.</p>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowGenerateSessionKey(false);
                      setExtensionForm({ name: '', generatedCode: '' });
                      setCodeCopied(false);
                    }}
                    className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    {extensionForm.generatedCode ? 'Close' : 'Cancel'}
                  </button>
                  {sessionKeyForm.target === 'extension' && extensionForm.generatedCode ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setExtensionForm({ name: '', generatedCode: '' });
                          setCodeCopied(false);
                        }}
                        className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                      >
                        Generate New
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(extensionForm.generatedCode);
                          setCodeCopied(true);
                          setTimeout(() => {
                            setShowGenerateSessionKey(false);
                            setExtensionForm({ name: '', generatedCode: '' });
                            setCodeCopied(false);
                          }, 800);
                        }}
                        className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                      >
                        {codeCopied ? <><Check className="h-4 w-4" /> Copied!</> : <><Copy className="h-4 w-4" /> Copy again</>}
                      </button>
                    </>
                  ) : (
                    <button
                      type="submit"
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                    >
                      {sessionKeyForm.target === 'extension' ? 'Generate & copy code' : 'Generate Key'}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add User Modal */}
        {showAddUser && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md transform transition-all">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
                  <UserPlus className="h-5 w-5" />
                  <span>Add New User</span>
                </h3>
              </div>

              <form onSubmit={handleAddUser} className="p-6 space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Username/Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="email"
                        required
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="user@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="user@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                    <input
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter secure password"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">User Role</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="user">Standard User</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddUser(false)}
                    className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    Create User
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
