'use server'

import { createClient } from '@supabase/supabase-js'

export async function adminCreateUser(formData: { name: string, email: string, role: string, password?: string }) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  const password = formData.password || Math.random().toString(36).slice(-8)

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: formData.email,
    password: password,
    email_confirm: true,
    user_metadata: {
      name: formData.name,
      role: formData.role,
      approved: true
    }
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true, password }
}
