import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus } from 'lucide-react'
import Link from 'next/link'

const sourceLabels: Record<string, string> = {
  website: 'Hjemmeside',
  phone: 'Telefon',
  referral: 'Anbefaling',
  manual: 'Manuel',
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false })

  if (params.search) {
    query = query.or(
      `full_name.ilike.%${params.search}%,phone.ilike.%${params.search}%,address.ilike.%${params.search}%`
    )
  }

  const { data: customers } = await query

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Kunder</h2>
          <p className="text-muted-foreground">Oversigt over alle kunder</p>
        </div>
        <Link href="/customers/new">
          <Button className="gap-2 bg-green-600 hover:bg-green-700 text-white">
            <Plus className="h-4 w-4" />
            Ny kunde
          </Button>
        </Link>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-4">
          <form className="flex gap-3">
            <input
              name="search"
              type="text"
              placeholder="Søg på navn, telefon, adresse..."
              defaultValue={params.search || ''}
              className="h-9 flex-1 rounded-lg border border-input bg-background px-3 text-sm focus:border-ring focus:ring-2 focus:ring-ring/50"
            />
            <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white">
              Søg
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Table */}
      {!customers || customers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground text-center">Ingen kunder endnu.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Navn</TableHead>
                  <TableHead className="hidden sm:table-cell">Telefon</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead className="hidden lg:table-cell">Adresse</TableHead>
                  <TableHead className="hidden sm:table-cell">Kilde</TableHead>
                  <TableHead>Handling</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.full_name}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <a href={`tel:${customer.phone}`} className="text-green-600 hover:underline">
                        {customer.phone}
                      </a>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {customer.email || '–'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {customer.address}, {customer.zip_code} {customer.city}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="secondary">
                        {sourceLabels[customer.source] || customer.source || '–'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Link
                          href={`/customers/${customer.id}`}
                          className="text-sm text-green-600 hover:underline font-medium"
                        >
                          Se
                        </Link>
                        <Link
                          href={`/customers/${customer.id}/edit`}
                          className="text-sm text-muted-foreground hover:underline"
                        >
                          Rediger
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
