import { Card, CardContent } from '@/components/ui/card'
import { Briefcase } from 'lucide-react'

export default function ServicesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Services</h2>
        <p className="text-muted-foreground">
          Administrer servicetyper og priser
        </p>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Briefcase className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground text-center">
            Denne funktion kommer i Fase 2
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
