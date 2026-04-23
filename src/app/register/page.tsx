'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const [type, setType] = useState('student')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    registration_no: '',
    department: 'CS',
    role: 'academic' // for staff
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const userType = type === 'student' ? 'student' : formData.role

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            role: userType,
            registration_no: type === 'student' ? formData.registration_no : null,
            department: type === 'student' ? formData.department : null
          }
        }
      })

      if (signUpError) throw signUpError

      if (type === 'student') {
        setSuccess("Registration successful! Redirecting to dashboard...")
        setTimeout(() => router.push('/dashboard'), 2000)
      } else {
        setSuccess("Registration submitted! An admin must approve your account before you can log in.")
        // Sign out immediately because they shouldn't have access yet
        await supabase.auth.signOut()
        setTimeout(() => router.push('/login'), 3000)
      }
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
          <h2 className="text-3xl font-black text-center text-slate-800 mb-2">Create Account</h2>
          <p className="text-center text-slate-500 mb-8 font-medium">Join the University Clearance System</p>

          <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
            <button 
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${type === 'student' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
              onClick={() => setType('student')}
            >
              Student
            </button>
            <button 
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${type === 'staff' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
              onClick={() => setType('staff')}
            >
              Staff
            </button>
          </div>

          {error && <div className="p-3 mb-4 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">{error}</div>}
          {success && <div className="p-3 mb-4 text-sm text-green-600 bg-green-50 rounded-lg border border-green-200">{success}</div>}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Full Name</label>
              <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="John Doe" />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Email Address</label>
              <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="name@university.edu" />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Password</label>
              <input type="password" required minLength={6} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="••••••••" />
            </div>

            {type === 'student' ? (
              <>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Registration Number</label>
                  <input type="text" required value={formData.registration_no} onChange={e => setFormData({...formData, registration_no: e.target.value})} className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="FA23-BSE-039" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Department</label>
                  <select required value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all">
                    <option value="CS">Computer Science</option>
                    <option value="SE">Software Engineering</option>
                    <option value="IT">Information Technology</option>
                    <option value="EE">Electrical Engineering</option>
                    <option value="BBA">Business Administration</option>
                  </select>
                </div>
              </>
            ) : (
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Staff Role</label>
                <select required value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all">
                  <option value="academic">Academic Department</option>
                  <option value="library">Librarian</option>
                  <option value="transport">Transport Officer</option>
                  <option value="finance">Finance Officer</option>
                  <option value="hostel">Hostel Manager</option>
                </select>
              </div>
            )}

            <button type="submit" disabled={loading} className="w-full mt-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50">
              {loading ? 'Processing...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center mt-6 text-sm text-slate-500 font-medium">
            Already have an account? <Link href="/login" className="text-blue-600 font-bold hover:underline">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
