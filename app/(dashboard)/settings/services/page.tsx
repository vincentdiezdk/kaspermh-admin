'use client'

import { useState, useEffect, useTransition } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  getServices,
  createService,
  updateService,
  deleteService,
  toggleServiceActive,
} from '@/lib/actions/services'
import type { Service, ServiceUnit } from '@/lib/types'

const UNIT_OPTIONS: { value: ServiceUnit; label: string }[] = [
  { value: 'm2', label: 'm²' },
  { value: 'stk', label: 'stk.' },
  { value: 'time', label: 'time' },
  { value: 'fast_pris', label: 'fast pris' },
]

function unitDisplay(unit: string): string {
  const found = UNIT_OPTIONS.find((u) => u.value === unit)
  return found?.label || unit
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Service | null>(null)

  const loadServices = async () => {
    try {
      const data = await getServices()
      setServices(data as Service[])
    } catch {
      toast.error('Kunne ikke hente services')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadServices()
  }, [])

  const handleToggle = async (id: string, active: boolean) => {
    try {
      await toggleServiceActive(id, active)
      setServices((prev) =>
        prev.map((s) => (s.id === id ? { ...s, is_active: active } : s))
      )
    } catch {
      toast.error('Kunne ikke opdatere status')
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    try {
      await deleteService(deleteConfirm.id)
      setServices((prev) => prev.filter((s) => s.id !== deleteConfirm.id))
      setDeleteConfirm(null)
      toast.success('Service slettet')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Kunne ikke slette service')
    }
  }

  const openEdit = (service: Service) => {
    setEditingService(service)
    setDialogOpen(true)
  }

  const openCreate = () => {
    setEditingService(null)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Services</h2>
          <p className="text-muted-foreground">Administrer servicetyper og priser</p>
        </div>
        <Button onClick={openCreate} className="gap-2 bg-green-600 hover:bg-green-700 text-white">
          <Plus className="h-4 w-4" />
          Tilføj service
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
        </div>
      ) : services.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">Ingen services oprettet endnu</p>
            <Button onClick={openCreate} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Tilføj service
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">#</th>
                  <th className="text-left p-3 font-medium">Navn</th>
                  <th className="text-left p-3 font-medium hidden sm:table-cell">Beskrivelse</th>
                  <th className="text-left p-3 font-medium">Enhed</th>
                  <th className="text-right p-3 font-medium">Grundpris</th>
                  <th className="text-right p-3 font-medium hidden sm:table-cell">Min. pris</th>
                  <th className="text-center p-3 font-medium">Aktiv</th>
                  <th className="text-right p-3 font-medium">Handlinger</th>
                </tr>
              </thead>
              <tbody>
                {services.map((svc) => (
                  <tr key={svc.id} className="border-b last:border-b-0 hover:bg-muted/30">
                    <td className="p-3 text-muted-foreground">{svc.sort_order}</td>
                    <td className="p-3 font-medium">{svc.name}</td>
                    <td className="p-3 text-muted-foreground hidden sm:table-cell max-w-[200px] truncate">
                      {svc.description || '—'}
                    </td>
                    <td className="p-3">{unitDisplay(svc.unit)}</td>
                    <td className="p-3 text-right tabular-nums">
                      {Number(svc.base_price).toLocaleString('da-DK')} kr/{unitDisplay(svc.unit)}
                    </td>
                    <td className="p-3 text-right tabular-nums hidden sm:table-cell">
                      {svc.min_price ? `${Number(svc.min_price).toLocaleString('da-DK')} kr` : '—'}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleToggle(svc.id, !svc.is_active)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          svc.is_active ? 'bg-green-600' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                            svc.is_active ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(svc)}
                          className="p-2 rounded-md hover:bg-muted transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                          title="Rediger"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(svc)}
                          className="p-2 rounded-md hover:bg-red-50 text-red-600 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                          title="Slet"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingService ? 'Rediger service' : 'Tilføj service'}</DialogTitle>
          </DialogHeader>
          <ServiceForm
            service={editingService}
            nextSortOrder={services.length > 0 ? Math.max(...services.map((s) => s.sort_order)) + 1 : 1}
            onSuccess={() => {
              setDialogOpen(false)
              loadServices()
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Slet service</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Er du sikker på at du vil slette <strong>{deleteConfirm?.name}</strong>?
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Annuller
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Slet
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ServiceForm({
  service,
  nextSortOrder,
  onSuccess,
}: {
  service: Service | null
  nextSortOrder: number
  onSuccess: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState(service?.name || '')
  const [description, setDescription] = useState(service?.description || '')
  const [unit, setUnit] = useState<ServiceUnit>(service?.unit || 'm2')
  const [basePrice, setBasePrice] = useState(service ? String(service.base_price) : '')
  const [minPrice, setMinPrice] = useState(service?.min_price ? String(service.min_price) : '')
  const [isActive, setIsActive] = useState(service?.is_active ?? true)
  const [sortOrder, setSortOrder] = useState(service?.sort_order ?? nextSortOrder)

  const handleSubmit = () => {
    if (!name || !basePrice) return

    const data = {
      name,
      description: description || null,
      unit,
      base_price: parseFloat(basePrice),
      min_price: minPrice ? parseFloat(minPrice) : null,
      is_active: isActive,
      sort_order: sortOrder,
    }

    startTransition(async () => {
      try {
        if (service) {
          await updateService(service.id, data)
          toast.success('Service opdateret')
        } else {
          await createService(data)
          toast.success('Service oprettet')
        }
        onSuccess()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Der opstod en fejl')
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label>Navn *</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="f.eks. Græsslåning" />
      </div>
      <div className="space-y-1">
        <Label>Beskrivelse</Label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          placeholder="Kort beskrivelse..."
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Enhed *</Label>
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value as ServiceUnit)}
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
          >
            {UNIT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label>Rækkefølge</Label>
          <Input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Grundpris (kr) *</Label>
          <Input
            type="number"
            step="0.01"
            value={basePrice}
            onChange={(e) => setBasePrice(e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div className="space-y-1">
          <Label>Min. pris (kr)</Label>
          <Input
            type="number"
            step="0.01"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder="0.00"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Label>Aktiv</Label>
        <button
          type="button"
          onClick={() => setIsActive(!isActive)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isActive ? 'bg-green-600' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
              isActive ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
      <Button
        onClick={handleSubmit}
        disabled={isPending || !name || !basePrice}
        className="w-full bg-green-600 hover:bg-green-700 text-white"
      >
        {isPending ? 'Gemmer...' : service ? 'Gem ændringer' : 'Opret service'}
      </Button>
    </div>
  )
}
