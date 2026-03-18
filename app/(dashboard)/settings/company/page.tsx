'use client'

import { useState, useEffect, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Building2, CreditCard, Settings, Upload, Image, Link as LinkIcon } from 'lucide-react'
import { toast } from 'sonner'
import {
  getCompanySettings,
  updateCompanySettings,
  uploadCompanyLogo,
  type CompanySettings,
} from '@/lib/actions/company'
import { getDineroStatus } from '@/lib/actions/integrations'

export default function CompanyPage() {
  const [settings, setSettings] = useState<CompanySettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const [dineroStatus, setDineroStatus] = useState<{ configured: boolean; hasClientId: boolean; hasRedirectUri: boolean } | null>(null)

  useEffect(() => {
    getCompanySettings().then((data) => {
      setSettings(data)
      setLoading(false)
    })
    getDineroStatus().then(setDineroStatus)
  }, [])

  const handleSave = () => {
    if (!settings) return
    startTransition(async () => {
      try {
        const { id, updated_at, ...rest } = settings
        await updateCompanySettings(rest)
        toast.success('Firmaoplysninger gemt')
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Kunne ikke gemme')
      }
    })
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const url = await uploadCompanyLogo(formData)
      setSettings((prev) => prev ? { ...prev, logo_url: url } : prev)
      toast.success('Logo uploadet')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Kunne ikke uploade logo')
    } finally {
      setUploading(false)
    }
  }

  const update = (field: keyof CompanySettings, value: string | number) => {
    setSettings((prev) => prev ? { ...prev, [field]: value } : prev)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Virksomhed</h2>
          <p className="text-muted-foreground">Firmaoplysninger og indstillinger</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Kør venligst MIGRATION_FASE4.md SQL først for at oprette company_settings tabellen.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Virksomhed</h2>
        <p className="text-muted-foreground">Firmaoplysninger og indstillinger</p>
      </div>

      <div className="space-y-6 max-w-2xl">
        {/* Firmaoplysninger */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5" />
              Firmaoplysninger
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Firmanavn</Label>
              <Input
                value={settings.company_name}
                onChange={(e) => update('company_name', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Adresse</Label>
              <Input
                value={settings.address}
                onChange={(e) => update('address', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Postnr.</Label>
                <Input
                  value={settings.postal_code}
                  onChange={(e) => update('postal_code', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>By</Label>
                <Input
                  value={settings.city}
                  onChange={(e) => update('city', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>CVR-nummer</Label>
              <Input
                value={settings.cvr}
                onChange={(e) => update('cvr', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Telefon</Label>
                <Input
                  value={settings.phone}
                  onChange={(e) => update('phone', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={settings.email}
                  onChange={(e) => update('email', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Image className="h-5 w-5" />
              Logo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {settings.logo_url ? (
              <div className="flex items-center gap-4">
                <img
                  src={settings.logo_url}
                  alt="Firma logo"
                  className="h-16 w-auto rounded border"
                />
                <p className="text-sm text-muted-foreground">Nuværende logo</p>
              </div>
            ) : (
              <div className="flex items-center justify-center h-16 w-32 rounded border border-dashed bg-muted/50">
                <p className="text-sm text-muted-foreground">Intet logo</p>
              </div>
            )}
            <div>
              <label className="cursor-pointer inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  disabled={uploading}
                />
                <Upload className="h-4 w-4" />
                {uploading ? 'Uploader...' : 'Upload logo'}
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Betalingsoplysninger */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="h-5 w-5" />
              Betalingsoplysninger
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>MobilePay-nummer</Label>
              <Input
                value={settings.mobilepay_number}
                onChange={(e) => update('mobilepay_number', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Reg. nr.</Label>
                <Input
                  value={settings.bank_reg}
                  onChange={(e) => update('bank_reg', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Kontonr.</Label>
                <Input
                  value={settings.bank_account}
                  onChange={(e) => update('bank_account', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Standardindstillinger */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Settings className="h-5 w-5" />
              Standardindstillinger
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Tilbuds gyldighedsperiode (dage)</Label>
                <Input
                  type="number"
                  value={settings.default_quote_validity_days}
                  onChange={(e) => update('default_quote_validity_days', parseInt(e.target.value, 10) || 14)}
                />
              </div>
              <div className="space-y-1">
                <Label>Faktura forfaldsdage</Label>
                <Input
                  type="number"
                  value={settings.invoice_due_days}
                  onChange={(e) => update('invoice_due_days', parseInt(e.target.value, 10) || 14)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Rykker efter dage</Label>
              <Input
                type="number"
                value={settings.invoice_reminder_days}
                onChange={(e) => update('invoice_reminder_days', parseInt(e.target.value, 10) || 7)}
              />
            </div>
            <div className="space-y-1">
              <Label>Standard tilbudsnote</Label>
              <textarea
                value={settings.default_quote_notes}
                onChange={(e) => update('default_quote_notes', e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                placeholder="Tekst der vises på nye tilbud..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Dinero Integration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <LinkIcon className="h-5 w-5" />
              Dinero Regnskab
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              {dineroStatus?.configured ? (
                <span className="inline-flex items-center gap-1 text-sm font-medium text-green-600">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  Forbundet
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-gray-300" />
                  Ikke forbundet
                </span>
              )}
            </div>
            {!dineroStatus?.configured && (
              <>
                {dineroStatus?.hasClientId && dineroStatus?.hasRedirectUri ? (
                  <a
                    href="/api/dinero/connect"
                    className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
                  >
                    Forbind Dinero
                  </a>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Sæt DINERO_CLIENT_ID og DINERO_CLIENT_SECRET i Vercel miljøvariabler for at aktivere.
                  </p>
                )}
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Når du forbinder Dinero, vil systemet automatisk:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Synkronisere kontakter</li>
                    <li>Eksportere fakturaer til bogføring</li>
                    <li>Registrere betalinger</li>
                  </ul>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Button
          onClick={handleSave}
          disabled={isPending}
          className="w-full bg-green-600 hover:bg-green-700 text-white min-h-[44px]"
        >
          {isPending ? 'Gemmer...' : 'Gem ændringer'}
        </Button>
      </div>
    </div>
  )
}
