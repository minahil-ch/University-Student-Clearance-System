"use client"

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Sidebar } from "@/components/layout/Sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { motion, AnimatePresence } from "framer-motion"
import { getPortalContact } from "@/lib/portalContacts"
import { toast } from "sonner"
import { 
  Phone, Mail, User, CheckCircle2, 
  Building2, Truck, BookOpen, ArrowRight, 
  FileText, ClipboardCheck, GraduationCap, LayoutDashboard, ShieldCheck, ExternalLink,
  AlertTriangle, Lock, Clock
} from "lucide-react"
import { Logo } from "@/components/ui/Logo"
import { Button } from "@/components/ui/Button"
import { NotificationBell } from "@/components/NotificationBell"
import { Dialog } from "@/components/ui/Dialog"

export default function StudentDashboardContent() {
  const [profile, setProfile] = useState<any>(null)
  const [clearanceData, setClearanceData] = useState<any[]>([])
  const [uniFormDone, setUniFormDone] = useState(false)
  const [clearanceStarted, setClearanceStarted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showCertificate, setShowCertificate] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [hodContact, setHodContact] = useState<any>(null)
  const [deptForms, setDeptForms] = useState<any[]>([])
  const [departmentContacts, setDepartmentContacts] = useState<Record<string, string>>({})
  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])
  
  const { orderedClearanceData, allCoreCleared, isFinalCleared } = useMemo(() => {
    const academicDeptKey = `academic-${(profile?.department_name || "general").toLowerCase().replace(/\s+/g, "-")}`
    const baseOrder = ['library', 'transport', 'finance', 'hostel']
    const desiredOrder = [...baseOrder, academicDeptKey]

    const clearanceMap = new Map(clearanceData.map((row) => [row.department_key, row]))
    const data = desiredOrder.map((key, idx) => {
      const found = clearanceMap.get(key)
      if (found) return found
      return {
        id: `virtual-${key}-${idx}`,
        department_key: key,
        status: "pending",
        remarks: null,
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      }
    })

    const coreCleared = data
      .filter(d => !d.department_key.startsWith('academic-'))
      .every(d => d.status === 'cleared')

    const finalCleared = data.length > 0 && data.every((item) => item.status === "cleared")

    return { orderedClearanceData: data, allCoreCleared: coreCleared, isFinalCleared: finalCleared }
  }, [profile, clearanceData])

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(profile)

      const { data: clearance } = await supabase.from('clearance_status').select('*').eq('student_id', user.id)
      const { data: futureData } = await supabase.from("future_data").select("id").eq("student_id", user.id).maybeSingle()

      if (profile?.department_name) {
        const { data: hod } = await supabase
          .from("profiles")
          .select("full_name, email, phone")
          .eq("role", "department")
          .eq("department_name", profile.department_name)
          .maybeSingle()
        setHodContact(hod)
      }
      
      setClearanceData(clearance || [])
      setUniFormDone(Boolean(futureData))
      setClearanceStarted((clearance || []).length > 0)

      if (profile?.department_name) {
        const { data: forms } = await supabase
          .from('department_forms')
          .select('*')
          .eq('department_key', `academic-${profile.department_name.toLowerCase().replace(/\s+/g, '-')}`)
        setDeptForms(forms || [])
      }

      const { data: deptProfiles } = await supabase
         .from('profiles')
         .select('role, phone')
         .in('role', ['transport', 'library', 'finance', 'hostel'])
      
      if (deptProfiles) {
         const contactMap: Record<string, string> = {}
         deptProfiles.forEach(p => {
            if (p.phone) contactMap[p.role] = p.phone
         })
         setDepartmentContacts(contactMap)
      }
    } finally {
      setLoading(false)
    }
  }

  const markFormAsFilled = async () => {
    try {
      const academicKey = `academic-${(profile?.department_name || '').toLowerCase().replace(/\s+/g, '-')}`
      const { error } = await supabase
        .from('clearance_status')
        .update({ form_submitted: true })
        .eq('student_id', profile?.id)
        .eq('department_key', academicKey)
      
      if (error) throw error
      toast.success("Department form marked as filled!")
      setClearanceData(prev => prev.map(c => c.department_key === academicKey ? { ...c, form_submitted: true } : c))
    } catch (err: any) {
      toast.error(err.message || "Failed to mark form as filled")
    }
  }

  const academicStatus = clearanceData.find(c => c.department_key.startsWith('academic-'))
  const isAcademicFormSubmitted = academicStatus?.form_submitted === true
  const isAcademicCleared = academicStatus?.status === 'cleared'

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-sky-50/50 dark:bg-slate-950 gap-4">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary"></div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Synchronizing Hub...</p>
    </div>
  )

  const getDepartmentIcon = (key: string) => {
    if (key === 'transport') return <Truck className="w-4 h-4" />
    if (key === 'library') return <BookOpen className="w-4 h-4" />
    if (key === 'finance') return <Building2 className="w-4 h-4" />
    if (key === 'hostel') return <Building2 className="w-4 h-4" />
    if (key.startsWith('academic-')) return <GraduationCap className="w-4 h-4" />
    return <Building2 className="w-4 h-4" />
  }

  return (
    <div className="flex min-h-screen bg-sky-50/50 dark:bg-slate-950 font-sans">
      <Sidebar role="student" />
      
      <main className="flex-1 lg:ml-64 p-4 md:p-8">
        <header className="mb-8 pb-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-primary rounded-xl shadow-lg">
               <Logo className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white uppercase leading-none">
                CUI <span className="text-primary italic">Clearance</span>
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Student Portal Hub</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <NotificationBell />
             <Button 
               variant="outline" 
               size="sm"
               onClick={() => setShowProfile(!showProfile)}
               className="h-10 px-5 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm gap-2 font-bold text-[10px] uppercase tracking-widest"
             >
               <User className="w-3.5 h-3.5 text-primary" /> Profile
             </Button>
          </div>
        </header>

        {/* 🔐 First Login Security Prompt */}
        {profile?.is_first_login && (
          <div className="mb-6 p-5 bg-indigo-600 rounded-[1.5rem] text-white flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                   <Lock className="w-5 h-5" />
                </div>
                <div>
                   <h4 className="font-bold text-sm leading-tight">Security Activation Required</h4>
                   <p className="text-[10px] text-indigo-100 font-medium opacity-80">Update your temporary password to secure your academic records.</p>
                </div>
             </div>
             <Button 
               onClick={() => window.location.href = '/settings'}
               className="bg-white text-indigo-600 hover:bg-indigo-50 font-bold uppercase text-[9px] tracking-widest px-6 h-10 rounded-lg shrink-0"
             >
                Change Password
             </Button>
          </div>
        )}

        {/* 👤 Profile Personalization Prompt */}
        {!profile?.phone || !profile?.avatar_url && !profile?.is_first_login && (
          <div className="mb-6 p-5 bg-amber-500 rounded-[1.5rem] text-white flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                   <User className="w-5 h-5" />
                </div>
                <div>
                   <h4 className="font-bold text-sm leading-tight">Complete Your Identity</h4>
                   <p className="text-[10px] text-amber-50 font-medium opacity-80">Upload a profile picture and add your WhatsApp for official communication.</p>
                </div>
             </div>
             <Button 
               onClick={() => window.location.href = '/settings'}
               className="bg-white text-amber-600 hover:bg-amber-50 font-bold uppercase text-[9px] tracking-widest px-6 h-10 rounded-lg shrink-0"
             >
                Update Profile
             </Button>
          </div>
        )}

        {/* 🚀 Starter Onboarding View */}
        {!clearanceStarted ? (
          <div className="max-w-4xl mx-auto py-12">
             <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-2xl overflow-hidden p-12 text-center space-y-8 relative group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 transition-transform group-hover:scale-110 duration-700" />
                
                <div className="w-20 h-20 rounded-[1.5rem] bg-sky-50 dark:bg-slate-800 text-primary flex items-center justify-center mx-auto shadow-inner">
                   <FileText className="w-8 h-8" />
                </div>
                
                <div className="space-y-4">
                   <h3 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white uppercase leading-none italic">
                     Initialize <span className="text-primary not-italic">Clearance Protocol</span>
                   </h3>
                   <p className="text-slate-500 font-medium text-sm max-w-lg mx-auto leading-relaxed">
                     Welcome, {profile?.full_name}! To begin your final graduation journey, you must first initiate the official clearance workflow. This will notify all relevant departments (Library, Transport, Finance, etc.) to review your status.
                   </p>
                </div>

                <div className="pt-4 flex flex-col items-center gap-6">
                   <Button 
                     onClick={() => window.location.href = uniFormDone ? "/form" : "/uni-form"}
                     className="h-14 px-12 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xl shadow-slate-900/20 font-bold text-[11px] uppercase tracking-widest gap-4 active:scale-95 transition-all group"
                   >
                      {uniFormDone ? "Start Proper Clearance" : "Start University Survey"} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                   </Button>
                   
                   {!uniFormDone && (
                     <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <ShieldCheck className="w-4 h-4" /> Multi-Step Institutional Protocol Active
                     </div>
                   )}
                </div>
             </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* 📊 Live Tracker View */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               {[
                 { label: "Completed Steps", value: orderedClearanceData.filter(s => s.status === 'cleared').length, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
                 { label: "Pending Reviews", value: orderedClearanceData.filter(s => s.status === 'pending').length, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
                 { label: "Critical Issues", value: orderedClearanceData.filter(s => s.status === 'issue').length, icon: AlertTriangle, color: "text-rose-500", bg: "bg-rose-500/10" },
               ].map((stat, i) => (
                 <Card key={i} className="glass-card border-none shadow-xl rounded-3xl overflow-hidden group hover:scale-[1.02] transition-all">
                    <CardContent className="p-6 flex items-center justify-between">
                       <div>
                          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">{stat.label}</p>
                          <h4 className="text-2xl font-bold tracking-tighter">{stat.value} / {orderedClearanceData.length}</h4>
                       </div>
                       <div className={`w-10 h-10 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center`}>
                          <stat.icon className="w-5 h-5" />
                       </div>
                    </CardContent>
                 </Card>
               ))}
            </div>

            <Card className="glass-card border-none rounded-[2rem] shadow-2xl overflow-hidden">
               <CardHeader className="p-6 border-b border-slate-50 dark:border-white/5 bg-slate-900 text-white flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                     <LayoutDashboard className="w-5 h-5 text-primary" />
                     <CardTitle className="text-sm font-bold uppercase tracking-widest">Verification Roadmap</CardTitle>
                  </div>
                  <div className="flex items-center gap-3">
                     <span className="text-[10px] font-bold text-slate-400 uppercase">Progress</span>
                     <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${(orderedClearanceData.filter(s => s.status === 'cleared').length / (orderedClearanceData.length || 1)) * 100}%` }}
                          className="h-full bg-primary"
                        />
                     </div>
                  </div>
               </CardHeader>
               <CardContent className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                     {orderedClearanceData.map((item, index) => (
                       <motion.div 
                         key={item.id}
                         initial={{ opacity: 0, y: 10 }}
                         animate={{ opacity: 1, y: 0 }}
                         transition={{ delay: index * 0.05 }}
                         className={`p-4 rounded-2xl border transition-all duration-500 ${
                           item.status === 'cleared' ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-500/5 dark:border-emerald-500/20' : 
                           item.status === 'issue' ? 'bg-rose-50 border-rose-200 dark:bg-rose-500/10' : 
                           'bg-white dark:bg-slate-900 border-slate-100 dark:border-white/5'
                         }`}
                       >
                          <div className="flex items-center justify-between mb-3">
                             <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                               item.status === 'cleared' ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                             }`}>
                                {getDepartmentIcon(item.department_key)}
                             </div>
                             <StatusBadge status={item.status} className="text-[8px] h-5 px-2 font-bold uppercase" />
                          </div>
                          <p className="text-[9px] font-bold uppercase text-slate-400 tracking-wider leading-none mb-1">{item.department_key}</p>
                          <h5 className="font-bold text-slate-900 dark:text-white text-[11px] truncate">
                            {item.department_key.startsWith("academic-") ? "Final Academic" : item.department_key.replace(/_/g, " ")}
                          </h5>
                          {item.remarks && <p className="text-[9px] font-bold text-rose-500 mt-2 italic line-clamp-1">&quot;{item.remarks}&quot;</p>}
                       </motion.div>
                     ))}
                  </div>
               </CardContent>
            </Card>

            {/* 📍 Department Help & Contacts (More Compact) */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
               <Card className="glass-card border-none rounded-[2rem] shadow-xl overflow-hidden">
                  <CardHeader className="px-6 py-4 border-b border-slate-100">
                     <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                        <Phone className="w-4 h-4 text-primary" /> Helplines
                     </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 grid grid-cols-2 gap-3">
                     {['transport', 'library', 'finance', 'hostel'].map((key) => (
                       <div key={key} className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl flex items-center justify-between group">
                          <div className="flex items-center gap-3">
                             <div className="w-7 h-7 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
                                {getDepartmentIcon(key)}
                             </div>
                             <p className="text-[10px] font-bold text-slate-600 uppercase">{key}</p>
                          </div>
                          <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => departmentContacts[key] && window.open(`tel:${departmentContacts[key]}`, '_self')}>
                             <Phone className="w-3 h-3" />
                          </Button>
                       </div>
                     ))}
                  </CardContent>
               </Card>

               {hodContact && (
                 <Card className="glass-card border-none rounded-[2rem] shadow-xl overflow-hidden bg-indigo-50/50">
                    <CardContent className="p-6 flex items-center justify-between gap-6 h-full">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg">
                             <GraduationCap className="w-6 h-6" />
                          </div>
                          <div>
                             <p className="text-[9px] font-bold uppercase tracking-widest text-indigo-400">Head of Department</p>
                             <h4 className="text-base font-bold text-indigo-900">{hodContact.full_name}</h4>
                             <p className="text-[10px] font-bold text-indigo-700/60 truncate">{hodContact.email}</p>
                          </div>
                       </div>
                       <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="h-9 rounded-lg border-indigo-200 text-indigo-600 font-bold text-[9px] uppercase tracking-widest" onClick={() => window.open(`https://wa.me/${hodContact.phone?.replace(/\+/g, '')}`, '_blank')}>WhatsApp</Button>
                          <Button size="sm" className="h-9 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[9px] uppercase tracking-widest px-4">Contact</Button>
                       </div>
                    </CardContent>
                 </Card>
               )}
            </div>
          </div>
        )}
      </main>

      {/* 👤 Profile Modal (More Professional) */}
      <AnimatePresence>
        {showProfile && (
          <Dialog isOpen={showProfile} onClose={() => setShowProfile(false)} title="Student Identity Profile">
             <div className="p-8 text-center space-y-6">
                <div className="w-24 h-24 rounded-3xl bg-slate-100 dark:bg-slate-800 mx-auto flex items-center justify-center font-bold text-3xl text-slate-400 border-4 border-white shadow-2xl overflow-hidden">
                   {profile?.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" /> : profile?.full_name?.[0]}
                </div>
                <div>
                   <h3 className="text-xl font-bold uppercase tracking-tight">{profile?.full_name}</h3>
                   <p className="text-xs font-bold text-primary mt-1">{profile?.reg_no}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-4">
                   <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-left">
                      <p className="text-[8px] font-bold uppercase text-slate-400 tracking-widest mb-1">Department</p>
                      <p className="text-[10px] font-bold truncate">{profile?.department_name}</p>
                   </div>
                   <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-left">
                      <p className="text-[8px] font-bold uppercase text-slate-400 tracking-widest mb-1">Session</p>
                      <p className="text-[10px] font-bold">{profile?.session || "N/A"}</p>
                   </div>
                </div>
                <div className="pt-4 space-y-3">
                   <Button onClick={() => window.location.href = '/settings'} className="w-full h-12 rounded-xl bg-slate-900 text-white font-bold uppercase text-[10px] tracking-widest shadow-xl">Complete Profile Customization</Button>
                   <p className="text-[9px] font-bold text-slate-400 uppercase italic">Verification Photo & WhatsApp Required</p>
                </div>
             </div>
          </Dialog>
        )}
      </AnimatePresence>

      {/* 📜 Certificate Modal */}
      <Dialog isOpen={showCertificate} onClose={() => setShowCertificate(false)} title="Official Clearance Document">
         <div className="p-8 text-center space-y-6">
            <h3 className="text-2xl font-bold uppercase italic tracking-tighter">Clearance <span className="text-primary">Certificate</span></h3>
            <p className="text-sm text-slate-500 font-medium">This document confirms that <strong>{profile?.full_name}</strong> has completed all institutional clearance protocols.</p>
            <div className="pt-6">
               <Button onClick={() => window.print()} className="h-12 w-full rounded-xl bg-primary text-white font-bold uppercase text-[10px] tracking-widest">Download Official PDF</Button>
            </div>
         </div>
      </Dialog>
    </div>
  )
}
