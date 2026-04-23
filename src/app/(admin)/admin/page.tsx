'use client'

import { useEffect, useState } from "react"
import { createBrowserClient } from '@supabase/ssr'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, XCircle, UserPlus, Users, Activity } from "lucide-react"

export default function AdminDashboard() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newStaff, setNewStaff] = useState({ name: '', email: '', role: 'academic' })

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    fetchUsers()

    const channel = supabase
      .channel('admin_users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        fetchUsers()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false })
      if (error) throw error
      setUsers(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id: string, approved: boolean) => {
    try {
      const { error } = await supabase.from('users').update({ approved }).eq('id', id)
      if (error) throw error
      fetchUsers()
    } catch (err: any) {
      alert("Error: " + err.message)
    }
  }

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    // In a real application, you'd use a server function or Supabase Admin API to create the auth user
    // For this demonstration, we'll try to insert a placeholder or call an API route.
    // However, since we can't create an auth user securely from client without a signup,
    // we'll instruct the admin to use standard registration, and then approve them here.
    alert("To add staff manually, please have them register on the Staff Registration page, then approve their account here. Direct manual creation requires Supabase Admin Service Key which is implemented via a secure backend route.")
  }

  if (loading) return <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>

  const pendingStaff = users.filter(u => !u.approved && u.role !== 'student')
  const activeUsers = users.filter(u => u.approved)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <header className="mb-8">
        <h1 className="text-4xl font-black text-slate-800 flex items-center gap-3">
          <Activity className="text-blue-500 w-10 h-10" /> Admin Command Center
        </h1>
        <p className="text-slate-500 font-medium mt-2">Manage university personnel and oversee platform security.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* PENDING APPROVALS */}
        <Card className="lg:col-span-2 shadow-xl border-none ring-1 ring-slate-200">
          <CardHeader className="bg-slate-50/50 border-b">
            <CardTitle className="text-xl flex items-center gap-2">
              <Users className="text-orange-500" /> Pending Staff Approvals ({pendingStaff.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {pendingStaff.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No pending staff approvals.</div>
              ) : (
                pendingStaff.map(staff => (
                  <div key={staff.id} className="p-6 flex flex-col sm:flex-row justify-between items-center hover:bg-slate-50 transition-colors">
                    <div>
                      <h3 className="font-bold text-lg text-slate-800">{staff.name}</h3>
                      <p className="text-slate-500">{staff.email}</p>
                      <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold uppercase rounded-full mt-2 tracking-widest">
                        {staff.role}
                      </span>
                    </div>
                    <div className="flex gap-3 mt-4 sm:mt-0">
                      <button onClick={() => handleApprove(staff.id, true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors shadow-sm focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2">
                        <CheckCircle className="w-4 h-4" /> Approve
                      </button>
                      <button onClick={() => handleApprove(staff.id, false)} className="flex items-center gap-2 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-medium transition-colors shadow-sm focus:ring-2 focus:ring-rose-500 focus:ring-offset-2">
                        <XCircle className="w-4 h-4" /> Reject
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* ADD STAFF MANUAL */}
        <Card className="shadow-xl border-none ring-1 ring-slate-200 h-fit">
          <CardHeader className="bg-slate-50/50 border-b">
            <CardTitle className="text-xl flex items-center gap-2">
              <UserPlus className="text-blue-500" /> Quick Add Staff
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleCreateStaff} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Full Name</label>
                <input type="text" className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Jane Doe" required />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Email Address</label>
                <input type="email" className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="jane@university.edu" required />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Role</label>
                <select className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="academic">Academic</option>
                  <option value="library">Library</option>
                  <option value="transport">Transport</option>
                  <option value="finance">Finance</option>
                  <option value="hostel">Hostel</option>
                </select>
              </div>
              <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors shadow-lg shadow-blue-500/30">
                Send Invitation
              </button>
            </form>
          </CardContent>
        </Card>

      </div>

      {/* ALL USERS LIST */}
      <Card className="shadow-xl border-none ring-1 ring-slate-200 mt-12">
        <CardHeader className="bg-slate-50/50 border-b">
          <CardTitle className="text-xl">System Users Overview</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-100 text-slate-500 uppercase text-xs font-black tracking-widest">
                  <th className="p-4">Name</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeUsers.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="p-4 font-bold text-slate-800">{user.name}</td>
                    <td className="p-4 text-slate-600">{user.email}</td>
                    <td className="p-4">
                      <span className="px-3 py-1 bg-slate-200 text-slate-700 rounded-full text-xs font-bold uppercase tracking-widest">{user.role}</span>
                    </td>
                    <td className="p-4">
                      <span className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-widest">
                        <CheckCircle className="w-4 h-4" /> Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
