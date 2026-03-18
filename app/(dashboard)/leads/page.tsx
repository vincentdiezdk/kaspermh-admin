import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { LeadStatusBadge } from '@/components/leads/lead-status-badge'
import { LeadSourceBadge } from '@/components/leads/lead-source-badge'
import { formatDate, formatPriceShort } from '@/lib/format'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import type { LeadStatus } from '@/lib/types'

const PAGE_SIZE = 20

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; service?: string; page?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const page = Math.max(1, Number(params.page) || 1)
  const offset = (page - 1) * PAGE_SIZE

  let query = supabase
    .from('leads')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (params.search) {
    query = query.or(
      `full_name.ilike.%${params.search}%,phone.ilike.%${params.search}%,address.ilike.%${params.search}%`
    )
  }
  if (params.status) {
    query = query.eq('status', params.status)
  }
  if (params.service) {
    query = query.eq('service_type', params.service)
  }

  const { data: leads, count } = await query

  // Get unique service types for filter
  const { data: services } = await supabase
    .from('services')
    .select('name')
    .eq('is_active', true)
    .order('sort_order')

  const totalPages = Math.ceil((count || 0) / PAGE_SIZE)

  function buildUrl(overrides: Record<string, string | undefined>) {
    const p = new URLSearchParams()
    const merged = { search: params.search, status: params.status, service: params.service, page: params.page, ...overrides }
    for (const [k, v] of Object.entries(merged)) {
      if (v && v !== 'undefined') p.set(k, v)
    }
    return `/leads?${p.toString()}`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Leads</h2>
          <p className="text-muted-foreground">
            Administrer indkommende leads og henvendelser
          </p>
        </div>
        <Link href="/leads/new">
          <Button className="gap-2 bg-green-600 hover:bg-green-700 text-white">
            <Plus className="h-4 w-4" />
            Ny lead
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <form className="flex flex-col sm:flex-row gap-3">
            <input
              name="search"
              type="text"
              placeholder="Søg på navn, telefon, adresse..."
              defaultValue={params.search || ''}
              className="h-9 flex-1 rounded-lg border border-input bg-background px-3 text-sm focus:border-ring focus:ring-2 focus:ring-ring/50"
            />
            <select
              name="status"
              defaultValue={params.status || ''}
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:border-ring focus:ring-2 focus:ring-ring/50"
            >
              <option value="">Alle statusser</option>
              <option value="new">Ny</option>
              <option value="contacted">Kontaktet</option>
              <option value="quote_sent">Tilbud sendt</option>
              <option value="won">Vundet</option>
              <option value="lost">Tabt</option>
              <option value="duplicate">Duplikat</option>
            </select>
            <select
              name="service"
              defaultValue={params.service || ''}
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:border-ring focus:ring-2 focus:ring-ring/50"
            >
              <option value="">Alle services</option>
              {services?.map((s) => (
                <option key={s.name} value={s.name}>{s.name}</option>
              ))}
            </select>
            <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white">
              Søg
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Table */}
      {!leads || leads.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground text-center">
              Ingen leads endnu. Leads fra hjemmesiden vises automatisk her.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dato</TableHead>
                  <TableHead>Navn</TableHead>
                  <TableHead className="hidden sm:table-cell">Telefon</TableHead>
                  <TableHead className="hidden md:table-cell">Service</TableHead>
                  <TableHead className="hidden md:table-cell">Est. pris</TableHead>
                  <TableHead className="hidden lg:table-cell">Kilde</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Handling</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="text-muted-foreground">
                      {formatDate(lead.created_at)}
                    </TableCell>
                    <TableCell className="font-medium">{lead.full_name}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <a href={`tel:${lead.phone}`} className="text-green-600 hover:underline">
                        {lead.phone}
                      </a>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{lead.service_type || '–'}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {formatPriceShort(lead.calculated_price)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <LeadSourceBadge source={lead.source} />
                    </TableCell>
                    <TableCell>
                      <LeadStatusBadge status={lead.status as LeadStatus} />
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/leads/${lead.id}`}
                        className="text-sm text-green-600 hover:underline font-medium"
                      >
                        Se
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Side {page} af {totalPages} ({count} leads)
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={buildUrl({ page: String(page - 1) })}>
                <Button variant="outline" size="sm">Forrige</Button>
              </Link>
            )}
            {page < totalPages && (
              <Link href={buildUrl({ page: String(page + 1) })}>
                <Button variant="outline" size="sm">Næste</Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
