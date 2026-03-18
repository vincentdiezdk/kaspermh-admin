import { createCustomer } from '@/lib/actions/customers'
import { Card, CardContent } from '@/components/ui/card'
import { CustomerForm } from '@/components/customers/customer-form'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewCustomerPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <Link
        href="/customers"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Tilbage til kunder
      </Link>

      <div>
        <h2 className="text-2xl font-bold tracking-tight">Opret kunde</h2>
        <p className="text-muted-foreground">Opret en ny kunde manuelt</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <CustomerForm action={createCustomer} submitLabel="Opret kunde" />
        </CardContent>
      </Card>
    </div>
  )
}
