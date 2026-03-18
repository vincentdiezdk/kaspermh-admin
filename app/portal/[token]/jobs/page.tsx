'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { getPortalJobs } from '@/lib/actions/portal'

interface Photo {
  id: string
  job_id: string
  public_url: string
  type: 'before' | 'after'
}

interface PortalJob {
  id: string
  job_number: string
  scheduled_date: string
  status: string
  address: string
  services: { service_name: string; quantity: number; unit: string }[]
  photos: Photo[]
}

const statusLabels: Record<string, string> = {
  scheduled: 'Planlagt',
  en_route: 'Undervejs',
  arrived: 'Ankommet',
  in_progress: 'I gang',
  completed: 'Afsluttet',
  invoiced: 'Faktureret',
  cancelled: 'Annulleret',
}

const statusColors: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  en_route: 'bg-yellow-100 text-yellow-700',
  arrived: 'bg-orange-100 text-orange-700',
  in_progress: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  invoiced: 'bg-green-600 text-white',
  cancelled: 'bg-gray-100 text-gray-700',
}

export default function PortalJobsPage() {
  const params = useParams()
  const token = params.token as string
  const [jobs, setJobs] = useState<PortalJob[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    getPortalJobs(token).then(result => {
      if (result) setJobs(result.jobs)
      setLoading(false)
    })
  }, [token])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Dine jobs</h1>

      {jobs.length === 0 ? (
        <div className="bg-white rounded-xl border p-8 text-center text-gray-500">
          Ingen jobs fundet
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map(job => {
            const isExpanded = expanded === job.id
            const beforePhotos = job.photos.filter(p => p.type === 'before')
            const afterPhotos = job.photos.filter(p => p.type === 'after')
            const hasPhotos = beforePhotos.length > 0 || afterPhotos.length > 0

            return (
              <div key={job.id} className="bg-white rounded-xl border overflow-hidden">
                <button
                  onClick={() => setExpanded(isExpanded ? null : job.id)}
                  className="w-full p-4 text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900">
                          {new Date(job.scheduled_date + 'T00:00:00').toLocaleDateString('da-DK', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[job.status] || 'bg-gray-100 text-gray-700'}`}>
                          {statusLabels[job.status] || job.status}
                        </span>
                      </div>
                      {Array.isArray(job.services) && job.services.length > 0 && (
                        <p className="text-sm text-gray-600 mt-1">
                          {job.services.map(s => s.service_name).join(', ')}
                        </p>
                      )}
                      <p className="text-sm text-gray-500 mt-0.5">{job.address}</p>
                    </div>
                    {hasPhotos && (
                      <svg
                        className={`w-5 h-5 text-gray-400 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </div>
                </button>

                {isExpanded && hasPhotos && (
                  <div className="border-t px-4 pb-4 pt-3">
                    {beforePhotos.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Før</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {beforePhotos.map(photo => (
                            <img
                              key={photo.id}
                              src={photo.public_url}
                              alt="Før billede"
                              className="rounded-lg w-full h-32 object-cover"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    {afterPhotos.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Efter</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {afterPhotos.map(photo => (
                            <img
                              key={photo.id}
                              src={photo.public_url}
                              alt="Efter billede"
                              className="rounded-lg w-full h-32 object-cover"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
