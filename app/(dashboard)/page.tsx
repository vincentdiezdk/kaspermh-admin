import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ClipboardList, Wrench, FileText, CreditCard, MapPin, ArrowRight } from 'lucide-react'
import { formatPriceShort, formatDate, formatTime } from '@/lib/format'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user!.id)
    .single()

  const greeting = getGreeting()
  const name = profile?.full_name?.split(' ')[0] || 'bruger'

  const today = new Date().toISOString().split('T')[0]

  // Fetch live stats in parallel
  const [
    { count: newLeadsCount },
    { count: jobsTodayCount },
    { count: pendingQuotesCount },
    { data: unpaidJobs },
    { data: todaysJobs },
    { data: newLeads },
  ] = await Promise.all([
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'new'),
    supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('scheduled_date', today),
    supabase.from('quotes').select('*', { count: 'exact', head: true }).eq('status', 'sent'),
    supabase.from('jobs').select('total_incl_vat:quotes(total_incl_vat)').eq('status', 'completed').is('paid_at', null),
    supabase
      .from('jobs')
      .select('*, customer:customers(full_name)')
      .eq('scheduled_date', today)
      .order('scheduled_time', { ascending: true })
      .limit(10),
    supabase
      .from('leads')
      .select('*')
      .eq('status', 'new')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  // Calculate unpaid total — sum from related quotes
  // Since jobs may not directly have total, we compute from the unpaid jobs
  const { data: unpaidJobsList } = await supabase
    .from('jobs')
    .select('quote_id')
    .eq('status', 'completed')
    .is('paid_at', null)

  let unpaidTotal = 0
  if (unpaidJobsList && unpaidJobsList.length > 0) {
    const quoteIds = unpaidJobsList
      .map((j) => j.quote_id)
      .filter(Boolean) as string[]
    if (quoteIds.length > 0) {
      const { data: unpaidQuotes } = await supabase
        .from('quotes')
        .select('total_incl_vat')
        .in('id', quoteIds)
      unpaidTotal = unpaidQuotes?.reduce((sum, q) => sum + Number(q.total_incl_vat || 0), 0) || 0
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          {greeting}, {name}
        </h2>
        <p className="text-muted-foreground">
          Her er dit dagsoverblik
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Nye leads"
          value={String(newLeadsCount || 0)}
          icon={<ClipboardList className="h-4 w-4 text-green-600" />}
          href="/leads?status=new"
        />
        <StatCard
          title="Jobs i dag"
          value={String(jobsTodayCount || 0)}
          icon={<Wrench className="h-4 w-4 text-green-600" />}
          href="/jobs"
        />
        <StatCard
          title="Udestående tilbud"
          value={String(pendingQuotesCount || 0)}
          icon={<FileText className="h-4 w-4 text-green-600" />}
          href="/quotes"
        />
        <StatCard
          title="Ubetalt"
          value={formatPriceShort(unpaidTotal)}
          icon={<CreditCard className="h-4 w-4 text-green-600" />}
        />
      </div>

      {/* Today's jobs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dagens jobs</CardTitle>
        </CardHeader>
        <CardContent>
          {!todaysJobs || todaysJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ingen jobs planlagt i dag
            </p>
          ) : (
            <div className="space-y-3">
              {todaysJobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {job.scheduled_time && (
                        <span className="text-sm font-medium">{formatTime(job.scheduled_time)}</span>
                      )}
                      <span className="text-sm font-medium">
                        {(job.customer as { full_name: string } | null)?.full_name || 'Ukendt kunde'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {job.address}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm" className="gap-1">
                        <MapPin className="h-3 w-3" />
                        <span className="hidden sm:inline">Navigation</span>
                      </Button>
                    </a>
                    <Link href={`/jobs/${job.id}`}>
                      <Button variant="outline" size="sm">
                        Åbn
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* New leads */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Nye leads</CardTitle>
          <Link href="/leads?status=new">
            <Button variant="ghost" size="sm" className="gap-1 text-green-600">
              Se alle
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {!newLeads || newLeads.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ingen nye leads</p>
          ) : (
            <div className="space-y-2">
              {newLeads.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/leads/${lead.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">{lead.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {lead.service_type || 'Ingen service'} · {formatDate(lead.created_at)}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon,
  href,
}: {
  title: string
  value: string
  icon: React.ReactNode
  href?: string
}) {
  const content = (
    <Card className={href ? 'cursor-pointer hover:ring-2 hover:ring-green-600/20 transition-all' : ''}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }

  return content
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'God morgen'
  if (hour < 18) return 'God eftermiddag'
  return 'God aften'
}
