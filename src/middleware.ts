import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isAuthPage = pathname === '/login' || pathname === '/register' || pathname.startsWith('/login/') || pathname.startsWith('/register/')
  const isPublicRoute = isAuthPage || pathname === '/'

  if (!user && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const getPortalPath = (role: string) => {
    switch (role) {
      case 'admin': return '/admin';
      case 'academic': return '/academic';
      case 'library': return '/library';
      case 'transport': return '/transport';
      case 'finance': return '/finance';
      case 'hostel': return '/hostel';
      case 'student': return '/dashboard';
      default: return '/login';
    }
  }

  if (user && isAuthPage) {
    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (!profile) return supabaseResponse
    return NextResponse.redirect(new URL(getPortalPath(profile.role), request.url))
  }

  if (user && !isPublicRoute && pathname !== '/settings') {
    const { data: profile } = await supabase
      .from('users')
      .select('role, approved, email')
      .eq('id', user.id)
      .single()

    if (profile) {
      const isMasterAdmin = profile.email === 'admin@university.com'
      const isApproved = profile.approved || isMasterAdmin
      const pRole = profile.role
      const correctPath = getPortalPath(pRole)

      if (pRole !== 'student' && !isApproved) {
        const redirectUrl = new URL('/login', request.url)
        redirectUrl.searchParams.set('error', 'Your account is pending administrative approval.')
        return NextResponse.redirect(redirectUrl)
      }

      let isAllowed = false
      if (pRole === 'admin' && pathname.startsWith('/admin')) isAllowed = true
      else if (pRole === 'student' && (pathname.startsWith('/dashboard') || pathname.startsWith('/notifications'))) isAllowed = true
      else if (['academic', 'library', 'transport', 'finance', 'hostel'].includes(pRole) && pathname.startsWith(`/${pRole}`)) isAllowed = true

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
