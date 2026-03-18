import { Card, CardContent } from '@/components/ui/card'
import { Users } from 'lucide-react'

export default function CustomersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Kunder</h2>
        <p className="text-muted-foreground">
          Oversigt over alle kunder
        </p>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground text-center">
            Denne funktion kommer i Fase 2
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
