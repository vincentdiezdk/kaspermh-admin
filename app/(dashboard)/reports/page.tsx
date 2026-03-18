import { Card, CardContent } from '@/components/ui/card'
import { BarChart3 } from 'lucide-react'

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Rapporter</h2>
        <p className="text-muted-foreground">
          Overblik over forretningens nøgletal
        </p>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <BarChart3 className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground text-center">
            Denne funktion kommer i Fase 5
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
