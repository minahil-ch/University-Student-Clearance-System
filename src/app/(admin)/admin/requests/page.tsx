"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Sidebar } from "@/components/layout/Sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { motion, AnimatePresence } from "framer-motion"
import { 
  UserCheck, 
  UserX, 
  Clock, 
  ShieldCheck,
  Mail,
  Phone,
  Building2,
  Search,
  CheckCircle2
} from "lucide-react"
import { toast } from "sonner"
import { Input } from "@/components/ui/Input"
import { formatDate } from "@/lib/utils"

export default function AdminRequests() {
  const [allStaff, setAllStaff] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState<'pending' | 'working'>('pending')
  const [manualStaff, setManualStaff] = useState({
    fullName: "",
    email: "",
    password: "",
    departmentName: "finance",
  })
  
  const supabase = createClient()

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .neq('role', 'student') // Only staff requests
      .neq('role', 'admin') // Exclude current root
      .order('created_at', { ascending: false })

    if (error) {
      toast.error("Failed to fetch organizational data")
    } else {
      setAllStaff(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchRequests()

    // Real-time subscription
    const channel = supabase
      .channel('requests-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchRequests()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleToggleApproval = async (id: string, name: string, approve: boolean) => {
    // 1. Optimistic UI update
    setAllStaff(prev => prev.map(s => s.id === id ? { ...s, is_approved: approve } : s))
    
    // 2. Database persistent update
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ is_approved: approve })
      .eq('id', id)
      .select()

    if (updateError) {
      console.error("Update failed:", updateError)
      toast.error(`Persistence failure for ${name}. Reverting...`)
      fetchRequests() // Hard revert from DB
      return
    }

    // 3. Log the administrative action
    const { data: { user } } = await supabase.auth.getUser()
    const { error: logError } = await supabase.from('audit_logs').insert({
      actor_id: user?.id,
      action: approve ? 'staff_approved' : 'staff_revoked',
      details: { 
        staff_name: name, 
        staff_id: id,
        timestamp: new Date().toISOString()
      }
    })

    if (logError) console.warn("Audit log fail:", logError)
    
    toast.success(`${name} is now ${approve ? 'Authorized' : 'De-authorized'}`)
    
    // 4. Force a hard re-fetch after a slight delay to ensure read-after-write consistency
    setTimeout(() => fetchRequests(), 500)
  }

  const handleManualCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const derivedRole =
      manualStaff.departmentName === "library" || manualStaff.departmentName === "transport"
        ? manualStaff.departmentName
        : "department"

    const response = await fetch("/api/admin/create-staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...manualStaff, role: derivedRole }),
    })
    const result = await response.json()
    if (!response.ok) {
      toast.error(result.error || "Failed to create staff")
      return
    }
    toast.success("Staff account created and approved.")
    setManualStaff({ fullName: "", email: "", password: "", departmentName: "finance" })
    fetchRequests()
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  )

  const pendingRequests = allStaff.filter(s => !s.is_approved)
  const workingStaff = allStaff.filter(s => s.is_approved)
  
  const activeList = activeTab === 'pending' ? pendingRequests : workingStaff
  const filteredList = activeList.filter(r => 
    r.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar role="admin" />
      
      <main className="flex-1 w-full lg:max-w-[calc(100%-16rem)] lg:ml-64 p-8 xl:p-12">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter flex items-center gap-4">
              System <span className="text-primary italic">Admins</span>
              <ShieldCheck className="w-10 h-10 text-primary" />
            </h2>
            <p className="text-muted-foreground mt-3 text-lg font-medium max-w-xl leading-relaxed">
              Manage organizational verified identities, access control, and active clearance representatives.
            </p>
          </motion.div>
          <div className="relative">
             <Search className="absolute left-4 top-4 w-5 h-5 text-muted-foreground" />
             <Input 
              placeholder={`Search ${activeTab === 'working' ? 'admins' : 'pending'}...`} 
              className="pl-12 w-full md:w-80 h-14 rounded-2xl glass-card border-none shadow-xl text-md font-medium" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </header>

        {/* Dynamic Navigation Tabs */}
        <div className="flex items-center gap-4 mb-10 bg-slate-200/50 dark:bg-slate-800/50 p-2 rounded-[1.5rem] w-fit shadow-inner">
          <button 
            onClick={() => setActiveTab('pending')}
            className={`px-8 py-3.5 rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 ${activeTab === 'pending' ? 'bg-white dark:bg-slate-900 shadow-xl text-rose-500 scale-105' : 'text-slate-500 hover:text-slate-700 hover:scale-105'}`}
          >
            Pending Approvals {pendingRequests.length > 0 && <span className="bg-rose-500 text-white px-2 py-0.5 rounded-full text-[10px] ml-1">{pendingRequests.length}</span>}
          </button>
          <button 
            onClick={() => setActiveTab('working')}
            className={`px-8 py-3.5 rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 ${activeTab === 'working' ? 'bg-white dark:bg-slate-900 shadow-xl text-emerald-500 scale-105' : 'text-slate-500 hover:text-slate-700 hover:scale-105'}`}
          >
            System Admins {workingStaff.length > 0 && <span className="bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full text-[10px] ml-1">{workingStaff.length}</span>}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <Card className="glass-card border-none shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg font-black">Manual Staff Creation</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleManualCreate} className="grid md:grid-cols-5 gap-3">
                <Input placeholder="Name" value={manualStaff.fullName} onChange={(e) => setManualStaff((p) => ({ ...p, fullName: e.target.value }))} required />
                <Input type="email" placeholder="Email" value={manualStaff.email} onChange={(e) => setManualStaff((p) => ({ ...p, email: e.target.value }))} required />
                <Input type="password" placeholder="Password" value={manualStaff.password} onChange={(e) => setManualStaff((p) => ({ ...p, password: e.target.value }))} required />
                <select className="h-10 rounded-md border px-3 bg-background" value={manualStaff.departmentName} onChange={(e) => setManualStaff((p) => ({ ...p, departmentName: e.target.value }))}>
                  <option value="library">Library</option>
                  <option value="transport">Transport</option>
                  <option value="finance">Finance</option>
                  <option value="hostel">Hostel</option>
                  <option value="academic-computer-science">Academic (CS)</option>
                  <option value="academic-software-engineering">Academic (SE)</option>
                </select>
                <Button type="submit">Add Staff</Button>
              </form>
            </CardContent>
          </Card>

          <AnimatePresence mode="popLayout" initial={false}>
            {filteredList.length > 0 ? (
              filteredList.map((req, i) => (
                <motion.div
                  key={req.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -20 }}
                  transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
                >
                  <Card className="glass-card group overflow-hidden border-none shadow-xl hover:shadow-2xl transition-all duration-300">
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 absolute top-0 left-0">
                       <div className={`h-full w-1/4 group-hover:w-full transition-all duration-1000 ${activeTab === 'working' ? 'bg-emerald-500' : 'bg-primary'}`}></div>
                    </div>
                    <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-8">
                       <div className="flex items-center gap-6">
                          <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center shadow-inner ${activeTab === 'working' ? 'bg-emerald-500/10' : 'bg-slate-100 dark:bg-slate-800'}`}>
                             {activeTab === 'working' ? <UserCheck className="w-10 h-10 text-emerald-500" /> : <Clock className="w-10 h-10 text-primary" />}
                          </div>
                          <div>
                             <h3 className="text-2xl font-black uppercase tracking-tight">{req.full_name}</h3>
                             <div className="flex flex-wrap items-center gap-4 mt-3">
                                <span className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-full">
                                   <Mail className="w-3.5 h-3.5 text-primary" /> {req.email}
                                </span>
                                <span className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-full">
                                   <Building2 className="w-3.5 h-3.5 text-primary" /> {req.department_name || req.role}
                                </span>
                             </div>
                          </div>
                       </div>

                       <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto mt-6 md:mt-0">
                          {activeTab === 'pending' ? (
                            <>
                              <Button 
                                onClick={() => handleToggleApproval(req.id, req.full_name, false)} // Just a soft toggle or delete
                                variant="ghost" 
                                className="w-full md:w-auto h-14 px-8 rounded-2xl font-black uppercase text-xs tracking-widest text-rose-500 hover:bg-rose-500/10 gap-3"
                              >
                                <UserX className="w-5 h-5" /> Deny
                              </Button>
                              <Button 
                                onClick={() => handleToggleApproval(req.id, req.full_name, true)}
                                className="w-full md:w-auto h-14 px-10 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-primary/20 gap-3 active:scale-95 transition-all"
                              >
                                <CheckCircle2 className="w-5 h-5" /> Approve Access
                              </Button>
                            </>
                          ) : (
                             <Button 
                                onClick={() => handleToggleApproval(req.id, req.full_name, false)}
                                variant="outline"
                                className="w-full md:w-auto h-14 px-8 rounded-2xl font-black uppercase text-xs tracking-widest text-rose-500 border-rose-500/20 hover:bg-rose-500 hover:text-white gap-3 shadow-xl shadow-rose-500/10 transition-all"
                              >
                                <UserX className="w-5 h-5" /> Revoke Access
                              </Button>
                          )}
                       </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-24 text-center flex flex-col items-center gap-6 glass-card rounded-[3rem] border-none shadow-sm"
              >
                 <div className={`w-24 h-24 rounded-[2.5rem] flex items-center justify-center shadow-inner ${activeTab === 'working' ? 'bg-primary/10' : 'bg-emerald-500/10'}`}>
                    <ShieldCheck className={`w-12 h-12 ${activeTab === 'working' ? 'text-primary' : 'text-emerald-500'}`} />
                 </div>
                 <div>
                    <h3 className="text-3xl font-black uppercase tracking-tight">{activeTab === 'working' ? 'No Registered Admins' : 'No Pending Requests'}</h3>
                    <p className="text-muted-foreground text-lg font-medium mt-2 max-w-sm mx-auto leading-relaxed">
                      {activeTab === 'working' ? 'There are currently no approved system administrators for this portal.' : 'All staff registrations have been definitively evaluated.'}
                    </p>
                 </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
