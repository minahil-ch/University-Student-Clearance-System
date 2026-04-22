import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

async function debugDB() {
  console.log("Checking Supabase connection...")
  
  // 1. Check if we can connect
  const { data: health, error: healthError } = await supabase.from('profiles').select('count', { count: 'exact', head: true })
  if (healthError) {
    console.error("Connection Error or Table 'profiles' missing:", healthError.message)
  } else {
    console.log("Profiles table accessible. Count:", health)
  }

  // 2. Check for the admin user
  const { data: adminProfile, error: adminError } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', 'minahilch821@gmail.com')
    .maybeSingle()
  
  if (adminError) {
    console.error("Error looking up admin profile:", adminError.message)
  } else if (!adminProfile) {
    console.log("Admin profile 'minahilch821@gmail.com' NOT found!")
  } else {
    console.log("Admin profile found:", adminProfile)
  }

  // 3. Check for specific tables
  const tables = ['profiles', 'clearance_status', 'audit_logs', 'future_data']
  for (const table of tables) {
    const { error } = await supabase.from(table).select('*').limit(1)
    if (error) {
      console.log(`Table '${table}' check: FAILED - ${error.message}`)
    } else {
      console.log(`Table '${table}' check: SUCCESS`)
    }
  }
}

debugDB()
