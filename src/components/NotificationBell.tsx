"use client"

import { useEffect, useState } from "react"
import { Bell, Check, Trash2, Clock, Info, AlertTriangle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/Button"
import { formatDate } from "@/lib/utils"

export function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const supabase = createClient()

  const fetchNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (data) {
      setNotifications(data)
      setUnreadCount(data.filter(n => !n.is_seen).length)
    }
  }

  useEffect(() => {
    fetchNotifications()

    // Realtime updates
    const channel = supabase
      .channel('notifications-db')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        fetchNotifications()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const markAsSeen = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('notifications')
      .update({ is_seen: true })
      .eq('user_id', user.id)
      .eq('is_seen', false)
    
    setUnreadCount(0)
    setNotifications(prev => prev.map(n => ({ ...n, is_seen: true })))
  }

  const deleteNotification = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id)
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  return (
    <div className="relative z-50">
      <button 
        onClick={() => {
          setIsOpen(!isOpen)
          if (!isOpen && unreadCount > 0) markAsSeen()
        }}
        className="relative p-3 rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-xl transition-all group"
      >
        <Bell className="w-5 h-5 text-slate-500 group-hover:text-primary transition-colors" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 animate-bounce">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 top-full mt-4 w-80 md:w-96 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 dark:border-slate-800 overflow-hidden z-[9999]"
            >
              <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                <h4 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Recent Alerts</h4>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button onClick={markAsSeen} className="text-[10px] font-bold text-primary hover:underline">Mark all read</button>
                  )}
                </div>
              </div>

              <div className="max-h-[400px] overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((n) => (
                    <div 
                      key={n.id} 
                      className={`p-5 border-b border-slate-50 dark:border-slate-800 flex gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group relative ${!n.is_seen ? 'bg-primary/5' : ''}`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        n.type === 'issue' ? 'bg-rose-500/10 text-rose-500' : 
                        n.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 
                        'bg-blue-500/10 text-blue-500'
                      }`}>
                        {n.type === 'issue' ? <AlertTriangle className="w-5 h-5" /> : 
                         n.type === 'success' ? <Check className="w-5 h-5" /> : 
                         <Info className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                           <p className="text-xs font-black text-slate-900 dark:text-white leading-tight">{n.title}</p>
                           <button onClick={() => deleteNotification(n.id)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 transition-all">
                             <Trash2 className="w-3 h-3" />
                           </button>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{n.message}</p>
                        <div className="flex items-center gap-2 pt-1">
                           <Clock className="w-3 h-3 text-slate-300" />
                           <span className="text-[9px] font-bold text-slate-300 uppercase">{formatDate(n.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-20 text-center flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                       <Bell className="w-8 h-8 text-slate-200" />
                    </div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No new notifications</p>
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 text-center">
                 <button className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors">View All Notifications</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
