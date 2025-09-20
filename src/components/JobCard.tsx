"use client"

import type React from "react"
import { Calendar } from "lucide-react"
import type { Job } from "../types"
import { getTimeAgo } from "../utils/getTimeAgo"
interface JobCardProps {
  job: Job
  onDragStart: (e: React.DragEvent, job: Job) => void
  onEdit: () => void
  onDelete: () => void
  showJobModal: boolean
  setSelectedJob: React.Dispatch<React.SetStateAction<{}>>
  setShowJobModal: React.Dispatch<React.SetStateAction<boolean>>
}

const JobCard: React.FC<JobCardProps> = ({ setSelectedJob, setShowJobModal, job, onDragStart, onEdit, onDelete }) => {
  console.log("triggered..")
  return (
    <div
      onClick={() => {
        setShowJobModal(true)
        setSelectedJob(job)
      }}
      draggable
      onDragStart={(e) => onDragStart(e, job)}
      className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group hover:border-gray-300"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 text-sm leading-tight mb-2 group-hover:text-gray-700 transition-colors">
            {job.jobTitle}
          </h4>
          <div className="flex items-center text-sm text-gray-600">
            <img
              src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(job.companyName)}.com&sz=64`}
              alt="Company Logo"
              className="w-4 h-4 mr-2 rounded-sm"
              onError={(e) => {
                e.currentTarget.style.display = "none"
              }}
            />
            <span className="truncate">{job.companyName}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center text-xs text-gray-500 mb-3 bg-gray-50 rounded-md px-2 py-1">
        <Calendar className="w-3 h-3 mr-1.5" />
        <span>{getTimeAgo(job?.dateAdded)}</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              job.currentStatus?.startsWith("saved")
                ? "bg-gray-400 w-1/6"
                : job.currentStatus?.startsWith("applied")
                  ? "bg-blue-500 w-2/6"
                  : job.currentStatus?.startsWith("interviewing")
                    ? "bg-amber-500 w-4/6"
                    : job.currentStatus?.startsWith("offer")
                      ? "bg-green-500 w-full"
                      : job.currentStatus?.startsWith("rejected")
                        ? "bg-red-500 w-3/6"
                        : "bg-gray-300 w-1/6"
            }`}
          ></div>
        </div>
      </div>
    </div>
  )
}

export default JobCard
