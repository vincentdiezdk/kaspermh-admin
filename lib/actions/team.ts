'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

export interface TeamMember {
  id: string
  full_name: string
  email: string
  role: string
  is_active: boolean
  created_at: string
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Ikke logget ind')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    throw new Error('Kun administratorer har adgang')
  }

  return { supabase, userId: user.id }
}

export async function getTeamMembers(): Promise<TeamMember[]> {
  const { supabase } = await requireAdmin()

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, is_active, created_at')
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return (data as TeamMember[]) || []
}

export async function inviteTeamMember(data: {
  name: string
  email: string
  role: string
}) {
  await requireAdmin()

  // Use service role client for admin API
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: inviteData, error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(
    data.email,
    {
      data: {
        full_name: data.name,
        role: data.role,
      },
    }
  )

  if (inviteError) throw new Error(inviteError.message)

  // Create profile row for invited user
  if (inviteData.user) {
    const { error: profileError } = await serviceClient
      .from('profiles')
      .upsert({
        id: inviteData.user.id,
        full_name: data.name,
        email: data.email,
        role: data.role,
        is_active: true,
      })

    if (profileError) throw new Error(profileError.message)
  }

  revalidatePath('/settings/team')
}

export async function updateTeamMemberRole(memberId: string, role: string) {
  const { supabase, userId } = await requireAdmin()

  if (memberId === userId) {
    throw new Error('Du kan ikke ændre din egen rolle')
  }

  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', memberId)

  if (error) throw new Error(error.message)
  revalidatePath('/settings/team')
}

export async function toggleTeamMemberActive(memberId: string, is_active: boolean) {
  const { supabase, userId } = await requireAdmin()

  if (memberId === userId) {
    throw new Error('Du kan ikke deaktivere dig selv')
  }

  const { error } = await supabase
    .from('profiles')
    .update({ is_active })
    .eq('id', memberId)

  if (error) throw new Error(error.message)
  revalidatePath('/settings/team')
}
