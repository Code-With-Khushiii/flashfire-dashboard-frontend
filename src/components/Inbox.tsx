import React, {
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    useCallback
} from "react";
import { UserContext } from "../state_management/UserContext";
import { useOperationsStore } from "../state_management/Operations";
import {
    Inbox as InboxIcon,
    RefreshCcw,
    Search,
    Mail,
    Paperclip,
    Reply,
    ReplyAll,
    Forward,
    Archive,
    Trash2,
    CheckCheck,
    Loader2,
    Star,
    Pencil,
    X,
    ImageOff,
    Image as ImageIcon,
    ArrowLeft,
    Send,
    AlertCircle,
    ShieldOff
} from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

// =========================
// Types
// =========================
interface ThreadSummary {
    threadId: string;
    subject: string;
    snippet: string;
    fromLatest: string;
    participants: string[];
    lastMessageAt: string | null;
    messageCount: number;
    unreadCount: number;
    labels: string[];
    hasAttachments: boolean;
}

interface MessageDetail {
    messageId: string;
    threadId: string;
    from: string;
    to: string[];
    cc: string[];
    bcc: string[];
    replyTo: string;
    subject: string;
    date: string | null;
    snippet: string;
    labels: string[];
    isUnread: boolean;
    rfcMessageId: string;
    bodyHtml: string;
    bodyText: string;
    attachments: Array<{
        attachmentId: string;
        filename: string;
        mimetype: string;
        size: number;
        cached: boolean;
    }>;
}

interface AccountInfo {
    email: string;
    createdAt?: string;
}

type ComposeMode = "new" | "reply" | "replyAll" | "forward";

interface ComposeState {
    mode: ComposeMode;
    inReplyToMsgId?: string;
    threadId?: string;
    to: string;
    cc: string;
    bcc: string;
    subject: string;
    body: string;
    attachments: File[];
    showCcBcc: boolean;
}

// =========================
// Utilities
// =========================
const AVATAR_COLORS = [
    "bg-rose-500",
    "bg-orange-500",
    "bg-amber-500",
    "bg-lime-500",
    "bg-emerald-500",
    "bg-teal-500",
    "bg-sky-500",
    "bg-blue-500",
    "bg-indigo-500",
    "bg-violet-500",
    "bg-fuchsia-500",
    "bg-pink-500"
];

const hashColor = (s: string) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
};

const extractEmail = (s: string) => {
    const m = (s || "").match(/<([^>]+)>/);
    return m ? m[1].trim() : (s || "").trim();
};

const extractName = (s: string) => {
    const m = (s || "").match(/^([^<]+)</);
    if (m) return m[1].replace(/"/g, "").trim();
    const e = (s || "").trim();
    return e.split("@")[0] || e;
};

const initialOf = (s: string) => {
    const name = extractName(s);
    return (name || "?").trim().charAt(0).toUpperCase();
};

const formatRelative = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const day = 86400000;
    if (diff < day)
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (diff < 7 * day) return d.toLocaleDateString([], { weekday: "short" });
    if (d.getFullYear() === new Date().getFullYear())
        return d.toLocaleDateString([], { month: "short", day: "numeric" });
    return d.toLocaleDateString();
};

const formatBytes = (n: number) => {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 / 1024).toFixed(2)} MB`;
};

const labelChip = (label: string): [string, string] => {
    const map: Record<string, string> = {
        UNREAD: "bg-blue-100 text-blue-800",
        IMPORTANT: "bg-yellow-100 text-yellow-800",
        STARRED: "bg-amber-100 text-amber-700",
        SENT: "bg-purple-100 text-purple-800",
        TRASH: "bg-red-100 text-red-800",
        SPAM: "bg-red-100 text-red-800",
        DRAFT: "bg-gray-200 text-gray-800",
        INBOX: "bg-emerald-100 text-emerald-800"
    };
    if (label.startsWith("CATEGORY_")) {
        return ["bg-slate-100 text-slate-700", label.replace("CATEGORY_", "").toLowerCase()];
    }
    return [map[label] || "bg-slate-100 text-slate-700", label.toLowerCase()];
};

// Build a quoted-reply body (plain text) from the original message.
const buildQuotedBody = (msg: MessageDetail) => {
    const dateStr = msg.date ? new Date(msg.date).toLocaleString() : "";
    const stripped = (msg.bodyText || msg.snippet || "").trim();
    const quoted = stripped
        .split("\n")
        .map((l) => `> ${l}`)
        .join("\n");
    return `\n\nOn ${dateStr}, ${msg.from} wrote:\n${quoted}`;
};

const escapeHtml = (s: string) =>
    s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

// =========================
// Component
// =========================
export default function Inbox() {
    const ctx = useContext(UserContext);
    const { role } = useOperationsStore();
    const isOpsRole = role === "operations" || role === "operator";
    const ownerEmail = ctx?.userDetails?.email || "";
    const token = ctx?.token || "";

    const [accounts, setAccounts] = useState<AccountInfo[]>([]);
    const [activeGmail, setActiveGmail] = useState<string>("");
    const [labelId, setLabelId] = useState<string>("INBOX");
    const [query, setQuery] = useState<string>("");
    const [submittedQuery, setSubmittedQuery] = useState<string>("");
    const [threads, setThreads] = useState<ThreadSummary[]>([]);
    const [nextPageToken, setNextPageToken] = useState<string | null>(null);
    const [loadingThreads, setLoadingThreads] = useState(false);
    const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
    const [messages, setMessages] = useState<MessageDetail[]>([]);
    const [loadingThread, setLoadingThread] = useState(false);
    const [busy, setBusy] = useState(false);
    const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
    const [unreadCount, setUnreadCount] = useState<number>(0);
    const [compose, setCompose] = useState<ComposeState | null>(null);
    const [error, setError] = useState<string | null>(null);

    const searchInputRef = useRef<HTMLInputElement | null>(null);

    const authHeaders = useMemo(
        () => ({
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        }),
        [token]
    );

    // -------- Accounts --------
    useEffect(() => {
        if (!isOpsRole || !ownerEmail) return;
        (async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/gmail/accounts`, {
                    method: "POST",
                    headers: authHeaders,
                    body: JSON.stringify({ email: ownerEmail })
                });
                const data = await res.json();
                const list: AccountInfo[] = data?.accounts || [];
                setAccounts(list);
                if (list.length && !activeGmail) setActiveGmail(list[0].email);
            } catch (e) {
                console.error("[Inbox] accounts load failed", e);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpsRole, ownerEmail, authHeaders]);

    // -------- Search debounce --------
    useEffect(() => {
        const id = setTimeout(() => setSubmittedQuery(query.trim()), 350);
        return () => clearTimeout(id);
    }, [query]);

    // -------- Load threads on filter change --------
    const loadThreads = useCallback(
        async (replace = false, pageToken: string | null = null) => {
            if (!isOpsRole || !ownerEmail || !activeGmail) return;
            setLoadingThreads(true);
            setError(null);
            try {
                const res = await fetch(`${API_BASE_URL}/gmail/inbox/threads`, {
                    method: "POST",
                    headers: authHeaders,
                    body: JSON.stringify({
                        ownerEmail,
                        gmailEmail: activeGmail,
                        labelIds: labelId ? [labelId] : undefined,
                        q: submittedQuery || undefined,
                        pageToken: pageToken || undefined,
                        maxResults: 25
                    })
                });
                const data = await res.json();
                if (!res.ok) {
                    setError(data?.error || "Failed to load threads");
                    setThreads(replace ? [] : threads);
                    return;
                }
                const incoming: ThreadSummary[] = data?.threads || [];
                setThreads((prev) => (replace ? incoming : [...prev, ...incoming]));
                setNextPageToken(data?.nextPageToken || null);
            } catch (e: any) {
                setError(e?.message || "Network error");
            } finally {
                setLoadingThreads(false);
            }
        },
        [isOpsRole, ownerEmail, activeGmail, labelId, submittedQuery, authHeaders, threads]
    );

    useEffect(() => {
        if (!isOpsRole || !ownerEmail || !activeGmail) return;
        setBulkSelected(new Set());
        setSelectedThreadId(null);
        setMessages([]);
        loadThreads(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpsRole, ownerEmail, activeGmail, labelId, submittedQuery]);

    // -------- Unread count --------
    const refreshUnread = useCallback(async () => {
        if (!isOpsRole || !ownerEmail || !activeGmail) return;
        try {
            const res = await fetch(`${API_BASE_URL}/gmail/inbox/unread-count`, {
                method: "POST",
                headers: authHeaders,
                body: JSON.stringify({ ownerEmail, gmailEmail: activeGmail })
            });
            const data = await res.json();
            setUnreadCount(Number(data?.unread || 0));
        } catch {
            /* ignore */
        }
    }, [isOpsRole, ownerEmail, activeGmail, authHeaders]);

    useEffect(() => {
        refreshUnread();
    }, [refreshUnread, threads.length]);

    // -------- Thread open --------
    const openThread = useCallback(
        async (threadId: string) => {
            setSelectedThreadId(threadId);
            setMessages([]);
            setLoadingThread(true);
            try {
                const res = await fetch(
                    `${API_BASE_URL}/gmail/inbox/thread/${encodeURIComponent(threadId)}`,
                    {
                        method: "POST",
                        headers: authHeaders,
                        body: JSON.stringify({ ownerEmail, gmailEmail: activeGmail })
                    }
                );
                const data = await res.json();
                const msgs: MessageDetail[] = data?.messages || [];
                setMessages(msgs);

                const unreadIds = msgs
                    .filter((m) => m.isUnread)
                    .map((m) => m.messageId);
                if (unreadIds.length) {
                    await modifyMessages({ messageIds: unreadIds, action: "markRead" });
                    setThreads((prev) =>
                        prev.map((t) =>
                            t.threadId === threadId ? { ...t, unreadCount: 0 } : t
                        )
                    );
                    refreshUnread();
                }
            } catch (e) {
                console.error("[Inbox] open thread failed", e);
            } finally {
                setLoadingThread(false);
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [ownerEmail, activeGmail, authHeaders]
    );

    // -------- Modify (markRead/Unread/archive/trash/labels) --------
    const modifyMessages = async (payload: {
        messageIds?: string[];
        threadIds?: string[];
        action?: "markRead" | "markUnread" | "archive" | "trash";
        addLabelIds?: string[];
        removeLabelIds?: string[];
    }) => {
        try {
            await fetch(`${API_BASE_URL}/gmail/inbox/modify`, {
                method: "POST",
                headers: authHeaders,
                body: JSON.stringify({ ownerEmail, gmailEmail: activeGmail, ...payload })
            });
        } catch (e) {
            console.error("[Inbox] modify failed", e);
        }
    };

    const starThreads = async (ids: string[], star: boolean) => {
        try {
            await fetch(`${API_BASE_URL}/gmail/inbox/star`, {
                method: "POST",
                headers: authHeaders,
                body: JSON.stringify({
                    ownerEmail,
                    gmailEmail: activeGmail,
                    threadIds: ids,
                    star
                })
            });
            setThreads((prev) =>
                prev.map((t) =>
                    ids.includes(t.threadId)
                        ? {
                              ...t,
                              labels: star
                                  ? Array.from(new Set([...t.labels, "STARRED"]))
                                  : t.labels.filter((l) => l !== "STARRED")
                          }
                        : t
                )
            );
        } catch (e) {
            console.error("[Inbox] star failed", e);
        }
    };

    // -------- Bulk actions --------
    const toggleBulk = (id: string) => {
        setBulkSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const bulkAction = async (action: "markRead" | "markUnread" | "archive" | "trash") => {
        const ids = Array.from(bulkSelected);
        if (!ids.length) return;
        if (action === "trash" && !window.confirm(`Move ${ids.length} thread(s) to Trash?`)) return;
        setBusy(true);
        await modifyMessages({ threadIds: ids, action });
        if (action === "archive" || action === "trash") {
            setThreads((prev) => prev.filter((t) => !bulkSelected.has(t.threadId)));
            if (selectedThreadId && bulkSelected.has(selectedThreadId)) {
                setSelectedThreadId(null);
                setMessages([]);
            }
        } else if (action === "markRead") {
            setThreads((prev) =>
                prev.map((t) =>
                    bulkSelected.has(t.threadId) ? { ...t, unreadCount: 0 } : t
                )
            );
        } else if (action === "markUnread") {
            setThreads((prev) =>
                prev.map((t) =>
                    bulkSelected.has(t.threadId)
                        ? { ...t, unreadCount: Math.max(1, t.unreadCount) }
                        : t
                )
            );
        }
        setBulkSelected(new Set());
        setBusy(false);
        refreshUnread();
    };

    const archiveCurrent = async () => {
        if (!selectedThreadId) return;
        setBusy(true);
        await modifyMessages({ threadIds: [selectedThreadId], action: "archive" });
        setThreads((prev) => prev.filter((t) => t.threadId !== selectedThreadId));
        setSelectedThreadId(null);
        setMessages([]);
        setBusy(false);
        refreshUnread();
    };

    const trashCurrent = async () => {
        if (!selectedThreadId) return;
        if (!window.confirm("Move thread to Trash?")) return;
        setBusy(true);
        await modifyMessages({ threadIds: [selectedThreadId], action: "trash" });
        setThreads((prev) => prev.filter((t) => t.threadId !== selectedThreadId));
        setSelectedThreadId(null);
        setMessages([]);
        setBusy(false);
        refreshUnread();
    };

    const markUnreadCurrent = async () => {
        if (!selectedThreadId) return;
        await modifyMessages({ threadIds: [selectedThreadId], action: "markUnread" });
        setThreads((prev) =>
            prev.map((t) =>
                t.threadId === selectedThreadId
                    ? { ...t, unreadCount: Math.max(1, t.unreadCount) }
                    : t
            )
        );
        refreshUnread();
    };

    // -------- Attachment download --------
    const downloadAttachment = async (
        msg: MessageDetail,
        att: MessageDetail["attachments"][number]
    ) => {
        try {
            const res = await fetch(
                `${API_BASE_URL}/gmail/inbox/message/${encodeURIComponent(
                    msg.messageId
                )}/attachment/${encodeURIComponent(att.attachmentId)}`,
                {
                    method: "POST",
                    headers: authHeaders,
                    body: JSON.stringify({ ownerEmail, gmailEmail: activeGmail })
                }
            );
            const data = await res.json();
            if (data?.url) window.open(data.url, "_blank", "noopener,noreferrer");
        } catch (e) {
            console.error("[Inbox] attachment fetch failed", e);
        }
    };

    // -------- Compose --------
    const openCompose = (mode: ComposeMode, msg?: MessageDetail) => {
        if (mode === "new") {
            setCompose({
                mode,
                to: "",
                cc: "",
                bcc: "",
                subject: "",
                body: "",
                attachments: [],
                showCcBcc: false
            });
            return;
        }
        if (!msg) return;
        const allRecipients = [
            extractEmail(msg.from),
            ...msg.to.map(extractEmail),
            ...msg.cc.map(extractEmail)
        ]
            .filter(Boolean)
            .filter((e) => e.toLowerCase() !== activeGmail.toLowerCase());
        const dedupe = Array.from(new Set(allRecipients));
        const subj = msg.subject || "";
        const reSubject = subj.startsWith("Re:") ? subj : `Re: ${subj}`;
        const fwSubject = subj.startsWith("Fwd:") ? subj : `Fwd: ${subj}`;
        const quoted = buildQuotedBody(msg);

        if (mode === "reply") {
            setCompose({
                mode,
                inReplyToMsgId: msg.messageId,
                threadId: msg.threadId,
                to: msg.replyTo ? extractEmail(msg.replyTo) : extractEmail(msg.from),
                cc: "",
                bcc: "",
                subject: reSubject,
                body: quoted,
                attachments: [],
                showCcBcc: false
            });
        } else if (mode === "replyAll") {
            const primary = msg.replyTo ? extractEmail(msg.replyTo) : extractEmail(msg.from);
            const cc = dedupe.filter((e) => e !== primary);
            setCompose({
                mode,
                inReplyToMsgId: msg.messageId,
                threadId: msg.threadId,
                to: primary,
                cc: cc.join(", "),
                bcc: "",
                subject: reSubject,
                body: quoted,
                attachments: [],
                showCcBcc: cc.length > 0
            });
        } else if (mode === "forward") {
            setCompose({
                mode,
                inReplyToMsgId: msg.messageId,
                threadId: undefined,
                to: "",
                cc: "",
                bcc: "",
                subject: fwSubject,
                body: `\n\n---------- Forwarded message ----------\nFrom: ${msg.from}\nDate: ${
                    msg.date ? new Date(msg.date).toLocaleString() : ""
                }\nSubject: ${msg.subject}\nTo: ${msg.to.join(", ")}\n\n${msg.bodyText || msg.snippet || ""}`,
                attachments: [],
                showCcBcc: false
            });
        }
    };

    const sendCompose = async () => {
        if (!compose) return;
        if (!compose.to.trim() || !compose.subject.trim()) {
            alert("Recipient and subject are required.");
            return;
        }
        setBusy(true);
        try {
            const fd = new FormData();
            fd.append("ownerEmail", ownerEmail);
            fd.append("gmailEmail", activeGmail);
            fd.append("to", compose.to);
            if (compose.cc) fd.append("cc", compose.cc);
            if (compose.bcc) fd.append("bcc", compose.bcc);
            fd.append("subject", compose.subject);
            fd.append("text", compose.body);
            // Light HTML render: convert newlines.
            fd.append("html", compose.body
                .split("\n")
                .map((l) => escapeHtml(l))
                .join("<br>"));
            if (compose.threadId) fd.append("threadId", compose.threadId);
            if (compose.inReplyToMsgId) {
                const target = messages.find((m) => m.messageId === compose.inReplyToMsgId);
                if (target?.rfcMessageId) {
                    fd.append("inReplyTo", target.rfcMessageId);
                    fd.append("references", target.rfcMessageId);
                }
            }
            for (const f of compose.attachments) fd.append("attachments", f);

            const res = await fetch(`${API_BASE_URL}/gmail/inbox/compose`, {
                method: "POST",
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                body: fd
            });
            const data = await res.json();
            if (!res.ok) {
                alert(data?.error || "Send failed");
                return;
            }
            setCompose(null);
            if (selectedThreadId) await openThread(selectedThreadId);
        } finally {
            setBusy(false);
        }
    };

    // -------- Keyboard shortcuts --------
    useEffect(() => {
        if (!isOpsRole) return;
        const onKey = (e: KeyboardEvent) => {
            if (compose) return;
            const target = e.target as HTMLElement;
            if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
            if (e.key === "/") {
                e.preventDefault();
                searchInputRef.current?.focus();
            } else if (e.key === "c") {
                e.preventDefault();
                openCompose("new");
            } else if (e.key === "j" || e.key === "k") {
                e.preventDefault();
                if (!threads.length) return;
                const idx = threads.findIndex((t) => t.threadId === selectedThreadId);
                const nextIdx = e.key === "j" ? Math.min(threads.length - 1, idx + 1) : Math.max(0, idx - 1);
                const target = threads[nextIdx === -1 ? 0 : nextIdx];
                if (target) openThread(target.threadId);
            } else if (e.key === "e" && selectedThreadId) {
                e.preventDefault();
                archiveCurrent();
            } else if (e.key === "#" && selectedThreadId) {
                e.preventDefault();
                trashCurrent();
            } else if (e.key === "r" && selectedThreadId) {
                const last = messages[messages.length - 1];
                if (last) openCompose("reply", last);
            } else if (e.key === "s" && selectedThreadId) {
                const t = threads.find((x) => x.threadId === selectedThreadId);
                if (t) starThreads([t.threadId], !t.labels.includes("STARRED"));
            } else if (e.key === "Escape") {
                setSelectedThreadId(null);
                setMessages([]);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [compose, threads, selectedThreadId, messages]);

    // -------- Render --------
    // Role gate — only operations/operator users see the inbox.
    if (!isOpsRole) {
        return <ForbiddenScreen role={role} />;
    }

    if (!ownerEmail) {
        return <div className="p-6 text-gray-500">Sign in to view your inbox.</div>;
    }

    if (!accounts.length) {
        return (
            <div className="p-8 text-center max-w-xl mx-auto">
                <Mail size={48} className="mx-auto text-gray-400 mb-3" />
                <h2 className="text-xl font-semibold text-gray-800 mb-2">
                    No Gmail account connected
                </h2>
                <p className="text-gray-600 mb-4">
                    Connect a Gmail account from your Profile to see your inbox here.
                </p>
                <a
                    href="/profile"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md text-sm font-semibold"
                >
                    Go to Profile
                </a>
            </div>
        );
    }

    const hasBulk = bulkSelected.size > 0;

    return (
        <div className="h-[calc(100vh-64px)] flex flex-col bg-white">
            {/* Top bar */}
            <div className="border-b border-gray-200 px-3 sm:px-4 py-2.5 flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-2 text-gray-800 font-semibold">
                    <InboxIcon size={20} className="text-orange-600" />
                    <span>Inbox</span>
                    {unreadCount > 0 && (
                        <span className="ml-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] rounded-full bg-orange-600 text-white font-semibold">
                            {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                    )}
                </div>

                <select
                    value={activeGmail}
                    onChange={(e) => setActiveGmail(e.target.value)}
                    className="border border-gray-300 rounded-md text-sm px-2 py-1 bg-white"
                >
                    {accounts.map((a) => (
                        <option key={a.email} value={a.email}>
                            {a.email}
                        </option>
                    ))}
                </select>

                <select
                    value={labelId}
                    onChange={(e) => setLabelId(e.target.value)}
                    className="border border-gray-300 rounded-md text-sm px-2 py-1 bg-white"
                >
                    <option value="INBOX">Inbox</option>
                    <option value="UNREAD">Unread</option>
                    <option value="STARRED">Starred</option>
                    <option value="SENT">Sent</option>
                    <option value="DRAFT">Drafts</option>
                    <option value="SPAM">Spam</option>
                    <option value="TRASH">Trash</option>
                    <option value="">All Mail</option>
                </select>

                <div className="flex-1 min-w-[200px] max-w-2xl">
                    <div className="relative">
                        <Search
                            size={14}
                            className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search mail (Gmail syntax: from:, has:attachment, before:...)"
                            className="w-full border border-gray-300 rounded-md text-sm pl-7 pr-8 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                        {query && (
                            <button
                                onClick={() => setQuery("")}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>

                <button
                    onClick={() => openCompose("new")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded-md font-semibold"
                    title="Compose (c)"
                >
                    <Pencil size={14} /> Compose
                </button>

                <button
                    onClick={() => loadThreads(true)}
                    className="p-2 rounded-md hover:bg-gray-100 text-gray-600"
                    title="Refresh"
                >
                    {loadingThreads ? (
                        <Loader2 size={16} className="animate-spin" />
                    ) : (
                        <RefreshCcw size={16} />
                    )}
                </button>
            </div>

            {/* Bulk action bar */}
            {hasBulk && (
                <div className="bg-orange-50 border-b border-orange-200 px-4 py-2 flex items-center gap-2 text-sm">
                    <span className="font-semibold text-orange-800">
                        {bulkSelected.size} selected
                    </span>
                    <button
                        onClick={() => bulkAction("markRead")}
                        disabled={busy}
                        className="px-2 py-1 rounded hover:bg-white border border-orange-200 disabled:opacity-50"
                    >
                        Mark read
                    </button>
                    <button
                        onClick={() => bulkAction("markUnread")}
                        disabled={busy}
                        className="px-2 py-1 rounded hover:bg-white border border-orange-200 disabled:opacity-50"
                    >
                        Mark unread
                    </button>
                    <button
                        onClick={() => bulkAction("archive")}
                        disabled={busy}
                        className="px-2 py-1 rounded hover:bg-white border border-orange-200 disabled:opacity-50"
                    >
                        Archive
                    </button>
                    <button
                        onClick={() => bulkAction("trash")}
                        disabled={busy}
                        className="px-2 py-1 rounded hover:bg-red-50 border border-red-200 text-red-700 disabled:opacity-50"
                    >
                        Trash
                    </button>
                    <button
                        onClick={() => starThreads(Array.from(bulkSelected), true)}
                        className="px-2 py-1 rounded hover:bg-white border border-orange-200"
                    >
                        Star
                    </button>
                    <button
                        onClick={() => setBulkSelected(new Set())}
                        className="ml-auto px-2 py-1 rounded text-gray-600 hover:bg-white"
                    >
                        Clear
                    </button>
                </div>
            )}

            {error && (
                <div className="bg-red-50 border-b border-red-200 text-red-700 text-sm px-4 py-2 flex items-center gap-2">
                    <AlertCircle size={14} /> {error}
                </div>
            )}

            {/* Body: list + reader */}
            <div className="flex-1 flex overflow-hidden">
                {/* Thread list */}
                <div
                    className={`flex-1 border-r border-gray-200 overflow-y-auto bg-white ${
                        selectedThreadId ? "hidden md:hidden" : "block"
                    }`}
                >
                    {loadingThreads && threads.length === 0 ? (
                        <ThreadListSkeleton />
                    ) : threads.length === 0 ? (
                        <div className="p-8 text-sm text-gray-500 text-center">
                            <Mail size={32} className="mx-auto mb-2 text-gray-300" />
                            <div>No messages here.</div>
                            {submittedQuery && (
                                <div className="text-xs mt-1">Try clearing the search.</div>
                            )}
                        </div>
                    ) : (
                        threads.map((t) => (
                            <ThreadRow
                                key={t.threadId}
                                thread={t}
                                isActive={t.threadId === selectedThreadId}
                                isSelected={bulkSelected.has(t.threadId)}
                                onSelect={() => openThread(t.threadId)}
                                onToggleBulk={() => toggleBulk(t.threadId)}
                                onToggleStar={() =>
                                    starThreads(
                                        [t.threadId],
                                        !t.labels.includes("STARRED")
                                    )
                                }
                            />
                        ))
                    )}
                    {nextPageToken && !loadingThreads && (
                        <button
                            onClick={() => loadThreads(false, nextPageToken)}
                            className="w-full py-2 text-sm text-orange-600 hover:bg-orange-50"
                        >
                            Load more
                        </button>
                    )}
                    {loadingThreads && threads.length > 0 && (
                        <div className="py-3 text-center text-xs text-gray-400">
                            <Loader2 size={14} className="inline animate-spin mr-1" />
                            Loading...
                        </div>
                    )}
                </div>

                {/* Reader */}
                <div
                    className={`flex-1 overflow-y-auto bg-gray-50 ${
                        selectedThreadId ? "block" : "hidden"
                    }`}
                >
                    {!selectedThreadId ? (
                        <div className="h-full hidden md:flex items-center justify-center text-gray-400">
                            <div className="text-center">
                                <Mail size={48} className="mx-auto mb-2 text-gray-300" />
                                <div>Select a conversation to read.</div>
                                <div className="text-xs mt-1">
                                    Tip: <kbd className="px-1 py-0.5 bg-gray-200 rounded">j</kbd>{" "}
                                    /{" "}
                                    <kbd className="px-1 py-0.5 bg-gray-200 rounded">k</kbd>{" "}
                                    to navigate,{" "}
                                    <kbd className="px-1 py-0.5 bg-gray-200 rounded">c</kbd>{" "}
                                    to compose.
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-4xl mx-auto p-3 sm:p-6">
                            {/* Back to inbox */}
                            <button
                                onClick={() => {
                                    setSelectedThreadId(null);
                                    setMessages([]);
                                }}
                                className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-3"
                            >
                                <ArrowLeft size={14} /> Back to inbox
                            </button>

                            {loadingThread && messages.length === 0 ? (
                                <ThreadSkeleton />
                            ) : messages.length > 0 ? (
                                <>
                                    {/* Sticky thread header */}
                                    <div className="flex items-start justify-between mb-3 sticky top-0 bg-gray-50 py-2 z-10">
                                        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 pr-3">
                                            {messages[0].subject || "(no subject)"}
                                        </h2>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <IconButton
                                                onClick={() =>
                                                    starThreads(
                                                        [selectedThreadId],
                                                        !threads
                                                            .find((t) => t.threadId === selectedThreadId)
                                                            ?.labels.includes("STARRED")
                                                    )
                                                }
                                                title="Star (s)"
                                            >
                                                <Star
                                                    size={16}
                                                    className={
                                                        threads
                                                            .find((t) => t.threadId === selectedThreadId)
                                                            ?.labels.includes("STARRED")
                                                            ? "fill-amber-400 text-amber-500"
                                                            : "text-gray-500"
                                                    }
                                                />
                                            </IconButton>
                                            <IconButton onClick={markUnreadCurrent} title="Mark unread">
                                                <CheckCheck size={16} className="text-gray-600" />
                                            </IconButton>
                                            <IconButton onClick={archiveCurrent} disabled={busy} title="Archive (e)">
                                                <Archive size={16} className="text-gray-600" />
                                            </IconButton>
                                            <IconButton onClick={trashCurrent} disabled={busy} title="Trash (#)" danger>
                                                <Trash2 size={16} className="text-red-600" />
                                            </IconButton>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {messages.map((m, i) => (
                                            <MessageCard
                                                key={m.messageId}
                                                msg={m}
                                                defaultExpanded={i === messages.length - 1}
                                                onReply={() => openCompose("reply", m)}
                                                onReplyAll={() => openCompose("replyAll", m)}
                                                onForward={() => openCompose("forward", m)}
                                                onDownload={(att) => downloadAttachment(m, att)}
                                            />
                                        ))}
                                    </div>
                                </>
                            ) : null}
                        </div>
                    )}
                </div>
            </div>

            {/* Compose modal */}
            {compose && (
                <ComposeModal
                    state={compose}
                    setState={setCompose}
                    onSend={sendCompose}
                    onClose={() => setCompose(null)}
                    busy={busy}
                />
            )}
        </div>
    );
}

// =========================
// Sub-components
// =========================
function IconButton({
    children,
    onClick,
    title,
    disabled,
    danger
}: {
    children: React.ReactNode;
    onClick: () => void;
    title?: string;
    disabled?: boolean;
    danger?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={`p-2 rounded border border-transparent disabled:opacity-50 ${
                danger ? "hover:bg-red-50 hover:border-red-200" : "hover:bg-white hover:border-gray-200"
            }`}
        >
            {children}
        </button>
    );
}

function Avatar({ from, size = 36 }: { from: string; size?: number }) {
    const color = hashColor(extractEmail(from) || from);
    return (
        <div
            className={`flex-shrink-0 ${color} text-white rounded-full flex items-center justify-center font-semibold`}
            style={{ width: size, height: size, fontSize: size * 0.4 }}
        >
            {initialOf(from)}
        </div>
    );
}

function ThreadRow({
    thread: t,
    isActive,
    isSelected,
    onSelect,
    onToggleBulk,
    onToggleStar
}: {
    thread: ThreadSummary;
    isActive: boolean;
    isSelected: boolean;
    onSelect: () => void;
    onToggleBulk: () => void;
    onToggleStar: () => void;
}) {
    const isUnread = t.unreadCount > 0;
    const isStarred = t.labels.includes("STARRED");

    const extraLabels = t.labels.filter(
        (l) => !["INBOX", "UNREAD", "IMPORTANT", "STARRED", "CATEGORY_PERSONAL", "CATEGORY_PROMOTIONS", "CATEGORY_SOCIAL", "CATEGORY_UPDATES", "CATEGORY_FORUMS"].includes(l)
    );

    return (
        <div
            onClick={onSelect}
            className={`group cursor-pointer w-full text-left px-3 py-2 border-b border-gray-100 transition-colors flex items-center gap-3 ${
                isActive
                    ? "bg-orange-50 border-l-4 border-l-orange-500"
                    : isUnread
                    ? "bg-white hover:shadow-sm hover:z-10 hover:border-gray-200"
                    : "bg-gray-50/60 hover:shadow-sm hover:z-10 hover:border-gray-200"
            }`}
        >
            <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => {
                    e.stopPropagation();
                    onToggleBulk();
                }}
                onClick={(e) => e.stopPropagation()}
                className="h-3.5 w-3.5 rounded border-gray-300 text-orange-600 focus:ring-orange-500 flex-shrink-0"
            />
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onToggleStar();
                }}
                className="text-gray-400 hover:text-amber-500 flex-shrink-0"
                title="Star"
            >
                <Star
                    size={15}
                    className={isStarred ? "fill-amber-400 text-amber-500" : ""}
                />
            </button>

            {/* Sender */}
            <div
                className={`w-[180px] flex-shrink-0 text-sm truncate ${
                    isUnread ? "font-bold text-gray-900" : "text-gray-700"
                }`}
                title={t.fromLatest}
            >
                {extractName(t.fromLatest) || "(unknown)"}
                {t.messageCount > 1 && (
                    <span className="ml-1 text-xs text-gray-500 font-normal">
                        ({t.messageCount})
                    </span>
                )}
            </div>

            {/* Subject + snippet (single line, gmail style) */}
            <div className="flex-1 min-w-0 flex items-center gap-2 overflow-hidden">
                <span
                    className={`text-sm truncate ${
                        isUnread ? "font-bold text-gray-900" : "text-gray-700"
                    }`}
                >
                    {t.subject || "(no subject)"}
                </span>
                {extraLabels.slice(0, 2).map((l) => {
                    const [cls, txt] = labelChip(l);
                    return (
                        <span
                            key={l}
                            className={`text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 ${cls}`}
                        >
                            {txt}
                        </span>
                    );
                })}
                {t.snippet && (
                    <span className="text-sm text-gray-500 truncate font-normal">
                        — {t.snippet}
                    </span>
                )}
            </div>

            {/* Attachments */}
            {t.hasAttachments && (
                <Paperclip size={13} className="text-gray-500 flex-shrink-0" />
            )}

            {/* Date */}
            <div
                className={`w-[80px] flex-shrink-0 text-right text-xs whitespace-nowrap ${
                    isUnread ? "font-semibold text-gray-900" : "text-gray-500"
                }`}
                title={t.lastMessageAt ? new Date(t.lastMessageAt).toLocaleString() : ""}
            >
                {formatRelative(t.lastMessageAt)}
            </div>
        </div>
    );
}

function MessageCard({
    msg,
    defaultExpanded,
    onReply,
    onReplyAll,
    onForward,
    onDownload
}: {
    msg: MessageDetail;
    defaultExpanded: boolean;
    onReply: () => void;
    onReplyAll: () => void;
    onForward: () => void;
    onDownload: (att: MessageDetail["attachments"][number]) => void;
}) {
    const [expanded, setExpanded] = useState(defaultExpanded);
    const [showImages, setShowImages] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const blockedImages = useMemo(() => {
        if (!msg.bodyHtml) return 0;
        const m = msg.bodyHtml.match(/<img\b[^>]*\ssrc=["']https?:\/\//gi);
        return m ? m.length : 0;
    }, [msg.bodyHtml]);

    useEffect(() => {
        if (!expanded || !iframeRef.current || !msg.bodyHtml) return;
        const doc = iframeRef.current.contentDocument;
        if (!doc) return;
        const html = showImages
            ? msg.bodyHtml
            : msg.bodyHtml.replace(
                  /<img\b([^>]*?)\ssrc=["'](https?:\/\/[^"']+)["']/gi,
                  '<img$1 data-blocked-src="$2"'
              );
        doc.open();
        doc.write(`<!doctype html><html><head><base target="_blank"><style>
          body{margin:0;padding:12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;color:#1f2937;line-height:1.55;}
          a{color:#2563eb;}
          img{max-width:100%;height:auto;}
          table{max-width:100%;border-collapse:collapse;}
          blockquote{margin:0;padding-left:12px;border-left:3px solid #e5e7eb;color:#6b7280;}
        </style></head><body>${html}</body></html>`);
        doc.close();

        const resize = () => {
            if (!iframeRef.current || !doc.body) return;
            iframeRef.current.style.height = doc.body.scrollHeight + 24 + "px";
        };
        resize();
        const t = setTimeout(resize, 200);
        return () => clearTimeout(t);
    }, [expanded, msg.bodyHtml, showImages]);

    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <button
                onClick={() => setExpanded((v) => !v)}
                className="w-full flex items-start gap-3 px-3 sm:px-4 py-3 text-left hover:bg-gray-50 rounded-t-lg"
            >
                <Avatar from={msg.from} size={40} />
                <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-gray-900 truncate">
                            {extractName(msg.from)}
                        </div>
                        <div
                            className="text-[11px] text-gray-500 whitespace-nowrap"
                            title={msg.date ? new Date(msg.date).toLocaleString() : ""}
                        >
                            {msg.date ? formatRelative(msg.date) : ""}
                        </div>
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                        &lt;{extractEmail(msg.from)}&gt; · to {msg.to.slice(0, 2).map(extractName).join(", ")}
                        {msg.to.length > 2 && ` +${msg.to.length - 2}`}
                        {msg.cc.length > 0 && `, cc ${msg.cc.slice(0, 1).map(extractName).join("")}${
                            msg.cc.length > 1 ? ` +${msg.cc.length - 1}` : ""
                        }`}
                    </div>
                    {!expanded && (
                        <div className="text-xs text-gray-500 truncate mt-1">{msg.snippet}</div>
                    )}
                </div>
            </button>

            {expanded && (
                <div className="border-t border-gray-100 px-3 sm:px-4 py-3">
                    {msg.bodyHtml ? (
                        <>
                            {blockedImages > 0 && (
                                <div className="mb-2 flex items-center gap-2 text-xs bg-yellow-50 border border-yellow-200 text-yellow-800 px-2 py-1 rounded">
                                    <ImageOff size={12} />
                                    {blockedImages} image{blockedImages > 1 ? "s" : ""} blocked
                                    <button
                                        onClick={() => setShowImages((v) => !v)}
                                        className="ml-auto inline-flex items-center gap-1 text-yellow-900 underline"
                                    >
                                        <ImageIcon size={12} />
                                        {showImages ? "Hide images" : "Show images"}
                                    </button>
                                </div>
                            )}
                            <iframe
                                ref={iframeRef}
                                sandbox="allow-popups allow-popups-to-escape-sandbox"
                                className="w-full border-0"
                                title={`message-${msg.messageId}`}
                            />
                        </>
                    ) : (
                        <pre className="whitespace-pre-wrap break-words text-sm text-gray-800 font-sans">
                            {msg.bodyText || msg.snippet}
                        </pre>
                    )}

                    {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                            {msg.attachments.map((a) => (
                                <button
                                    key={a.attachmentId}
                                    onClick={() => onDownload(a)}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-md border border-gray-300 hover:bg-gray-50"
                                    title={`${formatBytes(a.size)} · ${a.mimetype}`}
                                >
                                    <Paperclip size={12} className="text-gray-500" />
                                    <span className="max-w-[220px] truncate">
                                        {a.filename || "attachment"}
                                    </span>
                                    <span className="text-gray-400">{formatBytes(a.size)}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="mt-3 flex items-center gap-2">
                        <button
                            onClick={onReply}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md bg-gray-800 hover:bg-gray-900 text-white"
                            title="Reply (r)"
                        >
                            <Reply size={14} /> Reply
                        </button>
                        <button
                            onClick={onReplyAll}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border border-gray-300 hover:bg-gray-50"
                        >
                            <ReplyAll size={14} /> Reply all
                        </button>
                        <button
                            onClick={onForward}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border border-gray-300 hover:bg-gray-50"
                        >
                            <Forward size={14} /> Forward
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function ComposeModal({
    state,
    setState,
    onSend,
    onClose,
    busy
}: {
    state: ComposeState;
    setState: React.Dispatch<React.SetStateAction<ComposeState | null>>;
    onSend: () => void;
    onClose: () => void;
    busy: boolean;
}) {
    const fileInput = useRef<HTMLInputElement | null>(null);
    const totalSize = state.attachments.reduce((s, f) => s + f.size, 0);

    const handleFiles = (files: FileList | null) => {
        if (!files) return;
        const arr = Array.from(files);
        setState((p) => (p ? { ...p, attachments: [...p.attachments, ...arr] } : p));
    };

    const removeAttachment = (idx: number) => {
        setState((p) =>
            p ? { ...p, attachments: p.attachments.filter((_, i) => i !== idx) } : p
        );
    };

    const titleMap = {
        new: "New message",
        reply: "Reply",
        replyAll: "Reply all",
        forward: "Forward"
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end sm:justify-center bg-black/30 p-0 sm:p-4">
            <div className="bg-white w-full sm:w-[640px] sm:max-w-[95vw] sm:rounded-lg shadow-2xl flex flex-col max-h-[90vh]">
                <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-800">{titleMap[state.mode]}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
                        <X size={18} />
                    </button>
                </div>

                <div className="px-4 py-3 space-y-2 overflow-y-auto">
                    <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-500 w-12 flex-shrink-0">To</label>
                        <input
                            type="text"
                            value={state.to}
                            onChange={(e) =>
                                setState((p) => (p ? { ...p, to: e.target.value } : p))
                            }
                            placeholder="recipient@example.com"
                            className="flex-1 border-0 border-b border-gray-200 focus:border-orange-500 focus:outline-none text-sm py-1"
                        />
                        {!state.showCcBcc && (
                            <button
                                onClick={() =>
                                    setState((p) => (p ? { ...p, showCcBcc: true } : p))
                                }
                                className="text-xs text-gray-500 hover:text-gray-800"
                            >
                                Cc/Bcc
                            </button>
                        )}
                    </div>
                    {state.showCcBcc && (
                        <>
                            <div className="flex items-center gap-2">
                                <label className="text-xs text-gray-500 w-12 flex-shrink-0">Cc</label>
                                <input
                                    type="text"
                                    value={state.cc}
                                    onChange={(e) =>
                                        setState((p) => (p ? { ...p, cc: e.target.value } : p))
                                    }
                                    className="flex-1 border-0 border-b border-gray-200 focus:border-orange-500 focus:outline-none text-sm py-1"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="text-xs text-gray-500 w-12 flex-shrink-0">Bcc</label>
                                <input
                                    type="text"
                                    value={state.bcc}
                                    onChange={(e) =>
                                        setState((p) => (p ? { ...p, bcc: e.target.value } : p))
                                    }
                                    className="flex-1 border-0 border-b border-gray-200 focus:border-orange-500 focus:outline-none text-sm py-1"
                                />
                            </div>
                        </>
                    )}
                    <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-500 w-12 flex-shrink-0">Subject</label>
                        <input
                            type="text"
                            value={state.subject}
                            onChange={(e) =>
                                setState((p) => (p ? { ...p, subject: e.target.value } : p))
                            }
                            className="flex-1 border-0 border-b border-gray-200 focus:border-orange-500 focus:outline-none text-sm py-1 font-medium"
                        />
                    </div>
                    <textarea
                        value={state.body}
                        onChange={(e) =>
                            setState((p) => (p ? { ...p, body: e.target.value } : p))
                        }
                        rows={10}
                        className="w-full border-0 focus:outline-none text-sm resize-y min-h-[160px] mt-2"
                        placeholder="Write your message..."
                    />

                    {state.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                            {state.attachments.map((f, i) => (
                                <div
                                    key={i}
                                    className="inline-flex items-center gap-2 px-2 py-1 text-xs rounded border border-gray-300 bg-gray-50"
                                >
                                    <Paperclip size={12} />
                                    <span className="max-w-[180px] truncate">{f.name}</span>
                                    <span className="text-gray-400">{formatBytes(f.size)}</span>
                                    <button
                                        onClick={() => removeAttachment(i)}
                                        className="text-gray-400 hover:text-red-600"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                            <div className="text-xs text-gray-400 self-center">
                                Total: {formatBytes(totalSize)}
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-4 py-3 border-t border-gray-200 flex items-center gap-2">
                    <button
                        onClick={onSend}
                        disabled={busy || !state.to.trim() || !state.subject.trim()}
                        className="inline-flex items-center gap-1 px-4 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded-md font-semibold disabled:opacity-50"
                    >
                        {busy ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : (
                            <Send size={14} />
                        )}
                        Send
                    </button>
                    <input
                        ref={fileInput}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => handleFiles(e.target.files)}
                    />
                    <button
                        onClick={() => fileInput.current?.click()}
                        title="Attach files"
                        className="p-2 rounded hover:bg-gray-100 text-gray-600"
                    >
                        <Paperclip size={16} />
                    </button>
                    <div className="ml-auto text-xs text-gray-400">
                        Max 25 MB per file, 10 files
                    </div>
                </div>
            </div>
        </div>
    );
}

function ForbiddenScreen({ role }: { role: string | undefined }) {
    return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
            <div className="max-w-md w-full text-center bg-white rounded-xl border border-gray-200 shadow-sm p-8">
                <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-3">
                    <ShieldOff size={22} className="text-red-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">
                    Inbox is restricted
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                    The unified inbox is currently available to operations team members only.
                    {role && role !== "operations" ? (
                        <>
                            {" "}
                            You are signed in as <span className="font-medium">{role}</span>.
                        </>
                    ) : null}
                </p>
                <a
                    href="/"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white text-sm rounded-md font-semibold"
                >
                    Back to dashboard
                </a>
            </div>
        </div>
    );
}

function ThreadListSkeleton() {
    return (
        <div className="p-2 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
                <div
                    key={i}
                    className="flex items-start gap-2 px-2 py-2 animate-pulse"
                >
                    <div className="h-3.5 w-3.5 mt-1.5 bg-gray-200 rounded" />
                    <div className="h-3.5 w-3.5 mt-1 bg-gray-200 rounded" />
                    <div className="h-8 w-8 bg-gray-200 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                        <div className="h-3 bg-gray-200 rounded w-3/4" />
                        <div className="h-3 bg-gray-200 rounded w-2/3" />
                        <div className="h-2 bg-gray-200 rounded w-full" />
                    </div>
                </div>
            ))}
        </div>
    );
}

function ThreadSkeleton() {
    return (
        <div className="space-y-3 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-2/3 mb-2" />
            {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-gray-200 rounded-full" />
                        <div className="flex-1 space-y-1.5">
                            <div className="h-3 bg-gray-200 rounded w-1/3" />
                            <div className="h-2.5 bg-gray-200 rounded w-1/2" />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <div className="h-3 bg-gray-200 rounded w-full" />
                        <div className="h-3 bg-gray-200 rounded w-5/6" />
                        <div className="h-3 bg-gray-200 rounded w-3/4" />
                    </div>
                </div>
            ))}
        </div>
    );
}
