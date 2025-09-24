import React, { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import axiosInstance from '../lib/axios.js'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-hot-toast'

const EditCompany = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name:'', description:'', website:'', location:'', logo:'' })

  const { data, isLoading } = useQuery({
    queryKey: ['company', id],
    queryFn: async () => {
      const res = await axiosInstance.get(`/company/get/${id}`)
      return res.data
    }
  })

  useEffect(()=>{
    if (data?.company) {
      setForm({
        name: data.company.name || '',
        description: data.company.description || '',
        website: data.company.website || '',
        location: data.company.location || '',
        logo: data.company.logo || '',
      })
    }
  }, [data])

  const { mutate, isLoading: isSaving } = useMutation({
    mutationFn: async () => {
      const payload = { ...form }
      // backend expects body fields name, description, website, location, logo
      await axiosInstance.put(`/company/update/${id}`, payload)
    },
    onSuccess: () => {
      toast.success('Company updated')
      navigate('/jobs/post')
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to update company')
    }
  })

  const handleChange = (e) => setForm(prev => ({...prev, [e.target.name]: e.target.value}))
  const handleSubmit = (e) => { e.preventDefault(); mutate() }

  if (isLoading) return <div className="p-4">Loading...</div>

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Edit Company</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input className="input input-bordered" name="name" placeholder="Company Name" value={form.name} onChange={handleChange} required />
        <textarea className="textarea textarea-bordered" name="description" placeholder="Description" value={form.description} onChange={handleChange} />
        <input className="input input-bordered" name="website" placeholder="Website" value={form.website} onChange={handleChange} />
        <input className="input input-bordered" name="location" placeholder="Location" value={form.location} onChange={handleChange} />
        <input className="input input-bordered" name="logo" placeholder="Logo URL" value={form.logo} onChange={handleChange} />
        <button className="btn btn-primary" type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</button>
      </form>
    </div>
  )
}

export default EditCompany
