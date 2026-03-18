import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ClipboardList, Wrench, FileText, CreditCard } from 'lucide-react'

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
          value="0"
          icon={<ClipboardList className="h-4 w-4 text-green-600" />}
        />
        <StatCard
          title="Jobs i dag"
          value="0"
          icon={<Wrench className="h-4 w-4 text-green-600" />}
        />
        <StatCard
          title="Udestående tilbud"
          value="0"
          icon={<FileText className="h-4 w-4 text-green-600" />}
        />
        <StatCard
          title="Ubetalt"
          value="0 kr"
          icon={<CreditCard className="h-4 w-4 text-green-600" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dagens jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Ingen jobs planlagt i dag
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string
  value: string
  icon: React.ReactNode
}) {
  return (
    <Card>
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
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'God morgen'
  if (hour < 18) return 'God eftermiddag'
  return 'God aften'
}
