'use client'

import { useState, useEffect, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, RefreshCw, CalendarDays } from 'lucide-react'
import {
  createRecurringTemplate,
  updateRecurringTemplate,
  deleteRecurringTemplate,
  toggleRecurringTemplate,
  FREQUENCY_LABELS,
  DAY_LABELS,
} from '@/app/actions/recurring'
import { formatDate } from '@/lib/format'

interface RecurringTemplate {
  id: string
  customer_id: string
  service_id: string
  assigned_user_id: string | null
  vehicle_id: string | null
  frequency: string
  day_of_week: number | null
  preferred_time: string | null
  notes: string | null
  is_active: boolean
  last_job_date: string | null
  next_job_date: string
  service: { name: string } | null
  assigned_user: { full_name: string } | null
  vehicle: { name: string; license_plate: string } | null
}

interface Props {
  customerId: string
  initialTemplates: RecurringTemplate[]
}

export function RecurringTemplates({ customerId, initialTemplates }: Props) {
  const [templates, setTemplates] = useState<RecurringTemplate[]>(initialTemplates)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<RecurringTemplate | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleToggle(id: string) {
    startTransition(async () => {
      await toggleRecurringTemplate(id)
      // Optimistic update
      setTemplates(prev => prev.map(t => t.id === id ? { ...t, is_active: !t.is_active } : t))
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Er du sikker på at du vil slette denne faste aftale?')) return
    startTransition(async () => {
      await deleteRecurringTemplate(id)
      setTemplates(prev => prev.filter(t => t.id !== id))
    })
  }

  function openEdit(template: RecurringTemplate) {
    setEditingTemplate(template)
    setDialogOpen(true)
  }

  function openCreate() {
    setEditingTemplate(null)
    setDialogOpen(true)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-green-600" />
          Faste aftaler ({templates.length})
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={
              <Button
                size="sm"
                className="gap-1 bg-green-600 hover:bg-green-700 text-white"
                onClick={openCreate}
              />
            }
          >
            <Plus className="h-3 w-3" />
            Tilføj fast aftale
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTemplate ? 'Rediger fast aftale' : 'Tilføj fast aftale'}</DialogTitle>
            </DialogHeader>
            <RecurringTemplateForm
              customerId={customerId}
              template={editingTemplate}
              onSuccess={(newTemplate) => {
                setDialogOpen(false)
                if (editingTemplate) {
                  setTemplates(prev => prev.map(t => t.id === editingTemplate.id ? { ...t, ...newTemplate } : t))
                } else {
                  // Refresh - we don't have the full joined data from create
                  window.location.reload()
                }
              }}
            />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {templates.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Ingen faste aftaler for denne kunde
          </p>
        ) : (
          <div className="space-y-3">
            {templates.map((template) => (
              <div
                key={template.id}
                className={`rounded-lg border p-3 ${!template.is_active ? 'opacity-60' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">
                        {template.service?.name || 'Ukendt service'}
                      </span>
                      <Badge variant="secondary">
                        {FREQUENCY_LABELS[template.frequency] || template.frequency}
                      </Badge>
                      {!template.is_active && (
                        <Badge variant="outline">Pause</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        Næste: {formatDate(template.next_job_date)}
                      </span>
                      {template.day_of_week !== null && (
                        <span>{DAY_LABELS[template.day_of_week]}</span>
                      )}
                      {template.preferred_time && (
                        <span>kl. {template.preferred_time.slice(0, 5)}</span>
                      )}
                      {template.assigned_user && (
                        <span>{template.assigned_user.full_name}</span>
                      )}
                    </div>
                    {template.notes && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">{template.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={template.is_active}
                      onCheckedChange={() => handleToggle(template.id)}
                      size="sm"
                    />
                    <Button variant="ghost" size="sm" onClick={() => openEdit(template)} className="h-8 w-8 p-0">
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(template.id)} className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function RecurringTemplateForm({
  customerId,
  template,
  onSuccess,
}: {
  customerId: string
  template: RecurringTemplate | null
  onSuccess: (data: Partial<RecurringTemplate>) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [services, setServices] = useState<{ id: string; name: string }[]>([])
  const [profiles, setProfiles] = useState<{ id: string; full_name: string }[]>([])
  const [vehicles, setVehicles] = useState<{ id: string; name: string; license_plate: string }[]>([])

  const [serviceId, setServiceId] = useState(template?.service_id || '')
  const [frequency, setFrequency] = useState(template?.frequency || 'monthly')
  const [dayOfWeek, setDayOfWeek] = useState<string>(template?.day_of_week?.toString() || '')
  const [preferredTime, setPreferredTime] = useState(template?.preferred_time?.slice(0, 5) || '')
  const [assignedUserId, setAssignedUserId] = useState(template?.assigned_user_id || '')
  const [vehicleId, setVehicleId] = useState(template?.vehicle_id || '')
  const [notes, setNotes] = useState(template?.notes || '')
  const [nextJobDate, setNextJobDate] = useState(template?.next_job_date || '')

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('services').select('id, name').eq('is_active', true).order('sort_order'),
      supabase.from('profiles').select('id, full_name').eq('is_active', true),
      supabase.from('vehicles').select('id, name, license_plate').eq('is_active', true),
    ]).then(([s, p, v]) => {
      setServices(s.data || [])
      setProfiles(p.data || [])
      setVehicles(v.data || [])
      // Default to first service if creating
      if (!template && s.data?.length && !serviceId) {
        setServiceId(s.data[0].id)
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSubmit() {
    if (!serviceId || !nextJobDate) return

    const data = {
      service_id: serviceId,
      assigned_user_id: assignedUserId || null,
      vehicle_id: vehicleId || null,
      frequency,
      day_of_week: dayOfWeek ? parseInt(dayOfWeek, 10) : null,
      preferred_time: preferredTime || null,
      notes: notes || null,
      next_job_date: nextJobDate,
    }

    startTransition(async () => {
      if (template) {
        await updateRecurringTemplate(template.id, data)
      } else {
        await createRecurringTemplate({ customer_id: customerId, ...data })
      }
      onSuccess(data)
    })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label>Service *</Label>
        <select
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
          className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
        >
          <option value="">Vælg service...</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <Label>Frekvens *</Label>
        <select
          value={frequency}
          onChange={(e) => setFrequency(e.target.value)}
          className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
        >
          {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Foretrukken ugedag</Label>
          <select
            value={dayOfWeek}
            onChange={(e) => setDayOfWeek(e.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="">Ingen præference</option>
            {Object.entries(DAY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label>Foretrukket tidspunkt</Label>
          <Input
            type="time"
            value={preferredTime}
            onChange={(e) => setPreferredTime(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Tildelt medarbejder</Label>
          <select
            value={assignedUserId}
            onChange={(e) => setAssignedUserId(e.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="">Ingen</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>{p.full_name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label>Bil</Label>
          <select
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="">Ingen</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>{v.name} ({v.license_plate})</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <Label>Bemærkninger</Label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          placeholder="Eventuelle noter til det gentagne job..."
        />
      </div>

      <div className="space-y-1">
        <Label>Næste job-dato *</Label>
        <Input
          type="date"
          value={nextJobDate}
          onChange={(e) => setNextJobDate(e.target.value)}
          required
        />
      </div>

      <Button
        onClick={handleSubmit}
        disabled={isPending || !serviceId || !nextJobDate}
        className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
      >
        {isPending ? 'Gemmer...' : template ? 'Opdater aftale' : 'Opret fast aftale'}
      </Button>
    </div>
  )
}
