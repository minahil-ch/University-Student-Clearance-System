"use client"
export const dynamic = 'force-dynamic'

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
  UserPlus
} from "lucide-react"
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

export default function AdminDashboard() {
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
    const { data: students, error: studentError } = await supabase
      .from('profiles')
      .select('id, is_approved, role')
      .eq('role', 'student')

    if (students) {
      const total = students.length
      setStats((prev: any) => ({ ...prev, totalStudents: total }))
      setAllStudents(students)
    }

    // 2. Get departmental clearance stats
    const { data: clearance, error: clearanceError } = await supabase
      .from('clearance_status')
      .select('*')

    if (clearance) {
      const departments = [...new Set(clearance.map(c => c.department_name))]
      const deptStats = departments.map(dept => {
        const deptClearances = clearance.filter(c => c.department_name === dept)
        const cleared = deptClearances.filter(c => c.status === 'approved').length
        return {
          name: dept,
          cleared: cleared,
          total: deptClearances.length,
          percentage: (cleared / deptClearances.length) * 100
        }
      })
      setDepartmentStats(deptStats)
      
      const overallCleared = clearance.filter(c => c.status === 'approved').length
      const overallPending = clearance.filter(c => c.status === 'pending').length
      const overallIssues = clearance.filter(c => c.status === 'issued').length
      
      setStats((prev: any) => ({ 
        ...prev, 
        cleared: overallCleared,
        pending: overallPending,
        issues: overallIssues
      }))

      // Students who have ALL departments approved
      const studentGroups = clearance.reduce((acc: any, curr) => {
        if (!acc[curr.student_id]) acc[curr.student_id] = []
        acc[curr.student_id].push(curr.status)
        return acc
      }, {})

      const fullyCleared = Object.keys(studentGroups).filter(sid => 
        studentGroups[sid].every((status: string) => status === 'approved')
      )
      setFullyApprovedStudents(fullyCleared)
    }

    // 3. Get audit logs
    const { data: logs } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    
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
    fetchData()

    const channel = supabase
      .channel('admin-updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, () => {
        fetchData()
      })
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
      headers = ["Student ID", "Status"]
      rows = allStudents.map(s => [s.id, fullyApprovedStudents.includes(s.id) ? "Fully Cleared" : "In Progress"])
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
    { name: 'Cleared', value: stats.cleared, color: '#10b981' },
    { name: 'Pending', value: stats.pending, color: '#f59e0b' },
    { name: 'Issues', value: stats.issues, color: '#f43f5e' },
  ]

  if (loading && !stats.totalStudents && !auditLogs.length) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar role="admin" />
      
      <main className="flex-1 w-full lg:ml-64 p-4 md:p-6 xl:p-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-6">
            <Logo className="w-20 h-20" />
            <div>
              <h2 className="text-3xl font-black tracking-tight flex items-center gap-3 uppercase italic">
                CUI VEHARI <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-blue-500 to-indigo-600">ADMIN HUB</span>
              </h2>
              <p className="text-muted-foreground mt-1 text-sm font-medium">Official Campus-Wide Clearance Command Center</p>
            </div>
          </motion.div>
          <div className="flex gap-4">
            <div className="relative">
               <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
               <Input 
                placeholder="Search..." 
                className="pl-10 w-64 glass-card border-none shadow-sm h-10 rounded-xl" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button onClick={handleExportCSV} className="h-10 rounded-xl gap-2 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 transition-all active:scale-95 px-6">
              <Download className="w-4 h-4" /> Export CSV
            </Button>
          </div>
        </header>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 mb-8 bg-slate-200/50 dark:bg-slate-800/50 p-1.5 rounded-[1rem] w-fit">
          {['dashboard', 'students', 'staff_requests', 'alumni'].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === tab ? 'bg-white dark:bg-slate-900 shadow-md text-primary' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>

        {activeTab === 'dashboard' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
              {[
                { label: "Total Students", value: stats.totalStudents, icon: Users, color: "blue", trend: "Total" },
                { label: "Pending Staff", value: requests.length, icon: Clock, color: "emerald", trend: "Approval" },
                { label: "Overall Cleared", value: stats.cleared, icon: CheckCircle, color: "blue", trend: "On Track" },
                { label: "Pending Tasks", value: stats.pending, icon: Clock, color: "amber", trend: "High Priority" },
                { label: "Critical Issues", value: stats.issues, icon: AlertCircle, color: "rose", trend: "Review Needed" },
              ].map((item, i) => (
                <motion.div key={item.label} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                  <Card className="glass-card hover:ring-2 ring-primary/20 transition-all duration-500 group relative overflow-hidden">
                    <div className={`absolute top-0 right-0 w-24 h-24 bg-${item.color}-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700`} />
                    <CardContent className="p-5 relative">
                      <div className="flex items-center justify-between mb-3">
                        <div className={`p-3 rounded-xl bg-${item.color}-500/10`}>
                          <item.icon className={`w-5 h-5 text-${item.color}-500`} />
                        </div>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 tracking-widest uppercase">{item.trend}</span>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-bold tracking-tight uppercase opacity-70">{item.label}</p>
                        <h3 className="text-3xl font-extrabold mt-1 tracking-tighter">{item.value}</h3>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
              <Card className="lg:col-span-1 glass-card border-none shadow-xl">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-xl font-bold">Clearance Status</CardTitle>
                  <MoreVertical className="w-5 h-5 text-muted-foreground" />
                </CardHeader>
                <CardContent className="h-[350px] flex flex-col items-center justify-center">
                  <ResponsiveContainer width="100%" height="90%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={8} dataKey="value">
                        {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap justify-center gap-6 text-[10px] font-black uppercase tracking-widest">
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
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-xl font-bold">Department Efficiency</CardTitle>
                  <ArrowUpRight className="w-5 h-5 text-primary" />
                </CardHeader>
                <CardContent className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={departmentStats}>
                      <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                      <XAxis dataKey="name" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} dy={10} />
                      <YAxis fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
                      <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="cleared" fill="url(#barGradient)" radius={[8, 8, 0, 0]} barSize={45} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
            
            {/* Audit Logs Table */}
            <Card className="glass-card border-none shadow-xl overflow-hidden">
              <CardHeader className="border-b bg-slate-50/50 dark:bg-slate-900/50 px-8 py-6">
                <CardTitle className="flex items-center gap-3 text-2xl font-bold"><History className="w-6 h-6 text-primary" /> System Audit Trail</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-100/50 dark:bg-slate-800/50 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b">
                        <th className="px-8 py-4">Actor</th><th className="px-8 py-4">Action</th><th className="px-8 py-4">Target Student</th><th className="px-8 py-4">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-primary/[0.02] transition-colors">
                          <td className="px-8 py-5"><div className="font-bold">{log.actor?.full_name}</div><div className="text-[10px] text-muted-foreground uppercase">{log.actor?.role}</div></td>
                          <td className="px-8 py-5"><span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800">{log.action.replace(/_/g, ' ')}</span></td>
                          <td className="px-8 py-5"><div className="font-bold">{log.student?.full_name}</div><div className="text-[10px] text-muted-foreground uppercase">{log.student?.reg_no}</div></td>
                          <td className="px-8 py-5 text-sm text-muted-foreground">{formatDate(log.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {auditLogs.length === 0 && <div className="py-20 text-center text-muted-foreground font-medium">No logs.</div>}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeTab === 'students' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="glass-card border-none shadow-2xl overflow-hidden rounded-[2rem]">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 p-8 text-white flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-3xl font-black uppercase tracking-tighter flex items-center gap-4">
                    <Users className="w-8 h-8" /> Students Master List
                  </CardTitle>
                  <p className="font-bold opacity-80 mt-2">View all submitted clearance forms and fully approved students</p>
                </div>
                <Button 
                  onClick={() => setShowOnlyApproved(!showOnlyApproved)} 
                  variant="outline" 
                  className="bg-white/10 text-white border-white/20 hover:bg-white/20"
                >
                  {showOnlyApproved ? "Showing: Fully Approved" : "Showing: All Submitted"}
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-100/50 dark:bg-slate-800/50 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b">
                        <th className="px-8 py-5">Student</th>
                        <th className="px-8 py-5">Reg No / CGPA</th>
                        <th className="px-8 py-5">Department</th>
                        <th className="px-8 py-5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(showOnlyApproved ? allStudents.filter(s => fullyApprovedStudents.includes(s.id)) : allStudents)
                        .filter(s => s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || s.reg_no?.toLowerCase().includes(searchTerm.toLowerCase()))
                        .map(student => {
                          const isFullyApproved = fullyApprovedStudents.includes(student.id);
                          return (
                            <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                              <td className="px-8 py-5">
                                <div className="font-bold">{student.full_name}</div>
                                <div className="text-[10px] text-muted-foreground">{student.email}</div>
                              </td>
                              <td className="px-8 py-5">
                                <div className="font-bold text-primary">{student.reg_no}</div>
                                <div className="text-[10px] font-black uppercase">CGPA: {student.cgpa || 'N/A'}</div>
                              </td>
                              <td className="px-8 py-5 font-medium">{student.department_name || 'N/A'}</td>
                              <td className="px-8 py-5">
                                {isFullyApproved ? (
                                  <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 flex items-center gap-1 w-fit"><CheckCircle className="w-3 h-3"/> Fully Approved</span>
                                ) : (
                                  <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-500 flex items-center gap-1 w-fit"><Clock className="w-3 h-3"/> Pending</span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                  {(showOnlyApproved ? fullyApprovedStudents : allStudents).length === 0 && (
                    <div className="py-20 text-center text-muted-foreground">No students found.</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeTab === 'staff_requests' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-black uppercase tracking-tighter">Staff Approvals & Management</h3>
              <Button onClick={() => setIsAddingStaff(!isAddingStaff)} className="rounded-xl gap-2 shadow-xl shadow-primary/20"><UserPlus className="w-4 h-4" /> Add Staff Manually</Button>
            </div>

            {isAddingStaff && (
              <Card className="glass-card shadow-2xl border-none">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-primary">Manually Add Staff Member</CardTitle>
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
                      <Button type="submit" disabled={loading} className="px-8 rounded-xl">{loading ? 'Adding...' : 'Add Staff Member'}</Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            <Card className="glass-card border-none shadow-2xl overflow-hidden rounded-[2rem]">
              <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-500 p-8 text-white">
                <CardTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-4">
                  <Clock className="w-6 h-6" /> Pending Staff Requests
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-100/50 dark:bg-slate-800/50 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b">
                        <th className="px-8 py-5">Name & Email</th>
                        <th className="px-8 py-5">Requested Role</th>
                        <th className="px-8 py-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {requests.map(req => (
                        <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                          <td className="px-8 py-5">
                            <div className="font-bold">{req.full_name}</div>
                            <div className="text-[10px] text-muted-foreground">{req.email}</div>
                          </td>
                          <td className="px-8 py-5 font-bold uppercase text-[10px] tracking-widest">
                            <span className="bg-primary/10 text-primary px-3 py-1 rounded-full">
                              {req.role === 'department' ? req.department_name : req.role}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-right flex justify-end gap-2">
                            <Button size="sm" onClick={() => handleApproveStaff(req.id)} className="bg-emerald-500 hover:bg-emerald-600 rounded-lg"><Check className="w-4 h-4"/></Button>
                            <Button size="sm" variant="destructive" onClick={() => handleRejectStaff(req.id)} className="rounded-lg"><X className="w-4 h-4"/></Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {requests.length === 0 && <div className="py-20 text-center text-muted-foreground">No pending requests.</div>}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeTab === 'alumni' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="glass-card border-none shadow-2xl overflow-hidden rounded-[2rem]">
              <CardHeader className="bg-gradient-to-r from-emerald-500 to-primary p-8 text-white">
                <CardTitle className="text-3xl font-black uppercase tracking-tighter flex items-center gap-4">
                  <Users className="w-8 h-8" /> Alumni Future Data
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-100/50 dark:bg-slate-800/50 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b">
                        <th className="px-8 py-5">Graduate</th>
                        <th className="px-8 py-5">Employment</th>
                        <th className="px-8 py-5">Higher Ed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {allFutureData.map((item) => (
                        <tr key={item.id}>
                          <td className="px-8 py-5">
                            <div className="font-bold text-sm">{item.student?.full_name}</div>
                            <div className="text-[10px] text-primary">{item.student?.reg_no}</div>
                          </td>
                          <td className="px-8 py-5">
                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${item.experience === 'Yes' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-200 text-slate-500'}`}>
                              {item.experience === 'Yes' ? 'Employed' : 'Searching'}
                            </span>
                          </td>
                          <td className="px-8 py-5">
                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${item.degree ? 'bg-blue-500/10 text-blue-500' : 'bg-slate-200 text-slate-500'}`}>
                              {item.degree ? 'Enrolled' : 'None'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {allFutureData.length === 0 && <div className="py-20 text-center text-muted-foreground">No alumni data recorded yet.</div>}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </main>
    </div>
  )
}
