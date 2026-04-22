"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Sidebar } from "@/components/layout/Sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { motion, AnimatePresence } from "framer-motion"
import { formatDate } from "@/lib/utils"
import { 
  Bell, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  CalendarDays
} from "lucide-react"

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Since we don't have a dedicated notifications table, we will use clearance_status changes as mock notifications for now
    const { data: clearance } = await supabase
      .from('clearance_status')
      .select('*')
      .eq('student_id', user.id)
      .order('updated_at', { ascending: false })
    
    setNotifications(clearance || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchNotifications()

    // Real-time subscription to catch instant pushes
    const channel = supabase
      .channel('notifications-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clearance_status' },
        (payload) => {
          fetchNotifications()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar role="student" />
      
      <main className="flex-1 w-full lg:ml-64 p-4 md:p-6 xl:p-8">
        <header className="mb-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h2 className="text-4xl font-black tracking-tight flex items-center gap-4">
              Real-Time <span className="text-primary italic">Live Feed</span>
              <Bell className="w-8 h-8 text-primary animate-bounce delay-100" />
            </h2>
            <p className="text-muted-foreground mt-2 font-medium">Tracking all departmental verdicts securely</p>
          </motion.div>
        </header>

        <div className="max-w-4xl mx-auto space-y-6">
          <AnimatePresence>
            {notifications.length === 0 ? (
              <div className="py-20 text-center text-muted-foreground font-medium flex flex-col items-center gap-4">
                <Bell className="w-12 h-12 opacity-20" />
                No updates from the clearance network yet.
              </div>
            ) : (
              notifications.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className="glass-card border-none shadow-xl hover:shadow-2xl transition-all duration-300">
                    <CardContent className="p-6 flex items-start gap-6">
                      <div className={`p-4 rounded-full flex-shrink-0 ${
                        item.status === 'cleared' ? 'bg-emerald-500/10 text-emerald-500' : 
                        item.status === 'issue' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'
                      }`}>
                        {item.status === 'cleared' ? <CheckCircle2 className="w-6 h-6" /> : 
                         item.status === 'issue' ? <AlertTriangle className="w-6 h-6" /> : 
                         <Clock className="w-6 h-6" />}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h4 className="text-lg font-black uppercase tracking-widest">{item.department_key.replace(/_/g, ' ')}</h4>
                          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground bg-slate-100 dark:bg-slate-900 px-3 py-1 rounded-full">
                            <CalendarDays className="w-3 h-3" />
                            {formatDate(item.updated_at)}
                          </div>
                        </div>
                        
                        <div className="mt-2 text-slate-600 dark:text-slate-300">
                          {item.status === 'cleared' ? (
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">Verfied & Cleared successfully!</span>
                          ) : item.status === 'issue' ? (
                            <div>
                              <span className="font-bold text-rose-600 dark:text-rose-400">Clearance Blocked! Action Required.</span>
                              <div className="bg-rose-50 dark:bg-rose-950/50 p-4 rounded-xl mt-3 text-sm italic border border-rose-100 dark:border-rose-900/50">
                                "{item.remarks}"
                              </div>
                            </div>
                          ) : (
                            <span className="font-medium text-amber-600 dark:text-amber-400">Your profile is under review by organizational staff.</span>
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
      </main>
    </div>
  )
}
