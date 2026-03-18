'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Route, MapPin, Navigation, ExternalLink } from 'lucide-react'
import { getOptimizedRoute } from '@/app/actions/route-planning'
import Link from 'next/link'

interface RouteJob {
  id: string
  job_number: string
  scheduled_time: string | null
  address: string
  status: string
  customer: { full_name: string } | null
  services: unknown
}

export function TodaysRoute() {
  const [jobs, setJobs] = useState<RouteJob[]>([])
  const [totalDistanceKm, setTotalDistanceKm] = useState<number | null>(null)
  const [totalDurationMin, setTotalDurationMin] = useState<number | null>(null)
  const [googleMapsUrl, setGoogleMapsUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    getOptimizedRoute(today).then((result) => {
      setJobs(result.jobs)
      setTotalDistanceKm(result.totalDistanceKm)
      setTotalDurationMin(result.totalDurationMin)
      setGoogleMapsUrl(result.googleMapsUrl)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  function getServiceNames(services: unknown): string {
    if (!services) return ''
    const parsed = typeof services === 'string' ? JSON.parse(services) : services
    if (!Array.isArray(parsed)) return ''
    return parsed.map((s: { service_name: string }) => s.service_name).join(', ')
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Route className="h-4 w-4 text-green-600" />
          Dagens rute
        </CardTitle>
        <Link href="/route-planner">
          <Button variant="ghost" size="sm" className="text-green-600 gap-1">
            Køreplan
            <ExternalLink className="h-3 w-3" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-6">
            <div className="h-6 w-6 animate-spin rounded-full border-3 border-green-600 border-t-transparent" />
          </div>
        ) : jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Ingen jobs planlagt i dag
          </p>
        ) : (
          <div className="space-y-3">
            {/* Distance/duration summary */}
            {(totalDistanceKm !== null || totalDurationMin !== null) && (
              <div className="text-sm font-medium text-muted-foreground">
                {totalDistanceKm !== null && <span>{totalDistanceKm} km</span>}
                {totalDistanceKm !== null && totalDurationMin !== null && <span> · </span>}
                {totalDurationMin !== null && <span>ca. {totalDurationMin} min køretid</span>}
              </div>
            )}

            {/* Job list */}
            <div className="space-y-2">
              {jobs.map((job, index) => (
                <div key={job.id} className="flex items-center gap-3 rounded-lg border p-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100 text-green-700 text-xs font-bold shrink-0">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {job.customer?.full_name || 'Ukendt'}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{job.address}</span>
                    </div>
                    {getServiceNames(job.services) && (
                      <p className="text-xs text-muted-foreground truncate">{getServiceNames(job.services)}</p>
                    )}
                  </div>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0"
                  >
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                      <Navigation className="h-3 w-3" />
                    </Button>
                  </a>
                </div>
              ))}
            </div>

            {/* Full route button */}
            {googleMapsUrl && (
              <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
                <Button className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white min-h-[44px]">
                  <Route className="h-4 w-4" />
                  Åbn hele ruten i Google Maps
                </Button>
              </a>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
