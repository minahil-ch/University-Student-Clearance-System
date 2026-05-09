"use client"
export const dynamic = 'force-dynamic'

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Sidebar } from "@/components/layout/Sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { motion, AnimatePresence } from "framer-motion"
import { formatDate } from "@/lib/utils"
import { 
  Bell, CheckCircle2, AlertTriangle, Clock, 
  Send, Mail, ShieldCheck
} from "lucide-react"
import { canonicalClearanceDepartmentKey } from "@/lib/departmentKeys"

export default function DepartmentNotificationsPage() {
  const params = useParams()
  const rawDept = Array.isArray(params?.dept) ? params.dept[0] : params?.dept
  const deptString = typeof rawDept === 'string' ? rawDept : ''

  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const departmentKey = deptString ? canonicalClearanceDepartmentKey(deptString) : ''

  const fetchLogs = async () => {
    // In a real scenario, we might filter by department name.
    // For now, we'll try to fetch logs that match the department string closely.
    const cleanDeptName = deptString.replace(/-/g, ' ').toLowerCase()

    const { data } = await supabase
      .from('notification_logs')
      .select('*')
      .ilike('department', `%${cleanDeptName}%`)
      .order('created_at', { ascending: false })
      .limit(50)
    
    setLogs(data || [])
    setLoading(false)
  }

  useEffect(() => {
    if (deptString) fetchLogs()
  }, [deptString])

  if (!deptString) return null

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-sky-50/50 dark:bg-slate-950">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-sky-50/50 dark:bg-slate-950">
      <Sidebar role="department" departmentName={deptString} />
      
      <main className="flex-1 w-full lg:ml-64 p-6 md:p-10">
        <header className="mb-12">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="flex items-center gap-3 mb-2">
               <Badge className="bg-primary/10 text-primary border-none rounded-lg px-3 py-1 text-xs font-bold font-medium text-muted-foreground">Outbox Log</Badge>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-primary">
              CUI <span className="text-primary not-italic">CLEARANCE SYSTEM</span>
            </h2>
            <p className="text-slate-500 font-bold text-lg mt-2 leading-relaxed flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" /> Automated Communication Log
            </p>
          </motion.div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
           <div className="xl:col-span-1">
              <Card className="glass-card border-none rounded-[2.5rem] shadow-2xl overflow-hidden sticky top-6">
                 <CardHeader className="p-8 bg-slate-900 text-white">
                    <div className="flex items-center gap-4">
                       <Mail className="w-8 h-8 text-primary" />
                       <div>
                          <CardTitle className="text-xl font-bold tracking-tight">Dispatch Metrics</CardTitle>
                          <p className="text-xs font-bold font-medium text-muted-foreground text-slate-400 mt-1">Institutional Outreach</p>
                       </div>
                    </div>
                 </CardHeader>
                 <CardContent className="p-8 space-y-6">
                    <div className="flex items-center justify-between p-4 bg-sky-50/50 rounded-2xl">
                       <p className="text-xs font-bold font-medium text-muted-foreground text-slate-400">Total Sent</p>
                       <p className="text-2xl font-bold text-slate-900">{logs.length}</p>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-2xl">
                       <p className="text-xs font-bold font-medium text-muted-foreground text-emerald-600">Approvals</p>
                       <p className="text-2xl font-bold text-emerald-600">{logs.filter(l => l.status === 'cleared').length}</p>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-rose-50 rounded-2xl">
                       <p className="text-xs font-bold font-medium text-muted-foreground text-rose-600">Issues Flagged</p>
                       <p className="text-2xl font-bold text-rose-600">{logs.filter(l => l.status === 'issue').length}</p>
                    </div>
                 </CardContent>
              </Card>
           </div>

           <div className="xl:col-span-2 space-y-4">
             <AnimatePresence>
               {logs.length === 0 ? (
                 <div className="py-20 text-center text-slate-400 font-medium flex flex-col items-center gap-4 bg-white rounded-[2.5rem] shadow-sm border border-slate-100">
                   <div className="w-20 h-20 bg-sky-50/50 rounded-full flex items-center justify-center">
                     <Bell className="w-10 h-10 text-slate-300" />
                   </div>
                   <p className="text-xs font-bold font-medium text-muted-foreground">No outbound notifications yet.</p>
                 </div>
               ) : (
                 logs.map((item, i) => (
                   <motion.div
                     key={item.id}
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     transition={{ delay: i * 0.05 }}
                   >
                     <Card className="glass-card border-none rounded-[2rem] shadow-xl hover:shadow-2xl transition-all duration-300 group">
                       <CardContent className="p-6 flex items-start gap-6">
                         <div className={`p-4 rounded-[1.5rem] flex-shrink-0 ${
                           item.status === 'cleared' ? 'bg-emerald-500/10 text-emerald-500' : 
                           item.status === 'issue' ? 'bg-rose-500/10 text-rose-500' : 'bg-slate-100 text-slate-500'
                         }`}>
                           {item.status === 'cleared' ? <CheckCircle2 className="w-6 h-6" /> : 
                            item.status === 'issue' ? <AlertTriangle className="w-6 h-6" /> : 
                            <Mail className="w-6 h-6" />}
                         </div>
                         
                         <div className="flex-1 min-w-0">
                           <div className="flex justify-between items-start mb-2">
                             <div>
                               <h4 className="text-sm font-bold font-medium text-muted-foreground text-slate-900 truncate">
                                 To: {item.recipient_email}
                               </h4>
                               <p className="text-xs font-bold text-slate-400 font-medium text-muted-foreground mt-0.5">
                                 From: {item.sender_email || "System"}
                               </p>
                             </div>
                             <div className="flex items-center gap-2 text-xs font-bold font-medium text-muted-foreground text-slate-400 bg-sky-50/50 px-3 py-1.5 rounded-full border border-slate-100">
                               <Clock className="w-3 h-3" />
                               {formatDate(item.created_at)}
                             </div>
                           </div>
                           
                           <div className="mt-4">
                             {item.status === 'cleared' ? (
                               <Badge className="bg-emerald-500 hover:bg-emerald-600 border-none px-3 py-1 text-xs font-bold font-medium text-muted-foreground">
                                 Clearance Approved
                               </Badge>
                             ) : item.status === 'issue' ? (
                               <div>
                                 <Badge className="bg-rose-500 hover:bg-rose-600 border-none px-3 py-1 text-xs font-bold font-medium text-muted-foreground mb-3">
                                   Issue Flagged
                                 </Badge>
                                 <div className="bg-rose-50/50 p-4 rounded-2xl text-xs font-medium italic text-rose-700 border border-rose-100/50">
                                   "{item.remarks}"
                                 </div>
                               </div>
                             ) : (
                               <Badge className="bg-slate-900 border-none px-3 py-1 text-xs font-bold font-medium text-muted-foreground">
                                 System Update
                               </Badge>
                             )}
                           </div>
                         </div>
                       </CardContent>
                     </Card>
                   </motion.div>
                 ))
               )}
             </AnimatePresence>
           </div>
        </div>
      </main>
    </div>
  )
}
