import { useState, useEffect } from "react";
import { X, AlertCircle } from "lucide-react";
import { createPortal } from "react-dom";

/** Name as shown in the dropdown, before any disambiguation. */
const baseLabel = (resume: { firstName?: string; lastName?: string; name?: string }) =>
    `${resume.firstName || ""} ${resume.lastName || ""}`.trim() || resume.name || "Unnamed";

const versionSuffix = (version: number) =>
    version === 2 ? " (Medical)" : version === 1 ? " (V1)" : "";

interface AssignResumeModalProps {
    open: boolean;
    onClose: () => void;
    onAssignSuccess: () => void;
    defaultUserEmail?: string | null;
}

export default function AssignResumeModal({ open, onClose, onAssignSuccess, defaultUserEmail }: AssignResumeModalProps) {
    const [users, setUsers] = useState<any[]>([]);
    const [resumes, setResumes] = useState<any[]>([]);
    const [selectedUserEmail, setSelectedUserEmail] = useState<string>("");
    const [selectedResumeId, setSelectedResumeId] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [existingResume, setExistingResume] = useState<string | null>(null);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);

    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8086";
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

    useEffect(() => {
        if (open) {
            fetchUsers();
            fetchResumes();
        }
    }, [open]);

    useEffect(() => {
        if (!open) return;
        if (!defaultUserEmail) return;
        setSelectedUserEmail(defaultUserEmail);
        checkExistingResume(defaultUserEmail);
    }, [open, defaultUserEmail]);

    const fetchUsers = async () => {
        try {
            const response = await fetch(`${apiBaseUrl}/admin/list/users`);
            if (response.ok) {
                const data = await response.json();
                setUsers((data.users || []).sort((a: any, b: any) => {
                    const nameA = (a.name && a.name.trim() ? a.name : a.email).toLowerCase();
                    const nameB = (b.name && b.name.trim() ? b.name : b.email).toLowerCase();
                    return nameA.localeCompare(nameB);
                }));
            }
        } catch (err) {
            console.error("Error fetching users:", err);
        }
    };

    const fetchResumes = async () => {
        try {
            const [resAll, resV1, resV2] = await Promise.all([
                fetch(`${apiUrl}/api/resumes/all`).catch(() => null),
                fetch(`${apiUrl}/api/resumes/v1`).catch(() => null),
                fetch(`${apiUrl}/api/resumes/v2`).catch(() => null),
            ]);

            const collected: any[] = [];
            const seenIds = new Set<string>();

            const collect = (data: unknown, forcedVersion?: number) => {
                if (!Array.isArray(data)) return;
                data.forEach((r: any) => {
                    const resumeId = r._id?.toString();
                    if (!resumeId || seenIds.has(resumeId)) return;
                    seenIds.add(resumeId);
                    collected.push({ ...r, V: forcedVersion ?? r.V ?? 0 });
                });
            };

            if (resAll && resAll.ok) collect(await resAll.json());
            if (resV1 && resV1.ok) collect(await resV1.json(), 1);
            if (resV2 && resV2.ok) collect(await resV2.json(), 2);

            // Deduplicating by _id alone is not enough: several index rows can
            // describe the same underlying resume (they share a filename), which
            // is what put the same client's name in this list twice. Group by the
            // storage key + version and keep one row per real resume, preferring
            // the one that already carries the client assignment, then the newest.
            const byResume = new Map<string, any>();
            collected.forEach((r) => {
                const key = `${r.filename || r._id}::${r.V ?? 0}`;
                const current = byResume.get(key);
                if (!current) {
                    byResume.set(key, r);
                    return;
                }
                const better =
                    (!!r.userEmail && !current.userEmail) ||
                    (!!r.userEmail === !!current.userEmail &&
                        new Date(r.createdAt || 0).getTime() >
                            new Date(current.createdAt || 0).getTime());
                if (better) byResume.set(key, r);
            });

            const unique = [...byResume.values()];

            // Two different clients can legitimately share a name. When that
            // happens, show who the resume belongs to so they are tellable apart
            // instead of rendering two identical options.
            const labelCounts = new Map<string, number>();
            unique.forEach((r) => {
                const label = baseLabel(r);
                labelCounts.set(label, (labelCounts.get(label) || 0) + 1);
            });

            const sortedResumes = unique
                .map((r) => ({ ...r, ambiguous: (labelCounts.get(baseLabel(r)) || 0) > 1 }))
                .sort((a, b) => baseLabel(a).localeCompare(baseLabel(b)));

            console.log(
                `[AssignResumeModal] ${collected.length} index rows -> ${sortedResumes.length} distinct resumes`
            );
            setResumes(sortedResumes);
        } catch (err) {
            console.error("Error fetching resumes:", err);
        }
    };

    const checkExistingResume = async (userEmail: string) => {
        try {
            const response = await fetch(`${apiUrl}/api/resume-by-email`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: userEmail }),
            });

            if (response.ok) {
                const data = await response.json();
                if (data.resumeId) {
                    const resume = resumes.find((r) => r._id === data.resumeId);
                    if (resume) {
                        setExistingResume(baseLabel(resume) + versionSuffix(resume.V ?? 0));
                        return true;
                    }
                }
            }
            setExistingResume(null);
            return false;
        } catch (err) {
            setExistingResume(null);
            return false;
        }
    };

    const handleUserChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const email = e.target.value;
        setSelectedUserEmail(email);
        if (email) {
            const hasExisting = await checkExistingResume(email);
            if (hasExisting && selectedResumeId) {
                setShowConfirmDialog(true);
            }
        }
    };

    const handleAssign = async () => {
        if (!selectedUserEmail || !selectedResumeId) {
            setError("Please select both user and resume");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${apiBaseUrl}/admin/assign-resume-to-user`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userEmail: selectedUserEmail,
                    resumeId: selectedResumeId,
                }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Also update ResumeIndex userEmail
                try {
                    await fetch(`${apiUrl}/api/update-resume-user-email`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            resumeId: selectedResumeId,
                            userEmail: selectedUserEmail,
                        }),
                    });
                } catch (err) {
                    console.error("Error updating ResumeIndex:", err);
                }

                alert(data.message || "Resume assigned successfully!");
                onAssignSuccess();
                onClose();
                setSelectedUserEmail("");
                setSelectedResumeId("");
                setExistingResume(null);
            } else {
                setError(data.message || "Failed to assign resume");
            }
        } catch (err) {
            console.error("Error assigning resume:", err);
            setError("Failed to assign resume. Please try again.");
        } finally {
            setLoading(false);
            setShowConfirmDialog(false);
        }
    };

    if (!open) return null;

    return createPortal(
        <>
            <div
                className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
                onClick={onClose}
            >
                <div
                    className="bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex justify-between items-center pb-4 border-b border-gray-200">
                        <h2 className="text-xl font-semibold text-gray-800">
                            Assign Resume to User
                        </h2>
                        <button onClick={onClose}>
                            <X className="w-6 h-6 text-gray-500 hover:text-gray-800" />
                        </button>
                    </div>

                    <div className="mt-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Select User
                            </label>
                            <select
                                value={selectedUserEmail}
                                onChange={handleUserChange}
                                disabled={!!defaultUserEmail}
                                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">-- Select a user --</option>
                                {users.map((user) => (
                                    <option key={user.email} value={user.email}>
                                        {user.name && user.name.trim() ? `${user.name} (${user.email})` : `Unknown (${user.email})`}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {existingResume && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                                <div className="flex items-center">
                                    <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
                                    <span className="text-sm text-yellow-800">
                                        This user already has a resume assigned: <strong>{existingResume}</strong>
                                    </span>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Select Resume
                            </label>
                            <select
                                value={selectedResumeId}
                                onChange={(e) => setSelectedResumeId(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">-- Select a resume --</option>
                                {resumes.map((resume) => (
                                    <option key={resume._id} value={resume._id}>
                                        {baseLabel(resume)}
                                        {versionSuffix(resume.V ?? 0)}
                                        {resume.ambiguous
                                            ? ` — ${resume.userEmail || "unassigned"}`
                                            : ""}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-md p-3">
                                <div className="flex items-center">
                                    <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                                    <span className="text-sm text-red-800">{error}</span>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end space-x-3 pt-4">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAssign}
                                disabled={loading || !selectedUserEmail || !selectedResumeId}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                {loading ? "Assigning..." : "Assign Resume"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Confirmation Dialog */}
            {showConfirmDialog && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center"
                    onClick={() => setShowConfirmDialog(false)}
                >
                    <div
                        className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">
                            Resume Already Assigned
                        </h3>
                        <p className="text-gray-600 mb-6">
                            This user already has a resume assigned ({existingResume}). Do you want to replace it with the selected resume?
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setShowConfirmDialog(false)}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAssign}
                                disabled={loading}
                                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:bg-gray-400"
                            >
                                {loading ? "Replacing..." : "Replace Resume"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>,
        document.body
    );
}

