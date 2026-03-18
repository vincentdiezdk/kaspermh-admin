import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter,
} from '@/components/ui/table'
import { QuoteStatusBadge } from '@/components/quotes/quote-status-badge'
import { QuoteActions } from '@/components/quotes/quote-actions'
import { formatDate, formatPrice } from '@/lib/format'
import { unitLabel } from '@/lib/format'
import { ArrowLeft, User, MapPin } from 'lucide-react'
import Link from 'next/link'
import type { QuoteStatus, QuoteLineItem } from '@/lib/types'

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: quote, error } = await supabase
    .from('quotes')
    .select('*, customer:customers(*)')
    .eq('id', id)
    .single()

  if (error || !quote) notFound()

  const customer = quote.customer as { full_name: string; address: string; city: string; zip_code: string; phone: string; email: string | null } | null
  const lineItems = (typeof quote.line_items === 'string' ? JSON.parse(quote.line_items) : quote.line_items) as QuoteLineItem[]

  return (
    <div className="space-y-6 max-w-3xl">
      <Link
        href="/quotes"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Tilbage til tilbud
      </Link>

      {/* Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold">Tilbud {quote.quote_number}</h2>
              <div className="mt-2 text-sm text-muted-foreground space-y-1">
                <p>Oprettet: {formatDate(quote.created_at)}</p>
                {quote.sent_at && <p>Sendt: {formatDate(quote.sent_at)}</p>}
                {quote.valid_until && <p>Gyldig til: {formatDate(quote.valid_until)}</p>}
              </div>
            </div>
            <QuoteStatusBadge status={quote.status as QuoteStatus} />
          </div>
        </CardContent>
      </Card>

      {/* Customer info */}
      {customer && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kunde</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <Link href={`/customers/${quote.customer_id}`} className="text-green-600 hover:underline font-medium">
                {customer.full_name}
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{customer.address}, {customer.zip_code} {customer.city}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Line items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Servicelinjer</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead className="text-right">Antal</TableHead>
                <TableHead className="hidden sm:table-cell">Enhed</TableHead>
                <TableHead className="text-right hidden sm:table-cell">Enhedspris</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineItems.map((item, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{item.service_name}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="hidden sm:table-cell">{unitLabel(item.unit)}</TableCell>
                  <TableCell className="text-right hidden sm:table-cell">{formatPrice(item.unit_price)}</TableCell>
                  <TableCell className="text-right">{formatPrice(item.line_total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={4} className="text-right font-medium">Subtotal</TableCell>
                <TableCell className="text-right">{formatPrice(quote.subtotal)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell colSpan={4} className="text-right font-medium">Moms 25%</TableCell>
                <TableCell className="text-right">{formatPrice(quote.vat_amount)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell colSpan={4} className="text-right font-bold">Total inkl. moms</TableCell>
                <TableCell className="text-right font-bold">{formatPrice(quote.total_incl_vat)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      {/* Notes */}
      {quote.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Interne noter</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{quote.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Handlinger</CardTitle>
        </CardHeader>
        <CardContent>
          <QuoteActions quoteId={quote.id} status={quote.status as QuoteStatus} acceptToken={quote.accept_token} />
        </CardContent>
      </Card>
    </div>
  )
}
