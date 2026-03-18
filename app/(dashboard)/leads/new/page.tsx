import { createClient } from '@/lib/supabase/server'
import { createLead } from '@/lib/actions/leads'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function NewLeadPage() {
  const supabase = await createClient()
  const { data: services } = await supabase
    .from('services')
    .select('name')
    .eq('is_active', true)
    .order('sort_order')

  return (
    <div className="space-y-6 max-w-2xl">
      <Link
        href="/leads"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Tilbage til leads
      </Link>

      <div>
        <h2 className="text-2xl font-bold tracking-tight">Opret lead</h2>
        <p className="text-muted-foreground">Opret en ny lead manuelt</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form action={createLead} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Navn *</Label>
                <Input id="full_name" name="full_name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefon *</Label>
                <Input id="phone" name="phone" type="tel" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="service_type">Service</Label>
                <select
                  id="service_type"
                  name="service_type"
                  className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm focus:border-ring focus:ring-2 focus:ring-ring/50"
                >
                  <option value="">Vælg service...</option>
                  {services?.map((s) => (
                    <option key={s.name} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Adresse *</Label>
              <Input id="address" name="address" required />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">By</Label>
                <Input id="city" name="city" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip_code">Postnummer</Label>
                <Input id="zip_code" name="zip_code" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="estimated_area">Estimeret areal (m²)</Label>
                <Input id="estimated_area" name="estimated_area" type="number" step="0.01" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="calculated_price">Estimeret pris (kr)</Label>
                <Input id="calculated_price" name="calculated_price" type="number" step="0.01" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Besked</Label>
              <textarea
                id="message"
                name="message"
                rows={4}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-ring focus:ring-2 focus:ring-ring/50"
              />
            </div>

            <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white">
              Opret lead
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
