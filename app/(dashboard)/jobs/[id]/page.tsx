'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { JobStatusBadge } from '@/components/jobs/job-status-badge'
import { PhotoUpload } from '@/components/jobs/photo-upload'
import { formatTime, formatDuration, formatDateLong, formatPriceShort, formatPhone, unitLabel } from '@/lib/format'
import { updateJobStatus, updateJobNotes, generateInvoice, markJobPaid } from '@/lib/actions/jobs'
import { ArrowLeft, MapPin, Phone, Calendar, Car, Clock, FileText, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import type { JobStatus, QuoteLineItem } from '@/lib/types'

interface JobDetail {
  id: string
  job_number: string
  customer_id: string
  quote_id: string | null
  scheduled_date: string
  scheduled_time: string | null
  estimated_duration: number | null
  assigned_user_id: string | null
  vehicle_id: string | null
  status: JobStatus
  address: string
  services: QuoteLineItem[]
  internal_notes: string | null
  customer_notes: string | null
  invoice_number: string | null
  invoice_sent_at: string | null
  paid_at: string | null
  started_at: string | null
  arrived_at: string | null
  completed_at: string | null
  created_at: string
  customer?: { full_name: string; phone: string; email: string | null } | null
  vehicle?: { name: string; color: string | null; license_plate: string } | null
  assigned_user?: { full_name: string } | null
}

interface Photo {
  id: string
  storage_path: string
  public_url: string
  type: 'before' | 'after'
}

export default function JobDetailPage() {
  const params = useParams()
  const router = useRouter()
  const jobId = params.id as string

  const [job, setJob] = useState<JobDetail | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [customerNotes, setCustomerNotes] = useState('')
  const [internalNotes, setInternalNotes] = useState('')
  const [notesDirty, setNotesDirty] = useState(false)

  const fetchJob = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('jobs')
      .select('*, customer:customers(full_name, phone, email), vehicle:vehicles(name, color, license_plate), assigned_user:profiles!jobs_assigned_user_id_fkey(full_name)')
      .eq('id', jobId)
      .single()

    if (data) {
      // Parse services if they come as string
      const parsed = {
        ...data,
        services: typeof data.services === 'string' ? JSON.parse(data.services) : data.services,
      } as JobDetail
      setJob(parsed)
      setCustomerNotes(parsed.customer_notes || '')
      setInternalNotes(parsed.internal_notes || '')
    }

    const { data: photoData } = await supabase
      .from('job_photos')
      .select('id, storage_path, public_url, type')
      .eq('job_id', jobId)
      .order('taken_at', { ascending: true })

    setPhotos((photoData as Photo[]) || [])
    setLoading(false)
  }, [jobId])

  useEffect(() => {
    fetchJob()
  }, [fetchJob])

  async function handleStatusAction() {
    if (!job) return
    setActionLoading(true)

    try {
      switch (job.status) {
        case 'scheduled': {
          // Open Google Maps and update status
          const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.address)}`
          window.open(mapsUrl, '_blank')
          await updateJobStatus(jobId, 'en_route')
          break
        }
        case 'en_route':
          await updateJobStatus(jobId, 'arrived')
          break
        case 'arrived':
          await updateJobStatus(jobId, 'in_progress')
          break
        case 'in_progress': {
          // Validate photos
          const beforePhotos = photos.filter((p) => p.type === 'before')
          const afterPhotos = photos.filter((p) => p.type === 'after')
          if (beforePhotos.length < 2 || afterPhotos.length < 2) {
            toast.error('Du skal uploade mindst 2 billeder FØR og 2 billeder EFTER jobbet')
            setActionLoading(false)
            return
          }
          await updateJobStatus(jobId, 'completed')
          break
        }
        case 'completed':
          await generateInvoice(jobId)
          break
        case 'invoiced':
          await markJobPaid(jobId)
          break
      }
      await fetchJob()
    } catch (err) {
      toast.error('Fejl ved opdatering')
    } finally {
      setActionLoading(false)
    }
  }

  async function saveNotes() {
    try {
      await updateJobNotes(jobId, customerNotes || null, internalNotes || null)
      setNotesDirty(false)
      toast.success('Noter gemt')
    } catch {
      toast.error('Fejl ved gemning af noter')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
      </div>
    )
  }

  if (!job) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Job ikke fundet</p>
        <Link href="/jobs">
          <Button variant="outline" className="mt-4">Tilbage til jobs</Button>
        </Link>
      </div>
    )
  }

  const statusActionConfig: Record<string, { label: string; icon: string }> = {
    scheduled: { label: 'Kør derhen', icon: '🚗' },
    en_route: { label: 'Jeg er ankommet', icon: '📍' },
    arrived: { label: 'Start job', icon: '▶️' },
    in_progress: { label: 'Afslut job', icon: '✅' },
    completed: { label: 'Opret faktura', icon: '📄' },
    invoiced: { label: 'Marker som betalt', icon: '💰' },
  }

  const actionConfig = statusActionConfig[job.status]
  const beforePhotos = photos.filter((p) => p.type === 'before')
  const afterPhotos = photos.filter((p) => p.type === 'after')

  const serviceTotal = Array.isArray(job.services)
    ? job.services.reduce((sum: number, s: QuoteLineItem) => sum + s.line_total, 0)
    : 0

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Link href="/jobs">
          <Button variant="ghost" size="sm" className="gap-1 min-h-[44px]">
            <ArrowLeft className="h-4 w-4" />
            Tilbage
          </Button>
        </Link>
        <div className="flex-1">
          <h2 className="text-lg font-bold">{job.job_number}</h2>
        </div>
        <JobStatusBadge status={job.status} />
      </div>

      <div className="space-y-4">
        {/* Customer info */}
        <Card>
          <CardContent className="p-4 space-y-2">
            <h3 className="font-semibold text-lg">{job.customer?.full_name || 'Ukendt kunde'}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0" />
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-green-600 underline"
              >
                {job.address}
              </a>
            </div>
            {job.customer?.phone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4 shrink-0" />
                <a href={`tel:${job.customer.phone}`} className="hover:text-green-600">
                  {formatPhone(job.customer.phone)}
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Services */}
        <Card>
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold mb-2">Services</h4>
            <div className="space-y-1">
              {Array.isArray(job.services) && job.services.map((s: QuoteLineItem, i: number) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>{s.service_name} · {s.quantity} {unitLabel(s.unit)}</span>
                  <span className="font-medium">{formatPriceShort(s.line_total)}</span>
                </div>
              ))}
            </div>
            {serviceTotal > 0 && (
              <div className="flex justify-between text-sm font-bold border-t mt-2 pt-2">
                <span>Total</span>
                <span>{formatPriceShort(serviceTotal)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Schedule details */}
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{formatDateLong(job.scheduled_date)}</span>
              {job.scheduled_time && <span className="font-medium">kl. {formatTime(job.scheduled_time)}</span>}
            </div>
            {job.vehicle && (
              <div className="flex items-center gap-2 text-sm">
                <Car className="h-4 w-4 text-muted-foreground" />
                <span>{job.vehicle.color ? `${job.vehicle.color} ` : ''}{job.vehicle.name}</span>
              </div>
            )}
            {job.estimated_duration && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>~{formatDuration(job.estimated_duration)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Photos */}
        <Card>
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold mb-3">FOTOS</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <PhotoUpload
                jobId={jobId}
                type="before"
                photos={beforePhotos}
                onPhotosChange={fetchJob}
              />
              <PhotoUpload
                jobId={jobId}
                type="after"
                photos={afterPhotos}
                onPhotosChange={fetchJob}
              />
            </div>
          </CardContent>
        </Card>

        {/* Customer notes */}
        <Card>
          <CardContent className="p-4 space-y-2">
            <h4 className="text-sm font-semibold">NOTER TIL KUNDEN</h4>
            <textarea
              value={customerNotes}
              onChange={(e) => { setCustomerNotes(e.target.value); setNotesDirty(true) }}
              rows={3}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              placeholder="Synlige noter til kunden..."
            />
          </CardContent>
        </Card>

        {/* Internal notes */}
        <Card>
          <CardContent className="p-4 space-y-2">
            <h4 className="text-sm font-semibold">INTERNE NOTER</h4>
            <textarea
              value={internalNotes}
              onChange={(e) => { setInternalNotes(e.target.value); setNotesDirty(true) }}
              rows={3}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              placeholder="Interne noter (ikke synlige for kunden)..."
            />
            {notesDirty && (
              <Button
                onClick={saveNotes}
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Gem noter
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Invoice link */}
        {job.invoice_number && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>Faktura: <strong>{job.invoice_number}</strong></span>
                </div>
                <Link href={`/jobs/${jobId}/invoice`}>
                  <Button variant="outline" size="sm" className="min-h-[44px]">
                    Se faktura
                  </Button>
                </Link>
              </div>
              {job.paid_at && (
                <p className="text-sm text-green-600 font-medium mt-2">
                  Betalt {new Date(job.paid_at).toLocaleDateString('da-DK')}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sticky bottom action bar */}
      {actionConfig && !job.paid_at && (
        <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-4 z-50">
          <div className="max-w-2xl mx-auto">
            <Button
              onClick={handleStatusAction}
              disabled={actionLoading}
              className="w-full h-14 text-lg font-semibold gap-3 bg-green-600 hover:bg-green-700 text-white"
            >
              {actionLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <span>{actionConfig.icon}</span>
              )}
              {actionConfig.label}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
