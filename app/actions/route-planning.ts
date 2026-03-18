'use server'

import { createClient } from '@/lib/supabase/server'

interface RouteJob {
  id: string
  job_number: string
  scheduled_time: string | null
  address: string
  lat: number | null
  lng: number | null
  status: string
  customer: { full_name: string } | null
  services: unknown
}

interface RouteResult {
  jobs: RouteJob[]
  totalDistanceKm: number | null
  totalDurationMin: number | null
  googleMapsUrl: string | null
  optimized: boolean
}

export async function getOptimizedRoute(date: string): Promise<RouteResult> {
  const supabase = await createClient()

  // Fetch jobs for the date
  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, job_number, scheduled_time, address, lat, lng, status, services, customer:customers(full_name)')
    .eq('scheduled_date', date)
    .in('status', ['scheduled', 'confirmed', 'en_route', 'arrived', 'in_progress'])
    .order('scheduled_time', { ascending: true })

  if (!jobs || jobs.length === 0) {
    return { jobs: [], totalDistanceKm: null, totalDurationMin: null, googleMapsUrl: null, optimized: false }
  }

  const typedJobs = jobs as unknown as RouteJob[]

  // Get company address as origin/destination
  const { data: company } = await supabase
    .from('company_settings')
    .select('address, postal_code, city')
    .limit(1)
    .single()

  const companyAddress = company
    ? `${company.address || ''}, ${company.postal_code || ''} ${company.city || ''}`.trim()
    : null

  const apiKey = process.env.GOOGLE_MAPS_API_KEY

  // Try Google Routes API optimization
  if (apiKey && companyAddress && typedJobs.length >= 2) {
    try {
      const result = await optimizeWithGoogleRoutes(apiKey, companyAddress, typedJobs)
      if (result) return result
    } catch (err) {
      console.warn('[Route] Google Routes API failed, falling back to time order:', err)
    }
  }

  // Fallback: return jobs in scheduled_time order with basic Google Maps link
  const mapsUrl = buildGoogleMapsUrl(companyAddress, typedJobs)

  return {
    jobs: typedJobs,
    totalDistanceKm: null,
    totalDurationMin: null,
    googleMapsUrl: mapsUrl,
    optimized: false,
  }
}

async function optimizeWithGoogleRoutes(
  apiKey: string,
  origin: string,
  jobs: RouteJob[]
): Promise<RouteResult | null> {
  // Use Google Directions API with waypoint optimization
  const waypoints = jobs.map(j => j.address).join('|')
  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(origin)}&waypoints=optimize:true|${encodeURIComponent(waypoints)}&key=${apiKey}&language=da&region=dk`

  const res = await fetch(url, { next: { revalidate: 300 } })
  if (!res.ok) {
    console.warn('[Route] Google Directions API returned', res.status)
    return null
  }

  const data = await res.json()
  if (data.status !== 'OK' || !data.routes?.[0]) {
    console.warn('[Route] Google Directions API status:', data.status)
    return null
  }

  const route = data.routes[0]
  const waypointOrder: number[] = route.waypoint_order || []

  // Reorder jobs based on optimized waypoint order
  const orderedJobs = waypointOrder.length === jobs.length
    ? waypointOrder.map(i => jobs[i])
    : jobs

  // Calculate total distance and duration
  let totalDistanceM = 0
  let totalDurationS = 0
  for (const leg of route.legs) {
    totalDistanceM += leg.distance?.value || 0
    totalDurationS += leg.duration?.value || 0
  }

  const totalDistanceKm = Math.round(totalDistanceM / 100) / 10
  const totalDurationMin = Math.round(totalDurationS / 60)

  // Build Google Maps URL with optimized order
  const mapsUrl = buildGoogleMapsUrl(origin, orderedJobs)

  return {
    jobs: orderedJobs,
    totalDistanceKm,
    totalDurationMin,
    googleMapsUrl: mapsUrl,
    optimized: true,
  }
}

function buildGoogleMapsUrl(origin: string | null, jobs: RouteJob[]): string | null {
  if (jobs.length === 0) return null

  if (jobs.length === 1) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(jobs[0].address)}`
  }

  const destination = origin
    ? encodeURIComponent(origin)
    : encodeURIComponent(jobs[jobs.length - 1].address)

  const waypoints = jobs
    .map(j => encodeURIComponent(j.address))
    .join('|')

  const originParam = origin
    ? encodeURIComponent(origin)
    : 'current+location'

  return `https://www.google.com/maps/dir/?api=1&origin=${originParam}&destination=${destination}&waypoints=${waypoints}`
}
