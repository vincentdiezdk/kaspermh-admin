import { Card, CardContent } from '@/components/ui/card'
import { Car } from 'lucide-react'

export default function VehiclesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Køretøjer</h2>
        <p className="text-muted-foreground">
          Administrer køretøjer og flåde
        </p>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Car className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground text-center">
            Denne funktion kommer i Fase 3
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
