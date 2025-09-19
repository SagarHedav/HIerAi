import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import axiosInstance from '../lib/axios.js'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'

const PostJob = () => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [salary, setSalary] = useState('')
  const [location, setLocation] = useState('')
  const [jobType, setJobType] = useState('')
  const [position, setPosition] = useState('')
  const [experienceLevel, setExperienceLevel] = useState('')
  const [company, setCompany] = useState('')
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { mutate, isLoading } = useMutation({
    mutationFn: async (data) => {
      await axiosInstance.post('/job/post', data)
    },
    onSuccess: () => {
      toast.success('Job posted successfully')
      queryClient.invalidateQueries(['jobs'])
      navigate('/jobs')
    },
    onError: () => {
      toast.error('Failed to post job')
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    mutate({ title, description, salary, location, jobType, position, experienceLevel, company })
  }

  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Post a Job</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input className="input input-bordered" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} required />
        <textarea className="input input-bordered" placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} required />
        <input className="input input-bordered" placeholder="Salary" type="number" value={salary} onChange={e => setSalary(e.target.value)} required />
        <input className="input input-bordered" placeholder="Location" value={location} onChange={e => setLocation(e.target.value)} required />
        <input className="input input-bordered" placeholder="Job Type" value={jobType} onChange={e => setJobType(e.target.value)} required />
        <input className="input input-bordered" placeholder="Position" type="number" value={position} onChange={e => setPosition(e.target.value)} required />
        <input className="input input-bordered" placeholder="Experience Level" type="number" value={experienceLevel} onChange={e => setExperienceLevel(e.target.value)} required />
        {/* Company ID input */}
        <input
          className="input input-bordered"
          placeholder="Company ID"
          value={company}
          onChange={e => setCompany(e.target.value)}
          required
        />
        <button className="btn btn-primary" type="submit" disabled={isLoading}>
          {isLoading ? 'Posting...' : 'Post Job'}
        </button>
      </form>
    </div>
  )
}

export default PostJob
