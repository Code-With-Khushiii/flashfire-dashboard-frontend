import React, {useState, useEffect, useRef} from 'react';
import { Clock, Sparkles, ShieldCheck, ShieldAlert, ShieldQuestion, HelpCircle, X } from 'lucide-react';
import { Job } from '../types';
import { getTimeAgo } from '../utils/getTimeAgo';
import { useDownloadHighlightStore } from '../state_management/DownloadHighlightStore.ts';
import { useOperationsStore } from '../state_management/Operations.ts';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
interface JobCardProps {
  job: Job;
  onDragStart: (e: React.DragEvent, job: Job) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onEdit: () => void;
  onDelete: () => void;
  showJobModal: boolean;
  setSelectedJob: React.Dispatch<React.SetStateAction<Job | null>>;
  setShowJobModal: React.Dispatch<React.SetStateAction<boolean>>;
  onShowRemovalReason?: (job: Job) => void;
}

const JobCard: React.FC<JobCardProps> = ({
  setSelectedJob,
  setShowJobModal,
  job,
  onDragStart,
  onDragEnd,
  onEdit,
  onDelete,
  onShowRemovalReason,
}) => {
  const { isHighlighting } = useDownloadHighlightStore();
  const { role } = useOperationsStore();
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isRemoved = job.currentStatus?.toLowerCase().startsWith('deleted') || 
                    job.currentStatus?.toLowerCase().startsWith('removed');
  
  const handleClick = () => {
    setShowJobModal(true);
    setSelectedJob(job);
    // Mark optimized resume as seen (fire-and-forget)
    if (hasUnseenResume && job._id) {
      fetch(`${API_BASE}/api/jobs/${job._id}/mark-resume-seen`, { method: 'PATCH' }).catch(() => {});
      job.optimizedResumeSeen = true; // Update local object immediately
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isRemoved || !onShowRemovalReason) return;
    
    longPressTimer.current = setTimeout(() => {
      if (onShowRemovalReason) {
        onShowRemovalReason(job);
      }
    }, 5000);
  };

  const handleMouseUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleMouseLeave = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isRemoved || !onShowRemovalReason) return;
    
    longPressTimer.current = setTimeout(() => {
      if (onShowRemovalReason) {
        onShowRemovalReason(job);
      }
    }, 5000);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);
  const getCompanyDomain = (companyName: string) => {
    return companyName.replace(/\s+/g, '').toLowerCase();
  };
  const shouldHighlight = isHighlighting &&
    (role === "operator" || role === "operations") &&
    !job.downloaded;

  const isOps = role === "operator" || role === "operations";
  const hasUnseenResume = isOps && job.optimizedResume?.hasResume === true && !job.optimizedResumeSeen;
  const autoOptStatus = job.autoOptimization?.status;
  const autoOptCompleted = isOps && job.optimizedResume?.hasResume === true;
  const autoOptFailed = isOps && autoOptStatus === 'failed';
  const autoOptSkipped = isOps && autoOptStatus === 'skipped';
  const autoOptPending = isOps && autoOptStatus === 'pending';
  const autoOptProcessing = isOps && autoOptStatus === 'processing';
  const autoOptUnknown = isOps && !autoOptStatus && !autoOptCompleted && !!job.jobDescription?.trim();
  const autoOptError = job.autoOptimization?.error?.trim();

  // Second-stage screening (operator-only). The backend re-judges the real
  // employer-site text; 'failed' jobs are moved to the removed column.
  const sjStatus = job.secondJudge?.status;
  const sjScore = job.secondJudge?.score;
  const sjReason = job.secondJudge?.reason?.trim();
  const sjPassed = isOps && sjStatus === 'passed';
  const sjFailed = isOps && sjStatus === 'failed';
  const sjPending = isOps && sjStatus === 'pending';
  const sjProcessing = isOps && sjStatus === 'processing';
  const sjSkipped = isOps && sjStatus === 'skipped';
  const sjScoreLabel = (sjScore !== null && sjScore !== undefined) ? ` (score ${sjScore})` : '';
  // Why the extension picked this job. Operator-only, and fetched ON DEMAND:
  // the list response strips aiDecision so hundreds of cards do not each carry
  // a reason string. One click, one job, one small request.
  const [whyOpen, setWhyOpen] = useState(false);
  const [whyLoading, setWhyLoading] = useState(false);
  const [whyError, setWhyError] = useState<string>("");
  const [why, setWhy] = useState<Job["aiDecision"]>(null);

  const openWhy = async (e: React.MouseEvent) => {
    // The card itself is clickable; this button is not a card click.
    e.stopPropagation();
    setWhyOpen(true);
    if (why || whyLoading) return;
    setWhyLoading(true);
    setWhyError("");
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/operations/job-ai-decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job._id || job.jobID }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.message || "could not load the reason");
      setWhy(data.aiDecision || null);
    } catch (err: any) {
      setWhyError(err?.message || "could not load the reason");
    } finally {
      setWhyLoading(false);
    }
  };
  // A 'pending' job with attempts>0 + a stored error isn't just queued - it
  // tried, hit a snag (slow ATS / bot wall / AI blip) and is in retry backoff
  // (attempts 3+ wait HOURS). Surface that so it doesn't look silently "stopped".
  const sjAttempts = job.secondJudge?.attempts ?? 0;
  const sjError = job.secondJudge?.error?.trim?.();
  const sjRetrying = sjPending && sjAttempts > 0 && !!sjError;
  const sjHiccup = (() => {
    const m = String(sjError || '').toLowerCase();
    if (/(timed out|scraper|econnrefused|fetch failed|network|nav_timeout|http_)/.test(m)) return 'the job site was slow or unavailable';
    if (/(thin|empty|content|page text)/.test(m)) return 'the posting had almost no readable text (login/bot wall)';
    if (/(openai|grader|json)/.test(m)) return 'the AI screener was briefly unavailable';
    if (/profile/.test(m)) return 'no client profile to check against';
    return 'a temporary error';
  })();
  const sanitizeCompanyDomain = (name) => {
  if (!name) return "example.com";

  // Clean spaces and invalid characters
  let domain = name
    .toLowerCase()
    .replace(/\s+/g, "")       // remove spaces
    .replace(/[^a-z0-9.-]/g, ""); // remove invalid chars

  // Avoid double .com
  if (!domain.includes(".")) domain += ".com";

  return domain;
};

  return (
    <div
      onClick={handleClick}
      draggable
      onDragStart={(e) => onDragStart(e, job)}
      onDragEnd={onDragEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={`group w-full cursor-move border p-3.5 shadow-sm transition-all duration-150 hover:shadow-md ${
        shouldHighlight
          ? "bg-red-100 border-red-300"
          : hasUnseenResume
            ? "bg-amber-50 border-amber-300 ring-1 ring-amber-200"
            : "bg-white border-gray-200 hover:border-orange-300"
      }`}
    >
      {/* Company row: logo + name */}
      <div className="flex items-center gap-2 mb-2">
        {job.companyName && (
          <img
            src={`https://www.google.com/s2/favicons?domain=${sanitizeCompanyDomain(job.companyName)}&sz=64`}
            alt={job.companyName}
            className="h-7 w-7 flex-shrink-0 object-contain border border-gray-100 bg-white p-0.5"
            style={{ display: 'none' }}
            onError={(e) => { e.currentTarget.style.display = "none"; }}
            onLoad={(e) => {
              const img = e.currentTarget;
              if (img.naturalHeight === 16 && img.naturalWidth === 16) {
                img.style.display = "none";
              } else {
                img.style.display = "block";
              }
            }}
          />
        )}
        <span className="text-xs font-medium text-gray-500 truncate">{job.companyName}</span>
      </div>

      {/* Job title */}
      <div className="flex items-start gap-1 mb-3">
        <h4 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-5 flex-1 group-hover:text-orange-700 transition-colors">{job.jobTitle}</h4>
        {autoOptCompleted && !job.optimizedResumeSeen && (
          <Sparkles className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" title="Resume auto optimized" />
        )}
        {sjPassed && <ShieldCheck className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" title={`Second-stage screening passed${sjScoreLabel}`} />}
        {sjFailed && <ShieldAlert className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" title={`Flagged in second-stage screening${sjScoreLabel} — review`} />}
        {(sjPending || sjProcessing) && <ShieldQuestion className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5 animate-pulse" title="Second-stage screening in progress" />}
      </div>

      {/* Time ago */}
      <div className="flex items-center text-xs text-gray-400">
        <Clock className="w-3 h-3 mr-1 flex-shrink-0" />
        <span>{getTimeAgo(job?.createdAt || job?.dateAdded || job?.updatedAt)}</span>
      </div>

      {isOps && job.addedBy?.trim() && (
        <div className="text-xs text-gray-400 mt-1">Added by {job.addedBy.trim()}</div>
      )}

      {/* Operator-only. The reason is not in the list payload - see openWhy. */}
      {isOps && (
        <button
          type="button"
          onClick={openWhy}
          className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
          title="Why the extension picked this job"
        >
          <HelpCircle className="w-3 h-3" />
          Why picked?
        </button>
      )}

      {isOps && (autoOptCompleted || autoOptFailed || autoOptSkipped || autoOptPending || autoOptProcessing || autoOptUnknown) && (
        <div className="mt-2">
          {autoOptCompleted && !job.optimizedResumeSeen && <p className="text-xs font-medium text-green-600">Resume auto-optimized. Download optimized resume and apply.</p>}
          {autoOptFailed && !autoOptCompleted && <p className="text-xs font-medium text-red-600">Resume auto-optimization failed. Please optimize and download manually.</p>}
          {autoOptSkipped && !autoOptCompleted && <p className="text-xs font-medium text-amber-700">Resume auto-optimization skipped{autoOptError ? `: ${autoOptError}` : "."}</p>}
          {autoOptPending && !autoOptCompleted && <p className="text-xs font-medium text-blue-600">Resume auto-optimization queued.</p>}
          {autoOptProcessing && !autoOptCompleted && <p className="text-xs font-medium text-blue-600">Resume auto-optimization in progress.</p>}
          {autoOptUnknown && <p className="text-xs font-medium text-gray-600">Resume auto-optimization status unavailable. Please refresh.</p>}
        </div>
      )}

      {isOps && (sjPassed || sjFailed || sjPending || sjProcessing || sjSkipped) && (
        <div className="mt-2">
          {sjPassed && <p className="text-xs font-medium text-green-600">Second-stage screening passed{sjScoreLabel}.</p>}
          {sjFailed && <p className="text-xs font-medium text-amber-700">⚠️ AI flag{sjScoreLabel}{sjReason ? ` — ${sjReason}` : ''}. Kept — review and decide.</p>}
          {sjPending && (
            sjRetrying ? (
              <p className="text-xs font-medium text-amber-700">
                Second-stage screening paused — {sjHiccup}. Retrying (attempt {sjAttempts}).
              </p>
            ) : (
              <p className="text-xs font-medium text-blue-600">Second-stage screening queued.</p>
            )
          )}
          {sjProcessing && <p className="text-xs font-medium text-blue-600">Second-stage screening in progress.</p>}
          {sjSkipped && <p className="text-xs font-medium text-amber-700">{sjReason || 'Second-stage screening skipped — job kept.'}</p>}
        </div>
      )}

      {/* Why-picked modal. Operator-only; mounted only while open so a board of
          hundreds of cards carries no hidden dialogs. */}
      {whyOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => { e.stopPropagation(); setWhyOpen(false); }}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-4"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Why this job was picked"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-gray-900">Why this job was picked</h3>
                <p className="text-xs text-gray-500 truncate">{job.jobTitle} &middot; {job.companyName}</p>
              </div>
              <button
                type="button"
                onClick={() => setWhyOpen(false)}
                className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {whyLoading && <p className="text-xs text-gray-500">Loading&hellip;</p>}
            {!whyLoading && whyError && <p className="text-xs text-red-600">{whyError}</p>}

            {!whyLoading && !whyError && !why && (
              <p className="text-xs text-gray-500">
                No reason recorded. Jobs added before the extension started storing its
                reasoning, and jobs a client added themselves, will not have one.
              </p>
            )}

            {!whyLoading && !whyError && why && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {typeof why.score === 'number' && (
                    <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">
                      AI score {why.score}
                    </span>
                  )}
                  {typeof why.jrScore === 'number' && (
                    <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                      JobRight {why.jrScore}%
                    </span>
                  )}
                  {why.matchedRole && (
                    <span className="text-[11px] text-gray-600">matched &rarr; {why.matchedRole}</span>
                  )}
                </div>
                {why.reason && (
                  <p className="text-xs text-gray-800 leading-relaxed border-l-2 border-indigo-300 pl-2">
                    {why.reason}
                  </p>
                )}
                <p className="text-[10px] text-gray-400">
                  {why.model ? `Judged by ${why.model}` : 'Judged'}
                  {why.judgedAt ? ` on ${new Date(why.judgedAt).toLocaleString()}` : ''}
                  {' '}&middot; visible to operators only
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default JobCard;
