import { Card, CardContent } from '@/components/ui/card'
import { Map } from 'lucide-react'

export default function RoutePlannerPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Køreplan</h2>
        <p className="text-muted-foreground">
          Planlæg optimale ruter for dagens jobs
        </p>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Map className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground text-center">
            Denne funktion kommer i Fase 4
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
