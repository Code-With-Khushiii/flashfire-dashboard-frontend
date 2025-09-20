"use client"

import type React from "react"
import { useState, useEffect, useContext, Suspense, lazy } from "react"
import { Plus, Search } from "lucide-react"
import type { Job, JobStatus } from "../types"
const JobForm = lazy(() => import("./JobForm"))
const JobCard = lazy(() => import("./JobCard"))
import { UserContext } from "../state_management/UserContext.tsx"
import { useNavigate } from "react-router-dom"
import { useUserJobs } from "../state_management/UserJobs.tsx"
import LoadingScreen from "./LoadingScreen.tsx"
import { useOperationsStore } from "../state_management/Operations.ts"
import { toastUtils, toastMessages } from "../utils/toast"
const JobModal = lazy(() => import("./JobModal.tsx"))

const JOBS_PER_PAGE = 30

const JobTracker = () => {
  const [showJobForm, setShowJobForm] = useState(false)
  const [editingJob, setEditingJob] = useState<Job | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [showJobModal, setShowJobModal] = useState(false)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const { userJobs, setUserJobs, loading } = useUserJobs()
  const { userDetails, token, setData } = useContext(UserContext)
  const navigate = useNavigate()
  const [pendingMove, setPendingMove] = useState<{
    jobID: string
    status: JobStatus
  } | null>(null)

  const [columnPages, setColumnPages] = useState<{
    [key in JobStatus]?: number
  }>({})

  const role = useOperationsStore((state) => state.role)
  const name = useOperationsStore((state) => state.name)

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

  const statusColumns: { status: JobStatus; label: string; color: string }[] = [
    {
      status: "saved",
      label: "Saved",
      color: "bg-gray-50",
    },
    {
      status: "applied",
      label: "Applied",
      color: "bg-blue-50",
    },
    {
      status: "interviewing",
      label: "Interviewing",
      color: "bg-amber-50",
    },
    {
      status: "offer",
      label: "Offers",
      color: "bg-green-50",
    },
    {
      status: "rejected",
      label: "Rejected",
      color: "bg-red-50",
    },
    {
      status: "deleted",
      label: "Removed",
      color: "bg-gray-100",
    },
  ]

  useEffect(() => {
    if (!showJobModal) setPendingMove(null)
  }, [showJobModal])

  console.log("Role in job tracker is ", role)

  const handleEditJob = async (jobData: Partial<Job>) => {
    if (!editingJob) return

    if (role === "operations") {
      try {
        const updatedJobDetails = {
          ...editingJob,
          ...jobData,
          userID: userDetails?.email,
        }
        console.log("operations ")
        const response = await fetch(`${API_BASE_URL}/operations/jobs`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token,
            jobID: editingJob.jobID,
            userDetails,
            jobDetails: updatedJobDetails,
            action: "edited by " + (name || "operations"),
          }),
        })

        const result = await response.json()

        if (result.message === "Jobs updated successfully") {
          setUserJobs(result.updatedJobs)
          toastUtils.success(toastMessages.jobUpdated)
          console.log("Job updated:", result.updatedJobs)
        } else {
          toastUtils.error(toastMessages.jobError)
        }
      } catch (err) {
        console.error("Failed to update job", err)
        toastUtils.error(toastMessages.jobError)
      } finally {
        setEditingJob(null)
        setShowJobForm(false)
      }
    } else {
      try {
        const updatedJobDetails = {
          ...editingJob,
          ...jobData,
          userID: userDetails?.email,
        }

        const response = await fetch(`${API_BASE_URL}/updatechanges`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token,
            jobID: editingJob.jobID,
            userDetails,
            jobDetails: updatedJobDetails,
            action: "edited by ",
          }),
        })

        const result = await response.json()

        if (result.message === "Jobs updated successfully") {
          setUserJobs(result.updatedJobs)
          toastUtils.success(toastMessages.jobUpdated)
          console.log("Job updated:", result.updatedJobs)
        } else {
          toastUtils.error(toastMessages.jobError)
        }
      } catch (err) {
        console.error("Failed to update job", err)
        toastUtils.error(toastMessages.jobError)
      } finally {
        setEditingJob(null)
        setShowJobForm(false)
      }
    }
  }

  const handleAddJob = async (jobData: Omit<Job, "jobID" | "createdAt" | "updatedAt">) => {
    try {
      const jobDetails = {
        ...jobData,
        jobID: Date.now().toString(),
        userID: userDetails?.email,
      }

      const saveJobsToDb = await fetch(`${API_BASE_URL}/api/jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ jobDetails, userDetails, token }),
      })

      const responseFromServer = await saveJobsToDb.json()
      console.log(responseFromServer)

      if (responseFromServer.message === "Job Added Succesfully") {
        setUserJobs(responseFromServer.NewJobList)
      }
    } catch (err) {
      console.error("Failed to save job. Please try again.", err)
    } finally {
      setShowJobForm(false) // Close the form regardless of outcome
    }
  }

  const handleDragStart = (e: React.DragEvent, job: Job) => {
    e.dataTransfer.setData("jobID", job.jobID)
    e.dataTransfer.setData("jobId", job.jobID)
    e.dataTransfer.setData("sourceStatus", job.currentStatus)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const onDeleteJob = async (jobID: string) => {
    try {
      const Code = prompt("Enter The Code to Delete.")
      if (Code !== import.meta.env.VITE_JOB_DELETION_CODE) return
      else {
        if (role === "operations") {
          const response = await fetch(`${API_BASE_URL}/operations/jobs`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              jobID,
              userDetails,
              action: "delete",
            }),
          })

          const result = await response.json()
          if (result.message === "Jobs updated successfully") {
            setUserJobs(result?.updatedJobs)
            toastUtils.success(toastMessages.jobDeleted)
            console.log("Job deleted:", result?.updatedJobs)
          } else {
            toastUtils.error(toastMessages.jobError)
          }
        } else {
          const response = await fetch(`${API_BASE_URL}/updatechanges`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              jobID,
              userDetails,
              token,
              action: "delete",
            }),
          })

          const result = await response.json()
          if (result.message === "Jobs updated successfully") {
            setUserJobs(result?.updatedJobs)
            toastUtils.success(toastMessages.jobDeleted)
            console.log("Job deleted:", result?.updatedJobs)
          } else {
            toastUtils.error(toastMessages.jobError)
          }
        }
      }
    } catch (error) {
      console.error("Error deleting job:", error)
      toastUtils.error("Failed to delete job. Please try again.")
    }
  }

  const updateJobStatusOptimistically = (jobID: string, newStatus: JobStatus) => {
    setUserJobs((currentJobs) => {
      if (!currentJobs) return currentJobs

      return currentJobs.map((job) => {
        if (job.jobID === jobID) {
          return {
            ...job,
            currentStatus: newStatus + (role === "operations" ? " by " + (name || "operations") : " by user"),
            updatedAt: new Date().toLocaleString("en-IN"),
          }
        }
        return job
      })
    })
  }

  const revertJobStatusUpdate = (jobID: string, originalStatus: string) => {
    setUserJobs((currentJobs) => {
      if (!currentJobs) return currentJobs

      return currentJobs.map((job) => {
        if (job.jobID === jobID) {
          return {
            ...job,
            currentStatus: originalStatus,
          }
        }
        return job
      })
    })
  }

  const onUpdateJobStatus = async (jobID, status, userDetails) => {
    const originalJob = userJobs?.find((job) => job.jobID === jobID)
    if (!originalJob) return

    const originalStatus = originalJob.currentStatus

    updateJobStatusOptimistically(jobID, status)

    try {
      const endpoint = role === "operations" ? `${API_BASE_URL}/operations/jobs` : `${API_BASE_URL}/updatechanges`
      const statusSuffix = role === "operations" ? " by " + (name || "operations") : " by user"

      const reqToServer = await fetch(endpoint, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "UpdateStatus",
          status: status + statusSuffix,
          userDetails,
          token: role !== "operations" ? token : undefined,
          jobID,
        }),
      })

      const resFromServer = await reqToServer.json()
      if (resFromServer.message === "Jobs updated successfully") {
        setUserJobs(resFromServer?.updatedJobs)
        toastUtils.success("Job status updated successfully!")
        console.log("Job status updated:", resFromServer?.updatedJobs)
      } else {
        revertJobStatusUpdate(jobID, originalStatus)
        toastUtils.error("Failed to update job status")
        console.error("Failed to update job status on server")
      }
    } catch (error) {
      console.error("Error updating job status:", error)
      revertJobStatusUpdate(jobID, originalStatus)
      toastUtils.error("Network error while updating job status")
    }
  }

  const handleDrop = (e: React.DragEvent, status: JobStatus) => {
    e.preventDefault()
    const jobID = e.dataTransfer.getData("jobID") || e.dataTransfer.getData("jobId")
    if (!jobID) return

    const job = userJobs?.find((j) => j.jobID === jobID)
    if (!job) return

    if (
      job.currentStatus?.toLowerCase().startsWith("saved") &&
      !status.toLowerCase().startsWith("deleted") &&
      !status.toLowerCase().startsWith("saved")
    ) {
      setSelectedJob(job)
      setPendingMove({ jobID, status })
      setShowJobModal(true)
      return
    }

    onUpdateJobStatus(jobID, status, userDetails)
  }

  const tsFromUpdatedAt = (val: unknown): number => {
    if (!val) return 0
    if (val instanceof Date) return val.getTime()
    if (typeof val === "string") {
      const parts = val.split(",").map((s) => s.trim())
      if (parts.length !== 2) return 0

      const [datePart, timePartRaw] = parts
      const [ddStr, mmStr, yyyyStr] = datePart.split("/")
      const dd = Number.parseInt(ddStr, 10)
      const mm = Number.parseInt(mmStr, 10)
      const yyyy = Number.parseInt(yyyyStr, 10)
      if (isNaN(dd) || isNaN(mm) || isNaN(yyyy)) return 0

      const timeBits = timePartRaw.toLowerCase().split(" ")
      const clock = timeBits[0] || ""
      const ampm = timeBits[1] || ""

      const [hStr, mStr, sStr] = clock.split(":")
      let h = Number.parseInt(hStr || "0", 10)
      const m = Number.parseInt(mStr || "0", 10)
      const s = Number.parseInt(sStr || "0", 10)

      if (ampm === "pm" && h < 12) h += 12
      if (ampm === "am" && h === 12) h = 0

      return new Date(yyyy, mm - 1, dd, h, m || 0, s || 0).getTime()
    }

    const t = new Date(val as any).getTime()
    return isNaN(t) ? 0 : t
  }

  const updateColumnPage = (status: JobStatus, page: number) => {
    setColumnPages((prev) => ({ ...prev, [status]: page }))
  }

  const getPaginatedJobs = (jobs: Job[], status: JobStatus) => {
    const currentPage = columnPages[status] || 1
    const startIndex = (currentPage - 1) * JOBS_PER_PAGE
    const endIndex = startIndex + JOBS_PER_PAGE
    return jobs.slice(startIndex, endIndex)
  }

  const getTotalPages = (jobs: Job[]) => {
    return Math.ceil(jobs.length / JOBS_PER_PAGE)
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div className="flex flex-col justify-around items-start w-full">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Job Tracker</h2>
          <p className="text-gray-600">Track your job applications and manage your career pipeline</p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center justify-end gap-4 w-full">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search jobs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
            />
          </div>
          <button
            onClick={() => setShowJobForm(true)}
            className="whitespace-nowrap bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md"
          >
            Add Jobs
          </button>
        </div>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-6">
        {statusColumns.map(({ status, label, color }) => {
          const filteredAndSortedJobs =
            userJobs
              ?.filter((job) => {
                const statusMatch = job.currentStatus?.startsWith(status)
                if (!statusMatch) return false
                if (!searchQuery.trim()) return true

                const query = searchQuery.toLowerCase()
                const titleMatch = job.jobTitle?.toLowerCase().includes(query)
                const companyMatch = job.companyName?.toLowerCase().includes(query)
                return titleMatch || companyMatch
              })
              .sort((a, b) => tsFromUpdatedAt(b.updatedAt) - tsFromUpdatedAt(a.updatedAt)) || []

          const paginatedJobs = getPaginatedJobs(filteredAndSortedJobs, status)
          const totalPages = getTotalPages(filteredAndSortedJobs)
          const currentPage = columnPages[status] || 1

          return (
            <div
              key={status}
              className={`${color} rounded-xl p-4 min-w-[280px] w-80 flex flex-col shadow-sm border border-gray-200`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, status)}
            >
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      status === "saved"
                        ? "bg-gray-400"
                        : status === "applied"
                          ? "bg-blue-500"
                          : status === "interviewing"
                            ? "bg-amber-500"
                            : status === "offer"
                              ? "bg-green-500"
                              : status === "rejected"
                                ? "bg-red-500"
                                : "bg-gray-500"
                    }`}
                  ></div>
                  <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">{label}</h3>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    status === "saved"
                      ? "bg-gray-100 text-gray-700"
                      : status === "applied"
                        ? "bg-blue-100 text-blue-700"
                        : status === "interviewing"
                          ? "bg-amber-100 text-amber-700"
                          : status === "offer"
                            ? "bg-green-100 text-green-700"
                            : status === "rejected"
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {userJobs?.filter((item) => item.currentStatus?.startsWith(status)).length}
                </span>
              </div>

              <div className="flex-1 space-y-3 min-h-[500px]">
                <Suspense fallback={<LoadingScreen />}>
                  {paginatedJobs?.map((job) => (
                    <JobCard
                      showJobModal={showJobModal}
                      setShowJobModal={setShowJobModal}
                      setSelectedJob={setSelectedJob}
                      key={job.jobID}
                      job={job}
                      onDragStart={handleDragStart}
                      onEdit={() => setEditingJob(job)}
                      onDelete={() => onDeleteJob(job.jobID)}
                    />
                  ))}
                </Suspense>
                {filteredAndSortedJobs && filteredAndSortedJobs.length === 0 && (
                  <div className="text-center py-12 text-gray-400">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                      <Plus className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-medium">No jobs yet</p>
                    <p className="text-xs mt-1">Drag jobs here or add new ones</p>
                  </div>
                )}
              </div>

              {totalPages > 1 && (
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => updateColumnPage(status, currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
                        currentPage === 1
                          ? "text-gray-400 cursor-not-allowed"
                          : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
                      }`}
                    >
                      ← Prev
                    </button>

                    <span className="text-xs text-gray-600 font-medium bg-white/50 px-2 py-1 rounded">
                      {currentPage} of {totalPages}
                    </span>

                    <button
                      onClick={() => updateColumnPage(status, currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
                        currentPage === totalPages
                          ? "text-gray-400 cursor-not-allowed"
                          : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
                      }`}
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showJobModal && (
        <Suspense fallback={<LoadingScreen />}>
          <JobModal
            setShowJobModal={setShowJobModal}
            showJobModal={showJobModal}
            jobDetails={selectedJob}
            initialSection={
              pendingMove && selectedJob && pendingMove.jobID === selectedJob.jobID ? "attachments" : undefined
            }
            onAutoCheckDone={(exists) => {
              if (exists && pendingMove && selectedJob && pendingMove.jobID === selectedJob.jobID) {
                onUpdateJobStatus(pendingMove.jobID, pendingMove.status, userDetails)
                setPendingMove(null)
                setShowJobModal(false)
              }
            }}
            onResumeUploaded={() => {
              if (pendingMove && selectedJob && pendingMove.jobID === selectedJob.jobID) {
                onUpdateJobStatus(pendingMove.jobID, pendingMove.status, userDetails)
                setPendingMove(null)
                setShowJobModal(false)
              }
            }}
          />
        </Suspense>
      )}
      {(showJobForm || editingJob) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <Suspense fallback={<LoadingScreen />}>
              <JobForm
                setUserJobs={setUserJobs}
                job={editingJob}
                onSubmit={editingJob ? handleEditJob : handleAddJob}
                onCancel={() => {
                  setShowJobForm(false)
                  setEditingJob(null)
                }}
              />
            </Suspense>
          </div>
        </div>
      )}
    </div>
  )
}

export default JobTracker
