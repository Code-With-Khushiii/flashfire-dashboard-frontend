import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, RefreshCw, Search, ChevronDown, ChevronRight, AlertTriangle, AlertCircle,
  FileText, User as UserIcon, Shield, KeyRound, LogIn, Edit3, Trash2, PlusCircle,
  Eye, EyeOff, Briefcase, X, Filter,
} from 'lucide-react';

interface Actor {
  email: string;
  name: string;
  role: string;
  source: string;
}

interface DiffEntry {
  field: string;
  before: unknown;
  after: unknown;
}

interface ActivityEntry {
  _id: string;
  actor: Actor;
  action: string;
  category: string;
  targetType: string;
  targetId: string;
  targetLabel: string;
  summary: string;
  diff: DiffEntry[] | { before?: unknown; after?: unknown } | null;
  context: Record<string, unknown> | null;
  ip: string;
  userAgent: string;
  severity: 'info' | 'warning' | 'critical';
  createdAt: string;
}

interface ApiResponse {
  items: ActivityEntry[];
  nextCursor: string | null;
  hasMore: boolean;
}

interface Facets {
  categories: string[];
  actions: string[];
  sources: string[];
  actors: { email: string; name: string; role: string }[];
}

interface Props {
  apiBase: string;
  token: string;
}

const PAGE_SIZE = 30;

const ACTION_ICON: Record<string, { icon: typeof FileText; bg: string; fg: string }> = {
  'resume.create':            { icon: PlusCircle, bg: 'bg-emerald-50',  fg: 'text-emerald-600' },
  'resume.update':            { icon: Edit3,      bg: 'bg-blue-50',     fg: 'text-blue-600' },
  'resume.assign':            { icon: UserIcon,   bg: 'bg-purple-50',   fg: 'text-purple-600' },
  'resume.unassign':          { icon: UserIcon,   bg: 'bg-gray-50',     fg: 'text-gray-600' },
  'resume.visibility_toggle': { icon: Eye,        bg: 'bg-amber-50',    fg: 'text-amber-600' },
  'resume.version_change':    { icon: FileText,   bg: 'bg-indigo-50',   fg: 'text-indigo-600' },
  'resume.unlock_key_update': { icon: KeyRound,   bg: 'bg-amber-50',    fg: 'text-amber-600' },
  'user.create':              { icon: PlusCircle, bg: 'bg-emerald-50',  fg: 'text-emerald-600' },
  'user.update':              { icon: Edit3,      bg: 'bg-blue-50',     fg: 'text-blue-600' },
  'user.delete':              { icon: Trash2,     bg: 'bg-rose-50',     fg: 'text-rose-600' },
  'auth.login':               { icon: LogIn,      bg: 'bg-sky-50',      fg: 'text-sky-600' },
  'auth.otp_verify':          { icon: Shield,     bg: 'bg-sky-50',      fg: 'text-sky-600' },
};

function iconFor(action: string, category: string) {
  if (ACTION_ICON[action]) return ACTION_ICON[action];
  if (category === 'resume') return { icon: FileText, bg: 'bg-blue-50', fg: 'text-blue-600' };
  if (category === 'user') return { icon: UserIcon, bg: 'bg-purple-50', fg: 'text-purple-600' };
  if (category === 'auth') return { icon: Shield, bg: 'bg-sky-50', fg: 'text-sky-600' };
  if (category === 'session') return { icon: KeyRound, bg: 'bg-amber-50', fg: 'text-amber-600' };
  if (category === 'job') return { icon: Briefcase, bg: 'bg-teal-50', fg: 'text-teal-600' };
  return { icon: Activity, bg: 'bg-gray-50', fg: 'text-gray-600' };
}

function severityChip(severity: ActivityEntry['severity']) {
  if (severity === 'critical') {
    return { Icon: AlertCircle, label: 'Critical', cls: 'bg-rose-50 text-rose-700 border-rose-200' };
  }
  if (severity === 'warning') {
    return { Icon: AlertTriangle, label: 'Warning', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
  }
  return null;
}

function relativeTime(iso: string) {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function fullTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function actorInitials(actor: Actor) {
  const src = (actor.name || actor.email || 'S').trim();
  const parts = src.split(/[\s@.]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0]?.slice(0, 2) || '??').toUpperCase();
}

function actorDisplay(actor: Actor) {
  if (actor.name && actor.email) return `${actor.name} (${actor.email})`;
  return actor.name || actor.email || 'System';
}

function ActivityRow({ entry }: { entry: ActivityEntry }) {
  const [open, setOpen] = useState(false);
  const { icon: Icon, bg, fg } = iconFor(entry.action, entry.category);
  const sev = severityChip(entry.severity);
  const hasDetails =
    (Array.isArray(entry.diff) && entry.diff.length > 0) ||
    (!!entry.context && Object.keys(entry.context).length > 0);

  return (
    <li
      className="group relative flex items-start gap-4 px-5 py-4 hover:bg-gray-50/80 transition-colors"
      data-id={entry._id}
    >
      <div className={`flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center ${bg}`}>
        <Icon className={`h-5 w-5 ${fg}`} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-sm font-semibold text-gray-900 truncate">
            {entry.summary || entry.action}
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono bg-gray-100 text-gray-600">
            {entry.action}
          </span>
          {sev && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs border ${sev.cls}`}>
              <sev.Icon className="h-3 w-3" /> {sev.label}
            </span>
          )}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 text-white text-[10px] font-bold shadow-sm">
              {actorInitials(entry.actor)}
            </span>
            <span className="text-gray-700 font-medium">{actorDisplay(entry.actor)}</span>
            {entry.actor.role && (
              <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 uppercase tracking-wide text-[10px] font-semibold">
                {entry.actor.role}
              </span>
            )}
            {entry.actor.source && entry.actor.source !== 'optimizer' && (
              <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 uppercase tracking-wide text-[10px] font-semibold">
                {entry.actor.source}
              </span>
            )}
          </span>

          <span className="text-gray-300">·</span>
          <time title={fullTime(entry.createdAt)}>{relativeTime(entry.createdAt)}</time>

          {entry.targetLabel && (
            <>
              <span className="text-gray-300">·</span>
              <span className="truncate max-w-[260px]" title={entry.targetLabel}>
                {entry.targetType ? `${entry.targetType}: ` : ''}{entry.targetLabel}
              </span>
            </>
          )}

          {hasDetails && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="ml-auto inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
            >
              {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              Details
            </button>
          )}
        </div>

        {open && hasDetails && (
          <div className="mt-3 rounded-xl border border-gray-200 bg-white p-4 text-xs space-y-3">
            {Array.isArray(entry.diff) && entry.diff.length > 0 && (
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-2">Changes</div>
                <div className="space-y-1.5">
                  {entry.diff.map((d, i) => (
                    <div key={i} className="grid grid-cols-[120px_1fr_1fr] gap-3 items-start">
                      <div className="font-mono font-semibold text-gray-700 break-all">{d.field}</div>
                      <div className="rounded-md bg-rose-50 border border-rose-100 px-2 py-1 font-mono text-rose-700 break-all whitespace-pre-wrap">
                        {typeof d.before === 'object' ? JSON.stringify(d.before) : String(d.before ?? '∅')}
                      </div>
                      <div className="rounded-md bg-emerald-50 border border-emerald-100 px-2 py-1 font-mono text-emerald-700 break-all whitespace-pre-wrap">
                        {typeof d.after === 'object' ? JSON.stringify(d.after) : String(d.after ?? '∅')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {entry.context && Object.keys(entry.context).length > 0 && (
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-2">Context</div>
                <pre className="rounded-md bg-gray-50 border border-gray-100 p-2 font-mono text-gray-700 overflow-x-auto">
                  {JSON.stringify(entry.context, null, 2)}
                </pre>
              </div>
            )}
            {(entry.ip || entry.userAgent) && (
              <div className="text-[11px] text-gray-500 flex flex-wrap gap-x-4">
                {entry.ip && <span>IP: <span className="font-mono text-gray-700">{entry.ip}</span></span>}
                {entry.userAgent && (
                  <span className="truncate max-w-[600px]">UA: <span className="font-mono text-gray-700">{entry.userAgent}</span></span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

const ActivityMonitor: React.FC<Props> = ({ apiBase, token }) => {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facets, setFacets] = useState<Facets | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('');
  const [action, setAction] = useState('');
  const [severity, setSeverity] = useState('');
  const [actorEmail, setActorEmail] = useState('');

  // Abort prior fetches to avoid race conditions on filter changes.
  const abortRef = useRef<AbortController | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  // Track key dependencies for fetchPage without re-creating the callback.
  const filtersRef = useRef({ debouncedSearch, category, action, severity, actorEmail });
  filtersRef.current = { debouncedSearch, category, action, severity, actorEmail };

  // Debounce text search (250ms).
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const buildUrl = useCallback(
    (afterCursor: string | null) => {
      const f = filtersRef.current;
      const params = new URLSearchParams();
      params.set('limit', String(PAGE_SIZE));
      if (afterCursor) params.set('cursor', afterCursor);
      if (f.debouncedSearch) params.set('q', f.debouncedSearch);
      if (f.category) params.set('category', f.category);
      if (f.action) params.set('action', f.action);
      if (f.severity) params.set('severity', f.severity);
      if (f.actorEmail) params.set('actorEmail', f.actorEmail);
      return `${apiBase}/admin/activity?${params.toString()}`;
    },
    [apiBase]
  );

  const fetchPage = useCallback(
    async (resetting: boolean, afterCursor: string | null) => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      if (resetting) {
        setRefreshing(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      try {
        const res = await fetch(buildUrl(afterCursor), {
          headers: { Authorization: `Bearer ${token}` },
          signal: ctrl.signal,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Failed (${res.status})`);
        }
        const data: ApiResponse = await res.json();
        setEntries((prev) => (resetting ? data.items : [...prev, ...data.items]));
        setCursor(data.nextCursor);
        setHasMore(data.hasMore);
      } catch (err: unknown) {
        if ((err as { name?: string })?.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Failed to load activity');
      } finally {
        if (resetting) {
          setRefreshing(false);
          setInitialLoading(false);
        } else {
          setLoadingMore(false);
        }
      }
    },
    [buildUrl, token]
  );

  // Initial load + reload on filter changes.
  useEffect(() => {
    setEntries([]);
    setCursor(null);
    setHasMore(true);
    setInitialLoading(true);
    fetchPage(true, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, category, action, severity, actorEmail]);

  // Load facets once.
  useEffect(() => {
    fetch(`${apiBase}/admin/activity/facets`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setFacets(data))
      .catch(() => undefined);
  }, [apiBase, token]);

  // Infinite scroll via IntersectionObserver.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || loadingMore || refreshing || initialLoading) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && cursor) {
          fetchPage(false, cursor);
        }
      },
      { rootMargin: '400px 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [cursor, hasMore, loadingMore, refreshing, initialLoading, fetchPage]);

  const grouped = useMemo(() => {
    const groups: { label: string; items: ActivityEntry[] }[] = [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today.getTime() - 86_400_000);
    let current: { label: string; items: ActivityEntry[] } | null = null;
    for (const e of entries) {
      const d = new Date(e.createdAt); d.setHours(0, 0, 0, 0);
      let label: string;
      if (d.getTime() === today.getTime()) label = 'Today';
      else if (d.getTime() === yesterday.getTime()) label = 'Yesterday';
      else label = d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
      if (!current || current.label !== label) {
        current = { label, items: [] };
        groups.push(current);
      }
      current.items.push(e);
    }
    return groups;
  }, [entries]);

  const activeFilterCount =
    (debouncedSearch ? 1 : 0) +
    (category ? 1 : 0) +
    (action ? 1 : 0) +
    (severity ? 1 : 0) +
    (actorEmail ? 1 : 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="h-6 w-6 text-blue-600" />
            Activity Monitor
          </h3>
          <p className="text-sm text-gray-500 mt-1">Every change made by admins, operators and clients — live audit trail.</p>
        </div>
        <button
          type="button"
          onClick={() => fetchPage(true, null)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-md border border-white/20 p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by actor, target, summary…"
              className="w-full pl-10 pr-9 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100"
              >
                <X className="h-3.5 w-3.5 text-gray-400" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
              activeFilterCount > 0
                ? 'border-blue-200 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-blue-600 text-white text-[10px] font-bold px-1">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2 border-t border-gray-100">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All categories</option>
              {(facets?.categories || []).map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All actions</option>
              {(facets?.actions || []).map((a) => (<option key={a} value={a}>{a}</option>))}
            </select>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All severities</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>
            <select
              value={actorEmail}
              onChange={(e) => setActorEmail(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All actors</option>
              {(facets?.actors || []).map((a) => (
                <option key={a.email} value={a.email}>
                  {a.name ? `${a.name} — ${a.email}` : a.email}
                </option>
              ))}
            </select>
            {activeFilterCount > 0 && (
              <div className="md:col-span-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => { setSearch(''); setCategory(''); setAction(''); setSeverity(''); setActorEmail(''); }}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Feed */}
      <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 overflow-hidden">
        {error && (
          <div className="px-6 py-4 bg-rose-50 border-b border-rose-100 text-sm text-rose-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> {error}
          </div>
        )}

        {initialLoading ? (
          <div className="px-6 py-20 flex flex-col items-center text-gray-500">
            <RefreshCw className="h-6 w-6 animate-spin mb-3" />
            <span className="text-sm">Loading activity…</span>
          </div>
        ) : entries.length === 0 ? (
          <div className="px-6 py-20 flex flex-col items-center text-gray-500">
            <EyeOff className="h-8 w-8 mb-3 text-gray-300" />
            <span className="text-sm">No activity matches the current filters.</span>
          </div>
        ) : (
          <>
            {grouped.map((g) => (
              <section key={g.label}>
                <div className="sticky top-0 z-10 px-5 py-2 bg-gradient-to-b from-white via-white to-white/90 backdrop-blur-sm border-b border-gray-100 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  {g.label}
                </div>
                <ul className="divide-y divide-gray-100">
                  {g.items.map((e) => (<ActivityRow key={e._id} entry={e} />))}
                </ul>
              </section>
            ))}

            <div ref={sentinelRef} aria-hidden="true" />
            {loadingMore && (
              <div className="px-6 py-6 flex items-center justify-center text-gray-500 text-sm">
                <RefreshCw className="h-4 w-4 animate-spin mr-2" /> Loading more…
              </div>
            )}
            {!hasMore && entries.length > 0 && (
              <div className="px-6 py-6 text-center text-xs text-gray-400">
                — End of activity history —
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ActivityMonitor;
