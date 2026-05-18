"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Sidebar } from "@/components/layout/Sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Truck, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  GraduationCap, 
  ShieldCheck,
  ArrowRight,
  Send,
  FileSearch,
  Phone,
  Mail,
  Lock
} from "lucide-react"
import { toast } from "sonner"
import { Logo } from "@/components/ui/Logo"
import { StatusBadge } from "@/components/ui/StatusBadge"

export default function DispatchPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [requesting, setRequesting] = useState(false)
  const [academicCleared, setAcademicCleared] = useState(false)
  const [dispatchStatus, setDispatchStatus] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [dispatchStaff, setDispatchStaff] = useState<any>(null)

  useEffect(() => {
    fetchStatus()
  }, [])

  const fetchStatus = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: pData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(pData)

      const { data: clearances } = await supabase
        .from('clearance_status')
        .select('*')
        .eq('student_id', user.id)

      if (clearances) {
        const academic = clearances.find(c => c.department_key.startsWith('academic-'))
        const dispatch = clearances.find(c => c.department_key === 'dispatch')
        
        setAcademicCleared(academic?.status === 'cleared')
        setDispatchStatus(dispatch)

        // Fetch Dispatch Staff Contact
        const { data: staff } = await supabase
          .from('profiles')
          .select('full_name, email, phone')
          .eq('role', 'dispatch')
          .eq('is_approved', true)
          .maybeSingle()
        setDispatchStaff(staff)
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRequestDispatch = async () => {
    setRequesting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const { error } = await supabase
        .from('clearance_status')
        .upsert({
          student_id: user.id,
          department_key: 'dispatch',
          status: 'pending',
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      toast.success("Degree issuance request sent to Dispatch Portal!")
      fetchStatus()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setRequesting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-sky-50/50 dark:bg-slate-950 gap-6">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary" />
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-400">Loading Degree Status...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-sky-50/50 dark:bg-slate-950">
      <Sidebar role="student" />
      
      <main className="flex-1 lg:ml-64 p-6 md:p-10">
        <header className="mb-12">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
             <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                   <Truck className="w-6 h-6" />
                </div>
                <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white uppercase italic">
                  Dispatch & <span className="text-primary">Degree Award</span>
                </h2>
             </div>
             <p className="text-slate-500 font-bold text-sm ml-16 italic">Track your final degree issuance and logistics status.</p>
          </motion.div>
        </header>

        <div className="max-w-4xl">
           <AnimatePresence mode="wait">
              {!academicCleared ? (
                <motion.div
                  key="locked"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white dark:bg-slate-900 rounded-[3rem] border border-rose-100 dark:border-rose-950/30 p-16 text-center space-y-8 shadow-2xl"
                >
                   <div className="w-24 h-24 rounded-[2rem] bg-rose-50 dark:bg-rose-950/20 text-rose-500 flex items-center justify-center mx-auto shadow-inner">
                      <AlertCircle className="w-12 h-12" />
                   </div>
                   <div className="space-y-4">
                      <h3 className="text-2xl font-bold text-rose-600 uppercase italic">Clearance Pending</h3>
                      <p className="text-slate-500 max-w-md mx-auto font-medium leading-relaxed text-sm">
                         Your clearance is not approved yet. You can&apos;t dispatch now.
                      </p>
                   </div>
                   
                   <div className="pt-4">
                      <Button 
                        disabled
                        className="h-16 px-12 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 font-bold font-medium text-xs gap-4 cursor-not-allowed uppercase tracking-widest"
                      >
                         Send Request to Dispatch <Lock className="w-4 h-4" />
                      </Button>
                   </div>

                   <div className="pt-2">
                      <div className="inline-flex items-center gap-3 px-6 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-full text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                         <Clock className="w-4 h-4 text-primary" /> Sequential Protocol Active
                      </div>
                   </div>
                </motion.div>
              ) : (
                <motion.div
                  key="active"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-8"
                >
                   <Card className="glass-card border-none shadow-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-[3rem] overflow-hidden group">
                      <CardHeader className="p-10 border-b border-slate-100 dark:border-white/5 relative overflow-hidden">
                         <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/5 rounded-full -mr-20 -mt-20 blur-3xl group-hover:scale-150 transition-transform duration-700" />
                         <div className="flex items-center justify-between">
                            <div className="space-y-2">
                               <div className="inline-flex items-center gap-3 px-4 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                  <span className="text-xs font-bold tracking-wider text-emerald-500 italic uppercase">Academic Clearance Verified</span>
                               </div>
                               <CardTitle className="text-3xl font-bold tracking-tight">DEGREE <span className="text-primary italic">ISSUANCE</span></CardTitle>
                            </div>
                            <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-white/5 flex items-center justify-center p-3 shadow-xl">
                               <Logo />
                            </div>
                         </div>
                      </CardHeader>
                      <CardContent className="p-10 space-y-10">
                         {dispatchStatus ? (
                           <div className="space-y-8">
                              <div className="flex items-center justify-between p-8 bg-sky-50/50 dark:bg-slate-950/50 rounded-[2.5rem] border border-slate-100 dark:border-white/5">
                                 <div className="flex items-center gap-6">
                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${
                                      dispatchStatus.status === 'cleared' ? 'bg-emerald-500 text-white' : 'bg-primary text-white'
                                    }`}>
                                       <Truck className="w-8 h-8" />
                                    </div>
                                    <div>
                                       <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Current Request Status</p>
                                       <h4 className="text-xl font-bold text-slate-900 dark:text-white uppercase italic">Degree Processing</h4>
                                    </div>
                                 </div>
                                 <StatusBadge status={dispatchStatus.status} className="h-10 px-6 rounded-xl font-bold text-sm" />
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                 <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-white/5">
                                    <div className="flex items-center gap-3 mb-4">
                                       <Clock className="w-5 h-5 text-primary" />
                                       <h5 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-tight">Timeline</h5>
                                    </div>
                                    <div className="space-y-4">
                                       <div className="flex items-center gap-3">
                                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                          <p className="text-xs font-bold text-slate-500">Request Received: {new Date(dispatchStatus.created_at).toLocaleDateString()}</p>
                                       </div>
                                       <div className="flex items-center gap-3">
                                          <div className={`w-2 h-2 rounded-full ${dispatchStatus.status === 'cleared' ? 'bg-emerald-500' : 'bg-slate-300 animate-pulse'}`} />
                                          <p className="text-xs font-bold text-slate-500">Award Status: {dispatchStatus.status === 'cleared' ? 'Degree Awarded' : 'Under Verification'}</p>
                                       </div>
                                    </div>
                                 </div>
                                 <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-white/5">
                                    <div className="flex items-center gap-3 mb-4">
                                       <AlertCircle className="w-5 h-5 text-rose-500" />
                                       <h5 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-tight">Remarks</h5>
                                    </div>
                                    <p className="text-xs font-bold text-slate-400 italic leading-relaxed">
                                       {dispatchStatus.remarks || "No administrative remarks yet. Your request is being processed by the Degree Issuance Cell."}
                                    </p>
                                 </div>
                              </div>
                           </div>
                         ) : (
                           <div className="text-center py-10 space-y-8">
                              <div className="w-20 h-20 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto animate-bounce">
                                 <Send className="w-8 h-8" />
                              </div>
                              <div className="space-y-4">
                                 <h3 className="text-2xl font-bold text-slate-900 dark:text-white uppercase italic">Ready for Dispatch Request</h3>
                                 <p className="text-slate-500 max-w-md mx-auto font-medium text-sm leading-relaxed">
                                    Congratulations! You are eligible to request your degree issuance. Click below to notify the Degree Awarded Portal.
                                 </p>
                              </div>
                              <Button 
                                onClick={handleRequestDispatch}
                                disabled={requesting}
                                className="h-16 px-12 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xl shadow-slate-900/20 font-bold font-medium text-muted-foreground text-sm gap-4 active:scale-95 transition-all uppercase tracking-widest"
                              >
                                 {requesting ? "Sending Request..." : <>Send Request to Dispatch <ArrowRight className="w-5 h-5" /></>}
                              </Button>
                           </div>
                         )}
                      </CardContent>
                   </Card>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-xl flex items-center gap-6 group hover:border-primary transition-all">
                       <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <FileSearch className="w-7 h-7" />
                       </div>
                       <div>
                          <h5 className="font-bold text-slate-900 dark:text-white uppercase text-sm tracking-tight">Record Verification</h5>
                          <p className="text-xs font-bold text-slate-400 mt-1">Cross-referencing all cleared portals.</p>
                       </div>
                    </div>
                    {dispatchStaff && (
                      <div className="p-8 bg-indigo-600 rounded-[2.5rem] text-white shadow-xl flex flex-col justify-between group hover:scale-[1.02] transition-all">
                         <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                               <ShieldCheck className="w-6 h-6" />
                            </div>
                            <div>
                               <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Issuance Coordinator</p>
                               <h5 className="font-bold text-sm truncate">{dispatchStaff.full_name}</h5>
                            </div>
                         </div>
                         <div className="flex gap-3">
                            {dispatchStaff.phone && (
                              <Button 
                                onClick={() => window.open(`https://wa.me/${dispatchStaff.phone.replace(/\+/g, '')}`, '_blank')}
                                variant="outline" 
                                className="flex-1 rounded-xl h-12 bg-white/10 border-white/20 hover:bg-white/20 text-white font-bold text-xs"
                              >
                                WhatsApp
                              </Button>
                            )}
                            <Button 
                              onClick={() => window.location.href = `mailto:${dispatchStaff.email}`}
                              variant="outline" 
                              className="flex-1 rounded-xl h-12 bg-white/10 border-white/20 hover:bg-white/20 text-white font-bold text-xs"
                            >
                              Email
                            </Button>
                         </div>
                      </div>
                    )}
                 </div>
              </motion.div>
              )}
           </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
