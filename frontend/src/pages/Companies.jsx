import React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axiosInstance from '../lib/axios.js'
import { Link } from 'react-router-dom'
import { toast } from 'react-hot-toast'

const Companies = () => {
  const queryClient = useQueryClient()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['myCompanies'],
    queryFn: async () => {
      const res = await axiosInstance.get('/company/get')
      return res.data
    }
  })

  if (isLoading) return <div className="p-4">Loading companies...</div>
  if (isError) return <div className="p-4">Failed to load companies.</div>

  const companies = data?.companies || []

  const { mutate: deleteCompany, isLoading: isDeleting } = useMutation({
    mutationFn: async (id) => {
      await axiosInstance.delete(`/company/delete/${id}`)
    },
    onSuccess: () => {
      toast.success('Company deleted')
      queryClient.invalidateQueries(['myCompanies'])
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to delete company')
    }
  })

  const onDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this company?')) {
      deleteCompany(id)
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">My Companies</h1>
        <Link to="/company/register" className="btn btn-primary">Register Company</Link>
      </div>

      {companies.length === 0 ? (
        <div className="alert">
          <span>No companies yet. Register your first company.</span>
        </div>
      ) : (
        <ul className="space-y-4">
          {companies.map(c => (
            <li key={c._id} className="p-4 bg-base-300 rounded shadow flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">{c.name}</div>
                <div className="text-sm text-info">
                  {c.location && <span>{c.location} • </span>}
                  {c.website && <a className="link" href={c.website} target="_blank" rel="noreferrer">{c.website}</a>}
                </div>
              </div>
              <div className="flex gap-2">
                <Link to={`/company/edit/${c._id}`} className="btn btn-sm">Edit</Link>
                <button className="btn btn-sm " disabled={isDeleting} onClick={()=>onDelete(c._id)}>Delete</button>
                <Link to="/jobs/post" className="btn btn-sm btn-success">Post Job</Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default Companies
