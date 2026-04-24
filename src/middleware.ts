import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { departmentPortalPathSlug } from '@/lib/departmentKeys'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // If env is missing (often causes "failed to fetch"), do not block navigation.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnon) {
    return supabaseResponse
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnon,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session - do NOT call getUser() more than once per request
  let user: any = null
  try {
    const result = await supabase.auth.getUser()
    user = result.data.user
  } catch {
    // If Supabase is temporarily unreachable, continue safely on public routes.
    user = null
  }

  const pathname = request.nextUrl.pathname
  const isAuthPage =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password' ||
    pathname.startsWith('/login/') ||
    pathname.startsWith('/register/')
  const isPublicRoute = isAuthPage || pathname === '/' || pathname === '/faculty' || pathname === '/academic'
  const forceSwitch = request.nextUrl.searchParams.get("switch") === "1"

  // Redirect unauthenticated users away from protected pages
  if (!user && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const getPortalPath = (role: string, deptName?: string) => {
    const normalizedDept = deptName?.toLowerCase().trim()
    switch (role) {
      case 'admin': return '/admin';
      case 'department':
        if (normalizedDept === 'transport') return '/transport'
        if (normalizedDept === 'library') return '/library'
        if (normalizedDept === 'hostel') return '/hostel'
        if (normalizedDept === 'finance') return '/finance'
        return `/dept/${departmentPortalPathSlug(deptName)}`;
      case 'transport': return '/transport';
      case 'library': return '/library';
      case 'hostel': return '/hostel';
      case 'finance': return '/finance';
      default: return '/dashboard';
    }
  }

  // Redirect already-authenticated users away from auth pages
  if (user && isAuthPage && !forceSwitch) {
    const { data: profile } = await supabase.from('profiles').select('role, department_name').eq('id', user.id).single()
    if (!profile) return supabaseResponse
    return NextResponse.redirect(new URL(getPortalPath(profile.role, profile.department_name), request.url))
  }

  // Enforce strict portal authorization boundaries and approval check
  if (user && !isPublicRoute && pathname !== '/settings') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, department_name, is_approved, email')
      .eq('id', user.id)
      .single()

    if (profile) {
      // Master Admin Bypass
      const isMasterAdmin = profile.email === 'admin@university.com'
      const isApproved = profile.is_approved || isMasterAdmin
      const pRole = profile.role
      const deptSlug = departmentPortalPathSlug(profile.department_name)
      const correctPath = getPortalPath(pRole, profile.department_name)

      // 1. Check Approval for staff/admin roles
      if (pRole !== 'student' && !isApproved) {
        // If not approved, kick them back to login or a pending page
        // For simplicity, we redirect to login with a query param
        const redirectUrl = new URL('/login', request.url)
        redirectUrl.searchParams.set('error', 'Your account is pending administrative approval.')
        return NextResponse.redirect(redirectUrl)
      }

      // 2. Check Role-Path consistency
      let isAllowed = false
      if (pRole === 'admin' && pathname.startsWith('/admin')) isAllowed = true
      else if (pRole === 'student' && (pathname.startsWith('/dashboard') || pathname.startsWith('/form') || pathname.startsWith('/uni-form') || pathname.startsWith('/notifications'))) isAllowed = true
      else if (pRole === 'transport' && (pathname.startsWith('/transport') || pathname.startsWith('/history'))) isAllowed = true
      else if (pRole === 'library' && (pathname.startsWith('/library') || pathname.startsWith('/history'))) isAllowed = true
      else if (pRole === 'hostel' && (pathname.startsWith('/hostel') || pathname.startsWith('/history'))) isAllowed = true
      else if (pRole === 'finance' && (pathname.startsWith('/finance') || pathname.startsWith('/history'))) isAllowed = true
      else if (pRole === 'department' && pathname.startsWith('/history')) isAllowed = true
      else if (pRole === 'department' && deptSlug && pathname === `/dept/${deptSlug}`) isAllowed = true

      if (!isAllowed) {
        return NextResponse.redirect(new URL(correctPath, request.url))
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
