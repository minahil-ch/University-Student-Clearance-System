"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
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
import { 
  Shield, 
  Users, 
  FileCheck, 
  AlertTriangle, 
  Download, 
  Plus, 
  Trash2, 
  Search, 
  Filter,
  Calendar,
  ChevronDown,
  LayoutGrid,
  List,
  CheckCircle2,
  Clock,
  XCircle,
  MoreVertical,
  History,
  UserPlus,
  GraduationCap
} from 'lucide-react'
import { Button } from "@/components/ui/Button"
import { Logo } from "@/components/ui/Logo"
import { formatDate } from "@/lib/utils"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"

export default function AdminDashboardContent() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>({ totalStudents: 0, cleared: 0, pending: 0, issues: 0 })
  const [allStudents, setAllStudents] = useState<any[]>([])
  const [departmentStats, setDepartmentStats] = useState<any[]>([])
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [fullyApprovedStudents, setFullyApprovedStudents] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState('dashboard')
  const [requests, setRequests] = useState<any[]>([])
  const [allFutureData, setAllFutureData] = useState<any[]>([])
  const [isAddingStaff, setIsAddingStaff] = useState(false)
  const [newStaff, setNewStaff] = useState({ fullName: '', email: '', password: '', role: 'department', departmentName: 'Computer Science' })
  const [mounted, setMounted] = useState(false)
  
  // Advanced Filtering States
  const [filterDept, setFilterDept] = useState('All Departments')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterTime, setFilterTime] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

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
    
    const { data: students } = await supabase
      .from('profiles')
      .select('id, is_approved, role, full_name, reg_no, email, cgpa, department_name, created_at')
      .eq('role', 'student')

    if (students) {
      setStats((prev: any) => ({ ...prev, totalStudents: students.length }))
      setAllStudents(students)
    }

    const { data: clearance } = await supabase
      .from('clearance_status')
      .select('*')

    if (clearance && clearance.length > 0) {
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

    const { data: logs } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
    
    if (logs) setAuditLogs(logs)

    const { data: staffReqs } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_approved', false)
      .neq('role', 'student')
    
    if (staffReqs) setRequests(staffReqs)

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

  const downloadCSV = (data: any[], filename: string) => {
    const headers = ["Name", "Reg No", "Department", "Status"]
    const rows = data.map(s => [
      s.full_name, 
      s.reg_no, 
      s.department_name, 
      fullyApprovedStudents.includes(s.id) ? "Cleared" : "Pending"
    ])

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

  const filteredStudents = allStudents.filter(student => {
    const matchesDept = filterDept === 'All Departments' || student.department_name === filterDept
    const matchesSearch = !searchQuery || 
      student.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.reg_no?.toLowerCase().includes(searchQuery.toLowerCase())
    let matchesStatus = true
    if (filterStatus === 'cleared') matchesStatus = fullyApprovedStudents.includes(student.id)
    else if (filterStatus === 'pending') matchesStatus = !fullyApprovedStudents.includes(student.id)
    let matchesTime = true
    if (filterTime !== 'all') {
      const createdDate = new Date(student.created_at)
      const now = new Date()
      if (filterTime === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        matchesTime = createdDate >= weekAgo
      } else if (filterTime === 'month') {
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
        matchesTime = createdDate >= monthAgo
      }
    }
    return matchesDept && matchesSearch && matchesStatus && matchesTime
  })

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
    <div className="min-h-screen bg-sky-50/50 dark:bg-slate-950 p-6 md:p-12 transition-colors duration-500">
      <div className="max-w-[1600px] mx-auto">
        <header className="flex flex-col xl:flex-row items-center justify-between gap-8 mb-12">
          <div className="flex items-center gap-6">
            <div className="p-5 bg-slate-900 dark:bg-white text-white dark:text-slate-950 rounded-[2.5rem] shadow-2xl shadow-slate-900/20 rotate-3">
              <Shield className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-white leading-none">
                Command <span className="text-primary italic">Center</span>
              </h1>
              <div className="flex items-center gap-3 mt-3">
                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[10px] font-bold uppercase tracking-wider">Master Control</span>
                <h3 className="text-slate-400 font-bold tracking-[0.2em] uppercase text-xs">Administrative Oversight V1.0</h3>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-1 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl rounded-[2rem] border border-white/20 shadow-xl">
             {['dashboard', 'students', 'staff_requests', 'alumni', 'logs'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {tab.replace('_', ' ')}
                </button>
             ))}
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { label: 'Total Registry', value: stats.totalStudents, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                { label: 'Fully Cleared', value: fullyApprovedStudents.length, icon: FileCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                { label: 'Pending Ops', value: stats.totalStudents - fullyApprovedStudents.length, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                { label: 'Critical Issues', value: stats.issues, icon: AlertTriangle, color: 'text-rose-500', bg: 'bg-rose-500/10' },
              ].map((stat, i) => (
                <Card key={i} className="glass-card border-none shadow-2xl overflow-hidden rounded-[3rem] group hover:scale-[1.02] transition-all duration-500">
                  <CardContent className="p-10 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-2">{stat.label}</p>
                      <h4 className="text-5xl font-bold tracking-tighter text-slate-900 dark:text-white">{stat.value}</h4>
                    </div>
                    <div className={`w-16 h-16 rounded-[1.5rem] ${stat.bg} ${stat.color} flex items-center justify-center group-hover:rotate-12 transition-transform`}>
                      <stat.icon className="w-8 h-8" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <Card className="glass-card border-none shadow-2xl rounded-[3rem] overflow-hidden">
                <CardHeader className="px-10 py-8">
                  <CardTitle className="text-xl font-bold">Clearance Status Matrix</CardTitle>
                </CardHeader>
                <CardContent className="h-[350px] flex flex-col items-center justify-center p-10 pt-0">
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
                  <div className="flex flex-wrap justify-center gap-6 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-4">
                    {pieData.map(item => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                        <span>{item.name}: {item.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-none shadow-2xl rounded-[3rem] overflow-hidden">
                <CardHeader className="px-10 py-8">
                  <CardTitle className="text-xl font-bold">Departmental Efficiency</CardTitle>
                </CardHeader>
                <CardContent className="h-[350px] p-10 pt-0">
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
          </motion.div>
        )}

        {activeTab === 'students' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="flex flex-col gap-8 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-[1.25rem] bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20">
                    <LayoutGrid className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold tracking-tight">Student <span className="text-primary italic">Intelligence</span></h2>
                    <p className="text-muted-foreground font-medium text-sm">Full institutional record monitoring and lifecycle tracking.</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                   <div className="relative group">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                      <input 
                        type="text" 
                        placeholder="Search database..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-11 pr-4 py-3 bg-white dark:bg-slate-900 rounded-2xl border-none shadow-sm focus:ring-2 focus:ring-primary/20 transition-all w-64 text-sm font-medium"
                      />
                   </div>
                   <Button onClick={() => downloadCSV(filteredStudents, `University_Clearance_Report_${new Date().toISOString().split('T')[0]}.csv`)} className="bg-primary hover:bg-primary/90 text-white rounded-2xl h-11 px-6 shadow-xl shadow-primary/20 flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      <span className="text-xs font-bold tracking-wider">Export Report</span>
                   </Button>
                </div>
              </div>

              {/* 🔍 Unified Filter Bar */}
              <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl p-3 rounded-3xl border border-white/20 dark:border-white/5 flex flex-wrap items-center justify-between gap-4">
                 <div className="flex items-center gap-2">
                    <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                       <button 
                         onClick={() => setFilterStatus('all')}
                         className={`px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${filterStatus === 'all' ? 'bg-white dark:bg-slate-700 shadow-md text-primary' : 'text-slate-400 hover:text-slate-600'}`}
                       >
                         All Records
                       </button>
                       <button 
                         onClick={() => setFilterStatus('pending')}
                         className={`px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${filterStatus === 'pending' ? 'bg-white dark:bg-slate-700 shadow-md text-amber-500' : 'text-slate-400 hover:text-slate-600'}`}
                       >
                         Pending
                       </button>
                       <button 
                         onClick={() => setFilterStatus('cleared')}
                         className={`px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${filterStatus === 'cleared' ? 'bg-white dark:bg-slate-700 shadow-md text-emerald-500' : 'text-slate-400 hover:text-slate-600'}`}
                       >
                         Cleared
                       </button>
                    </div>
                 </div>

                 <div className="flex items-center gap-3">
                    <div className="relative">
                       <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                       <select 
                         value={filterDept}
                         onChange={(e) => setFilterDept(e.target.value)}
                         className="pl-10 pr-10 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-2xl border-none text-xs font-bold appearance-none cursor-pointer hover:bg-slate-200 transition-colors"
                       >
                         <option>All Departments</option>
                         {academicDepartments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                       </select>
                       <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>

                    <div className="relative">
                       <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                       <select 
                         value={filterTime}
                         onChange={(e) => setFilterTime(e.target.value)}
                         className="pl-10 pr-10 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-2xl border-none text-xs font-bold appearance-none cursor-pointer hover:bg-slate-200 transition-colors"
                       >
                         <option value="all">All Time</option>
                         <option value="week">This Week</option>
                         <option value="month">This Month</option>
                       </select>
                       <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>
                 </div>
              </div>
            </div>

            <Card className="glass-card border-none shadow-2xl rounded-[3rem] overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-white/5">
                        <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-slate-400">Student Identity</th>
                        <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-slate-400">Department</th>
                        <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-slate-400">Progress</th>
                        <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</th>
                        <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-slate-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-white/[0.02]">
                      {filteredStudents.length > 0 ? filteredStudents.map((student) => {
                        const isCleared = fullyApprovedStudents.includes(student.id)
                        return (
                          <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-all group">
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center font-bold text-slate-400 group-hover:scale-110 transition-transform">
                                  {student.full_name?.charAt(0)}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900 dark:text-white">{student.full_name}</div>
                                  <div className="text-[10px] font-bold text-slate-400 tracking-wider mt-0.5">{student.reg_no}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <span className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] font-bold text-slate-500">
                                {student.department_name}
                              </span>
                            </td>
                            <td className="px-8 py-6">
                              <div className="flex flex-col gap-2 min-w-[120px]">
                                 <div className="flex justify-between items-center text-[10px] font-bold">
                                    <span className="text-slate-400">Clearance</span>
                                    <span className={isCleared ? "text-emerald-500" : "text-amber-500"}>{isCleared ? '100%' : '80%'}</span>
                                 </div>
                                 <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <motion.div 
                                      initial={{ width: 0 }}
                                      animate={{ width: isCleared ? '100%' : '80%' }}
                                      className={`h-full rounded-full ${isCleared ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]' : 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.4)]'}`}
                                    />
                                 </div>
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              {isCleared ? (
                                <div className="flex items-center gap-2 text-emerald-500 bg-emerald-500/10 px-4 py-1.5 rounded-xl w-fit">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span className="text-[10px] font-bold uppercase tracking-wider">Certified</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-amber-500 bg-amber-500/10 px-4 py-1.5 rounded-xl w-fit">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span className="text-[10px] font-bold uppercase tracking-wider">In Process</span>
                                </div>
                              )}
                            </td>
                            <td className="px-8 py-6 text-right">
                              <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                                 <MoreVertical className="w-4 h-4 text-slate-400" />
                              </button>
                            </td>
                          </tr>
                        )
                      }) : (
                        <tr>
                          <td colSpan={5} className="px-8 py-24 text-center">
                            <div className="flex flex-col items-center justify-center gap-4">
                              <div className="w-20 h-20 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
                                <Search className="w-8 h-8 text-slate-200" />
                              </div>
                              <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Records Discovered</h3>
                              <p className="text-sm text-slate-400 font-medium">Try broadening your search term or segment switch.</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeTab === 'staff_requests' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="flex justify-between items-center mb-8">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-[1.25rem] bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold tracking-tight">Staff <span className="text-amber-500 italic">Authorizations</span></h2>
                    <p className="text-muted-foreground font-medium text-sm">Credential verification and administrative access control.</p>
                  </div>
               </div>
               <Button onClick={() => setIsAddingStaff(!isAddingStaff)} className="rounded-2xl gap-2 shadow-xl shadow-primary/20 h-12 px-8"><UserPlus className="w-4 h-4" /> Register New Official</Button>
            </div>

            {isAddingStaff && (
              <Card className="glass-card shadow-2xl border-none rounded-[2.5rem] mb-12 overflow-hidden animate-in slide-in-from-top duration-500">
                <CardHeader className="bg-primary p-8 text-white">
                  <CardTitle className="text-xl font-bold flex items-center gap-3"><Plus className="w-6 h-6" /> Create Official Identity</CardTitle>
                </CardHeader>
                <CardContent className="p-10">
                  <form onSubmit={handleAddStaff} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Official Name</label>
                       <Input placeholder="Enter full name" value={newStaff.fullName} onChange={e => setNewStaff({...newStaff, fullName: e.target.value})} required className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-none font-bold" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
                       <Input type="email" placeholder="official@university.com" value={newStaff.email} onChange={e => setNewStaff({...newStaff, email: e.target.value})} required className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-none font-bold" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Secure Key</label>
                       <Input type="password" placeholder="••••••••" value={newStaff.password} onChange={e => setNewStaff({...newStaff, password: e.target.value})} required className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-none font-bold" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">System Role</label>
                       <select className="w-full h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-none px-4 font-bold text-sm appearance-none cursor-pointer" value={newStaff.role} onChange={e => setNewStaff({...newStaff, role: e.target.value})}>
                          <option value="department">Academic Official</option>
                          <option value="library">Library Manager</option>
                          <option value="transport">Transport Dept</option>
                          <option value="hostel">Hostel Warden</option>
                          <option value="finance">Finance Officer</option>
                       </select>
                    </div>
                    {newStaff.role === 'department' && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Assigned Department</label>
                        <select className="w-full h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-none px-4 font-bold text-sm appearance-none cursor-pointer" value={newStaff.departmentName} onChange={e => setNewStaff({...newStaff, departmentName: e.target.value})}>
                          {staffDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                    )}
                    <div className="lg:col-span-3 flex justify-end pt-4">
                      <Button type="submit" disabled={loading} className="px-12 rounded-2xl h-14 bg-primary text-white font-bold tracking-widest uppercase text-xs shadow-xl shadow-primary/20">{loading ? 'Synthesizing...' : 'Initialize Account'}</Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            <Card className="glass-card border-none shadow-2xl rounded-[3rem] overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-white/5">
                        <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-slate-400">Applicant</th>
                        <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-slate-400">Authorization Goal</th>
                        <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Verification</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-white/[0.02]">
                      {requests.length > 0 ? requests.map(req => (
                        <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors group">
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-4">
                               <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold text-sm shadow-lg shadow-amber-500/20">
                                 {req.full_name?.charAt(0)}
                               </div>
                               <div>
                                 <div className="font-bold text-slate-900 dark:text-white">{req.full_name}</div>
                                 <div className="text-[10px] font-bold text-slate-400 tracking-wider mt-0.5">{req.email}</div>
                               </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <span className="px-4 py-1.5 bg-primary/10 text-primary rounded-full text-[10px] font-bold uppercase tracking-widest">
                              {req.role === 'department' ? req.department_name : req.role}
                            </span>
                          </td>
                          <td className="px-8 py-6 text-right">
                             <div className="flex justify-end gap-3">
                                <Button size="sm" onClick={() => handleApproveStaff(req.id)} className="bg-emerald-500 hover:bg-emerald-600 rounded-xl h-10 px-6 text-[10px] font-bold uppercase tracking-widest">Verify</Button>
                                <Button size="sm" variant="destructive" onClick={() => handleRejectStaff(req.id)} className="rounded-xl h-10 px-6 text-[10px] font-bold uppercase tracking-widest">Deny</Button>
                             </div>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                           <td colSpan={3} className="px-8 py-20 text-center text-slate-400 font-bold text-sm uppercase tracking-widest">All identities verified</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeTab === 'alumni' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="flex items-center gap-4 mb-8">
               <div className="w-12 h-12 rounded-[1.25rem] bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/20">
                 <GraduationCap className="w-6 h-6" />
               </div>
               <div>
                 <h2 className="text-3xl font-bold tracking-tight">Alumni <span className="text-emerald-600 italic">Census</span></h2>
                 <p className="text-muted-foreground font-medium text-sm">Post-graduate success monitoring and institutional impact tracking.</p>
               </div>
            </div>

            <Card className="glass-card border-none shadow-2xl rounded-[3rem] overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-white/5">
                        <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-slate-400">Graduate</th>
                        <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-slate-400">Career Vector</th>
                        <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-slate-400">Higher Education</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-white/[0.02]">
                      {allFutureData.length > 0 ? allFutureData.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                          <td className="px-8 py-6">
                            <div className="font-bold text-slate-900 dark:text-white">{item.student?.full_name}</div>
                            <div className="text-[10px] font-bold text-primary uppercase mt-0.5 tracking-wider">{item.student?.reg_no}</div>
                          </td>
                          <td className="px-8 py-6">
                            <span className={`px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest ${item.experience === 'Yes' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-100 text-slate-400'}`}>
                              {item.experience === 'Yes' ? 'Engaged' : 'Not Specified'}
                            </span>
                          </td>
                          <td className="px-8 py-6">
                            <span className={`px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest ${item.degree ? 'bg-blue-500/10 text-blue-500' : 'bg-slate-100 text-slate-400'}`}>
                              {item.degree ? item.degree : 'Institutional Goal Met'}
                            </span>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                           <td colSpan={3} className="px-8 py-20 text-center text-slate-400 font-bold text-sm uppercase tracking-widest">No alumni data synchronized</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeTab === 'logs' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="flex items-center gap-4 mb-8">
               <div className="w-12 h-12 rounded-[1.25rem] bg-slate-900 dark:bg-white text-white dark:text-slate-950 flex items-center justify-center shadow-lg">
                 <History className="w-6 h-6" />
               </div>
               <div>
                 <h2 className="text-3xl font-bold tracking-tight">System <span className="text-primary italic">Audit Log</span></h2>
                 <p className="text-muted-foreground font-medium text-sm">Permanent record of all security-sensitive administrative operations.</p>
               </div>
            </div>

            <Card className="glass-card border-none shadow-2xl rounded-[3rem] overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-white/5">
                        <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-slate-400">Operation</th>
                        <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-slate-400">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-white/[0.02]">
                      {auditLogs.length > 0 ? auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                          <td className="px-8 py-6">
                             <div className="font-bold uppercase text-[10px] tracking-widest text-slate-900 dark:text-white">{log.action.replace(/_/g, ' ')}</div>
                             <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tight">
                               {typeof log.details === 'object' ? (
                                 log.details.remarks || JSON.stringify(log.details)
                               ) : (
                                 log.details || 'Baseline Operation'
                               )}
                             </p>
                          </td>
                          <td className="px-8 py-6 text-[10px] font-bold text-slate-400 tracking-widest uppercase">{formatDate(log.created_at)}</td>
                        </tr>
                      )) : (
                        <tr>
                           <td colSpan={2} className="px-8 py-20 text-center text-slate-400 font-bold text-sm uppercase tracking-widest">Clear Audit Trail</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  )
}
