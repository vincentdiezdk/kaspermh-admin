'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { JobStatusBadge } from '@/components/jobs/job-status-badge'
import { formatTime, formatPriceShort, unitLabel } from '@/lib/format'
import { createJob } from '@/lib/actions/jobs'
import { Plus, ChevronLeft, ChevronRight, List, CalendarDays, Clock, MapPin, Search, X, Download, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { exportJobsCSV } from '@/lib/actions/export'
import type { Job, JobStatus, QuoteLineItem, Service } from '@/lib/types'

type ViewMode = 'list' | 'week' | 'day'

type JobWithCustomer = Omit<Job, 'customer'> & {
  customer?: { full_name: string } | null
  invoice_sent_at?: string | null
  paid_at?: string | null
  invoice_number?: string | null
}

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d
}

function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0]
}

const DANISH_DAY_SHORT = ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør']
const DANISH_MONTHS = [
  'januar', 'februar', 'marts', 'april', 'maj', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'december',
]

export default function JobsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [jobs, setJobs] = useState<JobWithCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogDate, setDialogDate] = useState('')
  const [dialogTime, setDialogTime] = useState('')

  // Detect mobile
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Set default view based on screen size
  useEffect(() => {
    setViewMode(isMobile ? 'list' : 'week')
  }, [isMobile])

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    // Determine date range based on view mode
    let startDate: string
    let endDate: string

    if (viewMode === 'week') {
      const monday = getMonday(currentDate)
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      startDate = formatDateKey(monday)
      endDate = formatDateKey(sunday)
    } else if (viewMode === 'day') {
      startDate = formatDateKey(currentDate)
      endDate = startDate
    } else {
      // list: show 30 days from now
      startDate = formatDateKey(new Date())
      const end = new Date()
      end.setDate(end.getDate() + 30)
      endDate = formatDateKey(end)
    }

    let query = supabase
      .from('jobs')
      .select('*, customer:customers(full_name)')
      .gte('scheduled_date', startDate)
      .lte('scheduled_date', endDate)
      .order('scheduled_date', { ascending: true })
      .order('scheduled_time', { ascending: true })

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    const { data } = await query
    setJobs((data as JobWithCustomer[]) || [])
    setLoading(false)
  }, [viewMode, currentDate, statusFilter])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  const navigateWeek = (direction: number) => {
    setCurrentDate((prev) => {
      const d = new Date(prev)
      d.setDate(d.getDate() + direction * 7)
      return d
    })
  }

  const navigateDay = (direction: number) => {
    setCurrentDate((prev) => {
      const d = new Date(prev)
      d.setDate(d.getDate() + direction)
      return d
    })
  }

  const openNewJobDialog = (date?: string, time?: string) => {
    setDialogDate(date || formatDateKey(new Date()))
    setDialogTime(time || '')
    setDialogOpen(true)
  }

  // Group jobs by date for list view
  const jobsByDate = jobs.reduce<Record<string, JobWithCustomer[]>>((acc, job) => {
    const date = job.scheduled_date
    if (!acc[date]) acc[date] = []
    acc[date].push(job)
    return acc
  }, {})

  const monday = getMonday(currentDate)
  const weekLabel = (() => {
    const sun = new Date(monday)
    sun.setDate(monday.getDate() + 6)
    return `${monday.getDate()}. ${DANISH_MONTHS[monday.getMonth()]} – ${sun.getDate()}. ${DANISH_MONTHS[sun.getMonth()]} ${sun.getFullYear()}`
  })()

  const dayLabel = (() => {
    const d = currentDate
    return `${DANISH_DAY_SHORT[d.getDay()]} ${d.getDate()}. ${DANISH_MONTHS[d.getMonth()]} ${d.getFullYear()}`
  })()

  const handleExportCSV = async () => {
    const start = formatDateKey(new Date(new Date().getFullYear(), 0, 1))
    const end = formatDateKey(new Date(new Date().getFullYear(), 11, 31))
    try {
      const csv = await exportJobsCSV(start, end)
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `jobs-${start}-${end}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {}
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Jobs</h2>
          <p className="text-muted-foreground">Planlæg og spor opgaver</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportCSV} className="gap-2 min-h-[44px]">
            <Download className="h-4 w-4" />
            Eksporter CSV
          </Button>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={
              <Button
                className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                onClick={() => openNewJobDialog()}
              />
            }
          >
            <Plus className="h-4 w-4" />
            Nyt job
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Opret nyt job</DialogTitle>
            </DialogHeader>
            <CreateJobForm
              defaultDate={dialogDate}
              defaultTime={dialogTime}
              onSuccess={() => {
                setDialogOpen(false)
                fetchJobs()
              }}
            />
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* View mode tabs + status filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-lg border p-1">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              viewMode === 'list' ? 'bg-green-600 text-white' : 'hover:bg-muted'
            }`}
          >
            <List className="h-4 w-4" />
            Liste
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              viewMode === 'week' ? 'bg-green-600 text-white' : 'hover:bg-muted'
            }`}
          >
            <CalendarDays className="h-4 w-4" />
            Uge
          </button>
          <button
            onClick={() => setViewMode('day')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              viewMode === 'day' ? 'bg-green-600 text-white' : 'hover:bg-muted'
            }`}
          >
            <Clock className="h-4 w-4" />
            Dag
          </button>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
        >
          <option value="all">Alle statusser</option>
          <option value="scheduled">Planlagt</option>
          <option value="en_route">Undervejs</option>
          <option value="arrived">Ankommet</option>
          <option value="in_progress">I gang</option>
          <option value="completed">Afsluttet</option>
          <option value="invoiced">Faktureret</option>
          <option value="cancelled">Annulleret</option>
        </select>
      </div>

      {/* Navigation for week/day */}
      {viewMode === 'week' && (
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => navigateWeek(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">{weekLabel}</span>
          <Button variant="outline" size="sm" onClick={() => navigateWeek(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
      {viewMode === 'day' && (
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => navigateDay(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">{dayLabel}</span>
          <Button variant="outline" size="sm" onClick={() => navigateDay(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
        </div>
      ) : viewMode === 'list' ? (
        <ListView jobs={jobsByDate} onNewJob={openNewJobDialog} />
      ) : viewMode === 'week' ? (
        <WeekView jobs={jobs} monday={monday} onNewJob={openNewJobDialog} onDayClick={(d) => { setCurrentDate(d); setViewMode('day') }} />
      ) : (
        <DayView jobs={jobs} date={currentDate} onNewJob={openNewJobDialog} />
      )}
    </div>
  )
}

function ListView({ jobs, onNewJob }: { jobs: Record<string, JobWithCustomer[]>; onNewJob: (date?: string) => void }) {
  const dates = Object.keys(jobs).sort()

  if (dates.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground mb-4">Ingen jobs fundet</p>
          <Button variant="outline" onClick={() => onNewJob()} className="gap-2">
            <Plus className="h-4 w-4" />
            Opret nyt job
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {dates.map((date) => {
        const d = new Date(date + 'T00:00:00')
        const dayLabel = `${DANISH_DAY_SHORT[d.getDay()]} ${d.getDate()}. ${DANISH_MONTHS[d.getMonth()]}`

        return (
          <div key={date}>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">{dayLabel}</h3>
            <div className="space-y-2">
              {jobs[date].map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function WeekView({
  jobs,
  monday,
  onNewJob,
  onDayClick,
}: {
  jobs: JobWithCustomer[]
  monday: Date
  onNewJob: (date?: string, time?: string) => void
  onDayClick: (date: Date) => void
}) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })

  const today = formatDateKey(new Date())

  return (
    <div className="grid grid-cols-7 gap-1">
      {days.map((day) => {
        const key = formatDateKey(day)
        const isToday = key === today
        const dayJobs = jobs.filter((j) => j.scheduled_date === key)

        return (
          <div
            key={key}
            className={`min-h-[120px] rounded-lg border p-2 ${isToday ? 'border-green-600 bg-green-50/50' : ''}`}
          >
            <button
              onClick={() => onDayClick(day)}
              className="text-xs font-medium mb-1 hover:text-green-600 w-full text-left"
            >
              {DANISH_DAY_SHORT[day.getDay()]} {day.getDate()}.
            </button>
            <div className="space-y-1">
              {dayJobs.map((job) => (
                <Link key={job.id} href={`/jobs/${job.id}`}>
                  <div className="rounded bg-green-100 px-1.5 py-0.5 text-xs truncate hover:bg-green-200 transition-colors cursor-pointer">
                    <span className="font-medium">{formatTime(job.scheduled_time)}</span>{' '}
                    {job.customer?.full_name || 'Ukendt'}
                  </div>
                </Link>
              ))}
            </div>
            <button
              onClick={() => onNewJob(key)}
              className="mt-1 text-xs text-muted-foreground hover:text-green-600 w-full text-left"
            >
              + Tilføj
            </button>
          </div>
        )
      })}
    </div>
  )
}

function DayView({
  jobs,
  date,
  onNewJob,
}: {
  jobs: JobWithCustomer[]
  date: Date
  onNewJob: (date?: string, time?: string) => void
}) {
  const hours = Array.from({ length: 11 }, (_, i) => i + 8) // 08:00 - 18:00

  const dateKey = formatDateKey(date)
  const dayJobs = jobs.filter((j) => j.scheduled_date === dateKey)

  return (
    <div className="rounded-lg border">
      {hours.map((hour) => {
        const timeStr = `${String(hour).padStart(2, '0')}:00`
        const jobsInHour = dayJobs.filter((j) => {
          if (!j.scheduled_time) return false
          const h = parseInt(j.scheduled_time.split(':')[0], 10)
          return h === hour
        })

        return (
          <div key={hour} className="flex border-b last:border-b-0 min-h-[60px]">
            <div className="w-16 shrink-0 border-r p-2 text-xs text-muted-foreground font-medium">
              {timeStr}
            </div>
            <div className="flex-1 p-1 space-y-1">
              {jobsInHour.map((job) => (
                <Link key={job.id} href={`/jobs/${job.id}`}>
                  <div className="rounded bg-green-100 px-2 py-1.5 text-sm hover:bg-green-200 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {formatTime(job.scheduled_time)} — {job.customer?.full_name || 'Ukendt'}
                      </span>
                      <JobStatusBadge status={job.status} />
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <MapPin className="h-3 w-3" />
                      {job.address}
                    </div>
                  </div>
                </Link>
              ))}
              {jobsInHour.length === 0 && (
                <button
                  onClick={() => onNewJob(dateKey, timeStr)}
                  className="w-full h-full min-h-[40px] rounded hover:bg-muted/50 transition-colors text-xs text-muted-foreground"
                />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function JobCard({ job }: { job: JobWithCustomer }) {
  const serviceNames = Array.isArray(job.services)
    ? (job.services as QuoteLineItem[]).map((s) => s.service_name).join(', ')
    : ''

  const isOverdue = job.status === 'invoiced' && !job.paid_at && job.invoice_sent_at &&
    Math.floor((Date.now() - new Date(job.invoice_sent_at).getTime()) / (1000 * 60 * 60 * 24)) > 14

  return (
    <Link href={`/jobs/${job.id}`}>
      <Card className={`hover:ring-2 hover:ring-green-600/20 transition-all cursor-pointer ${isOverdue ? 'border-amber-300' : ''}`}>
        <CardContent className="flex items-center justify-between p-3">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {isOverdue && <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
              {job.scheduled_time && (
                <span className="text-sm font-bold tabular-nums">{formatTime(job.scheduled_time)}</span>
              )}
              <span className="text-sm font-medium truncate">
                {job.customer?.full_name || 'Ukendt kunde'}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{job.address}</span>
            </div>
            {serviceNames && (
              <p className="text-xs text-muted-foreground truncate">{serviceNames}</p>
            )}
          </div>
          <div className="ml-3 shrink-0">
            <JobStatusBadge status={job.status} />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

// ---- Create Job Form ----
function CreateJobForm({
  defaultDate,
  defaultTime,
  onSuccess,
}: {
  defaultDate: string
  defaultTime: string
  onSuccess: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [customers, setCustomers] = useState<{ id: string; full_name: string; address: string; city: string; zip_code: string }[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [profiles, setProfiles] = useState<{ id: string; full_name: string }[]>([])
  const [vehicles, setVehicles] = useState<{ id: string; name: string; license_plate: string }[]>([])

  const [customerSearch, setCustomerSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<typeof customers[0] | null>(null)
  const [lineItems, setLineItems] = useState<QuoteLineItem[]>([])
  const [scheduledDate, setScheduledDate] = useState(defaultDate)
  const [scheduledTime, setScheduledTime] = useState(defaultTime)
  const [estimatedDuration, setEstimatedDuration] = useState('')
  const [assignedUser, setAssignedUser] = useState('')
  const [vehicleId, setVehicleId] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('customers').select('id, full_name, address, city, zip_code').order('full_name'),
      supabase.from('services').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('profiles').select('id, full_name').eq('is_active', true),
      supabase.from('vehicles').select('id, name, license_plate').eq('is_active', true),
    ]).then(([c, s, p, v]) => {
      setCustomers(c.data || [])
      setServices((s.data as Service[]) || [])
      setProfiles(p.data || [])
      setVehicles(v.data || [])
    })
  }, [])

  const filteredCustomers = customerSearch
    ? customers.filter(
        (c) =>
          c.full_name.toLowerCase().includes(customerSearch.toLowerCase()) ||
          c.address.toLowerCase().includes(customerSearch.toLowerCase())
      )
    : []

  function selectCustomer(c: typeof customers[0]) {
    setSelectedCustomer(c)
    setAddress(`${c.address}, ${c.zip_code} ${c.city}`)
    setCustomerSearch('')
  }

  function addServiceLine() {
    if (services.length === 0) return
    const svc = services[0]
    setLineItems([
      ...lineItems,
      {
        service_id: svc.id,
        service_name: svc.name,
        quantity: 1,
        unit: svc.unit,
        unit_price: Number(svc.base_price),
        line_total: Number(svc.base_price),
      },
    ])
  }

  function updateLineItem(index: number, updates: Partial<QuoteLineItem>) {
    setLineItems(
      lineItems.map((item, i) => {
        if (i !== index) return item
        const updated = { ...item, ...updates }
        updated.line_total = updated.quantity * updated.unit_price
        return updated
      })
    )
  }

  function changeService(index: number, serviceId: string) {
    const svc = services.find((s) => s.id === serviceId)
    if (!svc) return
    updateLineItem(index, {
      service_id: svc.id,
      service_name: svc.name,
      unit: svc.unit,
      unit_price: Number(svc.base_price),
    })
  }

  function handleSubmit() {
    if (!selectedCustomer || lineItems.length === 0) return
    startTransition(async () => {
      await createJob({
        customer_id: selectedCustomer.id,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime || null,
        estimated_duration: estimatedDuration ? parseInt(estimatedDuration, 10) : null,
        assigned_user_id: assignedUser || null,
        vehicle_id: vehicleId || null,
        address,
        services: lineItems,
        internal_notes: notes || null,
      })
      onSuccess()
    })
  }

  return (
    <div className="space-y-4">
      {/* Customer search */}
      <div className="space-y-2">
        <Label>Kunde *</Label>
        {selectedCustomer ? (
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">{selectedCustomer.full_name}</p>
              <p className="text-xs text-muted-foreground">{selectedCustomer.address}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { setSelectedCustomer(null); setAddress('') }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Søg kunde..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="pl-10"
            />
            {customerSearch && filteredCustomers.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-lg border bg-background shadow-lg max-h-48 overflow-y-auto">
                {filteredCustomers.slice(0, 8).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => selectCustomer(c)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                  >
                    <span className="font-medium">{c.full_name}</span>
                    <span className="text-muted-foreground"> · {c.address}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Service lines */}
      <div className="space-y-2">
        <Label>Services *</Label>
        {lineItems.map((item, index) => (
          <div key={index} className="flex gap-2 items-end">
            <div className="flex-1">
              <select
                value={item.service_id}
                onChange={(e) => changeService(index, e.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="w-20">
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={item.quantity}
                onChange={(e) => updateLineItem(index, { quantity: Number(e.target.value) })}
                placeholder={unitLabel(item.unit)}
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLineItems(lineItems.filter((_, i) => i !== index))}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addServiceLine} className="gap-1">
          <Plus className="h-3 w-3" />
          Tilføj service
        </Button>
      </div>

      {/* Date & time */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Dato *</Label>
          <Input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Tidspunkt</Label>
          <Input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} />
        </div>
      </div>

      {/* Duration */}
      <div className="space-y-1">
        <Label>Estimeret varighed (minutter)</Label>
        <Input
          type="number"
          value={estimatedDuration}
          onChange={(e) => setEstimatedDuration(e.target.value)}
          placeholder="f.eks. 60"
        />
      </div>

      {/* Assigned user & vehicle */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Medarbejder</Label>
          <select
            value={assignedUser}
            onChange={(e) => setAssignedUser(e.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="">Vælg...</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>{p.full_name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label>Køretøj</Label>
          <select
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="">Vælg...</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>{v.name} ({v.license_plate})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Address */}
      <div className="space-y-1">
        <Label>Adresse *</Label>
        <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Adresse" />
      </div>

      {/* Notes */}
      <div className="space-y-1">
        <Label>Interne noter</Label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          placeholder="Eventuelle noter..."
        />
      </div>

      <Button
        onClick={handleSubmit}
        disabled={isPending || !selectedCustomer || lineItems.length === 0 || !scheduledDate || !address}
        className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
      >
        {isPending ? 'Opretter...' : 'Opret job'}
      </Button>
    </div>
  )
}
