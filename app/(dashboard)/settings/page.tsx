import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'

export default function SettingsPage() {
  const settingsLinks = [
    {
      title: 'Services',
      description: 'Administrer servicetyper og priser',
      href: '/settings/services',
    },
    {
      title: 'Køretøjer',
      description: 'Administrer køretøjer og flåde',
      href: '/settings/vehicles',
    },
    {
      title: 'Materialer',
      description: 'Administrer materialer og lagerbeholdning',
      href: '/settings/materials',
    },
    {
      title: 'Virksomhed',
      description: 'Firmaoplysninger, logo og betalingsinfo',
      href: '/settings/company',
    },
    {
      title: 'Team',
      description: 'Administrer medarbejdere og roller',
      href: '/settings/team',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Indstillinger</h2>
        <p className="text-muted-foreground">
          Konfigurer dit admin panel
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {settingsLinks.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="hover:border-green-300 hover:shadow-sm transition-all cursor-pointer h-full">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
