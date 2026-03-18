import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Customer } from '@/lib/types'

interface CustomerFormProps {
  customer?: Customer | null
  action: (formData: FormData) => void
  submitLabel: string
  redirectTo?: string
}

export function CustomerForm({ customer, action, submitLabel, redirectTo }: CustomerFormProps) {
  return (
    <form action={action} className="space-y-4">
      {redirectTo && <input type="hidden" name="redirect_to" value={redirectTo} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="full_name">Navn *</Label>
          <Input id="full_name" name="full_name" defaultValue={customer?.full_name || ''} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Telefon *</Label>
          <Input id="phone" name="phone" type="tel" defaultValue={customer?.phone || ''} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" defaultValue={customer?.email || ''} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="source">Kilde</Label>
          <select
            id="source"
            name="source"
            defaultValue={customer?.source || 'manual'}
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm focus:border-ring focus:ring-2 focus:ring-ring/50"
          >
            <option value="website">Hjemmeside</option>
            <option value="phone">Telefon</option>
            <option value="referral">Anbefaling</option>
            <option value="manual">Manuel</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Adresse *</Label>
        <Input id="address" name="address" defaultValue={customer?.address || ''} required />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city">By *</Label>
          <Input id="city" name="city" defaultValue={customer?.city || ''} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="zip_code">Postnummer *</Label>
          <Input id="zip_code" name="zip_code" defaultValue={customer?.zip_code || ''} required />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Noter</Label>
        <textarea
          id="notes"
          name="notes"
          defaultValue={customer?.notes || ''}
          rows={3}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-ring focus:ring-2 focus:ring-ring/50"
        />
      </div>

      <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white">
        {submitLabel}
      </Button>
    </form>
  )
}
