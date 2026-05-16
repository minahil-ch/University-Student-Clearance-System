"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Sidebar } from "@/components/layout/Sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Users, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Download, 
  MoreVertical,
  History,
  ArrowUpRight,
  ShieldCheck,
  Search,
  Check,
  X,
  UserPlus,
  GraduationCap,
  BarChart as BarChartIcon
} from "lucide-react"
import { NotificationBell } from "@/components/NotificationBell"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from 'recharts'
import { toast } from "sonner"
import { Input } from "@/components/ui/Input"
import { formatDate } from "@/lib/utils"
import { Logo } from "@/components/ui/Logo"

export default function AdminDashboardContent() {
  const [stats, setStats] = useState<any>({
    totalStudents: 0,
    cleared: 0,
    pending: 0,
    issues: 0
  })
  const [departmentStats, setDepartmentStats] = useState<any[]>([])
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [requests, setRequests] = useState<any[]>([])
  const [allFutureData, setAllFutureData] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState('dashboard')
  
  const [allStudents, setAllStudents] = useState<any[]>([])
  const [fullyApprovedStudents, setFullyApprovedStudents] = useState<string[]>([])
  const [showOnlyApproved, setShowOnlyApproved] = useState(false)
  const [isAddingStaff, setIsAddingStaff] = useState(false)
  const [newStaff, setNewStaff] = useState({ fullName: '', email: '', password: '', role: 'department', departmentName: 'Computer Science' })
  const [mounted, setMounted] = useState(false)

  const academicDepartments = [
    "Computer Science",
    "Software Engineering",
    "Mathematics",
    "Humanities",
    "Environmental Sciences",
  ]
  const staffDepartments = [...academicDepartments, "transport", "library", "hostel", "finance"]

  const supabase = createClient()

  async function fetchData() {
    setLoading(true)
    
    // 1. Get overall student stats
    const { data: students } = await supabase
      .from('profiles')
      .select('id, is_approved, role, full_name, reg_no, email, cgpa, department_name')
      .eq('role', 'student')

    if (students) {
      setStats((prev: any) => ({ ...prev, totalStudents: students.length }))
      setAllStudents(students)
    }

    // 2. Get departmental clearance stats
    const { data: clearance } = await supabase
      .from('clearance_status')
      .select('*')

    if (clearance) {
      const departments = [...new Set(clearance.map(c => c.department_key))]
      const deptStats = departments.map(dept => {
        const deptClearances = clearance.filter(c => c.department_key === dept)
        const clearedCount = deptClearances.filter(c => c.status === 'cleared').length
        return {
          name: dept,
          cleared: clearedCount,
          total: deptClearances.length,
          percentage: (clearedCount / (deptClearances.length || 1)) * 100
        }
      })
      setDepartmentStats(deptStats)
      
      setStats((prev: any) => ({ 
        ...prev, 
        cleared: clearance.filter(c => c.status === 'cleared').length,
        pending: clearance.filter(c => c.status === 'pending').length,
        issues: clearance.filter(c => c.status === 'issue').length
      }))

      const studentGroups = clearance.reduce((acc: any, curr) => {
        if (!acc[curr.student_id]) acc[curr.student_id] = []
        acc[curr.student_id].push(curr.status)
        return acc
      }, {})

      const fullyCleared = Object.keys(studentGroups).filter(sid => 
        studentGroups[sid].length >= 5 && studentGroups[sid].every((status: string) => status === 'cleared')
      )
      setFullyApprovedStudents(fullyCleared)
    }

    // 3. Get audit logs
    const { data: logs } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (logs) setAuditLogs(logs)

    // 4. Get pending staff requests
    const { data: staffReqs } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_approved', false)
      .neq('role', 'student')
    
    if (staffReqs) setRequests(staffReqs)

    // 5. Get Alumni Data
    const { data: future } = await supabase
      .from('future_data')
      .select(`*, student:profiles!future_data_student_id_fkey(full_name, reg_no, email, department_name)`)
    
    if (future) setAllFutureData(future)

    setLoading(false)
  }

  useEffect(() => {
    setMounted(true)
    fetchData()

    const channel = supabase
      .channel('admin-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clearance_status' }, () => fetchData())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleExportCSV = () => {
    let headers: string[] = []
    let rows: string[][] = []
    let filename = `export_${new Date().toISOString().split('T')[0]}.csv`

    if (activeTab === 'dashboard') {
      headers = ["Department", "Cleared", "Total Count", "Percentage"]
      rows = departmentStats.map(d => [d.name, d.cleared.toString(), d.total.toString(), `${d.percentage.toFixed(1)}%`])
    } else if (activeTab === 'students') {
      headers = ["Student Name", "Reg No", "Status"]
      rows = allStudents.map(s => [s.full_name, s.reg_no, fullyApprovedStudents.includes(s.id) ? "Fully Cleared" : "In Progress"])
    }

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n")

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleApproveStaff = async (id: string) => {
    const { error } = await supabase.from('profiles').update({ is_approved: true }).eq('id', id)
    if (error) toast.error(error.message)
    else {
      toast.success("Staff approved successfully")
      setRequests(requests.filter(r => r.id !== id))
    }
  }

  const handleRejectStaff = async (id: string) => {
    const { error } = await supabase.from('profiles').delete().eq('id', id)
    if (error) toast.error(error.message)
    else {
      toast.success("Staff request rejected")
      setRequests(requests.filter(r => r.id !== id))
    }
  }

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/admin/create-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: newStaff.fullName,
          email: newStaff.email,
          password: newStaff.password,
          role: newStaff.role,
          departmentName: newStaff.role === 'department' ? newStaff.departmentName : newStaff.role
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add staff')
      toast.success('Staff added successfully')
      setNewStaff({ fullName: '', email: '', password: '', role: 'department', departmentName: 'Computer Science' })
      setIsAddingStaff(false)
      fetchData()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const pieData = [
    { name: 'Cleared', value: stats.cleared || 0, color: '#10b981' },
    { name: 'Pending', value: stats.pending || 0, color: '#f59e0b' },
    { name: 'Issues', value: stats.issues || 0, color: '#f43f5e' },
  ]

  if (loading && !stats.totalStudents) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-sky-50/50 dark:bg-slate-950 gap-6">
      <div className="relative">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8">
          <Logo className="w-8 h-8" />
        </div>
      </div>
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-400 animate-pulse">Initializing Command Center...</p>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-sky-50/50 dark:bg-slate-950">
      <Sidebar role="admin" />
      
      <main className="flex-1 w-full lg:ml-64 p-4 md:p-6 xl:p-8">
        <header className="flex flex-col md:flex-row justify-between items-center gap-10 mb-14 relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
            <div className="p-1 bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-white/5">
              <Logo className="w-20 h-20 md:w-24 md:h-24" />
            </div>
            <div>
              <div className="flex items-center gap-3 justify-center md:justify-start">
                <h2 className="text-4xl font-bold tracking-tight uppercase text-slate-900 dark:text-white leading-none">
                  COMSATS <span className="text-primary italic">UNIVERSITY</span>
                </h2>
                <div className="hidden md:block w-1 h-10 bg-slate-200 dark:bg-white/10 rounded-full" />
                <div className="hidden md:flex flex-col">
                  <span className="text-xs font-bold uppercase tracking-[0.4em] text-slate-400 leading-none mb-1">Official Master Control</span>
                  <span className="text-xs font-bold tracking-tight text-primary italic">Institutional Oversight</span>
                </div>
              </div>
              <h3 className="mt-4 text-xl font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400 flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-primary" /> Command Center Hub
              </h3>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
             <div className="relative w-full md:w-80 group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-all duration-300" />
              <Input
                placeholder="Global System Search..."
                className="pl-14 h-16 rounded-3xl bg-white dark:bg-slate-900 border-slate-100 dark:border-white/5 shadow-sm focus:shadow-2xl focus:border-primary/30 transition-all text-sm font-bold"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <NotificationBell />
            <Button 
              onClick={handleExportCSV} 
              className="h-16 px-8 rounded-3xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xl shadow-slate-900/20 font-bold uppercase text-xs tracking-widest gap-3 transition-all active:scale-95"
            >
              <Download className="w-5 h-5" /> Export Data
            </Button>
          </div>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-8 mb-10 bg-white/40 dark:bg-slate-900/40 p-6 rounded-[3rem] border border-slate-100 dark:border-white/5 backdrop-blur-xl shadow-xl relative z-10">
          <div className="flex flex-wrap gap-3 p-1.5 bg-slate-200/30 dark:bg-slate-800/30 rounded-[2rem]">
            {(['dashboard', 'students', 'staff_requests', 'alumni'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-10 py-4 rounded-[1.5rem] text-[11px] font-bold uppercase tracking-[0.1em] transition-all duration-500 flex items-center gap-3 ${
                  activeTab === tab 
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xl shadow-slate-900/30' 
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab === 'dashboard' && <BarChartIcon className="w-4 h-4" />}
                {tab === 'students' && <Users className="w-4 h-4" />}
                {tab === 'staff_requests' && <ShieldCheck className="w-4 h-4" />}
                {tab === 'alumni' && <GraduationCap className="w-4 h-4" />}
                {tab.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'dashboard' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-10">
              {[
                { label: "Total Students", value: stats.totalStudents, icon: Users, color: "indigo", delay: 0.1 },
                { label: "Staff Requests", value: requests.length, icon: ShieldCheck, color: "emerald", delay: 0.2 },
                { label: "Overall Cleared", value: stats.cleared, icon: CheckCircle, color: "blue", delay: 0.3 },
                { label: "Pending Verification", value: stats.pending, icon: Clock, color: "amber", delay: 0.4 },
                { label: "Flagged Issues", value: stats.issues, icon: AlertCircle, color: "rose", delay: 0.5 },
              ].map((item, i) => (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: item.delay }}
                  className="group relative p-8 rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-2xl hover:scale-[1.05] transition-all duration-500 overflow-hidden"
                >
                   <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700" />
                   <div className="flex flex-col gap-6">
                      <div className={`w-14 h-14 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20 group-hover:rotate-12 transition-transform`}>
                         <item.icon className="w-7 h-7" />
                      </div>
                      <div>
                         <p className="text-xs font-bold tracking-wider text-slate-400 mb-1 leading-none">{item.label}</p>
                         <h4 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight italic leading-none">{item.value}</h4>
                      </div>
                   </div>
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
              <Card className="lg:col-span-1 glass-card border-none shadow-xl">
                <CardHeader>
                  <CardTitle className="text-xl font-bold">Clearance Status</CardTitle>
                </CardHeader>
                <CardContent className="h-[350px] flex flex-col items-center justify-center">
                  {mounted && (
                    <ResponsiveContainer width="100%" height="90%">
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={8} dataKey="value">
                          {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />)}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                  <div className="flex flex-wrap justify-center gap-6 text-xs font-bold font-medium text-muted-foreground mt-4">
                    {pieData.map(item => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                        <span>{item.name}: {item.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2 glass-card border-none shadow-xl">
                <CardHeader>
                  <CardTitle className="text-xl font-bold">Department Efficiency</CardTitle>
                </CardHeader>
                <CardContent className="h-[350px]">
                  {mounted && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={departmentStats}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                        <XAxis dataKey="name" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} dy={10} />
                        <YAxis fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
                        <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                        <Bar dataKey="cleared" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} barSize={45} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
            
            <Card className="glass-card border-none shadow-xl overflow-hidden">
              <CardHeader className="border-b bg-sky-50/50/50 dark:bg-slate-900/50 px-8 py-6">
                <CardTitle className="flex items-center gap-3 text-2xl font-bold"><History className="w-6 h-6 text-primary" /> System Audit Trail</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-100/50 dark:bg-slate-800/50 text-xs font-bold font-medium text-muted-foreground text-muted-foreground border-b">
                        <th className="px-8 py-4">Action</th><th className="px-8 py-4">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-primary/[0.02] transition-colors">
                          <td className="px-8 py-5">
                             <div className="font-bold uppercase text-[11px] tracking-tight">{log.action.replace(/_/g, ' ')}</div>
                             <p className="text-xs text-slate-400 mt-1">{log.details || 'No additional details'}</p>
                          </td>
                          <td className="px-8 py-5 text-sm text-muted-foreground">{formatDate(log.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeTab === 'students' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="glass-card border-none shadow-2xl overflow-hidden rounded-[2rem]">
              <CardHeader className="bg-slate-900 p-8 text-white flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-3xl font-bold tracking-tight flex items-center gap-4">
                    <Users className="w-8 h-8" /> Students Master List
                  </CardTitle>
                </div>
                <Button 
                  onClick={() => setShowOnlyApproved(!showOnlyApproved)} 
                  variant="outline" 
                  className="bg-white/10 text-white border-white/20 hover:bg-white/20"
                >
                  {showOnlyApproved ? "Showing: Fully Approved" : "Showing: All Registered"}
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-100/50 dark:bg-slate-800/50 text-xs font-bold font-medium text-muted-foreground text-muted-foreground border-b">
                        <th className="px-8 py-5">Student</th>
                        <th className="px-8 py-5">Reg No</th>
                        <th className="px-8 py-5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(showOnlyApproved ? allStudents.filter(s => fullyApprovedStudents.includes(s.id)) : allStudents)
                        .filter(s => s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || s.reg_no?.toLowerCase().includes(searchTerm.toLowerCase()))
                        .map(student => {
                          const isFullyApproved = fullyApprovedStudents.includes(student.id);
                          return (
                            <tr key={student.id} className="hover:bg-sky-50/50 dark:hover:bg-slate-900/50">
                              <td className="px-8 py-5">
                                <div className="font-bold">{student.full_name}</div>
                                <div className="text-xs text-muted-foreground">{student.email}</div>
                              </td>
                              <td className="px-8 py-5">
                                <div className="font-bold text-primary font-mono">{student.reg_no}</div>
                              </td>
                              <td className="px-8 py-5">
                                {isFullyApproved ? (
                                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 flex items-center gap-1 w-fit"><CheckCircle className="w-3 h-3"/> Fully Approved</span>
                                ) : (
                                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-500 flex items-center gap-1 w-fit"><Clock className="w-3 h-3"/> In Progress</span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeTab === 'staff_requests' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-bold tracking-tight">Staff Authorization Hub</h3>
              <Button onClick={() => setIsAddingStaff(!isAddingStaff)} className="rounded-xl gap-2 shadow-xl shadow-primary/20"><UserPlus className="w-4 h-4" /> Register New Staff</Button>
            </div>

            {isAddingStaff && (
              <Card className="glass-card shadow-2xl border-none">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-primary">New Staff Account</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddStaff} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input placeholder="Full Name" value={newStaff.fullName} onChange={e => setNewStaff({...newStaff, fullName: e.target.value})} required className="h-12 rounded-xl" />
                    <Input type="email" placeholder="Email" value={newStaff.email} onChange={e => setNewStaff({...newStaff, email: e.target.value})} required className="h-12 rounded-xl" />
                    <Input type="password" placeholder="Password" value={newStaff.password} onChange={e => setNewStaff({...newStaff, password: e.target.value})} required className="h-12 rounded-xl" />
                    <select className="h-12 rounded-xl border bg-background px-4" value={newStaff.role} onChange={e => setNewStaff({...newStaff, role: e.target.value})}>
                      <option value="department">Academic Department</option>
                      <option value="library">Library</option>
                      <option value="transport">Transport</option>
                      <option value="hostel">Hostel</option>
                      <option value="finance">Finance</option>
                    </select>
                    {newStaff.role === 'department' && (
                      <select className="h-12 rounded-xl border bg-background px-4" value={newStaff.departmentName} onChange={e => setNewStaff({...newStaff, departmentName: e.target.value})}>
                        {staffDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    )}
                    <div className="md:col-span-2 flex justify-end">
                      <Button type="submit" disabled={loading} className="px-8 rounded-xl h-14 bg-primary text-white font-bold font-medium text-muted-foreground text-xs">{loading ? 'Processing...' : 'Create Account'}</Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            <Card className="glass-card border-none shadow-2xl overflow-hidden rounded-[2rem]">
              <CardHeader className="bg-amber-500 p-8 text-white">
                <CardTitle className="text-2xl font-bold tracking-tight flex items-center gap-4">
                  <Clock className="w-6 h-6" /> Pending Approvals
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-100/50 dark:bg-slate-800/50 text-xs font-bold font-medium text-muted-foreground text-muted-foreground border-b">
                        <th className="px-8 py-5">Applicant</th>
                        <th className="px-8 py-5">Target Role</th>
                        <th className="px-8 py-5 text-right">Decision</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {requests.map(req => (
                        <tr key={req.id} className="hover:bg-sky-50/50 dark:hover:bg-slate-900/50">
                          <td className="px-8 py-5">
                            <div className="font-bold">{req.full_name}</div>
                            <div className="text-xs text-muted-foreground">{req.email}</div>
                          </td>
                          <td className="px-8 py-5 font-bold uppercase text-xs tracking-widest">
                            <span className="bg-primary/10 text-primary px-3 py-1 rounded-full">
                              {req.role === 'department' ? req.department_name : req.role}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-right flex justify-end gap-2">
                            <Button size="sm" onClick={() => handleApproveStaff(req.id)} className="bg-emerald-500 hover:bg-emerald-600 rounded-lg h-10 px-4">Approve</Button>
                            <Button size="sm" variant="destructive" onClick={() => handleRejectStaff(req.id)} className="rounded-lg h-10 px-4">Reject</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeTab === 'alumni' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="glass-card border-none shadow-2xl overflow-hidden rounded-[2rem]">
              <CardHeader className="bg-emerald-600 p-8 text-white">
                <CardTitle className="text-3xl font-bold tracking-tight flex items-center gap-4">
                  <GraduationCap className="w-8 h-8" /> Alumni Insight Data
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-100/50 dark:bg-slate-800/50 text-xs font-bold font-medium text-muted-foreground text-muted-foreground border-b">
                        <th className="px-8 py-5">Graduate</th>
                        <th className="px-8 py-5">Employment</th>
                        <th className="px-8 py-5">Higher Education</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {allFutureData.map((item) => (
                        <tr key={item.id}>
                          <td className="px-8 py-5">
                            <div className="font-bold text-sm">{item.student?.full_name}</div>
                            <div className="text-xs text-primary uppercase font-bold">{item.student?.reg_no}</div>
                          </td>
                          <td className="px-8 py-5">
                            <span className={`px-4 py-1.5 rounded-full text-xs font-bold font-medium text-muted-foreground ${item.experience === 'Yes' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-200 text-slate-500'}`}>
                              {item.experience === 'Yes' ? 'Employed' : 'Unemployed'}
                            </span>
                          </td>
                          <td className="px-8 py-5">
                            <span className={`px-4 py-1.5 rounded-full text-xs font-bold font-medium text-muted-foreground ${item.degree ? 'bg-blue-500/10 text-blue-500' : 'bg-slate-200 text-slate-500'}`}>
                              {item.degree ? item.degree : 'No Further Education'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </main>
    </div>
  )
}
