'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { JobStatusBadge } from '@/components/jobs/job-status-badge'
import { formatTime } from '@/lib/format'
import { MapPin, Navigation, Route, Zap } from 'lucide-react'
import Link from 'next/link'
import type { JobStatus } from '@/lib/types'
import { getOptimizedRoute } from '@/app/actions/route-planning'

interface RouteJob {
  id: string
  job_number: string
  scheduled_time: string | null
  address: string
  status: JobStatus
  customer?: { full_name: string } | null
  services: unknown
}

export default function RoutePlannerPage() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0])
  const [jobs, setJobs] = useState<RouteJob[]>([])
  const [loading, setLoading] = useState(true)
  const [totalDistanceKm, setTotalDistanceKm] = useState<number | null>(null)
  const [totalDurationMin, setTotalDurationMin] = useState<number | null>(null)
  const [googleMapsUrl, setGoogleMapsUrl] = useState<string | null>(null)
  const [optimized, setOptimized] = useState(false)

  const fetchRoute = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getOptimizedRoute(selectedDate)
      setJobs(result.jobs as unknown as RouteJob[])
      setTotalDistanceKm(result.totalDistanceKm)
      setTotalDurationMin(result.totalDurationMin)
      setGoogleMapsUrl(result.googleMapsUrl)
      setOptimized(result.optimized)
    } catch {
      setJobs([])
      setTotalDistanceKm(null)
      setTotalDurationMin(null)
      setGoogleMapsUrl(null)
      setOptimized(false)
    }
    setLoading(false)
  }, [selectedDate])

  useEffect(() => {
    fetchRoute()
  }, [fetchRoute])

  function getServiceNames(services: unknown): string {
    if (!services) return ''
    const parsed = typeof services === 'string' ? JSON.parse(services) : services
    if (!Array.isArray(parsed)) return ''
    return parsed.map((s: { service_name: string }) => s.service_name).join(', ')
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Køreplan</h2>
        <p className="text-muted-foreground">Planlæg optimale ruter for dagens jobs</p>
      </div>

      {/* Date picker + route info */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-auto"
          />
          {optimized && (
            <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
              <Zap className="h-3 w-3" />
              Optimeret
            </span>
          )}
        </div>
        {googleMapsUrl && jobs.length > 0 && (
          <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
            <Button className="gap-2 bg-green-600 hover:bg-green-700 text-white min-h-[44px]">
              <Route className="h-4 w-4" />
              Start alle ({jobs.length} stop)
            </Button>
          </a>
        )}
      </div>

      {/* Distance/duration summary */}
      {(totalDistanceKm !== null || totalDurationMin !== null) && (
        <div className="text-sm font-medium text-muted-foreground">
          {totalDistanceKm !== null && <span>{totalDistanceKm} km</span>}
          {totalDistanceKm !== null && totalDurationMin !== null && <span> · </span>}
          {totalDurationMin !== null && <span>ca. {totalDurationMin} min køretid</span>}
        </div>
      )}

      {/* Job list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
        </div>
      ) : jobs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MapPin className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Ingen jobs på denne dato</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {jobs.map((job, index) => (
            <Card key={job.id}>
              <CardContent className="flex items-center justify-between p-4 gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-700 text-sm font-bold shrink-0">
                    {index + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {job.scheduled_time && (
                        <span className="text-sm font-bold tabular-nums">{formatTime(job.scheduled_time)}</span>
                      )}
                      <span className="text-sm font-medium truncate">
                        {job.customer?.full_name || 'Ukendt'}
                      </span>
                      <JobStatusBadge status={job.status} />
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{job.address}</span>
                    </div>
                    {getServiceNames(job.services) && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {getServiceNames(job.services)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm" className="gap-1 min-h-[44px]">
                      <Navigation className="h-3 w-3" />
                      Naviger
                    </Button>
                  </a>
                  <Link href={`/jobs/${job.id}`}>
                    <Button variant="ghost" size="sm" className="min-h-[44px]">
                      Åbn
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
