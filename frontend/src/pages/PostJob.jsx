import React, { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axiosInstance from '../lib/axios.js'
import { useNavigate, Link } from 'react-router-dom'
import { toast } from 'react-hot-toast'

const PostJob = () => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [salary, setSalary] = useState('')
  const [location, setLocation] = useState('')
  const [jobType, setJobType] = useState('')
  const [position, setPosition] = useState('')
  const [experienceLevel, setExperienceLevel] = useState('')
  const [requirements, setRequirements] = useState('') // comma-separated
  const [companyId, setCompanyId] = useState('')
  const [responsibilities, setResponsibilities] = useState('') // comma-separated
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  // Fetch companies for the logged-in recruiter
  const { data: companyData, isLoading: isCompaniesLoading } = useQuery({
    queryKey: ['myCompanies'],
    queryFn: async () => {
      const res = await axiosInstance.get('/company/get')
      return res.data
    }
  })

  // Preselect first company if available
  useEffect(() => {
    if (!companyId && companyData?.companies?.length) {
      setCompanyId(companyData.companies[0]._id)
    }
  }, [companyData, companyId])

  const { mutate, isLoading } = useMutation({
    mutationFn: async (data) => {
      await axiosInstance.post('/job/post', data)
    },
    onSuccess: () => {
      toast.success('Job posted successfully')
      queryClient.invalidateQueries(['jobs'])
      navigate('/jobs')
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || 'Failed to post job'
      toast.error(msg)
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    mutate({
      title,
      description,
      requirements, // comma-separated
      responsibilities, // comma-separated
      salary: Number(salary),
      location,
      jobType,
      position: Number(position),
      experience: Number(experienceLevel),
      companyId,
    })
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Post a Job</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full">
        <input className="input input-bordered w-full" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} required />
        <textarea className="textarea textarea-bordered w-full" placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} required />
        <textarea className="textarea textarea-bordered w-full" placeholder="Requirements (comma separated e.g. React,Node,3+ years)" value={requirements} onChange={e => setRequirements(e.target.value)} required />
        <textarea className="textarea textarea-bordered w-full" placeholder="Responsibilities (comma separated e.g. Build features,Write tests,Review PRs)" value={responsibilities} onChange={e => setResponsibilities(e.target.value)} />
        <input className="input input-bordered w-full" placeholder="Salary" type="number" value={salary} onChange={e => setSalary(e.target.value)} required />
        <input className="input input-bordered w-full" placeholder="Location" value={location} onChange={e => setLocation(e.target.value)} required />
        <input className="input input-bordered w-full" placeholder="Job Type (e.g. Full-time)" value={jobType} onChange={e => setJobType(e.target.value)} required />
        <input className="input input-bordered w-full" placeholder="Positions (number of openings)" type="number" value={position} onChange={e => setPosition(e.target.value)} required />
        <input className="input input-bordered w-full" placeholder="Experience Level (years)" type="number" value={experienceLevel} onChange={e => setExperienceLevel(e.target.value)} required />

        {/* Company selection */}
        {isCompaniesLoading ? (
          <div>Loading your companies...</div>
        ) : companyData?.companies?.length ? (
          <>
            <select className="select select-bordered w-full" value={companyId} onChange={e => setCompanyId(e.target.value)} required>
              {companyData.companies.map(c => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
            <div className="flex flex-wrap gap-3 text-sm mt-1">
              <Link to="/company/register" className="link link-primary">Register new company</Link>
              {companyId && <Link to={`/company/edit/${companyId}`} className="link">Edit selected</Link>}
              <Link to="/companies" className="link">Manage companies</Link>
            </div>
          </>
        ) : (
          <div className="alert alert-warning">
            <div>
              <span>You don’t have any companies yet. Please register one first.</span>
            </div>
            <Link to="/company/register" className="link link-primary">Register company</Link>
          </div>
        )}

        <button className="btn btn-primary w-full md:w-auto" type="submit" disabled={isLoading || !companyId}>
          {isLoading ? 'Posting...' : 'Post Job'}
        </button>
      </form>
    </div>
  )
}

export default PostJob
