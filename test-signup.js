import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

async function testSignup() {
  const email = `test-${Date.now()}@example.com`
  const password = "password123"
  
  console.log(`Testing signup with ${email}...`)
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: "Test User",
        father_name: "Test Father",
        reg_no: `REG-${Date.now()}`,
        phone: "+921111111111",
        cgpa: "3.75",
        role: "student"
      }
    }
  })

  if (error) {
    console.error("Signup Error:", JSON.stringify(error, null, 2))
    return
  }

  console.log("Signup Success! User ID:", data.user?.id)
  
  // Now check if profile was created
  const { data: profile, error: pError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user?.id)
    .single()

  if (pError) {
    console.error("Profile Fetch Error (Trigger failed?):", JSON.stringify(pError, null, 2))
  } else {
    console.log("Profile created successfully:", profile)
  }
}

testSignup()
