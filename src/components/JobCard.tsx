import React, {useState, useEffect, useRef} from 'react';
import { Calendar, Sparkles, ShieldCheck, ShieldAlert, ShieldQuestion } from 'lucide-react';
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
      className={`w-full cursor-move rounded-lg border border-gray-200 p-2 shadow-sm transition-all duration-200 hover:shadow-md sm:hover:-rotate-1 sm:hover:scale-[1.02] ${
        shouldHighlight
          ? "bg-red-100 border-red-300"
          : hasUnseenResume
            ? "bg-amber-50 border-amber-300 ring-1 ring-amber-200"
            : "bg-white"
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-1.5">
            <h4 className="line-clamp-2 break-words text-sm font-semibold leading-5 text-gray-900 sm:text-base">{job.jobTitle}</h4>
            {autoOptCompleted && !job.optimizedResumeSeen && (
              <Sparkles className="w-3.5 h-3.5 text-green-600 flex-shrink-0" title="Resume auto optimized" />
            )}
            {sjPassed && (
              <ShieldCheck className="w-3.5 h-3.5 text-green-600 flex-shrink-0" title={`Second-stage screening passed${sjScoreLabel}`} />
            )}
            {sjFailed && (
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" title={`Flagged in second-stage screening${sjScoreLabel} — review`} />
            )}
            {(sjPending || sjProcessing) && (
              <ShieldQuestion className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 animate-pulse" title="Second-stage screening in progress" />
            )}
          </div>
          <div className="mt-1 flex min-w-0 items-center text-sm text-gray-600">
  {job.companyName && (
              <img
              src={`https://www.google.com/s2/favicons?domain=${sanitizeCompanyDomain(job.companyName)}&sz=64`}
              alt="Company Logo"
              className="m-1.5 h-5 w-5 flex-shrink-0 sm:m-2"
              style={{ display: 'none' }} // Start hidden until load check
              onError={(e) => {
                e.currentTarget.style.display = "none"; // Hide broken image
              }}
              onLoad={(e) => {
                const img = e.currentTarget;
                // Default globe is always 16x16; custom ones resize to 64x64
                if (img.naturalHeight === 16 && img.naturalWidth === 16) {
                  img.style.display = "none"; // Hide default
                } else {
                  img.style.display = "block"; // Show custom
                }
              }}
            />
            )}
            <span className="block max-w-full truncate">{job.companyName}</span> <hr />
          </div>
        </div>
      </div>

      <div className="flex items-center text-xs text-gray-500 mb-3">
        <Calendar className="w-3 h-3 mr-1" />
        <span>
         {getTimeAgo(job?.createdAt || job?.dateAdded || job?.updatedAt)}
        </span>
      </div>

      {isOps && job.addedBy?.trim() && (
        <div className="text-xs text-gray-400 mb-2">
          Added by {job.addedBy.trim()}
        </div>
      )}

      {isOps && (autoOptCompleted || autoOptFailed || autoOptSkipped || autoOptPending || autoOptProcessing || autoOptUnknown) && (
        <div className="mb-2">
          {autoOptCompleted && !job.optimizedResumeSeen && (
            <p className="text-xs font-medium text-green-600">Resume auto-optimized. Download optimized resume and apply.</p>
          )}
          {autoOptFailed && !autoOptCompleted && (
            <p className="text-xs font-medium text-red-600">
              Resume auto-optimization failed. Please optimize and download manually.
            </p>
          )}
          {autoOptSkipped && !autoOptCompleted && (
            <p className="text-xs font-medium text-amber-700">
              Resume auto-optimization skipped{autoOptError ? `: ${autoOptError}` : "."}
            </p>
          )}
          {autoOptPending && !autoOptCompleted && (
            <p className="text-xs font-medium text-blue-600">Resume auto-optimization queued.</p>
          )}
          {autoOptProcessing && !autoOptCompleted && (
            <p className="text-xs font-medium text-blue-600">Resume auto-optimization in progress.</p>
          )}
          {autoOptUnknown && (
            <p className="text-xs font-medium text-gray-600">Resume auto-optimization status unavailable. Please refresh.</p>
          )}
        </div>
      )}

      {isOps && (sjPassed || sjFailed || sjPending || sjProcessing || sjSkipped) && (
        <div className="mb-2">
          {sjPassed && (
            <p className="text-xs font-medium text-green-600">Second-stage screening passed{sjScoreLabel}.</p>
          )}
          {sjFailed && (
            <p className="text-xs font-medium text-amber-700">
              ⚠️ AI flag{sjScoreLabel}{sjReason ? ` — ${sjReason}` : ''}. Kept — review and decide.
            </p>
          )}
          {sjPending && (
            <p className="text-xs font-medium text-blue-600">Second-stage screening queued.</p>
          )}
          {sjProcessing && (
            <p className="text-xs font-medium text-blue-600">Second-stage screening in progress.</p>
          )}
          {sjSkipped && (
            <p className="text-xs font-medium text-amber-700">{sjReason || 'Second-stage screening skipped — job kept.'}</p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {/* <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="p-1 text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded transition-colors"
            title="Edit Job"
          >
            <Edit3 className="w-4 h-4" />
          </button> */}
          {/* <button
            // disabled
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1  bg-gray-100 rounded hover:text-neutral-500 text-red-400 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button> */}
        </div>
      </div>
    </div>
  );
};

export default JobCard;
