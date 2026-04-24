"use client"
export const dynamic = 'force-dynamic'

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Sidebar } from "@/components/layout/Sidebar"
import { Card, CardContent } from "@/components/ui/Card"
import { motion } from "framer-motion"
import { FileText, Download, TrendingUp, Users, CheckCircle, Clock } from "lucide-react"
import { Button } from "@/components/ui/Button"

export default function ReportsPortal() {
  const [stats, setStats] = useState({ total: 0, cleared: 0, pending: 0, timeAvg: '24h' })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data: students } = await supabase.from('profiles').select('id').eq('role', 'student')
      const { data: clearance } = await supabase.from('clearance_status').select('*')
      
      const total = students?.length || 0
      const cleared = clearance?.filter(c => c.status === 'cleared').length || 0
      const pending = clearance?.filter(c => c.status !== 'cleared').length || 0

      setStats({ total, cleared, pending, timeAvg: '18h 45m' })
      setLoading(false)
    }
    fetchData()
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar role="admin" />
      
      <main className="flex-1 w-full lg:max-w-[calc(100%-16rem)] lg:ml-64 p-8 xl:p-12">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter flex items-center gap-4">
              System <span className="text-primary italic">Reports</span>
              <FileText className="w-10 h-10 text-primary" />
            </h2>
            <p className="text-muted-foreground mt-3 text-lg font-medium leading-relaxed">
              Export verified academic batches and review aggregate clearance analytics.
            </p>
          </motion.div>
          <Button className="h-14 px-8 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-500/20 gap-3">
            <Download className="w-5 h-5" /> Export PDF Master Report
          </Button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <Card className="glass-card border-none shadow-xl">
             <CardContent className="p-8 flex items-center gap-6">
                <div className="w-16 h-16 rounded-[1.5rem] bg-blue-500/10 flex items-center justify-center"><Users className="w-8 h-8 text-blue-500" /></div>
                <div><p className="text-sm font-black text-slate-400 uppercase tracking-widest">Total Active Students</p><p className="text-4xl font-black">{stats.total}</p></div>
             </CardContent>
          </Card>
          <Card className="glass-card border-none shadow-xl">
             <CardContent className="p-8 flex items-center gap-6">
                <div className="w-16 h-16 rounded-[1.5rem] bg-emerald-500/10 flex items-center justify-center"><CheckCircle className="w-8 h-8 text-emerald-500" /></div>
                <div><p className="text-sm font-black text-slate-400 uppercase tracking-widest">Global Clearances</p><p className="text-4xl font-black">{stats.cleared}</p></div>
             </CardContent>
          </Card>
          <Card className="glass-card border-none shadow-xl">
             <CardContent className="p-8 flex items-center gap-6">
                <div className="w-16 h-16 rounded-[1.5rem] bg-amber-500/10 flex items-center justify-center"><Clock className="w-8 h-8 text-amber-500" /></div>
                <div><p className="text-sm font-black text-slate-400 uppercase tracking-widest">Pending Nodes</p><p className="text-4xl font-black">{stats.pending}</p></div>
             </CardContent>
          </Card>
          <Card className="glass-card border-none shadow-xl">
             <CardContent className="p-8 flex items-center gap-6">
                <div className="w-16 h-16 rounded-[1.5rem] bg-violet-500/10 flex items-center justify-center"><TrendingUp className="w-8 h-8 text-violet-500" /></div>
                <div><p className="text-sm font-black text-slate-400 uppercase tracking-widest">Avg Review Time</p><p className="text-3xl font-black">{stats.timeAvg}</p></div>
             </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
