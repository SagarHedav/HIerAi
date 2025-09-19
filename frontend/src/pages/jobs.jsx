import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axiosInstance from '../lib/axios.js'
import { Link } from 'react-router-dom'
import { toast } from 'react-hot-toast'

/*************  ✨ Windsurf Command ⭐  *************/
/**
 * A functional component that renders a placeholder for job listings.
 */

/*******  1605136a-1253-43f9-908d-6f93696cecaa  *******/
const Jobs = () => {
  const queryClient = useQueryClient()
  const { data: authUser } = useQuery({ queryKey: ["authUser"] });
  const { data, isLoading, isError } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      const res = await axiosInstance.get('/job/get')
      return res.data
    }
  })

  const { mutate: applyJob, isLoading: isApplying } = useMutation({
    mutationFn: async (jobId) => {
      await axiosInstance.post(`/applications/apply`, { jobId })
    },
    onSuccess: () => {
      toast.success('Applied successfully!')
      queryClient.invalidateQueries(['jobs'])
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to apply')
    }
  })

  if (isLoading) return <div>Loading jobs...</div>
  if (isError) return <div>Failed to load jobs.</div>

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Job Listings</h1>
        {authUser?.role === 'recruiter' && (
          <Link
            to="/jobs/post"
            className="btn btn-primary"
          >
            Post Job
          </Link>
        )}
      </div>
      {data && data.length > 0 ? (
        <ul className="space-y-4">
          {data.map(job => (
            <li key={job._id} className="p-4 border rounded shadow">
              <h2 className="text-xl font-semibold">{job.title}</h2>
              <p className="text-gray-700">{job.description}</p>
              <div className="text-sm text-gray-500 mt-2">
                Posted by: {job.created_by?.name || 'Unknown'}
              </div>
              {authUser?.role === 'student' && (
                <button
                  className="btn btn-success mt-2"
                  onClick={() => applyJob(job._id)}
                  disabled={isApplying}
                >
                  {isApplying ? 'Applying...' : 'Apply'}
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div>No jobs found.</div>
      )}
    </div>
  )
}

export default Jobs
