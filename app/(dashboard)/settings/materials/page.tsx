'use client'

import { useState, useEffect, useTransition } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Plus, Pencil, Trash2, Package, PackagePlus } from 'lucide-react'
import { toast } from 'sonner'
import {
  getMaterials,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  restockMaterial,
} from '@/lib/actions/materials'

interface Material {
  id: string
  name: string
  unit: string
  cost_per_unit: number
  stock_quantity: number
  low_stock_threshold: number | null
  is_active: boolean
  created_at: string
}

const UNITS = [
  { value: 'liter', label: 'Liter' },
  { value: 'stk', label: 'Stk' },
  { value: 'kg', label: 'Kg' },
  { value: 'm2', label: 'm²' },
  { value: 'rulle', label: 'Rulle' },
]

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Material | null>(null)
  const [restockDialog, setRestockDialog] = useState<Material | null>(null)
  const [restockQty, setRestockQty] = useState('')

  const loadMaterials = async () => {
    try {
      const data = await getMaterials()
      setMaterials(data as Material[])
    } catch {
      toast.error('Kunne ikke hente materialer')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMaterials()
  }, [])

  const handleDelete = async () => {
    if (!deleteConfirm) return
    try {
      await deleteMaterial(deleteConfirm.id)
      setMaterials(prev =>
        prev.map(m => m.id === deleteConfirm.id ? { ...m, is_active: false } : m)
      )
      setDeleteConfirm(null)
      toast.success('Materiale deaktiveret')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Kunne ikke deaktivere materiale')
    }
  }

  const handleRestock = async () => {
    if (!restockDialog || !restockQty) return
    try {
      const qty = parseFloat(restockQty)
      if (isNaN(qty) || qty <= 0) {
        toast.error('Indtast et gyldigt antal')
        return
      }
      await restockMaterial(restockDialog.id, qty)
      setRestockDialog(null)
      setRestockQty('')
      toast.success('Lager genopfyldt')
      loadMaterials()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Kunne ikke genopfylde lager')
    }
  }

  const openEdit = (material: Material) => {
    setEditingMaterial(material)
    setDialogOpen(true)
  }

  const openCreate = () => {
    setEditingMaterial(null)
    setDialogOpen(true)
  }

  const isLowStock = (m: Material) =>
    m.low_stock_threshold != null && Number(m.stock_quantity) < Number(m.low_stock_threshold)

  const formatQty = (qty: number) =>
    Number(qty) % 1 === 0 ? String(Number(qty)) : Number(qty).toFixed(1)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Materialer</h2>
          <p className="text-muted-foreground">Administrer materialer og lagerbeholdning</p>
        </div>
        <Button onClick={openCreate} className="gap-2 bg-green-600 hover:bg-green-700 text-white">
          <Plus className="h-4 w-4" />
          Tilføj materiale
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
        </div>
      ) : materials.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground mb-4">Ingen materialer oprettet endnu</p>
            <Button onClick={openCreate} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Tilføj materiale
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Navn</TableHead>
                    <TableHead>Enhed</TableHead>
                    <TableHead className="text-right">Pris/enhed</TableHead>
                    <TableHead className="text-right">Lager</TableHead>
                    <TableHead className="text-right">Grænse</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Handlinger</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materials.map(m => (
                    <TableRow
                      key={m.id}
                      className={`${!m.is_active ? 'opacity-50' : ''} ${isLowStock(m) ? 'bg-red-50' : ''}`}
                    >
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell>{UNITS.find(u => u.value === m.unit)?.label || m.unit}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {Number(m.cost_per_unit).toFixed(2)} kr
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <span className={isLowStock(m) ? 'text-red-600 font-semibold' : ''}>
                          {formatQty(m.stock_quantity)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {m.low_stock_threshold != null ? formatQty(m.low_stock_threshold) : '–'}
                      </TableCell>
                      <TableCell>
                        {m.is_active ? (
                          isLowStock(m) ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                              Lavt lager
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              Aktiv
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            Inaktiv
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setRestockDialog(m)}
                            className="p-2 rounded-md hover:bg-muted transition-colors min-h-[44px]"
                            title="Genopfyld lager"
                          >
                            <PackagePlus className="h-4 w-4 text-green-600" />
                          </button>
                          <button
                            onClick={() => openEdit(m)}
                            className="p-2 rounded-md hover:bg-muted transition-colors min-h-[44px]"
                            title="Rediger"
                          >
                            <Pencil className="h-4 w-4 text-muted-foreground" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(m)}
                            className="p-2 rounded-md hover:bg-red-50 transition-colors min-h-[44px]"
                            title="Deaktiver"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingMaterial ? 'Rediger materiale' : 'Tilføj materiale'}</DialogTitle>
          </DialogHeader>
          <MaterialForm
            material={editingMaterial}
            onSuccess={() => {
              setDialogOpen(false)
              loadMaterials()
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Deaktiver materiale</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Er du sikker på at du vil deaktivere <strong>{deleteConfirm?.name}</strong>?
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Annuller
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Deaktiver
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Restock Dialog */}
      <Dialog open={!!restockDialog} onOpenChange={() => { setRestockDialog(null); setRestockQty('') }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Genopfyld lager</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tilføj mængde til <strong>{restockDialog?.name}</strong>
          </p>
          <p className="text-sm">
            Nuværende lager: <strong>{restockDialog ? formatQty(restockDialog.stock_quantity) : '0'} {restockDialog?.unit}</strong>
          </p>
          <div className="space-y-1">
            <Label>Mængde at tilføje</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              value={restockQty}
              onChange={(e) => setRestockQty(e.target.value)}
              placeholder="f.eks. 50"
            />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => { setRestockDialog(null); setRestockQty('') }}>
              Annuller
            </Button>
            <Button
              onClick={handleRestock}
              disabled={!restockQty || parseFloat(restockQty) <= 0}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Genopfyld
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function MaterialForm({
  material,
  onSuccess,
}: {
  material: Material | null
  onSuccess: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState(material?.name || '')
  const [unit, setUnit] = useState(material?.unit || 'liter')
  const [costPerUnit, setCostPerUnit] = useState(material ? String(material.cost_per_unit) : '')
  const [stockQuantity, setStockQuantity] = useState(material ? String(material.stock_quantity) : '0')
  const [lowStockThreshold, setLowStockThreshold] = useState(
    material?.low_stock_threshold != null ? String(material.low_stock_threshold) : ''
  )
  const [isActive, setIsActive] = useState(material?.is_active ?? true)

  const handleSubmit = () => {
    if (!name || !costPerUnit) return

    startTransition(async () => {
      try {
        if (material) {
          await updateMaterial(material.id, {
            name,
            unit,
            cost_per_unit: parseFloat(costPerUnit),
            low_stock_threshold: lowStockThreshold ? parseFloat(lowStockThreshold) : null,
            is_active: isActive,
          })
          toast.success('Materiale opdateret')
        } else {
          await createMaterial({
            name,
            unit,
            cost_per_unit: parseFloat(costPerUnit),
            stock_quantity: parseFloat(stockQuantity) || 0,
            low_stock_threshold: lowStockThreshold ? parseFloat(lowStockThreshold) : null,
          })
          toast.success('Materiale oprettet')
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
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="f.eks. Roundup" />
      </div>
      <div className="space-y-1">
        <Label>Enhed *</Label>
        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm"
        >
          {UNITS.map(u => (
            <option key={u.value} value={u.value}>{u.label}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label>Pris per enhed (kr) *</Label>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={costPerUnit}
          onChange={(e) => setCostPerUnit(e.target.value)}
          placeholder="f.eks. 89.50"
        />
      </div>
      {!material && (
        <div className="space-y-1">
          <Label>Startmængde</Label>
          <Input
            type="number"
            step="0.1"
            min="0"
            value={stockQuantity}
            onChange={(e) => setStockQuantity(e.target.value)}
            placeholder="f.eks. 100"
          />
        </div>
      )}
      <div className="space-y-1">
        <Label>Minimumsgrænse (valgfrit)</Label>
        <Input
          type="number"
          step="0.1"
          min="0"
          value={lowStockThreshold}
          onChange={(e) => setLowStockThreshold(e.target.value)}
          placeholder="f.eks. 10"
        />
      </div>
      {material && (
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
      )}
      <Button
        onClick={handleSubmit}
        disabled={isPending || !name || !costPerUnit}
        className="w-full bg-green-600 hover:bg-green-700 text-white"
      >
        {isPending ? 'Gemmer...' : material ? 'Gem ændringer' : 'Opret materiale'}
      </Button>
    </div>
  )
}
