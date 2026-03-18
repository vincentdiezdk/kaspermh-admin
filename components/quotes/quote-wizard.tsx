'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createQuote } from '@/lib/actions/quotes'
import { createCustomer } from '@/lib/actions/customers'
import { formatPrice, unitLabel } from '@/lib/format'
import { Plus, X, Check, ArrowLeft, ArrowRight, User, Search } from 'lucide-react'
import type { QuoteLineItem, Service } from '@/lib/types'

interface CustomerOption {
  id: string
  full_name: string
  email: string | null
  phone: string
  address: string
  city: string
  zip_code: string
}

interface LeadData {
  id: string
  full_name: string
  email: string | null
  phone: string
  address: string
  city: string | null
  zip_code: string | null
  service_type: string | null
  estimated_area: number | null
  calculated_price: number | null
}

interface Props {
  customers: CustomerOption[]
  services: Service[]
  leadData: LeadData | null
}

export function QuoteWizard({ customers, services, leadData }: Props) {
  const [step, setStep] = useState(1)
  const [isPending, startTransition] = useTransition()

  // Step 1 state
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [showNewForm, setShowNewForm] = useState(false)

  // Step 2 state
  const [lineItems, setLineItems] = useState<QuoteLineItem[]>([])

  // Step 3 state
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 14)
    return d.toISOString().split('T')[0]
  })
  const [notes, setNotes] = useState('')

  // Computed totals
  const subtotal = lineItems.reduce((sum, item) => sum + item.line_total, 0)
  const vatAmount = subtotal * 0.25
  const totalInclVat = subtotal * 1.25

  // Filter customers
  const filteredCustomers = customers.filter((c) =>
    c.full_name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone.includes(customerSearch) ||
    c.address.toLowerCase().includes(customerSearch.toLowerCase())
  )

  function addServiceLine() {
    if (services.length === 0) return
    const svc = services[0]
    setLineItems([...lineItems, {
      service_id: svc.id,
      service_name: svc.name,
      quantity: 1,
      unit: svc.unit,
      unit_price: Number(svc.base_price),
      line_total: Number(svc.base_price),
    }])
  }

  function updateLineItem(index: number, updates: Partial<QuoteLineItem>) {
    setLineItems(lineItems.map((item, i) => {
      if (i !== index) return item
      const updated = { ...item, ...updates }
      updated.line_total = updated.quantity * updated.unit_price
      return updated
    }))
  }

  function removeLineItem(index: number) {
    setLineItems(lineItems.filter((_, i) => i !== index))
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

  function handleSave(status: 'draft' | 'sent') {
    if (!selectedCustomer) return
    startTransition(async () => {
      await createQuote({
        customer_id: selectedCustomer.id,
        lead_id: leadData?.id || null,
        line_items: lineItems,
        subtotal,
        vat_amount: vatAmount,
        total_incl_vat: totalInclVat,
        valid_until: validUntil || null,
        notes: notes || null,
        status,
      })
    })
  }

  function handleCreateCustomer(formData: FormData) {
    // We use a workaround: create customer via server action, then refresh
    // For the wizard, we create inline and select it
    startTransition(async () => {
      formData.set('redirect_to', '/quotes/new' + (leadData ? `?leadId=${leadData.id}` : ''))
      await createCustomer(formData)
    })
  }

  function useLeadAsCustomer() {
    if (!leadData) return
    // Check if a customer with this phone already exists
    const existing = customers.find((c) => c.phone === leadData.phone)
    if (existing) {
      setSelectedCustomer(existing)
    } else {
      // Create a temporary customer selection from lead data
      setSelectedCustomer({
        id: '__new__',
        full_name: leadData.full_name,
        email: leadData.email,
        phone: leadData.phone,
        address: leadData.address,
        city: leadData.city || '',
        zip_code: leadData.zip_code || '',
      })
    }
  }

  // Steps indicator
  const steps = [
    { num: 1, label: 'Vælg kunde' },
    { num: 2, label: 'Servicelinjer' },
    { num: 3, label: 'Gennemse' },
  ]

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.num} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                step >= s.num
                  ? 'bg-green-600 text-white'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {step > s.num ? <Check className="h-4 w-4" /> : s.num}
            </div>
            <span className={`text-sm hidden sm:inline ${step >= s.num ? 'font-medium' : 'text-muted-foreground'}`}>
              {s.label}
            </span>
            {i < steps.length - 1 && <div className="h-px w-8 bg-border" />}
          </div>
        ))}
      </div>

      {/* Step 1: Choose Customer */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vælg kunde</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {leadData && !selectedCustomer && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
                <p className="text-sm font-medium mb-2">Fra lead: {leadData.full_name}</p>
                <p className="text-sm text-muted-foreground">{leadData.phone} · {leadData.address}</p>
                <Button
                  onClick={useLeadAsCustomer}
                  className="mt-3 gap-2 bg-green-600 hover:bg-green-700 text-white"
                  size="sm"
                >
                  <User className="h-4 w-4" />
                  Brug denne
                </Button>
              </div>
            )}

            {selectedCustomer ? (
              <div className="rounded-lg border p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{selectedCustomer.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedCustomer.phone} · {selectedCustomer.address}, {selectedCustomer.zip_code} {selectedCustomer.city}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setSelectedCustomer(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {!showNewForm && (
                  <>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Søg efter eksisterende kunde..."
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    {customerSearch && (
                      <div className="max-h-48 overflow-y-auto rounded-lg border divide-y">
                        {filteredCustomers.length === 0 ? (
                          <p className="p-3 text-sm text-muted-foreground">Ingen resultater</p>
                        ) : (
                          filteredCustomers.slice(0, 10).map((c) => (
                            <button
                              key={c.id}
                              onClick={() => { setSelectedCustomer(c); setCustomerSearch('') }}
                              className="w-full text-left p-3 hover:bg-muted text-sm"
                            >
                              <span className="font-medium">{c.full_name}</span>
                              <span className="text-muted-foreground"> · {c.phone}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}

                    <Button
                      variant="outline"
                      onClick={() => setShowNewForm(true)}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Opret ny kunde
                    </Button>
                  </>
                )}

                {showNewForm && (
                  <form action={handleCreateCustomer} className="space-y-4 rounded-lg border p-4">
                    <h3 className="font-medium">Ny kunde</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="new_name">Navn *</Label>
                        <Input id="new_name" name="full_name" required />
                      </div>
                      <div>
                        <Label htmlFor="new_phone">Telefon *</Label>
                        <Input id="new_phone" name="phone" required />
                      </div>
                      <div>
                        <Label htmlFor="new_email">Email</Label>
                        <Input id="new_email" name="email" type="email" />
                      </div>
                      <div>
                        <Label htmlFor="new_source">Kilde</Label>
                        <input type="hidden" name="source" value="manual" />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="new_address">Adresse *</Label>
                      <Input id="new_address" name="address" required />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="new_city">By *</Label>
                        <Input id="new_city" name="city" required />
                      </div>
                      <div>
                        <Label htmlFor="new_zip">Postnummer *</Label>
                        <Input id="new_zip" name="zip_code" required />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" disabled={isPending} className="bg-green-600 hover:bg-green-700 text-white">
                        Opret kunde
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setShowNewForm(false)}>
                        Annuller
                      </Button>
                    </div>
                  </form>
                )}
              </>
            )}

            <div className="flex justify-end">
              <Button
                onClick={() => {
                  // If using lead data as customer and it's "__new__", we need to create the customer first
                  if (selectedCustomer?.id === '__new__') {
                    const formData = new FormData()
                    formData.set('full_name', selectedCustomer.full_name)
                    formData.set('phone', selectedCustomer.phone)
                    formData.set('email', selectedCustomer.email || '')
                    formData.set('address', selectedCustomer.address)
                    formData.set('city', selectedCustomer.city)
                    formData.set('zip_code', selectedCustomer.zip_code)
                    formData.set('source', 'website')
                    // We need to create customer and get ID before proceeding
                    startTransition(async () => {
                      const res = await fetch('/api/create-customer-inline', {
                        method: 'POST',
                        body: formData,
                      })
                      if (res.ok) {
                        const data = await res.json()
                        setSelectedCustomer({ ...selectedCustomer, id: data.id })
                        setStep(2)
                      }
                    })
                    return
                  }
                  setStep(2)
                }}
                disabled={!selectedCustomer || isPending}
                className="gap-2 bg-green-600 hover:bg-green-700 text-white"
              >
                Næste
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Service Lines */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tilføj servicelinjer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {lineItems.map((item, index) => (
              <div key={index} className="rounded-lg border p-3 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-2">
                      <Label className="text-xs">Service</Label>
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
                    <div>
                      <Label className="text-xs">Antal ({unitLabel(item.unit)})</Label>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(index, { quantity: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Enhedspris (kr)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => updateLineItem(index, { unit_price: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeLineItem(index)}
                    className="ml-2 mt-5"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-sm text-right text-muted-foreground">
                  Linje total: <span className="font-medium text-foreground">{formatPrice(item.line_total)}</span>
                </div>
              </div>
            ))}

            <Button variant="outline" onClick={addServiceLine} className="gap-2 w-full">
              <Plus className="h-4 w-4" />
              Tilføj service
            </Button>

            {lineItems.length > 0 && (
              <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-medium">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Moms 25%</span>
                  <span className="font-medium">{formatPrice(vatAmount)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 font-bold">
                  <span>Total inkl. moms</span>
                  <span>{formatPrice(totalInclVat)}</span>
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Tilbage
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={lineItems.length === 0}
                className="gap-2 bg-green-600 hover:bg-green-700 text-white"
              >
                Næste
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review & Send */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gennemse og send</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary */}
            <div className="rounded-lg border p-4 space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Kunde</p>
                <p className="font-medium">{selectedCustomer?.full_name}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedCustomer?.address}, {selectedCustomer?.zip_code} {selectedCustomer?.city}
                </p>
              </div>

              <div className="border-t pt-3">
                <p className="text-sm font-medium mb-2">Servicelinjer</p>
                {lineItems.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm py-1">
                    <span>{item.service_name} — {item.quantity} {unitLabel(item.unit)} × {formatPrice(item.unit_price)}</span>
                    <span className="font-medium">{formatPrice(item.line_total)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t pt-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Moms 25%</span>
                  <span>{formatPrice(vatAmount)}</span>
                </div>
                <div className="flex justify-between font-bold text-base pt-1">
                  <span>Total inkl. moms</span>
                  <span>{formatPrice(totalInclVat)}</span>
                </div>
              </div>
            </div>

            {/* Valid until */}
            <div className="space-y-2">
              <Label htmlFor="valid_until">Gyldig til</Label>
              <Input
                id="valid_until"
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Interne noter</Label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-ring focus:ring-2 focus:ring-ring/50"
                placeholder="Tilføj interne noter..."
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row justify-between gap-3">
              <Button variant="outline" onClick={() => setStep(2)} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Tilbage
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleSave('draft')}
                  disabled={isPending}
                >
                  Gem som kladde
                </Button>
                <Button
                  onClick={() => handleSave('sent')}
                  disabled={isPending}
                  className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                >
                  <Send className="h-4 w-4" />
                  Send tilbud
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Send(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" />
      <path d="m21.854 2.147-10.94 10.939" />
    </svg>
  )
}
