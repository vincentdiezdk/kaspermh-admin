import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { LeadStatusBadge } from '@/components/leads/lead-status-badge'
import { QuoteStatusBadge } from '@/components/quotes/quote-status-badge'
import { formatDate, formatPrice, formatPhone } from '@/lib/format'
import { ArrowLeft, Pencil, User, Phone, Mail, MapPin } from 'lucide-react'
import Link from 'next/link'
import type { LeadStatus, QuoteStatus } from '@/lib/types'
import { RecurringTemplates } from '@/components/customers/recurring-templates'

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: customer, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !customer) notFound()

  // Fetch related data
  const [
    { data: leads },
    { data: quotes },
    { data: jobs },
    { data: recurringTemplates },
  ] = await Promise.all([
    supabase.from('leads').select('*').eq('converted_customer_id', id).order('created_at', { ascending: false }),
    supabase.from('quotes').select('*').eq('customer_id', id).order('created_at', { ascending: false }),
    supabase.from('jobs').select('*').eq('customer_id', id).order('scheduled_date', { ascending: false }),
    supabase.from('recurring_templates').select('*, service:services(name), assigned_user:profiles(full_name), vehicle:vehicles(name, license_plate)').eq('customer_id', id).order('next_job_date', { ascending: true }),
  ])

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <Link
          href="/customers"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Tilbage til kunder
        </Link>
        <Link href={`/customers/${id}/edit`}>
          <Button variant="outline" className="gap-2">
            <Pencil className="h-4 w-4" />
            Rediger
          </Button>
        </Link>
      </div>

      {/* Customer info */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <User className="h-5 w-5 text-green-600" />
            {customer.full_name}
          </h2>
          <div className="space-y-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              <a href={`tel:${customer.phone}`} className="text-green-600 hover:underline">
                {formatPhone(customer.phone)}
              </a>
            </div>
            {customer.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <a href={`mailto:${customer.email}`} className="hover:underline">{customer.email}</a>
              </div>
            )}
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>{customer.address}, {customer.zip_code} {customer.city}</span>
            </div>
          </div>
          {customer.notes && (
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground">Noter:</p>
              <p className="text-sm whitespace-pre-wrap">{customer.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recurring templates */}
      <RecurringTemplates customerId={id} initialTemplates={recurringTemplates || []} />

      {/* Tabs */}
      <Tabs defaultValue="leads">
        <TabsList>
          <TabsTrigger value="leads">Leads ({leads?.length || 0})</TabsTrigger>
          <TabsTrigger value="quotes">Tilbud ({quotes?.length || 0})</TabsTrigger>
          <TabsTrigger value="jobs">Jobs ({jobs?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="leads">
          {!leads || leads.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Ingen leads tilknyttet denne kunde
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dato</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Handling</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell>{formatDate(lead.created_at)}</TableCell>
                        <TableCell>{lead.service_type || '–'}</TableCell>
                        <TableCell>
                          <LeadStatusBadge status={lead.status as LeadStatus} />
                        </TableCell>
                        <TableCell>
                          <Link href={`/leads/${lead.id}`} className="text-sm text-green-600 hover:underline">
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
        </TabsContent>

        <TabsContent value="quotes">
          {!quotes || quotes.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Ingen tilbud tilknyttet denne kunde
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nr.</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Handling</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quotes.map((quote) => (
                      <TableRow key={quote.id}>
                        <TableCell className="font-medium">{quote.quote_number}</TableCell>
                        <TableCell>{formatPrice(quote.total_incl_vat)}</TableCell>
                        <TableCell>
                          <QuoteStatusBadge status={quote.status as QuoteStatus} />
                        </TableCell>
                        <TableCell>
                          <Link href={`/quotes/${quote.id}`} className="text-sm text-green-600 hover:underline">
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
        </TabsContent>

        <TabsContent value="jobs">
          {!jobs || jobs.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Ingen jobs tilknyttet denne kunde
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nr.</TableHead>
                      <TableHead>Dato</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Handling</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell className="font-medium">{job.job_number}</TableCell>
                        <TableCell>{formatDate(job.scheduled_date)}</TableCell>
                        <TableCell>{job.status}</TableCell>
                        <TableCell>
                          <Link href={`/jobs/${job.id}`} className="text-sm text-green-600 hover:underline">
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
        </TabsContent>
      </Tabs>
    </div>
  )
}
