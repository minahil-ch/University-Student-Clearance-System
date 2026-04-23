'use client'

import { useState, Suspense } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const authError = searchParams.get('error')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) throw signInError

      const { data: user } = await supabase.from('users').select('role, approved').eq('id', data.user.id).single()
      
      if (!user) throw new Error("User profile not found")

      if (user.role !== 'student' && !user.approved && email !== 'admin@university.com') {
        await supabase.auth.signOut()
        throw new Error("Your account is pending administrative approval.")
      }

      router.push('/') // Middleware will handle redirect to correct portal
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden ring-1 ring-slate-200">
        <div className="p-8">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6 transform rotate-3">
            <svg className="w-8 h-8 text-blue-600 -rotate-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
          </div>
          <h2 className="text-3xl font-black text-center text-slate-800 mb-2">Welcome Back</h2>
          <p className="text-center text-slate-500 mb-8 font-medium">Enter your credentials to access your portal</p>

          {(error || authError) && (
            <div className="p-3 mb-6 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
              {error || authError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Email Address</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="user@university.edu" />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Password</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="••••••••" />
            </div>

            <button type="submit" disabled={loading} className="w-full mt-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50">
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center mt-8 text-sm text-slate-500 font-medium">
            Don't have an account? <Link href="/register" className="text-blue-600 font-bold hover:underline">Register here</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <LoginForm />
    </Suspense>
  )
}
