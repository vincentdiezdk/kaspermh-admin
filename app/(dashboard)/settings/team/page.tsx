import { Card, CardContent } from '@/components/ui/card'
import { UserCog } from 'lucide-react'

export default function TeamPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Team</h2>
        <p className="text-muted-foreground">
          Administrer medarbejdere og roller
        </p>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <UserCog className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground text-center">
            Denne funktion kommer i Fase 2
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
