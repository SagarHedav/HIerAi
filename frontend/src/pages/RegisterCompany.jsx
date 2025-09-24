import React, { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import axiosInstance from '../lib/axios.js'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'

const RegisterCompany = () => {
  const [companyName, setCompanyName] = useState('')
  const [description, setDescription] = useState('')
  const [website, setWebsite] = useState('')
  const [location, setLocation] = useState('')
  const [logo, setLogo] = useState('')
  const navigate = useNavigate()

  const { mutate, isLoading } = useMutation({
    mutationFn: async () => {
      await axiosInstance.post('/company/register', { companyName, description, website, location, logo })
    },
    onSuccess: () => {
      toast.success('Company registered successfully')
      navigate('/jobs/post')
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to register company')
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!companyName.trim()) return
    mutate()
  }

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Register Company</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          className="input input-bordered"
          placeholder="Company Name"
          value={companyName}
          onChange={e => setCompanyName(e.target.value)}
          required
        />
        <textarea
          className="textarea textarea-bordered"
          placeholder="Description (optional)"
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
        <input
          className="input input-bordered"
          placeholder="Website (optional)"
          value={website}
          onChange={e => setWebsite(e.target.value)}
        />
        <input
          className="input input-bordered"
          placeholder="Location (optional)"
          value={location}
          onChange={e => setLocation(e.target.value)}
        />
        <input
          className="input input-bordered"
          placeholder="Logo URL (optional)"
          value={logo}
          onChange={e => setLogo(e.target.value)}
        />
        <button className="btn btn-primary" type="submit" disabled={isLoading}>
          {isLoading ? 'Registering...' : 'Register'}
        </button>
      </form>
    </div>
  )
}

export default RegisterCompany