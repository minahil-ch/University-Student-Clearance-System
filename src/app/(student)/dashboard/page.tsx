"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Sidebar } from "@/components/layout/Sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { motion, AnimatePresence } from "framer-motion"
import { formatDate } from "@/lib/utils"
import { getPortalContact, normalizeDepartmentKey } from "@/lib/portalContacts"
import { 
  GraduationCap, Phone, Mail, User, CheckCircle2, Clock, 
  AlertTriangle, Building2, Truck, BookOpen, ArrowRight, 
  FileText, Edit2, Check, ClipboardCheck, Zap, Info, 
  ExternalLink, Plus, Trash2, Edit3, ShieldCheck
} from "lucide-react"
import { Button } from "@/components/ui/Button"
import { toast } from "sonner"
import { Dialog } from "@/components/ui/Dialog"
import { Input } from "@/components/ui/Input"
import { sendEmailNotification, sendWhatsAppNotification } from "@/lib/notifications"

export default function StudentDashboard() {
  const [profile, setProfile] = useState<any>(null)
  const [clearanceData, setClearanceData] = useState<any[]>([])
  const [uniFormDone, setUniFormDone] = useState(false)
  const [clearanceStarted, setClearanceStarted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedDept, setSelectedDept] = useState<any>(null)
  const [academicForms, setAcademicForms] = useState<any[]>([])
  const [academicFormLink, setAcademicFormLink] = useState<string>("")
  const [submittingFormStatus, setSubmittingFormStatus] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCertificate, setShowCertificate] = useState(false)
  const [editProfile, setEditProfile] = useState({
    full_name: "",
    father_name: "",
    phone: "",
    cgpa: ""
  })
  const [hodContact, setHodContact] = useState<any>(null)
  const supabase = createClient()
  
  const academicDeptKey = `academic-${(profile?.department_name || "general").toLowerCase().replace(/\s+/g, "-")}`
  
  const existingKeys = Array.from(new Set(clearanceData.map(c => c.department_key)))
  const nonAcademicKeys = existingKeys.filter(k => !k.startsWith('academic-'))
  const baseOrder = ['library', 'transport', 'finance', 'hostel']
  const allNonAcademic = Array.from(new Set([...baseOrder, ...nonAcademicKeys]))
  const desiredOrder = [...allNonAcademic, academicDeptKey]

  const clearanceMap = new Map(clearanceData.map((row) => [row.department_key, row]))
  const orderedClearanceData = desiredOrder.map((key, idx) => {
    const found = clearanceMap.get(key)
    if (found) return found
    return {
      id: `virtual-${key}-${idx}`,
      department_key: key,
      status: "pending",
      remarks: key.startsWith('academic-') ? "Awaiting core clearance." : "Pending initiation.",
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    }
  })
  
  const allCoreCleared = orderedClearanceData
    .filter(d => !d.department_key.startsWith('academic-'))
    .every(d => d.status === 'cleared')

  const isFinalCleared = orderedClearanceData.length > 0 && orderedClearanceData.every((item) => item.status === "cleared")

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(profile)

    const { data: clearance } = await supabase.from('clearance_status').select('*').eq('student_id', user.id)
    const { data: futureData } = await supabase.from("future_data").select("id").eq("student_id", user.id).maybeSingle()

    if (profile?.department_name) {
      const acKey = `academic-${profile.department_name.toLowerCase().replace(/\s+/g, "-")}`
      // Fetch Multi-Forms
      const { data: forms } = await supabase
        .from("department_forms")
        .select("*")
        .eq("department_key", acKey)
        .order('created_at', { ascending: true })
      setAcademicForms(forms || [])

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
    if (profile) {
      setEditProfile({
        full_name: profile.full_name || "",
        father_name: profile.father_name || "",
        phone: profile.phone || "",
        cgpa: profile.cgpa || ""
      })
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 gap-6">
      <div className="relative">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary"></div>
        <GraduationCap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-primary" />
      </div>
      <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 animate-pulse">Authenticating Portal Access...</p>
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
    <div className="flex min-h-screen bg-[#f8fafc] dark:bg-slate-950 font-sans">
      <Sidebar role="student" />
      
      <main className="flex-1 lg:ml-64 p-6 md:p-10">
        <header className="mb-12 flex flex-col md:flex-row justify-between items-start gap-6">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase italic">
              CUI VEHARI <span className="gradient-text">CLEARANCE</span>
            </h2>
            <p className="text-slate-500 mt-2 font-medium flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500 fill-amber-500" /> Official Academic Clearance Protocol.
            </p>
          </motion.div>
          
          <div className="flex items-center gap-3">
             <Button 
               variant="outline" 
               onClick={() => setShowEditModal(true)}
               className="h-12 px-6 rounded-2xl bg-white border-slate-200 shadow-sm hover:shadow-md gap-2 font-black text-[10px] uppercase tracking-widest"
             >
               <Edit2 className="w-4 h-4" /> Edit Profile
             </Button>
          </div>
        </header>

        {/* The Clearance Roadmap */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <div className={`p-6 rounded-[2rem] border-2 transition-all duration-500 ${uniFormDone ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-100 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-2xl ${uniFormDone ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                <FileText className="w-6 h-6" />
              </div>
              {uniFormDone ? <Check className="text-emerald-500 w-6 h-6 font-bold" /> : <span className="text-[10px] font-black text-slate-300">STEP 01</span>}
            </div>
            <h4 className={`font-black uppercase tracking-tight ${uniFormDone ? 'text-emerald-900' : 'text-slate-400'}`}>University Survey</h4>
            <p className="text-xs font-medium text-slate-500 mt-1">Status: {uniFormDone ? 'Completed' : 'Action Required'}</p>
          </div>

          <div className={`p-6 rounded-[2rem] border-2 transition-all duration-500 ${clearanceStarted ? 'bg-blue-50 border-blue-100' : 'bg-white border-slate-100 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-2xl ${clearanceStarted ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                <ClipboardCheck className="w-6 h-6" />
              </div>
              {clearanceStarted ? <Check className="text-blue-500 w-6 h-6 font-bold" /> : <span className="text-[10px] font-black text-slate-300">STEP 02</span>}
            </div>
            <h4 className={`font-black uppercase tracking-tight ${clearanceStarted ? 'text-blue-900' : 'text-slate-400'}`}>Department Review</h4>
            <p className="text-xs font-medium text-slate-500 mt-1">Status: {clearanceStarted ? 'Processing' : 'Locked'}</p>
          </div>

          <div className={`p-6 rounded-[2rem] border-2 transition-all duration-500 ${isFinalCleared ? 'bg-indigo-50 border-indigo-100' : 'bg-white border-slate-100 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-2xl ${isFinalCleared ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                <GraduationCap className="w-6 h-6" />
              </div>
              {isFinalCleared ? <Check className="text-indigo-500 w-6 h-6 font-bold" /> : <span className="text-[10px] font-black text-slate-300">STEP 03</span>}
            </div>
            <h4 className={`font-black uppercase tracking-tight ${isFinalCleared ? 'text-indigo-900' : 'text-slate-400'}`}>Final Approval</h4>
            <p className="text-xs font-medium text-slate-500 mt-1">Status: {isFinalCleared ? 'Cleared' : 'Final Step'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="space-y-8">
            {/* Student ID Card */}
            <Card className="glass-card border-none overflow-hidden rounded-[2.5rem] shadow-2xl">
              <div className="h-32 bg-slate-900 relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full -mr-10 -mt-10 blur-2xl" />
                 <div className="p-8 flex items-center gap-4">
                   <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white">
                     <User className="w-8 h-8" />
                   </div>
                   <div>
                     <h3 className="text-white font-black text-lg leading-tight">{profile?.full_name}</h3>
                     <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">{profile?.reg_no || 'Registration Pending'}</p>
                   </div>
                 </div>
              </div>
              <CardContent className="p-8 space-y-6">
                <div className="space-y-4">
                   <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <Building2 className="w-4 h-4 text-slate-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Major</span>
                      </div>
                      <span className="text-xs font-black text-slate-900">{profile?.department_name || 'N/A'}</span>
                   </div>
                   <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <BookOpen className="w-4 h-4 text-slate-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">GPA</span>
                      </div>
                      <span className="text-xs font-black text-emerald-600">{profile?.cgpa || '0.00'}</span>
                   </div>
                   <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Official</span>
                      </div>
                      <span className="text-xs font-bold text-slate-900 truncate max-w-[120px]">{profile?.email}</span>
                   </div>
                </div>
              </CardContent>
            </Card>
            
            {/* HOD Consultation Card */}
            {hodContact && (
              <Card className="glass-card border-none rounded-[2.5rem] shadow-2xl overflow-hidden group">
                <div className="p-8 bg-indigo-50/50">
                   <div className="flex items-center gap-4 mb-6">
                      <div className="w-14 h-14 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
                         <ShieldCheck className="w-8 h-8" />
                      </div>
                      <div>
                         <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Head of Department</p>
                         <h4 className="text-xl font-black text-indigo-900 tracking-tighter">{hodContact.full_name}</h4>
                      </div>
                   </div>
                   
                   <div className="space-y-4">
                      <div className="flex items-center gap-3 p-4 bg-white rounded-2xl shadow-sm border border-indigo-100/50 transition-colors hover:border-indigo-300 group/item">
                         <Phone className="w-4 h-4 text-indigo-500" />
                         <span className="text-xs font-black text-slate-700">{hodContact.phone || "No phone listed"}</span>
                      </div>
                      <div className="flex items-center gap-3 p-4 bg-white rounded-2xl shadow-sm border border-indigo-100/50 transition-colors hover:border-indigo-300 group/item">
                         <Mail className="w-4 h-4 text-indigo-500" />
                         <span className="text-xs font-black text-slate-700 truncate">{hodContact.email}</span>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-3 mt-6">
                      <Button 
                        variant="outline" 
                        onClick={() => hodContact.phone && window.open(`https://wa.me/${hodContact.phone.replace(/\+/g, '')}`, '_blank')}
                        className="rounded-xl font-black uppercase text-[9px] tracking-widest h-12 border-indigo-100 hover:bg-indigo-100/50"
                      >
                        WhatsApp
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => window.location.href = `mailto:${hodContact.email}`}
                        className="rounded-xl font-black uppercase text-[9px] tracking-widest h-12 border-indigo-100 hover:bg-indigo-100/50"
                      >
                        Email HOD
                      </Button>
                   </div>
                </div>
              </Card>
            )}

            {/* Quick Actions / Assistance */}
            <Card className="p-8 bg-slate-900 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
               <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/20 rounded-full -ml-16 -mb-16 blur-xl group-hover:scale-150 transition-transform duration-700" />
               <h4 className="text-xl font-black uppercase tracking-tighter relative z-10">Need Help?</h4>
               <p className="text-white/50 text-sm mt-2 relative z-10 font-medium italic">Having issues with a specific department clearance?</p>
               <Button 
                onClick={() => window.open('tel:+923054128282')}
                className="mt-6 w-full h-14 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-[10px] relative z-10"
               >
                 Contact Admin Office
               </Button>
            </Card>
          </div>

          <div className="xl:col-span-2 space-y-8">
            <Card className="glass-card border-none rounded-[2.5rem] shadow-2xl">
              <CardHeader className="p-8 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-black uppercase tracking-tighter">Real-time Tracker</CardTitle>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Department Approval status</p>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 text-[10px] font-black uppercase text-slate-500">
                    <Clock className="w-3.5 h-3.5" /> Auto-Updating
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                {!clearanceStarted ? (
                  <div className="py-20 text-center space-y-6">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto border-2 border-dashed border-slate-200">
                      <Clock className="w-8 h-8 text-slate-300" />
                    </div>
                    <div>
                      <h4 className="text-xl font-black uppercase tracking-tighter">Clearance Not Initiated</h4>
                      <p className="text-slate-500 text-sm font-medium mt-2 max-w-sm mx-auto leading-relaxed">
                        {!uniFormDone 
                          ? "Please complete Step 1 (University Form) first before starting the clearance process." 
                          : "University Form is done! Now submit the Clearance Form to notify departments."}
                      </p>
                    </div>
                    <Button 
                      onClick={() => { window.location.href = !uniFormDone ? "/uni-form" : "/form" }}
                      className="h-16 px-10 rounded-2xl bg-primary shadow-xl shadow-primary/20 font-black uppercase tracking-widest"
                    >
                      { !uniFormDone ? "Start University Form" : "Start Clearance Form" } <ArrowRight className="ml-3 w-5 h-5" />
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {orderedClearanceData.map((item, index) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`p-6 rounded-[2rem] border-2 bg-white transition-all shadow-sm group hover:shadow-xl ${
                          item.status === 'cleared' ? 'border-emerald-100' : 
                          item.status === 'issue' ? 'border-rose-100' : 'border-slate-100'
                        }`}
                      >
                         <div className="flex items-center justify-between mb-4">
                           <div className={`p-3 rounded-2xl ${
                             item.status === 'cleared' ? 'bg-emerald-50 text-emerald-500' : 
                             item.status === 'issue' ? 'bg-rose-50 text-rose-500' : 'bg-slate-50 text-slate-400'
                           }`}>
                             {getDepartmentIcon(item.department_key)}
                           </div>
                           <StatusBadge status={item.status} className="h-8 rounded-xl px-4 text-[9px] font-black uppercase tracking-widest" />
                         </div>
                         
                         <h5 className="font-black uppercase tracking-tight text-slate-900 truncate">
                            {item.department_key.startsWith("academic-") ? "FINAL ACADEMIC" : item.department_key.replace(/_/g, " ")}
                         </h5>
                         
                         <div className="mt-4 pt-4 border-t border-slate-50">
                            {item.status === 'cleared' ? (
                               <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs">
                                  <CheckCircle2 className="w-4 h-4" /> Clearance Approved
                               </div>
                            ) : item.status === 'issue' ? (
                               <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-rose-600 font-bold text-xs">
                                     <AlertTriangle className="w-4 h-4" /> Issue Found
                                  </div>
                                  <p className="text-[10px] bg-rose-50/50 p-3 rounded-xl italic font-medium text-rose-700">&quot;{item.remarks}&quot;</p>
                                </div>
                            ) : (
                               <div className="flex items-center gap-2 text-slate-400 font-bold text-xs">
                                  <Clock className="w-4 h-4" /> In Progress
                               </div>
                            )}

                            {item.department_key.startsWith("academic-") && academicForms.length > 0 && item.status !== 'cleared' && (
                                <div className="mt-4 p-4 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-3">
                                   <div className="flex items-start gap-2">
                                     <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                                     <p className="text-[10px] font-bold text-blue-900">Academic head requires these surveys before approval:</p>
                                   </div>
                                   
                                   <div className="space-y-2">
                                      {academicForms.map((form) => (
                                         <a 
                                           key={form.id}
                                           href={form.form_link} 
                                           target="_blank" 
                                           className="p-3 bg-white rounded-xl border border-blue-100 flex items-center justify-between group hover:border-blue-400 transition-all"
                                         >
                                            <span className="text-[10px] font-black uppercase text-blue-900 truncate max-w-[150px]">{form.form_name}</span>
                                            <ExternalLink className="w-3 h-3 text-blue-400 group-hover:text-blue-600" />
                                         </a>
                                      ))}
                                   </div>
                                   
                                   {!item.form_submitted ? (
                                     <div className="pt-2">
                                        <Button 
                                           size="sm" 
                                           className="w-full rounded-xl text-[10px] font-black uppercase bg-blue-600 hover:bg-blue-700 h-10"
                                           disabled={submittingFormStatus || !allCoreCleared}
                                           onClick={async () => {
                                              setSubmittingFormStatus(true)
                                              const { error } = await supabase.from('clearance_status').update({ form_submitted: true }).eq('id', item.id)
                                              if (!error) {
                                                 toast.success("Academic Head notified!")
                                                 fetchData()
                                              } else toast.error(error.message)
                                              setSubmittingFormStatus(false)
                                           }}
                                        >
                                           {!allCoreCleared ? "Locked (Finish Core Depts)" : "I have filled all forms"}
                                        </Button>
                                     </div>
                                   ) : (
                                     <div className="flex items-center gap-2 text-emerald-600 font-black text-[10px] uppercase tracking-widest bg-emerald-50 p-3 rounded-xl">
                                        <Check className="w-4 h-4" /> All Forms Submitted for Review
                                     </div>
                                   )}
                                </div>
                             )}
                         </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {isFinalCleared && (
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="mt-12 p-1 bg-gradient-to-r from-emerald-400 via-primary to-blue-500 rounded-[2.5rem] shadow-2xl"
                  >
                    <div className="bg-white rounded-[2.4rem] p-10 flex flex-col md:flex-row items-center justify-between gap-8">
                       <div className="text-center md:text-left">
                          <h4 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">CLEARANCE COMPLETE</h4>
                          <p className="text-slate-500 font-medium mt-2">You have been cleared by all departments. Download your certificate.</p>
                       </div>
                       <Button 
                         onClick={() => setShowCertificate(true)}
                         className="h-16 px-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-500/20 font-black uppercase tracking-widest gap-3"
                       >
                         <FileText className="w-6 h-6" /> Get Certificate
                       </Button>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>

            <Card className="glass-card border-none rounded-[2.5rem] shadow-2xl overflow-hidden">
               <CardHeader className="p-8 border-b border-slate-100">
                  <CardTitle className="text-xl font-black uppercase tracking-tighter flex items-center gap-3">
                    <Phone className="w-6 h-6 text-primary" /> Department Helplines
                  </CardTitle>
               </CardHeader>
               <CardContent className="p-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {['transport', 'library', 'finance', 'hostel'].map((key) => {
                    const portal = getPortalContact(key)
                    return (
                      <div key={key} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group hover:bg-white transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
                            {getDepartmentIcon(key)}
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{portal.label}</p>
                            <p className="text-xs font-bold">{portal.phone}</p>
                          </div>
                        </div>
                        <Button variant="ghost" className="rounded-full w-10 h-10 p-0" onClick={() => window.open(`https://wa.me/${portal.phone.replace(/\+/g, '')}`, '_blank')}>
                          <Phone className="w-4 h-4" />
                        </Button>
                      </div>
                    )
                  })}
               </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Edit Profile Modal */}
      <Dialog isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Update Personal Data">
        <div className="space-y-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Full Name</label>
              <Input value={editProfile.full_name} onChange={(e) => setEditProfile({...editProfile, full_name: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Father Name</label>
              <Input value={editProfile.father_name} onChange={(e) => setEditProfile({...editProfile, father_name: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-none" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">WhatsApp Phone</label>
              <Input value={editProfile.phone} onChange={(e) => setEditProfile({...editProfile, phone: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Current CGPA</label>
              <Input value={editProfile.cgpa} onChange={(e) => setEditProfile({...editProfile, cgpa: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-none" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t pt-6">
          <Button variant="ghost" onClick={() => setShowEditModal(false)} className="rounded-xl font-bold uppercase text-[10px]">Close</Button>
          <Button 
            onClick={async () => {
              const { error } = await supabase.from('profiles').update(editProfile).eq('id', profile.id)
              if (error) toast.error(error.message)
              else { toast.success("Profile updated"); setShowEditModal(false); fetchData() }
            }}
            className="rounded-xl font-black uppercase text-[10px] bg-primary text-white px-8"
          >
            Save Profile
          </Button>
        </div>
      </Dialog>

      {/* Certificate Modal */}
      <Dialog isOpen={showCertificate} onClose={() => setShowCertificate(false)} title="Official Clearance Document">
         <div className="p-10 relative overflow-hidden bg-white text-slate-900 rounded-[2.5rem]" id="clearance-certificate">
            <div className="absolute inset-4 border-[10px] border-double border-slate-50 pointer-events-none rounded-[2rem]" />
            <div className="relative z-10 text-center space-y-10">
               <div className="flex justify-center">
                  <div className="w-24 h-24 rounded-full bg-slate-900 flex items-center justify-center text-white border-8 border-slate-50 shadow-2xl">
                     <GraduationCap className="w-12 h-12" />
                  </div>
               </div>
               
               <div className="space-y-2">
                  <h2 className="text-5xl font-black tracking-tighter uppercase italic">
                     CLEARANCE <span className="text-primary">CERTIFICATE</span>
                  </h2>
                  <p className="text-[10px] font-black tracking-[0.6em] uppercase text-slate-400">University Administration Center</p>
               </div>
               
               <div className="py-10 space-y-8 border-y-2 border-slate-50">
                  <p className="text-lg font-medium text-slate-500 italic">This document officially confirms that</p>
                  <div className="space-y-2">
                     <h3 className="text-4xl font-black tracking-tight text-slate-900">{profile?.full_name}</h3>
                     <p className="text-xl font-bold tracking-widest uppercase text-primary">{profile?.reg_no}</p>
                  </div>
                  <p className="text-sm text-slate-600 font-medium leading-relaxed max-w-lg mx-auto">
                    Has successfully completed the mandatory university clearance protocol, including Library records, 
                    Hostel dues, Transport obligations, Finance accounts, and the 
                    <span className="font-black text-slate-900 uppercase ml-1">{profile?.department_name}</span> academic survey.
                  </p>
               </div>
               
               <div className="grid grid-cols-3 gap-10 pt-10">
                  <div className="flex flex-col items-center gap-4">
                     <div className="h-0.5 bg-slate-100 w-full" />
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Registrar Office</p>
                  </div>
                  <div className="flex flex-col items-center">
                     <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center border-4 border-white shadow-xl">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                     </div>
                     <p className="text-[10px] font-black uppercase text-emerald-500 mt-4 tracking-widest">Digitally Verified</p>
                  </div>
                  <div className="flex flex-col items-center gap-4">
                     <div className="h-0.5 bg-slate-100 w-full" />
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Head of Dept.</p>
                  </div>
               </div>
            </div>
         </div>
         <div className="p-8 flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowCertificate(false)} className="rounded-xl font-bold">Cancel</Button>
            <Button onClick={() => window.print()} className="rounded-xl font-black uppercase tracking-widest text-[10px] bg-slate-900 text-white px-10 h-14">Print Official Copy</Button>
         </div>
      </Dialog>
    </div>
  )
}
