"use client"
export const dynamic = 'force-dynamic'

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Sidebar } from "@/components/layout/Sidebar"
import { Card, CardContent } from "@/components/ui/Card"
import { motion, AnimatePresence } from "framer-motion"
import { formatDate } from "@/lib/utils"
import { 
  History as HistoryIcon,
  CheckCircle2, 
  AlertTriangle,
  FileText
} from "lucide-react"

export default function StaffHistoryPage() {
  const [profile, setProfile] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: pData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (pData) {
        setProfile(pData)
        
        let deptKey = pData.role
        if (pData.role === 'department') {
          deptKey = pData.department_name.toLowerCase().replace(/\s+/g, '-')
        }

        // Fetch logs
        const { data: logs } = await supabase
          .from('audit_logs')
          .select(`
            *,
            student:target_student_id (full_name, reg_no)
          `)
          .eq('actor_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50)
        
        setHistory(logs || [])
      }
      setLoading(false)
    }

    fetchData()
  }, [])

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {profile && <Sidebar role={profile.role} departmentName={profile.department_name} />}
      
      <main className="flex-1 w-full lg:ml-64 p-4 md:p-6 xl:p-8">
        <header className="mb-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h2 className="text-4xl font-black tracking-tight flex items-center gap-4">
              Staff <span className="text-primary italic">History</span>
              <HistoryIcon className="w-8 h-8 text-primary" />
            </h2>
            <p className="text-muted-foreground mt-2 font-medium">Your authorized audit footprint and past decisions</p>
          </motion.div>
        </header>

        <div className="max-w-4xl mx-auto space-y-6">
          <AnimatePresence>
            {history.length === 0 ? (
              <div className="py-20 text-center text-muted-foreground font-medium flex flex-col items-center gap-4">
                <FileText className="w-12 h-12 opacity-20" />
                No actions taken yet.
              </div>
            ) : (
              history.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className="glass-card border-none shadow-md hover:shadow-xl transition-all duration-300">
                    <CardContent className="p-6 flex items-center justify-between gap-6">
                      <div className="flex items-center gap-4">
                        <div className={`p-4 rounded-full flex-shrink-0 ${
                          item.action.includes('cleared') ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                        }`}>
                          {item.action.includes('cleared') ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                        </div>
                        
                        <div>
                          <h4 className="text-lg font-black tracking-widest">{item.student?.full_name}</h4>
                          <p className="text-sm font-bold text-muted-foreground">{item.student?.reg_no}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full inline-block mb-2 ${
                            item.action.includes('cleared') ? 'bg-emerald-500' : 'bg-rose-500'
                          } text-white`}>
                          {item.action.replace(/_/g, ' ')}
                        </div>
                        <p className="text-xs font-medium text-muted-foreground">{formatDate(item.created_at)}</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
