"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Sidebar } from "@/components/layout/Sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { motion, AnimatePresence } from "framer-motion"
import { ShieldAlert, Fingerprint, Activity, Clock } from "lucide-react"
import { formatDate } from "@/lib/utils"

export default function AuditLogsPortal() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from('audit_logs')
        .select(`
          *,
          actor:profiles!audit_logs_actor_id_fkey(full_name, email, role)
        `)
        .order('created_at', { ascending: false })
        .limit(50)
      
      setLogs(data || [])
      setLoading(false)
    }
    fetchData()
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  )

  const getActionColor = (action: string) => {
    if (action.includes('approve') || action.includes('clear')) return 'bg-emerald-500/10 text-emerald-500'
    if (action.includes('reject') || action.includes('revoke')) return 'bg-rose-500/10 text-rose-500'
    return 'bg-blue-500/10 text-blue-500'
  }

  const getActionIcon = (action: string) => {
    if (action.includes('approve') || action.includes('clear')) return <Activity className="w-5 h-5" />
    if (action.includes('reject') || action.includes('revoke')) return <ShieldAlert className="w-5 h-5" />
    return <Fingerprint className="w-5 h-5" />
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar role="admin" />
      
      <main className="flex-1 w-full lg:max-w-[calc(100%-16rem)] lg:ml-64 p-8 xl:p-12">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter flex items-center gap-4">
              Security <span className="text-primary italic">Audit Logs</span>
              <Fingerprint className="w-10 h-10 text-primary" />
            </h2>
            <p className="text-muted-foreground mt-3 text-lg font-medium leading-relaxed">
              Real-time monitoring of all critical system actions, evaluations, and modifications.
            </p>
          </motion.div>
        </header>

        <Card className="glass-card shadow-2xl border-none overflow-hidden">
          <div className="h-2 w-full bg-slate-200 dark:bg-slate-800"><div className="h-full bg-primary w-full"></div></div>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              <AnimatePresence>
                {logs.length > 0 ? logs.map((log, i) => (
                  <motion.div 
                    key={log.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                  >
                    <div className="flex items-center gap-6">
                       <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${getActionColor(log.action)}`}>
                          {getActionIcon(log.action)}
                       </div>
                       <div>
                          <p className="font-bold text-lg">{log.actor?.full_name || 'System Auto'}</p>
                          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mt-1">{log.actor?.role || 'SYSTEM'}</p>
                       </div>
                    </div>
                    
                    <div className="flex-1 max-w-xl mx-auto md:ml-12 border-l-2 border-slate-100 dark:border-slate-800 pl-6 py-2">
                       <h4 className="text-sm font-black uppercase tracking-widest mb-1">{log.action.replace(/_/g, ' ')}</h4>
                       <p className="text-sm font-medium text-slate-500">
                         {JSON.stringify(log.details)}
                       </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-xl">
                       <Clock className="w-4 h-4" />
                       {formatDate(log.created_at)}
                    </div>
                  </motion.div>
                )) : (
                  <div className="p-20 text-center text-muted-foreground font-medium">No system actions registered yet.</div>
                )}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
