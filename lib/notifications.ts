import { SupabaseClient } from '@supabase/supabase-js'

export async function createNotification(
  supabase: SupabaseClient,
  userId: string,
  type: string,
  title: string,
  message: string,
  href?: string
) {
  await supabase.from('notifications').insert({
    user_id: userId, type, title, message, href: href ?? null
  })
}

export async function notifyAdmins(
  supabase: SupabaseClient,
  type: string,
  title: string,
  message: string,
  href?: string
) {
  const { data: admins } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
    .eq('is_active', true)

  if (admins?.length) {
    await supabase.from('notifications').insert(
      admins.map(admin => ({
        user_id: admin.id, type, title, message, href: href ?? null
      }))
    )
  }
}
