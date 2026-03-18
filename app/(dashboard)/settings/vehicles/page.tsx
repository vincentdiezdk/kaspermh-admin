'use client'

import { useState, useEffect, useTransition } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, Car } from 'lucide-react'
import { toast } from 'sonner'
import {
  getVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  toggleVehicleActive,
} from '@/lib/actions/vehicles'

interface Vehicle {
  id: string
  name: string
  license_plate: string
  color: string | null
  notes: string | null
  is_active: boolean
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Vehicle | null>(null)

  const loadVehicles = async () => {
    try {
      const data = await getVehicles()
      setVehicles(data as Vehicle[])
    } catch {
      toast.error('Kunne ikke hente køretøjer')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadVehicles()
  }, [])

  const handleToggle = async (id: string, active: boolean) => {
    try {
      await toggleVehicleActive(id, active)
      setVehicles((prev) =>
        prev.map((v) => (v.id === id ? { ...v, is_active: active } : v))
      )
    } catch {
      toast.error('Kunne ikke opdatere status')
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    try {
      await deleteVehicle(deleteConfirm.id)
      setVehicles((prev) => prev.filter((v) => v.id !== deleteConfirm.id))
      setDeleteConfirm(null)
      toast.success('Køretøj slettet')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Kunne ikke slette køretøj')
    }
  }

  const openEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle)
    setDialogOpen(true)
  }

  const openCreate = () => {
    setEditingVehicle(null)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Køretøjer</h2>
          <p className="text-muted-foreground">Administrer køretøjer og flåde</p>
        </div>
        <Button onClick={openCreate} className="gap-2 bg-green-600 hover:bg-green-700 text-white">
          <Plus className="h-4 w-4" />
          Tilføj køretøj
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
        </div>
      ) : vehicles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Car className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground mb-4">Ingen køretøjer oprettet endnu</p>
            <Button onClick={openCreate} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Tilføj køretøj
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((vehicle) => (
            <Card key={vehicle.id} className={!vehicle.is_active ? 'opacity-60' : ''}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{vehicle.name}</h3>
                    <p className="text-sm text-muted-foreground">{vehicle.license_plate}</p>
                  </div>
                  <button
                    onClick={() => handleToggle(vehicle.id, !vehicle.is_active)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
                      vehicle.is_active ? 'bg-green-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                        vehicle.is_active ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                {vehicle.color && (
                  <p className="text-sm"><span className="text-muted-foreground">Farve:</span> {vehicle.color}</p>
                )}
                {vehicle.notes && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{vehicle.notes}</p>
                )}
                <div className="flex items-center gap-1 pt-1">
                  <button
                    onClick={() => openEdit(vehicle)}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground p-2 rounded-md hover:bg-muted transition-colors min-h-[44px]"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Rediger
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(vehicle)}
                    className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700 p-2 rounded-md hover:bg-red-50 transition-colors min-h-[44px]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Slet
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingVehicle ? 'Rediger køretøj' : 'Tilføj køretøj'}</DialogTitle>
          </DialogHeader>
          <VehicleForm
            vehicle={editingVehicle}
            onSuccess={() => {
              setDialogOpen(false)
              loadVehicles()
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Slet køretøj</DialogTitle>
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

function VehicleForm({
  vehicle,
  onSuccess,
}: {
  vehicle: Vehicle | null
  onSuccess: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState(vehicle?.name || '')
  const [licensePlate, setLicensePlate] = useState(vehicle?.license_plate || '')
  const [color, setColor] = useState(vehicle?.color || '')
  const [notes, setNotes] = useState(vehicle?.notes || '')
  const [isActive, setIsActive] = useState(vehicle?.is_active ?? true)

  const handleSubmit = () => {
    if (!name || !licensePlate) return

    const data = {
      name,
      license_plate: licensePlate,
      color: color || null,
      notes: notes || null,
      is_active: isActive,
    }

    startTransition(async () => {
      try {
        if (vehicle) {
          await updateVehicle(vehicle.id, data)
          toast.success('Køretøj opdateret')
        } else {
          await createVehicle(data)
          toast.success('Køretøj oprettet')
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
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="f.eks. VW Caddy 2022" />
      </div>
      <div className="space-y-1">
        <Label>Nummerplade *</Label>
        <Input value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} placeholder="f.eks. AB 12 345" />
      </div>
      <div className="space-y-1">
        <Label>Farve</Label>
        <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="f.eks. Hvid" />
      </div>
      <div className="space-y-1">
        <Label>Noter</Label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          placeholder="Eventuelle noter..."
        />
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
        disabled={isPending || !name || !licensePlate}
        className="w-full bg-green-600 hover:bg-green-700 text-white"
      >
        {isPending ? 'Gemmer...' : vehicle ? 'Gem ændringer' : 'Opret køretøj'}
      </Button>
    </div>
  )
}
