import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { QuoteStatusBadge } from '@/components/quotes/quote-status-badge'
import { formatDate, formatPrice } from '@/lib/format'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import type { QuoteStatus } from '@/lib/types'

export default async function QuotesPage() {
  const supabase = await createClient()

  const { data: quotes } = await supabase
    .from('quotes')
    .select('*, customer:customers(full_name)')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tilbud</h2>
          <p className="text-muted-foreground">Opret og administrer tilbud til kunder</p>
        </div>
        <Link href="/quotes/new">
          <Button className="gap-2 bg-green-600 hover:bg-green-700 text-white">
            <Plus className="h-4 w-4" />
            Nyt tilbud
          </Button>
        </Link>
      </div>

      {!quotes || quotes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground text-center">Ingen tilbud endnu.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nr.</TableHead>
                  <TableHead>Kunde</TableHead>
                  <TableHead className="hidden sm:table-cell">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Sendt</TableHead>
                  <TableHead className="hidden md:table-cell">Gyldig til</TableHead>
                  <TableHead>Handling</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.map((quote) => (
                  <TableRow key={quote.id}>
                    <TableCell className="font-medium">{quote.quote_number}</TableCell>
                    <TableCell>
                      {(quote.customer as { full_name: string } | null)?.full_name || '–'}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {formatPrice(quote.total_incl_vat)}
                    </TableCell>
                    <TableCell>
                      <QuoteStatusBadge status={quote.status as QuoteStatus} />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {formatDate(quote.sent_at)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {formatDate(quote.valid_until)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Link href={`/quotes/${quote.id}`} className="text-sm text-green-600 hover:underline font-medium">
                          Se
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
