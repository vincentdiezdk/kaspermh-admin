'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { JobStatusBadge } from '@/components/jobs/job-status-badge'
import { formatTime } from '@/lib/format'
import { MapPin, Navigation, Route } from 'lucide-react'
import Link from 'next/link'
import type { JobStatus } from '@/lib/types'

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

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('jobs')
      .select('id, job_number, scheduled_time, address, status, services, customer:customers(full_name)')
      .eq('scheduled_date', selectedDate)
      .neq('status', 'cancelled')
      .order('scheduled_time', { ascending: true })

    setJobs((data as unknown as RouteJob[]) || [])
    setLoading(false)
  }, [selectedDate])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  function getGoogleMapsMultiUrl(): string {
    if (jobs.length === 0) return '#'
    if (jobs.length === 1) {
      return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(jobs[0].address)}`
    }
    const lastJob = jobs[jobs.length - 1]
    const waypoints = jobs
      .slice(0, -1)
      .map((j) => encodeURIComponent(j.address))
      .join('|')
    return `https://www.google.com/maps/dir/?api=1&origin=current+location&destination=${encodeURIComponent(lastJob.address)}&waypoints=${waypoints}`
  }

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

      {/* Date picker + start all button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-auto"
        />
        {jobs.length > 0 && (
          <a href={getGoogleMapsMultiUrl()} target="_blank" rel="noopener noreferrer">
            <Button className="gap-2 bg-green-600 hover:bg-green-700 text-white min-h-[44px]">
              <Route className="h-4 w-4" />
              Start alle ({jobs.length} stop)
            </Button>
          </a>
        )}
      </div>

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
