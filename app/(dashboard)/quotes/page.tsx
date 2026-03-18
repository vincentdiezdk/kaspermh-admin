import { Card, CardContent } from '@/components/ui/card'
import { FileText } from 'lucide-react'

export default function QuotesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Tilbud</h2>
        <p className="text-muted-foreground">
          Opret og administrer tilbud til kunder
        </p>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground text-center">
            Denne funktion kommer i Fase 3
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
