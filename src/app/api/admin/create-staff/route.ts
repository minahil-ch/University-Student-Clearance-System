import { NextResponse } from "next/server"
import { createClient as createServerSupabase } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: me } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (me?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const body = await req.json()
    const { fullName, email, password, role, departmentName } = body || {}
    if (!fullName || !email || !password || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

    // Strategy 1: Use Admin API with service role key (preferred)
    if (serviceRoleKey && !serviceRoleKey.includes("dummy")) {
      try {
        const admin = createAdminClient(supabaseUrl, serviceRoleKey)

        const { data, error } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: fullName,
            role,
            department_name: departmentName || null,
          },
        })
        if (error) throw error

        if (data.user?.id) {
          await admin.from("profiles").upsert({
            id: data.user.id,
            full_name: fullName,
            email,
            role,
            is_approved: true,
            department_name: departmentName || null,
          }, { onConflict: "id" })
        }

        return NextResponse.json({ ok: true })
      } catch (adminError: any) {
        // If admin API fails, fall through to Strategy 2
        console.warn("Admin API failed, falling back to signUp:", adminError.message)
      }
    }

    // Strategy 2: Fallback - use regular signUp + profile upsert
    // This works even without a valid service role key
    const anonClient = createAdminClient(
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: signUpData, error: signUpError } = await anonClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
          department_name: departmentName || null,
        },
      },
    })

    if (signUpError) {
      return NextResponse.json({ error: signUpError.message }, { status: 400 })
    }

    // Create the profile with is_approved: true (pre-approved by admin)
    if (signUpData.user?.id) {
      const { error: profileError } = await anonClient.from("profiles").upsert({
        id: signUpData.user.id,
        full_name: fullName,
        email,
        role,
        is_approved: true,
        department_name: departmentName || null,
      }, { onConflict: "id" })

      if (profileError) {
        console.warn("Profile upsert warning:", profileError.message)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error("Create staff error:", error)
    return NextResponse.json({ error: error.message || "Failed to create staff" }, { status: 500 })
  }
}
