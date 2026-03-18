'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2, Package } from 'lucide-react'
import { toast } from 'sonner'
import {
  getJobMaterials,
  getActiveMaterials,
  addJobMaterial,
  removeJobMaterial,
} from '@/lib/actions/materials'

interface JobMaterial {
  id: string
  job_id: string
  material_id: string
  quantity: number
  unit_cost: number
  total_cost: number
  notes: string | null
  registered_at: string
  material: { name: string; unit: string } | null
}

interface ActiveMaterial {
  id: string
  name: string
  unit: string
  cost_per_unit: number
  stock_quantity: number
}

export function JobMaterials({ jobId }: { jobId: string }) {
  const [materials, setMaterials] = useState<JobMaterial[]>([])
  const [activeMaterials, setActiveMaterials] = useState<ActiveMaterial[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [selectedMaterial, setSelectedMaterial] = useState('')
  const [quantity, setQuantity] = useState('')
  const [notes, setNotes] = useState('')
  const [adding, setAdding] = useState(false)

  const loadData = async () => {
    try {
      const [jobMats, active] = await Promise.all([
        getJobMaterials(jobId),
        getActiveMaterials(),
      ])
      setMaterials(jobMats as JobMaterial[])
      setActiveMaterials(active as ActiveMaterial[])
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [jobId])

  const handleAdd = async () => {
    if (!selectedMaterial || !quantity) return
    const qty = parseFloat(quantity)
    if (isNaN(qty) || qty <= 0) {
      toast.error('Indtast et gyldigt antal')
      return
    }

    setAdding(true)
    try {
      await addJobMaterial(jobId, selectedMaterial, qty, notes || undefined)
      toast.success('Materiale tilføjet')
      setSelectedMaterial('')
      setQuantity('')
      setNotes('')
      loadData()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Kunne ikke tilføje materiale')
    } finally {
      setAdding(false)
    }
  }

  const handleRemove = async (id: string) => {
    try {
      await removeJobMaterial(id, jobId)
      setMaterials(prev => prev.filter(m => m.id !== id))
      toast.success('Materiale fjernet')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Kunne ikke fjerne materiale')
    }
  }

  const totalCost = materials.reduce((sum, m) => sum + (Number(m.total_cost) || 0), 0)
  const selectedMat = activeMaterials.find(m => m.id === selectedMaterial)

  return (
    <Card>
      <CardContent className="p-4">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between"
        >
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Package className="h-4 w-4" />
            MATERIALER
            {materials.length > 0 && (
              <span className="text-xs font-normal text-muted-foreground">
                ({materials.length})
              </span>
            )}
          </h4>
          <svg
            className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {expanded && (
          <div className="mt-3 space-y-3">
            {/* Add material form */}
            <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={selectedMaterial}
                  onChange={(e) => setSelectedMaterial(e.target.value)}
                  className="h-9 rounded-lg border border-input bg-background px-3 text-sm col-span-2 sm:col-span-1"
                >
                  <option value="">Vælg materiale...</option>
                  {activeMaterials.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({Number(m.stock_quantity).toFixed(1)} {m.unit} på lager)
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="Mængde"
                    className="flex-1"
                  />
                  {selectedMat && (
                    <span className="text-sm text-muted-foreground shrink-0">{selectedMat.unit}</span>
                  )}
                </div>
              </div>
              <Button
                onClick={handleAdd}
                disabled={adding || !selectedMaterial || !quantity}
                size="sm"
                className="gap-1 bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="h-3.5 w-3.5" />
                Tilføj
              </Button>
            </div>

            {/* Materials list */}
            {loading ? (
              <div className="text-sm text-muted-foreground text-center py-2">Indlæser...</div>
            ) : materials.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-2">
                Ingen materialer registreret
              </div>
            ) : (
              <div className="space-y-1">
                {materials.map(m => {
                  const mat = m.material as { name: string; unit: string } | null
                  return (
                    <div key={m.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-b-0">
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">{mat?.name || 'Ukendt'}</span>
                        <span className="text-muted-foreground ml-2">
                          {Number(m.quantity)} {mat?.unit || ''} × {Number(m.unit_cost).toFixed(2)} kr
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-medium tabular-nums">
                          {Number(m.total_cost).toFixed(2)} kr
                        </span>
                        <button
                          onClick={() => handleRemove(m.id)}
                          className="p-1 rounded hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </button>
                      </div>
                    </div>
                  )
                })}
                <div className="flex justify-between text-sm font-bold pt-2 border-t">
                  <span>Materialeomkostninger i alt</span>
                  <span className="tabular-nums">{totalCost.toFixed(2)} kr</span>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
