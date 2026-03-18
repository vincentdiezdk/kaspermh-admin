import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { updateCustomer } from '@/lib/actions/customers'
import { Card, CardContent } from '@/components/ui/card'
import { CustomerForm } from '@/components/customers/customer-form'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { Customer } from '@/lib/types'

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: customer, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !customer) notFound()

  const updateWithId = updateCustomer.bind(null, id)

  return (
    <div className="space-y-6 max-w-2xl">
      <Link
        href={`/customers/${id}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Tilbage til kunde
      </Link>

      <div>
        <h2 className="text-2xl font-bold tracking-tight">Rediger kunde</h2>
        <p className="text-muted-foreground">{customer.full_name}</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <CustomerForm
            customer={customer as Customer}
            action={updateWithId}
            submitLabel="Gem ændringer"
          />
        </CardContent>
      </Card>
    </div>
  )
}
