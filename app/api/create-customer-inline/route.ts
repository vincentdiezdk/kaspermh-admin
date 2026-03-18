import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const formData = await request.formData()

  const { data: customer, error } = await supabase
    .from('customers')
    .insert({
      full_name: formData.get('full_name') as string,
      email: (formData.get('email') as string) || null,
      phone: formData.get('phone') as string,
      address: formData.get('address') as string,
      city: formData.get('city') as string,
      zip_code: formData.get('zip_code') as string,
      source: (formData.get('source') as string) || 'manual',
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ id: customer.id })
}
