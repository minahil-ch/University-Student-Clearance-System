"use client"

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Sidebar } from "@/components/layout/Sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { motion, AnimatePresence } from "framer-motion"
import { formatDate } from "@/lib/utils"
import { getPortalContact } from "@/lib/portalContacts"
import { toast } from "sonner"
import { 
  Phone, Mail, User, CheckCircle2, 
  Building2, Truck, BookOpen, ArrowRight, 
  FileText, ClipboardCheck, GraduationCap, LayoutDashboard, ShieldCheck, ExternalLink
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
        // Fetch HOD Contact
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-sky-50/50 dark:bg-slate-950 gap-6">
      <div className="relative">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8">
          <Logo className="w-8 h-8" />
        </div>
      </div>
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-400 animate-pulse">Authenticating Portal Access...</p>
    </div>
  )

  const getDepartmentIcon = (key: string) => {
    if (key === 'transport') return <Truck className="w-5 h-5" />
    if (key === 'library') return <BookOpen className="w-5 h-5" />
    if (key === 'finance') return <Building2 className="w-5 h-5" />
    if (key === 'hostel') return <Building2 className="w-5 h-5" />
    if (key.startsWith('academic-')) return <GraduationCap className="w-5 h-5" />
    return <Building2 className="w-5 h-5" />
  }

  return (
    <div className="flex min-h-screen bg-sky-50/50 dark:bg-slate-950 font-sans">
      <Sidebar role="student" />
      
      <main className="flex-1 lg:ml-64 p-6 md:p-10 overflow-visible">
        <header className="mb-14 pb-6 border-b-[3px] border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start gap-8 relative z-40 overflow-visible">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-primary uppercase px-4 leading-none italic">
              CUI <span className="not-italic">CLEARANCE SYSTEM</span>
            </h2>
            <div className="flex items-center gap-3 mt-4 px-4">
              <div className="flex -space-x-2">
                <div className="w-6 h-6 rounded-full bg-blue-500 border-2 border-white dark:border-slate-950" />
                <div className="w-6 h-6 rounded-full bg-indigo-500 border-2 border-white dark:border-slate-950" />
              </div>
              <p className="text-slate-600 dark:text-slate-400 font-bold text-sm tracking-tight">
                Official Institutional Hub &bull; Student Access
              </p>
            </div>
          </motion.div>
          <div className="flex items-center gap-4 px-4 relative">
             <NotificationBell />
             <div className="relative">
                <Button 
                  variant="outline" 
                  onClick={() => setShowProfile(!showProfile)}
                  className={`h-14 px-8 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all gap-2 font-bold text-[11px] tracking-wider ${showProfile ? 'border-primary text-primary' : ''}`}
                >
                  <User className="w-4 h-4 text-primary" /> My Profile
                </Button>
                
                {/* Profile Card Dropdown */}
                <AnimatePresence>
                  {showProfile && (
                    <>
                      <div className="fixed inset-0 z-[9998]" onClick={() => setShowProfile(false)} />
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 top-full mt-4 w-72 bg-white dark:bg-slate-900 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 dark:border-slate-800 p-8 overflow-hidden z-[9999]"
                      >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12" />
                        <div className="flex flex-col items-center text-center space-y-4">
                           <div className="w-20 h-20 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-2xl text-slate-400 border border-slate-200 dark:border-slate-700">
                              {profile?.full_name?.[0]}
                           </div>
                           <div>
                              <h4 className="text-lg font-bold text-slate-900 dark:text-white uppercase leading-none">{profile?.full_name}</h4>
                              <p className="text-xs font-bold text-primary font-medium text-muted-foreground mt-1.5">{profile?.reg_no}</p>
                           </div>
                           <div className="w-full h-px bg-sky-50/50 dark:bg-slate-800 my-2" />
                           <div className="w-full space-y-3 text-left">
                              <div className="flex justify-between items-center text-xs font-bold font-medium text-muted-foreground text-slate-400">
                                 <span>CGPA</span>
                                 <span className="text-emerald-500 font-bold">{profile?.cgpa || '0.00'}</span>
                              </div>
                              <div className="flex justify-between items-center text-xs font-bold font-medium text-muted-foreground text-slate-400">
                                 <span>Dept</span>
                                 <span className="text-slate-900 dark:text-white font-bold">{profile?.department_name}</span>
                              </div>
                              <div className="flex justify-between items-center text-xs font-bold font-medium text-muted-foreground text-slate-400">
                                 <span>Session</span>
                                 <span className="text-slate-900 dark:text-white font-bold">{profile?.session || 'N/A'}</span>
                              </div>
                           </div>
                           <Button 
                             onClick={() => window.location.href = '/settings'}
                             className="w-full h-12 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold font-medium text-muted-foreground text-xs shadow-xl active:scale-95 transition-all"
                           >
                              Edit Profile
                           </Button>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
             </div>
          </div>
        </header>

        {/* The Clearance Roadmap - Premium Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 relative z-10">
          {[
            { 
              done: uniFormDone, 
              label: "University Survey", 
              step: "STEP 01", 
              icon: FileText, 
              color: "emerald",
              desc: uniFormDone ? "Verified & Locked" : "Action Required"
            },
            { 
              done: allCoreCleared, 
              label: "Department Review", 
              step: "STEP 02", 
              icon: ClipboardCheck, 
              color: "emerald",
              desc: allCoreCleared ? "Requirements Met" : (uniFormDone ? "Awaiting Approvals" : "Awaiting Survey")
            },
            { 
              done: isFinalCleared, 
              label: "Final Approval", 
              step: "STEP 03", 
              icon: GraduationCap, 
              color: "emerald",
              desc: isFinalCleared ? "Institutional Cleared" : "Pending Signature"
            }
          ].map((step, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`group relative p-8 rounded-[2.5rem] border-[3px] transition-all duration-700 overflow-hidden ${
                step.done 
                ? 'bg-white dark:bg-slate-900 border-primary/20 shadow-2xl shadow-primary/5' 
                : 'bg-white/40 dark:bg-slate-900/20 border-slate-900 dark:border-slate-800'
              }`}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
              
              <div className="flex items-center justify-between mb-6">
                <div className={`p-4 rounded-2xl shadow-lg transition-transform group-hover:scale-110 ${
                  step.done ? `bg-emerald-500 text-white` : 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white'
                }`}>
                  <step.icon className="w-6 h-6" />
                </div>
                <span className={`text-[11px] font-bold tracking-widest ${step.done ? 'text-emerald-500' : 'text-slate-700 dark:text-slate-400'}`}>
                  {step.done ? <CheckCircle2 className="w-6 h-6" /> : step.step}
                </span>
              </div>
              
              <h4 className={`text-xl font-bold tracking-tight leading-none ${step.done ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                {step.label}
              </h4>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-400 mt-3 flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${step.done ? 'bg-emerald-500 animate-pulse' : 'bg-slate-900 dark:bg-slate-400'}`} />
                {step.desc}
              </p>
            </motion.div>
          ))}
        </div>

        <div className="flex flex-col gap-8">
           {/* Live Status Tracker - Full Width */}
           {uniFormDone ? (
             <div className="w-full">
              <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-2xl overflow-hidden group">
                <div className="p-10 border-b border-slate-50 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
                   <div className="flex items-center gap-6 text-center md:text-left">
                      <div className="w-16 h-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                         <LayoutDashboard className="w-8 h-8" />
                      </div>
                      <div>
                         <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-none uppercase">Live Status <span className="text-primary italic">Tracker</span></h3>
                         <p className="text-xs font-bold text-slate-400 mt-2 tracking-wider">Official Campus Verification Queue</p>
                      </div>
                   </div>
                   <div className="flex flex-col items-center md:items-end">
                      <div className="flex items-center gap-4 mb-2">
                         <span className="text-xs font-bold text-slate-400 font-medium text-muted-foreground">Global Completion</span>
                         <span className="text-2xl font-bold text-emerald-500 italic">
                           {Math.round((orderedClearanceData.filter(s => s.status === 'cleared').length / (orderedClearanceData.length || 1)) * 100)}%
                         </span>
                      </div>
                      <div className="w-48 h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 shadow-inner">
                         <motion.div 
                           initial={{ width: 0 }}
                           animate={{ width: `${(orderedClearanceData.filter(s => s.status === 'cleared').length / (orderedClearanceData.length || 1)) * 100}%` }}
                           className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full"
                         />
                      </div>
                   </div>
                </div>

                <div className="p-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {orderedClearanceData.map((item, index) => (
                      <motion.div 
                        key={item.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className={`group/item flex items-center justify-between p-6 rounded-3xl border-[3px] transition-all duration-500 ${
                          item.status === 'cleared' ? 'bg-emerald-50/30 border-emerald-100 dark:bg-emerald-500/5 dark:border-emerald-500/20' : 
                          item.status === 'issue' ? 'bg-rose-50/30 border-rose-100 dark:bg-rose-500/5 dark:border-rose-500/20' : 
                          'bg-white dark:bg-slate-900 border-slate-900 dark:border-white/20 shadow-sm hover:shadow-xl'
                        }`}
                      >
                        <div className="flex items-center gap-5">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover/item:scale-110 shadow-lg ${
                            item.status === 'cleared' ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 
                            item.status === 'issue' ? 'bg-rose-500 text-white shadow-rose-500/20' : 
                            'bg-sky-50/50 dark:bg-slate-950 text-slate-300'
                          }`}>
                            {getDepartmentIcon(item.department_key)}
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase text-slate-400 tracking-[0.2em] mb-1 leading-none">{item.department_key}</p>
                            <h5 className="font-bold text-slate-900 dark:text-white text-sm tracking-tight">
                              {item.department_key.startsWith("academic-") ? "Final Academic" : item.department_key.replace(/_/g, " ")}
                            </h5>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                           <StatusBadge status={item.status} className="h-8 rounded-xl px-4 text-xs font-bold font-medium text-muted-foreground border-none shadow-sm" />
                           {item.remarks && <p className="text-xs font-bold text-rose-500 mt-1 italic max-w-[100px] truncate">&quot;{item.remarks}&quot;</p>}
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="mt-10 p-10 bg-emerald-600 rounded-[2.5rem] text-white text-center space-y-4 relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
                    <div className="relative z-10">
                      <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                         <CheckCircle2 className="w-8 h-8 text-white" />
                      </div>
                      <h4 className="text-2xl font-bold tracking-tight">Clearance Form Filed</h4>
                      <p className="text-emerald-100 font-medium text-sm max-w-sm mx-auto leading-relaxed">
                        Your clearance request is currently being processed by the departments. You will be notified of any updates.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
             </div>
           ) : (
             <div className="w-full">
                <div className="p-10 bg-blue-600 rounded-[2.5rem] text-white text-center space-y-6 relative overflow-hidden shadow-2xl">
                   <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
                   <div className="relative z-10">
                      <h4 className="text-2xl font-bold tracking-tight">Start Clearance Process</h4>
                      <p className="text-blue-100 font-medium text-sm mt-2 max-w-sm mx-auto leading-relaxed">
                        Please fill the clearance form. One-click initiation will guide you through the mandatory university survey and department clearance.
                      </p>
                      <div className="pt-6">
                         <Button 
                           onClick={() => { window.location.href = "/uni-form" }}
                           className="h-16 px-12 rounded-2xl bg-white text-blue-600 hover:bg-slate-100 shadow-2xl shadow-black/20 font-bold font-medium text-muted-foreground text-xs gap-3 active:scale-95 transition-all"
                         >
                            Start Filing Clearance Form <ArrowRight className="w-5 h-5" />
                         </Button>
                      </div>
                   </div>
                </div>
             </div>
           )}

                  {/* Department Specific Forms Section */}
                  {uniFormDone && deptForms.length > 0 && (
                    <div className="mt-10">
                       <div className="flex items-center gap-3 mb-6 px-4">
                          <FileText className="w-6 h-6 text-primary" />
                          <h4 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">Academic Department Forms</h4>
                       </div>
                       
                       {(isAcademicCleared || isAcademicFormSubmitted) ? (
                         <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-[2.5rem] p-10 flex items-center justify-center gap-5 text-emerald-600 shadow-inner">
                            <CheckCircle2 className="w-10 h-10" />
                            <div>
                               <h5 className="font-bold text-xl uppercase tracking-tight">Form Submitted Successfully</h5>
                               <p className="text-sm font-bold font-medium opacity-80 mt-1 text-emerald-600/80">The academic department is reviewing your clearance request.</p>
                            </div>
                         </div>
                       ) : (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {deptForms.map((form) => (
                              <Card key={form.id} className="glass-card border-[3px] border-slate-900 dark:border-slate-800 rounded-[2rem] shadow-xl overflow-hidden group hover:scale-[1.02] transition-all">
                                 <CardContent className="p-8 flex flex-col xl:flex-row items-center justify-between gap-6">
                                    <div className="flex items-center gap-4 w-full">
                                       <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                          <ClipboardCheck className="w-6 h-6" />
                                       </div>
                                       <div className="overflow-hidden">
                                          <h5 className="font-bold text-slate-900 dark:text-white uppercase text-sm leading-tight truncate">{form.form_name}</h5>
                                          <p className="text-[11px] font-bold text-slate-400 font-medium text-muted-foreground mt-1 tracking-wider uppercase">Required for HOD Approval</p>
                                       </div>
                                    </div>
                                    <div className="flex gap-3 w-full xl:w-auto mt-4 xl:mt-0">
                                      <Button 
                                        onClick={() => window.open(form.form_link, '_blank')}
                                        variant="outline" 
                                        className="h-12 flex-1 xl:w-12 xl:flex-none rounded-xl p-0 text-slate-400 hover:text-primary hover:border-primary transition-all bg-white"
                                        title="Open Form"
                                      >
                                         <ExternalLink className="w-5 h-5" />
                                      </Button>
                                      <Button 
                                        onClick={markFormAsFilled}
                                        className="h-12 flex-[2] xl:w-auto rounded-xl px-6 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[11px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 whitespace-nowrap"
                                      >
                                         Mark as Filled
                                      </Button>
                                    </div>
                                 </CardContent>
                              </Card>
                            ))}
                         </div>
                       )}
                    </div>
                  )}
           {/* Helplines and HOD - Side by Side */}
           <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              {/* Helplines */}
              <div className="xl:col-span-2">
                <Card className="glass-card border-[3px] border-slate-900 dark:border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden h-full">
                  <CardHeader className="p-8 border-b border-slate-100">
                      <CardTitle className="text-xl font-bold tracking-tight flex items-center gap-3">
                        <Phone className="w-6 h-6 text-primary" /> Department Helplines
                      </CardTitle>
                  </CardHeader>
                  <CardContent className="p-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {['transport', 'library', 'finance', 'hostel'].map((key) => {
                        const portal = getPortalContact(key)
                        const realPhone = departmentContacts[key] || 'Not Provided'
                        return (
                          <div key={key} className="p-5 bg-sky-50/50 rounded-2xl border border-slate-100 flex items-center justify-between group hover:bg-white transition-all">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
                                {getDepartmentIcon(key)}
                              </div>
                              <div>
                                <p className="text-xs font-bold font-medium text-muted-foreground text-slate-400">{portal.label}</p>
                                <p className="text-xs font-bold text-slate-900">{realPhone}</p>
                              </div>
                            </div>
                            <Button variant="ghost" className="rounded-full w-10 h-10 p-0" onClick={() => realPhone !== 'Not Provided' && window.open(`https://wa.me/${realPhone.replace(/\+/g, '')}`, '_blank')}>
                              <Phone className="w-4 h-4 text-slate-900" />
                            </Button>
                          </div>
                        )
                      })}
                  </CardContent>
                </Card>
              </div>

              {/* HOD Card */}
              <div className="xl:col-span-1">
                {hodContact && (
                  <Card className="glass-card shadow-lg border-[3px] border-slate-900 hover:border-slate-950 dark:border-slate-800 dark:hover:border-slate-700 hover:shadow-xl transition-all duration-300 rounded-[2rem] overflow-hidden group h-full">
                    <div className="p-8 bg-indigo-50/50 h-full flex flex-col">
                       <div className="flex items-center gap-4 mb-6">
                          <div className="w-14 h-14 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
                             <ShieldCheck className="w-8 h-8" />
                          </div>
                          <div>
                             <p className="text-xs font-bold font-medium text-muted-foreground text-indigo-400">Head of Department</p>
                             <h4 className="text-xl font-bold text-indigo-900 tracking-tight">{hodContact.full_name}</h4>
                          </div>
                       </div>
                       
                        <div className="space-y-4 flex-1">
                          <button 
                            onClick={() => hodContact.phone && window.open(`tel:${hodContact.phone}`, '_self')}
                            className="w-full flex items-center gap-3 p-4 bg-white rounded-2xl shadow-sm border border-indigo-100/50 transition-all hover:border-indigo-400 hover:shadow-md group/item text-left"
                          >
                             <Phone className="w-4 h-4 text-indigo-500" />
                             <span className="text-xs font-bold text-slate-700">{hodContact.phone || "No phone listed"}</span>
                          </button>
                          <button 
                            onClick={() => window.location.href = `mailto:${hodContact.email}`}
                            className="w-full flex items-center gap-3 p-4 bg-white rounded-2xl shadow-sm border border-indigo-100/50 transition-all hover:border-indigo-400 hover:shadow-md group/item text-left"
                          >
                             <Mail className="w-4 h-4 text-indigo-500" />
                             <span className="text-xs font-bold text-slate-700 truncate">{hodContact.email}</span>
                          </button>
                        </div>

                       <div className="grid grid-cols-2 gap-3 mt-6">
                          <Button 
                            variant="outline" 
                            onClick={() => hodContact.phone && window.open(`https://wa.me/${hodContact.phone.replace(/\+/g, '')}`, '_blank')}
                            className="rounded-xl font-bold uppercase text-xs tracking-widest h-12 border-indigo-100 hover:bg-indigo-100/50"
                          >
                            WhatsApp
                          </Button>
                          <Button 
                            variant="outline"
                            onClick={() => window.location.href = `mailto:${hodContact.email}`}
                            className="rounded-xl font-bold uppercase text-xs tracking-widest h-12 border-indigo-100 hover:bg-indigo-100/50"
                          >
                            Email HOD
                          </Button>
                       </div>
                    </div>
                  </Card>
                )}
              </div>
           </div>
        </div>
      </main>

      {/* Certificate Modal */}
      <Dialog isOpen={showCertificate} onClose={() => setShowCertificate(false)} title="Official Clearance Document">
         <div className="p-10 relative overflow-hidden bg-white text-slate-900 rounded-[2.5rem]" id="clearance-certificate">
            <div className="absolute inset-4 border-[10px] border-double border-slate-50 pointer-events-none rounded-[2rem]" />
            <div className="relative z-10 text-center space-y-10">
               <div className="flex justify-center">
                  <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center text-white border-8 border-slate-50 shadow-2xl p-4">
                     <Logo className="w-full h-full" />
                  </div>
               </div>
               
               <div className="space-y-2">
                  <h2 className="text-5xl font-bold tracking-tight uppercase italic">
                     CLEARANCE <span className="text-primary">CERTIFICATE</span>
                  </h2>
                  <p className="text-xs font-bold tracking-[0.6em] uppercase text-slate-400">University Administration Center</p>
               </div>
               
               <div className="py-10 space-y-8 border-y-2 border-slate-50">
                  <p className="text-lg font-medium text-slate-500 italic">This document officially confirms that</p>
                  <div className="space-y-2">
                     <h3 className="text-4xl font-bold tracking-tight text-slate-900">{profile?.full_name}</h3>
                     <p className="text-xl font-bold tracking-widest uppercase text-primary">{profile?.reg_no}</p>
                  </div>
                  <p className="text-sm text-slate-600 font-medium leading-relaxed max-w-lg mx-auto">
                    Has successfully completed the mandatory university clearance protocol, including Library records, 
                    Hostel dues, Transport obligations, Finance accounts, and the 
                    <span className="font-bold text-slate-900 uppercase ml-1">{profile?.department_name}</span> academic survey.
                  </p>
               </div>
               
               <div className="grid grid-cols-3 gap-10 pt-10">
                  <div className="flex flex-col items-center gap-4">
                     <div className="h-0.5 bg-slate-100 w-full" />
                     <p className="text-xs font-bold font-medium text-muted-foreground text-slate-400">Registrar Office</p>
                  </div>
                  <div className="flex flex-col items-center">
                     <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center border-4 border-white shadow-xl">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                     </div>
                     <p className="text-xs font-bold uppercase text-emerald-500 mt-4 tracking-widest">Digitally Verified</p>
                  </div>
                  <div className="flex flex-col items-center gap-4">
                     <div className="h-0.5 bg-slate-100 w-full" />
                     <p className="text-xs font-bold font-medium text-muted-foreground text-slate-400">Head of Dept.</p>
                  </div>
               </div>
            </div>
         </div>
         <div className="p-8 flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowCertificate(false)} className="rounded-xl font-bold">Cancel</Button>
            <Button onClick={() => window.print()} className="rounded-xl font-bold font-medium text-muted-foreground text-xs bg-slate-900 text-white px-10 h-14">Print Official Copy</Button>
         </div>
      </Dialog>
    </div>
  )
}
