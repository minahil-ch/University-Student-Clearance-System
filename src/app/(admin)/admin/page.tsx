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
  Filter,
  MoreVertical,
  History,
  ArrowUpRight,
  ShieldCheck,
  Search
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
  
  const supabase = createClient()

  useEffect(() => {
    async function fetchData() {
      // 1. Fetch Basic Stats
      const { data: students } = await supabase.from('profiles').select('id').eq('role', 'student')
      const { data: clearance } = await supabase.from('clearance_status').select('status, department_key')
      const { data: pendingRequests } = await supabase.from('profiles').select('id').eq('is_approved', false).neq('role', 'student')

      setRequests(pendingRequests || [])

      if (students && clearance) {
        const total = students.length
        const clearedCount = clearance.filter(c => c.status === 'cleared').length
        const pendingCount = clearance.filter(c => c.status === 'pending').length
        const issuesCount = clearance.filter(c => c.status === 'issue').length

        setStats({
          totalStudents: total,
          cleared: clearedCount,
          pending: pendingCount,
          issues: issuesCount
        })

        const depts: Record<string, any> = {}
        clearance.forEach(c => {
          if (!depts[c.department_key]) depts[c.department_key] = { name: c.department_key.replace(/_/g, ' '), cleared: 0, total: 0 }
          depts[c.department_key].total++
          if (c.status === 'cleared') depts[c.department_key].cleared++
        })
        setDepartmentStats(Object.values(depts))
      }

      // 2. Fetch Recent Audit Logs
      const { data: logs } = await supabase
        .from('audit_logs')
        .select(`
          *,
          actor:actor_id (full_name, role),
          student:target_student_id (full_name, reg_no)
        `)
        .order('created_at', { ascending: false })
        .limit(10)

      setAuditLogs(logs || [])
      // 3. Fetch Future Data (Alumni Surveys)
      const { data: future } = await supabase
        .from('future_data')
        .select(`
          *,
          student:profiles!future_data_student_id_fkey(full_name, reg_no, email, department_name)
        `)
      
      if (future) {
        setAllFutureData(future)
      }

      setLoading(false)
    }

    fetchData()

    // Real-time subscription for audit logs
    const channel = supabase
      .channel('admin-updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, (payload) => {
        // Refresh logs (simplified)
        fetchData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleExportCSV = () => {
    if (departmentStats.length === 0) return
    
    const headers = ["Department", "Cleared", "Total Count", "Percentage"]
    const rows = departmentStats.map(d => [
      d.name,
      d.cleared,
      d.total,
      `${((d.cleared / d.total) * 100).toFixed(1)}%`
    ])

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `clearance_report_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("Report downloaded successfully!")
  }

  const pieData = [
    { name: 'Cleared', value: stats.cleared, color: '#10b981' },
    { name: 'Pending', value: stats.pending, color: '#f59e0b' },
    { name: 'Issues', value: stats.issues, color: '#f43f5e' },
  ]

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar role="admin" />
      
      <main className="flex-1 w-full lg:ml-64 p-4 md:p-6 xl:p-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
              Admin <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-blue-500 to-indigo-600">Command Center</span>
              <ShieldCheck className="w-6 h-6 text-primary" />
            </h2>
            <p className="text-muted-foreground mt-1 text-sm font-medium">Real-time metrics and system-wide audit monitoring</p>
          </motion.div>
          <div className="flex gap-4">
            <div className="relative">
               <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
               <Input 
                placeholder={activeTab === 'alumni' ? "Search alumni..." : "Search logs..."} 
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
        <div className="flex items-center gap-4 mb-8 bg-slate-200/50 dark:bg-slate-800/50 p-1.5 rounded-[1rem] w-fit">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'dashboard' ? 'bg-white dark:bg-slate-900 shadow-md text-primary' : 'text-slate-500 hover:text-slate-700'}`}
          >
            System Metrics
          </button>
          <button 
            onClick={() => setActiveTab('alumni')}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'alumni' ? 'bg-white dark:bg-slate-900 shadow-md text-emerald-500' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Alumni Surveys
          </button>
        </div>

        {activeTab === 'dashboard' ? (
          <>

        {/* Dynamic Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
          {[
            { label: "Total Students", value: stats.totalStudents, icon: Users, color: "blue", trend: "+12%" },
            { label: "Pending Staff", value: requests.length, icon: Clock, color: "emerald", trend: "Approval" },
            { label: "Overall Cleared", value: stats.cleared, icon: CheckCircle, color: "blue", trend: "On Track" },
            { label: "Pending Tasks", value: stats.pending, icon: Clock, color: "amber", trend: "High Priority" },
            { label: "Critical Issues", value: stats.issues, icon: AlertCircle, color: "rose", trend: "Review Needed" },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="glass-card hover:ring-2 ring-primary/20 transition-all duration-500 group relative overflow-hidden group">
                <div className={`absolute top-0 right-0 w-24 h-24 bg-${item.color}-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700`} />
                <CardContent className="p-5 relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-3 rounded-xl bg-${item.color}-500/10`}>
                      <item.icon className={`w-5 h-5 text-${item.color}-500`} />
                    </div>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 tracking-widest uppercase">
                      {item.trend}
                    </span>
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
          {/* Charts Section */}
          <Card className="lg:col-span-1 glass-card border-none shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-bold">Clearance Status</CardTitle>
              <MoreVertical className="w-5 h-5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="h-[350px] flex flex-col items-center justify-center">
              <ResponsiveContainer width="100%" height="90%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                  />
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
                  <Tooltip 
                    cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="cleared" fill="url(#barGradient)" radius={[8, 8, 0, 0]} barSize={45} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Audit Activity Feed */}
        <Card className="glass-card border-none shadow-xl overflow-hidden">
          <CardHeader className="border-b bg-slate-50/50 dark:bg-slate-900/50 px-8 py-6">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3 text-2xl font-bold">
                <History className="w-6 h-6 text-primary" /> System Audit Trail
              </CardTitle>
              <Button variant="ghost" className="text-xs uppercase tracking-widest">View Full Logs</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-100/50 dark:bg-slate-800/50 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b">
                    <th className="px-8 py-4">Actor</th>
                    <th className="px-8 py-4">Action</th>
                    <th className="px-8 py-4">Target Student</th>
                    <th className="px-8 py-4">Timestamp</th>
                    <th className="px-8 py-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <AnimatePresence>
                    {auditLogs
                      .filter(log => 
                        log.actor?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        log.student?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        log.student?.reg_no?.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((log) => (
                      <motion.tr 
                        key={log.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="group hover:bg-primary/[0.02] transition-colors"
                      >
                        <td className="px-8 py-5">
                          <div className="font-bold">{log.actor?.full_name}</div>
                          <div className="text-[10px] text-muted-foreground uppercase">{log.actor?.role}</div>
                        </td>
                        <td className="px-8 py-5">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            log.action.includes('cleared') ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                          }`}>
                            {log.action.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          <div className="font-bold">{log.student?.full_name}</div>
                          <div className="text-[10px] text-muted-foreground uppercase">{log.student?.reg_no}</div>
                        </td>
                        <td className="px-8 py-5 text-sm text-muted-foreground">
                          {formatDate(log.created_at)}
                        </td>
                        <td className="px-8 py-5 text-right">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
              {auditLogs.length === 0 && (
                <div className="py-20 text-center text-muted-foreground font-medium flex flex-col items-center gap-4">
                  <History className="w-12 h-12 opacity-20" />
                  No audit logs recorded yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        </>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="glass-card border-none shadow-2xl overflow-hidden rounded-[2rem]">
              <CardHeader className="bg-gradient-to-r from-emerald-500 to-primary p-8 text-white">
                <CardTitle className="text-3xl font-black uppercase tracking-tighter flex items-center gap-4">
                  <Users className="w-8 h-8" />
                  Alumni Future Data Database
                </CardTitle>
                <p className="font-bold opacity-80 mt-2">Comprehensive post-graduation tracking and placement records</p>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-100/50 dark:bg-slate-800/50 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b">
                        <th className="px-8 py-5">Graduate Identity</th>
                        <th className="px-8 py-5">Employment Status</th>
                        <th className="px-8 py-5">Higher Education</th>
                        <th className="px-8 py-5">Mentorship</th>
                        <th className="px-8 py-5 text-right">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {allFutureData
                        .filter(item => 
                          item.student?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.student?.reg_no?.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                          <td className="px-8 py-5">
                            <div className="font-bold text-sm">{item.student?.full_name}</div>
                            <div className="text-[10px] text-primary font-black uppercase tracking-widest mt-1">{item.student?.reg_no}</div>
                            <div className="text-[10px] text-muted-foreground">{item.personal_email || item.student?.email}</div>
                          </td>
                          <td className="px-8 py-5">
                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                              item.experience === 'Yes' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                            }`}>
                              {item.experience === 'Yes' ? 'Employed' : 'Searching'}
                            </span>
                            {item.experience === 'Yes' && (
                              <div className="text-xs font-bold mt-2">
                                {item.job_title} <span className="text-muted-foreground font-normal">at</span> {item.company_name}
                              </div>
                            )}
                          </td>
                          <td className="px-8 py-5">
                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                              item.degree ? 'bg-blue-500/10 text-blue-500' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                            }`}>
                              {item.degree ? 'Enrolled' : 'None'}
                            </span>
                            {item.degree && (
                              <div className="text-xs font-bold mt-2 text-muted-foreground">
                                {item.degree} - {item.higher_education_uni} ({item.country})
                              </div>
                            )}
                          </td>
                          <td className="px-8 py-5">
                             <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                              item.skills === 'Yes' ? 'bg-violet-500/10 text-violet-500' : 'bg-rose-500/10 text-rose-500'
                            }`}>
                              {item.skills === 'Yes' ? 'Available' : 'Unavailable'}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-right">
                             <Button variant="outline" size="sm" className="rounded-xl text-[10px] font-black uppercase tracking-widest">
                               View Record
                             </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {allFutureData.length === 0 && (
                    <div className="py-20 text-center text-muted-foreground font-medium flex flex-col items-center gap-4">
                      <Users className="w-12 h-12 opacity-20" />
                      No alumni data recorded yet.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </main>
    </div>
  )
}
