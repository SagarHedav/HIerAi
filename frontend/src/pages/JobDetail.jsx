import React, { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import axiosInstance from '../lib/axios'
import { toast } from 'react-hot-toast'

const JobDetail = () => {
  const { id } = useParams()
  const [showApply, setShowApply] = useState(false)

  const { data: jobRes, isLoading, isError } = useQuery({
    queryKey: ['job', id],
    queryFn: async () => {
      const res = await axiosInstance.get(`/job/get/${id}`)
      return res.data
    }
  })

  const job = jobRes?.job || null

  const reqs = useMemo(()=> (job?.requirements || []).filter(Boolean), [job])
  const resps = useMemo(()=> (job?.responsibilities || []).filter(Boolean), [job])

  if (isError) return <div className='p-4'>Failed to load job.</div>
  if (isLoading || !job) return <div className='p-4'>Loading...</div>

  return (
    <div className='p-4'>
      <div className='mb-4 flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold'>{job.title}</h1>
          <div className='text-sm text-info mt-1'>
            {job.company?.name ? job.company.name : 'Company'} • {job.location}
          </div>
        </div>
        <Link className='btn btn-outline' to='/jobs'>Back to jobs</Link>
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <div className='bg-base-300 rounded p-4'>
          <h2 className='text-lg font-semibold mb-2'>Overview</h2>
          <div className='space-y-1 text-sm'>
            <div><span className='font-medium'>Type:</span> {job.jobType}</div>
            <div><span className='font-medium'>Experience:</span> {job.experienceLevel}</div>
            <div><span className='font-medium'>Salary:</span> {job.salary}</div>
            <div><span className='font-medium'>Positions:</span> {job.position}</div>
            <div><span className='font-medium'>Posted by:</span> {job.created_by?.name || 'Unknown'}</div>
          </div>
          <button className='btn btn-success mt-4' onClick={()=>setShowApply(true)}>Apply</button>
        </div>
        <div className='bg-base-300 rounded p-4'>
          <h2 className='text-lg font-semibold mb-2'>Description</h2>
          <p className='text-info whitespace-pre-wrap'>{job.description}</p>
        </div>
        <div className='bg-base-300 rounded p-4 md:col-span-2'>
          <h2 className='text-lg font-semibold mb-2'>Requirements</h2>
          {reqs.length ? (
            <ul className='list-disc pl-5 space-y-1'>
              {reqs.map((r, idx)=>(<li key={idx} className='text-info'>{r}</li>))}
            </ul>
          ) : (
            <div className='text-info'>No specific requirements listed.</div>
          )}
        </div>

        <div className='bg-base-300 rounded p-4 md:col-span-2'>
          <h2 className='text-lg font-semibold mb-2'>Responsibilities</h2>
          {resps.length ? (
            <ul className='list-disc pl-5 space-y-1'>
              {resps.map((r, idx)=>(<li key={idx} className='text-info'>{r}</li>))}
            </ul>
          ) : (
            <div className='text-info'>No specific responsibilities listed.</div>
          )}
        </div>
      </div>

      {showApply && (
        <ApplyModal job={job} onClose={()=>setShowApply(false)} />
      )}
    </div>
  )
}

const ApplyModal = ({ job, onClose }) => {
  const { isPending, error } = { isPending:false, error:null }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.append('jobId', job._id)
    try {
      await axiosInstance.post('/application/apply', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.success('Application submitted')
      onClose()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to apply')
    }
  }

  return (
    <div className='fixed inset-0 bg-black/60 flex items-center justify-center z-50'>
      <div className='bg-base-300 rounded p-4 w-full max-w-xl'>
        <h3 className='text-lg font-semibold mb-3'>Apply for {job.title}</h3>
        <form onSubmit={handleSubmit} className='flex flex-col gap-3'>
          <input name='fullName' className='input input-bordered w-full' placeholder='Full name' required />
          <input name='email' type='email' className='input input-bordered w-full' placeholder='Email' required />
          <input name='phone' className='input input-bordered w-full' placeholder='Phone' />
          <textarea name='coverLetter' className='textarea textarea-bordered w-full' placeholder='Cover letter (optional)' />
          <div className='divider'>Resume</div>
          <div className='text-sm'>Upload a file OR provide a Google Drive link</div>
          <input name='resume' type='file' accept='.pdf,.doc,.docx,.rtf,.odt' className='file-input file-input-bordered w-full' />
          <input name='resumeDriveLink' className='input input-bordered w-full' placeholder='Google Drive link (optional)' />
          <div className='flex justify-end gap-2 mt-2'>
            <button type='button' className='btn' onClick={onClose}>Cancel</button>
            <button type='submit' className='btn btn-primary' disabled={isPending}>{isPending ? 'Submitting...' : 'Submit'}</button>
          </div>
        </form>
        {error && <div className='text-error text-sm mt-2'>{String(error)}</div>}
      </div>
    </div>
  )
}

export default JobDetail