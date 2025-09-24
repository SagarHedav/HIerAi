import React, { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axiosInstance from '../lib/axios.js'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'react-hot-toast'

/*************  ✨ Windsurf Command ⭐  *************/
/**
 * A functional component that renders a placeholder for job listings.
 */

/*******  1605136a-1253-43f9-908d-6f93696cecaa  *******/
const Jobs = () => {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'listings') // 'listings' | 'applications'
  const [applyFor, setApplyFor] = useState(null) // job selected for application

  // Student job filters
  const [jobTypeFilter, setJobTypeFilter] = useState(searchParams.get('jt') || '') // free text match
  const [companyFilter, setCompanyFilter] = useState(searchParams.get('comp') || '')
  const [requirementsFilter, setRequirementsFilter] = useState(searchParams.get('req') || '') // comma separated keywords
  const [salaryMin, setSalaryMin] = useState(searchParams.get('smin') || '')
  const [salaryMax, setSalaryMax] = useState(searchParams.get('smax') || '')
  const [jobSort, setJobSort] = useState(searchParams.get('jsort') || 'dateDesc') // dateDesc | dateAsc | salaryDesc | salaryAsc
  const { data: authUser } = useQuery({ 
    queryKey: ["authUser"],
    queryFn: async () => {
      try {
        const res = await axiosInstance.get("/auth/me");
        return res.data;
      } catch (err) {
        if (err.response && err.response.status === 401) {
          return null;
        }
        throw err;
      }
    },
  });
  const { data, isLoading, isError } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      const res = await axiosInstance.get('/job/get')
      return res.data
    }
  })

  const filteredJobs = useMemo(() => {
    let list = (data || []).slice()

    // text filters (case-insensitive)
    const jt = jobTypeFilter.trim().toLowerCase()
    const comp = companyFilter.trim().toLowerCase()
    const reqKeywords = requirementsFilter
      .split(',')
      .map(k=>k.trim().toLowerCase())
      .filter(Boolean)

    if (jt) list = list.filter(j => (j.jobType || '').toLowerCase().includes(jt))
    if (comp) list = list.filter(j => (j.company?.name || '').toLowerCase().includes(comp))
    if (reqKeywords.length) {
      list = list.filter(j => {
        const reqs = (j.requirements || []).map(r => (r||'').toLowerCase())
        return reqKeywords.every(k => reqs.some(r => r.includes(k)))
      })
    }
    // salary range
    if (salaryMin) list = list.filter(j => (j.salary||0) >= Number(salaryMin))
    if (salaryMax) list = list.filter(j => (j.salary||0) <= Number(salaryMax))

    // sort
    if (jobSort === 'salaryDesc') list.sort((a,b)=>(b.salary||0)-(a.salary||0))
    else if (jobSort === 'salaryAsc') list.sort((a,b)=>(a.salary||0)-(b.salary||0))
    else if (jobSort === 'dateAsc') list.sort((a,b)=> new Date(a.createdAt) - new Date(b.createdAt))
    else list.sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt))

    return list
  }, [data, jobTypeFilter, companyFilter, requirementsFilter, salaryMin, salaryMax, jobSort])

  // fetch my applications
  const { data: myApplications } = useQuery({
    queryKey: ['applications:me'],
    queryFn: async () => {
      const res = await axiosInstance.get('/application/me')
      return res.data
    },
    enabled: !!authUser && authUser.role === 'student',
  })

  // For recruiters: fetch their jobs with applications
  const { data: adminJobs } = useQuery({
    queryKey: ['adminJobs'],
    queryFn: async () => {
      const res = await axiosInstance.get('/job/getadminjobs')
      return res.data
    },
    enabled: !!authUser && authUser.role === 'recruiter',
  })

  const appliedSet = useMemo(() => {
    const list = myApplications?.application || []
    return new Set(list.map(a => a?.job?._id))
  }, [myApplications])

  const recruiterApplications = useMemo(() => {
    if (!adminJobs?.jobs) return []
    // flatten all applications with job info
    return adminJobs.jobs.flatMap(job => (job.applications || []).map(app => ({...app, job})))
  }, [adminJobs])

  // Recruiter applications sorting / filtering
  const [appsSort, setAppsSort] = useState(searchParams.get('asort') || 'dateDesc') // nameAsc | nameDesc | dateAsc | dateDesc
  const [appsSearch, setAppsSearch] = useState(searchParams.get('asearch') || '')
  const [appsMinScore, setAppsMinScore] = useState(searchParams.get('amin') || '')
  const [hideRejected, setHideRejected] = useState(searchParams.get('hideRej') !== '0')

  const recruiterAppsSorted = useMemo(()=>{
    let list = recruiterApplications.slice()
    const q = appsSearch.trim().toLowerCase()
    if (q) list = list.filter(a => (a.applicant?.name||'').toLowerCase().includes(q))
    if (appsMinScore) list = list.filter(a => typeof a.resumeScore === 'number' && a.resumeScore >= Number(appsMinScore))
    if (hideRejected) list = list.filter(a => (a.status||'').toLowerCase() !== 'rejected')

    if (appsSort==='nameAsc') list.sort((a,b)=> (a.applicant?.name||'').localeCompare(b.applicant?.name||''))
    else if (appsSort==='nameDesc') list.sort((a,b)=> (b.applicant?.name||'').localeCompare(a.applicant?.name||''))
    else if (appsSort==='dateAsc') list.sort((a,b)=> new Date(a.createdAt)-new Date(b.createdAt))
    else if (appsSort==='aiDesc') list.sort((a,b)=> (b.resumeScore||0)-(a.resumeScore||0))
    else if (appsSort==='aiAsc') list.sort((a,b)=> (a.resumeScore||0)-(b.resumeScore||0))
    else list.sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt))
    return list
  },[recruiterApplications, appsSort, appsSearch])

  // Note: application is submitted via StudentApplyForm as multipart

  // Do not early-return before hooks; render conditionally below instead

  // persist filters in URL
  useEffect(()=>{
    const params = new URLSearchParams(searchParams)
    params.set('tab', activeTab)
    if (jobTypeFilter) params.set('jt', jobTypeFilter); else params.delete('jt')
    if (companyFilter) params.set('comp', companyFilter); else params.delete('comp')
    if (requirementsFilter) params.set('req', requirementsFilter); else params.delete('req')
    if (salaryMin) params.set('smin', salaryMin); else params.delete('smin')
    if (salaryMax) params.set('smax', salaryMax); else params.delete('smax')
    if (jobSort && jobSort!=='dateDesc') params.set('jsort', jobSort); else params.delete('jsort')
    if (appsSort && appsSort!=='dateDesc') params.set('asort', appsSort); else params.delete('asort')
    if (appsSearch) params.set('asearch', appsSearch); else params.delete('asearch')
    if (appsMinScore) params.set('amin', appsMinScore); else params.delete('amin')
    params.set('hideRej', hideRejected ? '1' : '0')
    setSearchParams(params)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, jobTypeFilter, companyFilter, requirementsFilter, salaryMin, salaryMax, jobSort, appsSort, appsSearch])

  const resetStudentFilters = () => {
    setJobTypeFilter('')
    setCompanyFilter('')
    setRequirementsFilter('')
    setSalaryMin('')
    setSalaryMax('')
    setJobSort('dateDesc')
  }

  const presetTech = () => {
    setJobTypeFilter('tech')
  }
  const presetNonTech = () => {
    setJobTypeFilter('non')
  }

  const resetRecruiterFilters = () => {
    setAppsSearch('')
    setAppsSort('dateDesc')
    setAppsMinScore('')
    setHideRejected(true)
  }

  return (
    <div className="p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <h1 className="text-2xl font-bold">Jobs</h1>
        {authUser?.role === 'recruiter' && (
          <div className="flex flex-wrap gap-2">
            <Link to="/jobs/post" className="btn btn-xs md:btn-sm btn-primary">Post Job</Link>
            <Link to="/company/register" className="btn btn-xs md:btn-sm btn-success">Register Company</Link>
            <Link to="/companies" className="btn btn-xs md:btn-sm btn-warning">Manage Companies</Link>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div role="tablist" className="tabs tabs-bordered mb-6">
        <button role="tab" className={`tab ${activeTab==='listings' ? 'tab-active' : ''}`} onClick={()=>setActiveTab('listings')}>Job Listings</button>
        <button role="tab" className={`tab ${activeTab==='applications' ? 'tab-active' : ''}`} onClick={()=>setActiveTab('applications')}>Applications</button>
      </div>

      {activeTab === 'listings' && (
        <>
          {/* Student filters */}
          {authUser?.role==='student' && (
            <div className="mb-4 bg-base-300 rounded p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className='flex gap-2 col-span-full'>
                <span className='text-sm'>Quick:</span>
                <button type='button' className='btn btn-xs' onClick={presetTech}>Tech</button>
                <button type='button' className='btn btn-xs' onClick={presetNonTech}>Non-Tech</button>
                <button type='button' className='btn btn-xs btn-outline' onClick={resetStudentFilters}>Reset</button>
              </div>
              <input className='input input-bordered w-full' placeholder='Filter by job type' value={jobTypeFilter} onChange={e=>setJobTypeFilter(e.target.value)} />
              <input className='input input-bordered w-full' placeholder='Filter by company' value={companyFilter} onChange={e=>setCompanyFilter(e.target.value)} />
              <input className='input input-bordered w-full md:col-span-2 lg:col-span-1' placeholder='Requirement keywords (comma separated)' value={requirementsFilter} onChange={e=>setRequirementsFilter(e.target.value)} />
              <input className='input input-bordered w-full' type='number' placeholder='Min salary' value={salaryMin} onChange={e=>setSalaryMin(e.target.value)} />
              <input className='input input-bordered w-full' type='number' placeholder='Max salary' value={salaryMax} onChange={e=>setSalaryMax(e.target.value)} />
              <select className='select select-bordered w-full' value={jobSort} onChange={e=>setJobSort(e.target.value)}>
                <option value='dateDesc'>Newest</option>
                <option value='dateAsc'>Oldest</option>
                <option value='salaryDesc'>Salary (high → low)</option>
                <option value='salaryAsc'>Salary (low → high)</option>
              </select>
            </div>
          )}

      {isError ? (
        <div>Failed to load jobs.</div>
      ) : isLoading ? (
        <div>Loading jobs...</div>
      ) : filteredJobs && filteredJobs.length > 0 ? (
            <JobsVirtualList jobs={filteredJobs} appliedSet={appliedSet} authUser={authUser} onApply={setApplyFor} />
          ) : (
            <div>No jobs found.</div>
          )}
        </>
      )}

      {activeTab === 'applications' && (
        <div className="space-y-4">
          {authUser?.role === 'student' && !myApplications?.application?.length && (
            <div className="text-info">No applications yet.</div>
          )}
          {authUser?.role === 'student' && myApplications?.application?.map((app)=> (
            <div key={app._id} className="p-4 bg-base-300 rounded shadow flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">{app.job?.title}</div>
                <div className="text-sm text-info">{app.job?.company?.name || 'Company'}</div>
              </div>
              <div>
                <span className={`badge ${app.status==='accepted' ? 'badge-success' : app.status==='rejected' ? 'badge-error' : 'badge-warning'}`}>
                  {app.status}
                </span>
              </div>
            </div>
          ))}

          {authUser?.role === 'recruiter' && (
            <div className='mb-4 bg-base-300 rounded p-3 grid grid-cols-1 md:grid-cols-3 gap-3'>
              <input className='input input-bordered w-full' placeholder='Search by applicant name' value={appsSearch} onChange={e=>setAppsSearch(e.target.value)} />
              <select className='select select-bordered w-full' value={appsSort} onChange={e=>setAppsSort(e.target.value)}>
                <option value='dateDesc'>Newest</option>
                <option value='dateAsc'>Oldest</option>
                <option value='nameAsc'>Name (A→Z)</option>
                <option value='nameDesc'>Name (Z→A)</option>
                <option value='aiDesc'>AI score (high → low)</option>
                <option value='aiAsc'>AI score (low → high)</option>
              </select>
              <input className='input input-bordered w-full' type='number' placeholder='Min AI score' value={appsMinScore} onChange={e=>setAppsMinScore(e.target.value)} />
              <div className='col-span-full flex gap-3 items-center'>
                <label className='label cursor-pointer gap-2'>
                  <input type='checkbox' className='checkbox checkbox-sm' checked={hideRejected} onChange={(e)=>setHideRejected(e.target.checked)} />
                  <span className='text-sm'>Hide rejected</span>
                </label>
                <button type='button' className='btn btn-xs btn-outline' onClick={resetRecruiterFilters}>Reset</button>
              </div>
            </div>
          )}

          {authUser?.role === 'recruiter' && recruiterAppsSorted.length === 0 && (
            <div className="text-info">No applications for your jobs yet.</div>
          )}

          {authUser?.role === 'recruiter' && recruiterAppsSorted.map((app)=> (
            <RecruiterApplicationItem key={app._id} app={app} onUpdated={()=>{queryClient.invalidateQueries(['adminJobs']);}} />
          ))}
        </div>
      )}
      {applyFor && authUser?.role==='student' && (
        <StudentApplyForm job={applyFor} onClose={()=>setApplyFor(null)} onSuccess={()=>{
          setApplyFor(null);
          queryClient.invalidateQueries(['applications:me']);
          queryClient.invalidateQueries(['jobs']);
        }} />
      )}
    </div>
  )
}

const RecruiterApplicationItem = ({ app, onUpdated }) => {
  const queryClient = useQueryClient()
  const [showWhy, setShowWhy] = useState(false)
  const { mutate: updateStatus, isLoading } = useMutation({
    mutationFn: async ({id, status}) => {
      await axiosInstance.put(`/application/${id}/status`, { status })
    },
    onSuccess: () => {
      toast.success('Status updated')
      queryClient.invalidateQueries(['adminJobs'])
      onUpdated?.()
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to update')
    }
  })

  const { mutate: rescore, isLoading: isRescoring } = useMutation({
    mutationFn: async () => {
      await axiosInstance.put(`/application/${app._id}/score-ai`)
    },
    onSuccess: () => {
      toast.success('Re-scored')
      queryClient.invalidateQueries(['adminJobs'])
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'AI scoring failed')
    }
  })

  return (
    <div className="p-4 bg-base-300 rounded shadow">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to={`/profile/${app.applicant?.username || ''}`} className="shrink-0">
            <img src={app.applicant?.profilePicture || '/avatar.png'} className="w-10 h-10 rounded-full" />
          </Link>
          <div className='min-w-0'>
            <Link to={`/profile/${app.applicant?.username || ''}`} className="font-semibold link link-hover block truncate">{app.applicant?.name}</Link>
            <div className="text-sm text-info truncate">Applied for: {app.job?.title}</div>
          </div>
        </div>
        <RecruiterActions app={app} queryClient={queryClient} isLoading={isLoading} updateStatus={updateStatus} />
      </div>
      {app.answers && (
        <div className="mt-3 text-sm">
          <div><span className="font-medium">Name:</span> {app.answers.fullName}</div>
          <div><span className="font-medium">Email:</span> {app.answers.email}</div>
          <div><span className="font-medium">Phone:</span> {app.answers.phone}</div>
          {app.answers.coverLetter && (
            <div className='mt-2'><span className="font-medium">Cover Letter:</span>
              <div className='whitespace-pre-wrap text-info'>{app.answers.coverLetter}</div>
            </div>
          )}
        </div>
      )}
      <div className='mt-3 flex flex-wrap items-center gap-2 sm:gap-3'>
        {typeof app.resumeScore === 'number' && (
          <span className='badge badge-info'>AI score: {app.resumeScore}</span>
        )}
        <button className='btn btn-xs' onClick={()=>setShowWhy(s=>!s)}>Why?</button>
        <button className='btn btn-xs btn-outline' disabled={isRescoring} onClick={()=>rescore()}>{isRescoring ? 'Re-scoring...' : 'Re-score'}</button>
      </div>
      {showWhy && app.aiSummary && (
        <div className='mt-2 text-sm text-info whitespace-pre-wrap'>{app.aiSummary}</div>
      )}

      {app.resume && (
        <div className="mt-3">
          {app.resume.provider === 'upload' && app.resume.url && (
            <a className="btn btn-outline btn-sm" href={app.resume.url} target="_blank" rel="noreferrer">Download Resume</a>
          )}
          {app.resume.provider === 'drive' && app.resume.driveLink && (
            <a className="btn btn-outline btn-sm" href={app.resume.driveLink} target="_blank" rel="noreferrer">Open Drive Resume</a>
          )}
        </div>
      )}
    </div>
  )
}

const StudentApplyForm = ({ job, onClose, onSuccess }) => {
  const queryClient = useQueryClient()
  const { mutate, isLoading } = useMutation({
    mutationFn: async (formData) => {
      await axiosInstance.post('/application/apply', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    },
    onSuccess: () => {
      toast.success('Application submitted')
      onSuccess?.()
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to apply')
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.append('jobId', job._id)
    mutate(fd)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-base-300 rounded p-4 w-full max-w-xl">
        <h3 className="text-lg font-semibold mb-3">Apply for {job.title}</h3>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input name='fullName' className="input input-bordered w-full" placeholder="Full name" required />
          <input name='email' type='email' className="input input-bordered w-full" placeholder="Email" required />
          <input name='phone' className="input input-bordered w-full" placeholder="Phone" />
          <textarea name='coverLetter' className="textarea textarea-bordered w-full" placeholder="Cover letter (optional)" />

          <div className='divider'>Resume</div>
          <div className='text-sm'>Upload a file OR provide a Google Drive link</div>
          <input name='resume' type='file' accept='.pdf,.doc,.docx,.rtf,.odt' className='file-input file-input-bordered w-full' />
          <input name='resumeDriveLink' className='input input-bordered w-full' placeholder='Google Drive link (optional)' />

          <div className='flex justify-end gap-2 mt-2'>
            <button type='button' className='btn' onClick={onClose}>Cancel</button>
            <button type='submit' className='btn btn-primary' disabled={isLoading}>{isLoading ? 'Submitting...' : 'Submit'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

const DeleteApplicationButton = ({ id, onDeleted }) => {
  const { mutate, isLoading } = useMutation({
    mutationFn: async () => {
      await axiosInstance.delete(`/application/${id}`)
    },
    onSuccess: () => {
      toast.success('Application deleted')
      onDeleted?.()
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Delete failed')
    }
  })
  return (
    <button className='btn btn-outline btn-sm' disabled={isLoading} onClick={()=>{
      if (confirm('Delete this application? This cannot be undone.')) mutate()
    }}>Delete</button>
  )
}

const RecruiterActions = ({ app, queryClient, isLoading, updateStatus }) => {
  const userId = app.applicant?._id
  const { data: statusData } = useQuery({
    queryKey: ['connStatus', userId],
    queryFn: async ()=>{
      const res = await axiosInstance.get(`/connections/status/${userId}`)
      return res.data
    },
    enabled: !!userId,
  })

  const { mutate: sendReq, isLoading: isSending } = useMutation({
    mutationFn: async ()=>{
      await axiosInstance.post(`/connections/request/${userId}`)
    },
    onSuccess: ()=>{
      toast.success('Connection request sent')
      queryClient.invalidateQueries(['connStatus', userId])
    },
    onError: (err)=>{
      toast.error(err?.response?.data?.message || 'Failed to send request')
    }
  })

  const { mutate: acceptReq, isLoading: isAccepting } = useMutation({
    mutationFn: async ()=>{
      const reqId = statusData?.requestId
      await axiosInstance.put(`/connections/accept/${reqId}`)
    },
    onSuccess: ()=>{
      toast.success('Connection accepted')
      queryClient.invalidateQueries(['connStatus', userId])
    },
    onError: (err)=>{
      toast.error(err?.response?.data?.message || 'Failed to accept')
    }
  })

  const renderConnect = () => {
    const st = statusData?.status
    if (st === 'connected') return <span className='badge badge-success'>Connected</span>
    if (st === 'pending') return <button className='btn btn-disabled btn-xs md:btn-sm'>Requested</button>
    if (st === 'received') return <button className='btn btn-xs md:btn-sm' disabled={isAccepting} onClick={()=>acceptReq()}>Accept request</button>
    return <button className='btn btn-outline btn-xs md:btn-sm' disabled={isSending} onClick={()=>sendReq()}>Connect</button>
  }

  return (
    <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto items-center">
      <span className={`badge ${app.status==='accepted' ? 'badge-success' : app.status==='rejected' ? 'badge-error' : 'badge-warning'}`}>{app.status}</span>
      <button className="btn btn-success btn-xs md:btn-sm" disabled={isLoading} onClick={()=>updateStatus({id: app._id, status:'accepted'})}>Accept</button>
      <button className="btn btn-error btn-xs md:btn-sm" disabled={isLoading} onClick={()=>updateStatus({id: app._id, status:'rejected'})}>Deny</button>
      {userId && renderConnect()}
      <DeleteApplicationButton id={app._id} onDeleted={()=>{queryClient.invalidateQueries(['adminJobs'])}} />
    </div>
  )
}

import { List } from 'react-window'

const JobsVirtualList = ({ jobs, appliedSet, authUser, onApply }) => {
  const Row = ({ index, style }) => {
    const job = jobs[index]
    return (
      <div style={style} className="px-1">
        <div className="p-4 bg-base-300 rounded shadow">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Link className='link link-hover' to={`/jobs/${job._id}`}>{job.title}</Link>
            {job.company?.name && (
              <span className="badge badge-outline">{job.company.name}</span>
            )}
          </h2>
          <p className="text-info line-clamp-3">{job.description}</p>
          <div className="text-sm text-info mt-2">
            Posted by: {job.created_by?.name || 'Unknown'}
          </div>
          {authUser?.role === 'student' && (
            appliedSet.has(job._id) ? (
              <span className="badge badge-success mt-3">Applied</span>
            ) : (
              <button
                className="btn btn-success mt-3"
                onClick={() => onApply(job)}
              >
                Apply
              </button>
            )
          )}
        </div>
      </div>
    )
  }
  const itemCount = jobs.length
  const itemSize = 140 // px height per row
  return (
    <List
      defaultHeight={600}
      rowCount={itemCount}
      rowHeight={itemSize}
      rowComponent={Row}
      rowProps={{}}
      style={{ width: '100%' }}
    />
  )
}

export default Jobs
