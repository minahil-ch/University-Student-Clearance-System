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
  GraduationCap, 
  Phone, 
  Mail, 
  User, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Building2,
  Truck,
  BookOpen,
  ArrowRight,
  FileText,
  Edit2
} from "lucide-react"
import { Button } from "@/components/ui/Button"
import { toast } from "sonner"
import { Dialog } from "@/components/ui/Dialog"
import { Input } from "@/components/ui/Input"
import { sendEmailNotification, sendWhatsAppNotification } from "@/lib/notifications"

// Initializing Student Dashboard Node
export default function StudentDashboard() {
  const [profile, setProfile] = useState<any>(null)
  const [clearanceData, setClearanceData] = useState<any[]>([])
  /** Step 1: University Form (future_data) */
  const [uniFormDone, setUniFormDone] = useState(false)
  /** Step 2: Clearance Form submitted (clearance rows exist) */
  const [clearanceStarted, setClearanceStarted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedDept, setSelectedDept] = useState<any>(null)
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
  const supabase = createClient()
  const academicDeptKey = `academic-${(profile?.department_name || "general").toLowerCase().replace(/\s+/g, "-")}`
  
  // Dynamic order: all non-academic first, then academic
  const existingKeys = Array.from(new Set(clearanceData.map(c => c.department_key)))
  const nonAcademicKeys = existingKeys.filter(k => !k.startsWith('academic-'))
  // Ensure common ones are always present even if not started? 
  // Actually, better to just show what's in the DB plus the academic one.
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
      remarks: key.startsWith('academic-') ? "Waiting for other departments." : "Waiting for workflow routing.",
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    }
  })
  const isFinalCleared = orderedClearanceData.length > 0 && orderedClearanceData.every((item) => item.status === "cleared")

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Fetch Profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    
    setProfile(profile)

    // Fetch Clearance Status
    const { data: clearance } = await supabase
      .from('clearance_status')
      .select('*')
      .eq('student_id', user.id)

    const { data: futureData } = await supabase
      .from("future_data")
      .select("id")
      .eq("student_id", user.id)
      .maybeSingle()

    if (profile?.department_name) {
      const acKey = `academic-${profile.department_name.toLowerCase().replace(/\s+/g, "-")}`
      const { data: settings } = await supabase
        .from("department_settings")
        .select("google_form_link")
        .eq("department_key", acKey)
        .maybeSingle()
      if (settings) {
        setAcademicFormLink(settings.google_form_link || "")
      }
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

    // Real-time subscription
    const channel = supabase
      .channel('clearance-updates')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'clearance_status' },
        (payload) => {
          if (payload.new.student_id === profile?.id) {
            toast.info(`${payload.new.department_key.replace(/_/g, ' ').toUpperCase()} has updated your status!`)
            fetchData()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile?.id])

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      <p className="text-sm font-black uppercase tracking-widest text-muted-foreground animate-pulse">Checking Clearance Profile...</p>
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
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar role="student" />
      
      <main className="flex-1 w-full lg:ml-64 p-4 md:p-6 xl:p-8">
        <header className="mb-10">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase italic">
              Welcome, <span className="text-primary text-emerald-500">{profile?.full_name || "Student"}</span>
            </h2>
            <p className="text-muted-foreground mt-1 text-sm font-medium">
              Monitor your clearance in real-time.
            </p>
          </motion.div>
          <div className="mt-4 flex gap-3">
             <Button 
               variant="outline" 
               size="sm" 
               onClick={() => setShowEditModal(true)}
               className="rounded-xl border-slate-200 dark:border-slate-800 font-bold gap-2 text-[10px] uppercase tracking-widest"
             >
               <Edit2 className="w-3.5 h-3.5" /> Edit Profile
             </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* User Profile Card */}
          <Card className="glass-card shadow-xl border-none overflow-hidden h-fit">
            <div className="h-24 bg-gradient-to-r from-primary via-emerald-500 to-blue-600"></div>
            <CardContent className="p-6 -mt-12 text-center">
              <div className="w-24 h-24 rounded-[2rem] bg-white dark:bg-slate-900 flex items-center justify-center mx-auto mb-4 shadow-xl relative border-[3px] border-white dark:border-slate-800">
                <GraduationCap className="w-12 h-12 text-primary" />
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1.5 rounded-lg shadow-md">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-xl font-black tracking-tight">{profile?.full_name}</h3>
              <p className="text-xs font-bold text-primary mt-1 uppercase tracking-widest">
                {clearanceStarted ? profile?.reg_no : "Hidden until clearance form"}
              </p>
              {!clearanceStarted && (
                <p className="text-xs text-amber-600 mt-3 font-semibold">
                  Your clearance form is pending. Please complete it.
                </p>
              )}
              
              <div className="mt-6 grid grid-cols-1 gap-3 text-left">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Father Name</p>
                    <p className="font-bold">{profile?.father_name || "N/A"}</p>
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Department</p>
                    <p className="font-bold">{clearanceStarted ? (profile?.department_name || "N/A") : "Hidden until clearance form"}</p>
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Current CGPA</p>
                    <p className="font-bold">{clearanceStarted ? (profile?.cgpa || "0.00") : "Hidden until clearance form"}</p>
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Official Email</p>
                    <p className="font-bold truncate">{profile?.email}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Clearance Progress Grid */}
          <div className="xl:col-span-2 space-y-8">
            <Card className="glass-card shadow-2xl border-none">
              <CardHeader className="p-8 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl font-black uppercase tracking-tighter">Clearance Tracking</CardTitle>
                  <Button variant="outline" className="rounded-full gap-2 border-2 hover:bg-slate-100">
                    <History className="w-4 h-4" /> Full History
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <AnimatePresence>
                    {!clearanceStarted ? (
                      <div className="col-span-2 text-center py-20 bg-slate-50 dark:bg-slate-900 rounded-[2rem] border-2 border-dashed">
                        <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        {!uniFormDone ? (
                          <>
                            <p className="text-xl font-bold text-slate-600 dark:text-slate-300">Your clearance form is pending. Please complete it.</p>
                            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                              Submit the University Form first, then the Clearance Form.
                            </p>
                            <Button className="mt-6 rounded-full px-8 bg-primary shadow-xl" onClick={() => { window.location.href = "/uni-form" }}>
                              Start registration <ArrowRight className="ml-2 w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <p className="text-xl font-bold text-slate-600 dark:text-slate-300">Your clearance form is pending. Please complete it.</p>
                            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                              University Form is complete. Submit your clearance details to notify departments.
                            </p>
                            <Button className="mt-6 rounded-full px-8 bg-emerald-600 hover:bg-emerald-700 shadow-xl" onClick={() => { window.location.href = "/form" }}>
                              Continue to Clearance Form <ArrowRight className="ml-2 w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    ) : (
                      orderedClearanceData.map((item, index) => (
                        <motion.div 
                          key={item.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.1 }}
                          className={`group p-6 rounded-[2rem] border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-primary/30 transition-all duration-300 shadow-sm hover:shadow-xl cursor-pointer ${
                            item.department_key.startsWith("academic-") ? "md:col-span-2 min-h-[220px]" : ""
                          }`}
                          onClick={() => setSelectedDept(item)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault()
                              setSelectedDept(item)
                            }
                          }}
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className={`p-4 rounded-2xl ${
                              item.status === 'cleared' ? 'bg-emerald-500/10 text-emerald-500' : 
                              item.status === 'issue' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'
                            }`}>
                              {getDepartmentIcon(item.department_key)}
                            </div>
                            <StatusBadge status={item.status} className="h-8 rounded-full px-4 text-[10px] font-black uppercase tracking-widest" />
                          </div>
                          
                          <h4 className="text-lg font-black uppercase tracking-tight">
                            {item.department_key.startsWith("academic-")
                              ? `academic (${item.department_key.replace("academic-", "").replace(/-/g, " ")})`
                              : item.department_key.replace(/_/g, ' ')}
                          </h4>
                          
                          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                            {item.status === 'cleared' ? (
                              <div className="flex items-center gap-2 text-emerald-500 font-bold text-sm">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>
                                  {item.department_key.startsWith("academic-")
                                    ? "ACADEMIC approved your final clearance!"
                                    : `${item.department_key.replace(/_/g, ' ').toUpperCase()} cleared you!`}
                                </span>
                              </div>
                            ) : item.status === 'issue' ? (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-rose-500 font-bold text-sm">
                                  <AlertTriangle className="w-4 h-4" />
                                  <span>Issue Reported</span>
                                </div>
                                <p className="text-xs bg-rose-50 text-rose-600 p-3 rounded-xl italic font-medium">
                                  &quot;{item.remarks}&quot;
                                </p>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-amber-500 font-bold text-sm">
                                <Clock className="w-4 h-4" />
                                <span>Pending Approval</span>
                              </div>
                            )}

                            {item.department_key.startsWith("academic-") && academicFormLink && item.status !== 'cleared' && (
                              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                {item.form_submitted ? (
                                  <div className="text-emerald-500 text-xs font-bold flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4" /> Form submitted, awaiting academic head approval
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-2">
                                    <p className="text-xs text-rose-500 font-bold">Action Required: Fill out the academic clearance form before approval.</p>
                                    <a href={academicFormLink} target="_blank" className="text-xs text-blue-500 underline font-medium w-fit mb-2">Open Google Form</a>
                                    <Button 
                                      size="sm" 
                                      className="w-fit text-[10px] uppercase tracking-widest font-black rounded-xl"
                                      disabled={submittingFormStatus}
                                      onClick={async (e) => {
                                        e.stopPropagation()
                                        setSubmittingFormStatus(true)
                                        const { error } = await supabase
                                          .from('clearance_status')
                                          .update({ form_submitted: true })
                                          .eq('id', item.id)
                                        if (!error) {
                                          toast.success("Form marked as submitted. Notification sent to Academic Head.")
                                          
                                          // Notify Academic Head
                                          const { data: headProfile } = await supabase
                                            .from('profiles')
                                            .select('email, phone')
                                            .eq('role', 'department')
                                            .eq('department_name', profile.department_name)
                                            .single()

                                          if (headProfile) {
                                            await Promise.allSettled([
                                              sendEmailNotification({
                                                name: profile.full_name,
                                                email: profile.email,
                                                phone: profile.phone,
                                                recipientEmail: headProfile.email,
                                                recipientPhone: headProfile.phone,
                                                regNo: profile.reg_no,
                                                department: `ACADEMIC - ${profile.department_name}`,
                                                eventType: "portal_alert",
                                                remarks: `Student ${profile.full_name} (${profile.reg_no}) has filled the Google Form. Please verify and approve.`
                                              }),
                                              sendWhatsAppNotification({
                                                name: profile.full_name,
                                                email: profile.email,
                                                phone: profile.phone,
                                                recipientPhone: headProfile.phone,
                                                regNo: profile.reg_no,
                                                department: `ACADEMIC - ${profile.department_name}`,
                                                eventType: "portal_alert",
                                                remarks: `Student ${profile.full_name} has filled the form. Check the portal.`
                                              })
                                            ])
                                          }

                                          fetchData()
                                        } else {
                                          toast.error(error.message)
                                        }
                                        setSubmittingFormStatus(false)
                                      }}
                                    >
                                      I have filled the form
                                    </Button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          
                          <p className="text-[10px] text-muted-foreground mt-4 uppercase tracking-widest font-black opacity-50">
                            Last Update: {formatDate(item.updated_at)}
                          </p>
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                </div>

                {isFinalCleared && (
                  <div className="mt-8 p-1 bg-gradient-to-r from-emerald-500 via-primary to-blue-500 rounded-[2.2rem] shadow-2xl">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.1rem] p-8">
                      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div>
                          <h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                            Congratulations! Your clearance is complete.
                          </h4>
                          <p className="text-muted-foreground mt-2 font-medium">
                            All departments have verified your status. You are officially cleared for graduation.
                          </p>
                        </div>
                        <Button 
                          onClick={() => setShowCertificate(true)}
                          className="h-16 px-10 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest gap-3 shadow-xl shadow-emerald-500/20 active:scale-95 transition-all"
                        >
                          <FileText className="w-6 h-6" /> View Official Certificate
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {selectedDept && (
                  <div className="mt-6 rounded-2xl border bg-slate-50 dark:bg-slate-900 p-5">
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Department Details</p>
                    <h4 className="text-lg font-black mt-1">
                      {selectedDept.department_key.startsWith("academic-")
                        ? `ACADEMIC (${selectedDept.department_key.replace("academic-", "").replace(/-/g, " ").toUpperCase()})`
                        : selectedDept.department_key.replace(/_/g, " ").toUpperCase()}
                    </h4>
                    <div className="grid sm:grid-cols-2 gap-3 mt-4 text-sm">
                      <p>Contact: {getPortalContact(selectedDept.department_key).phone}</p>
                      <p>Request Submitted: {formatDate(selectedDept.created_at || selectedDept.updated_at)}</p>
                      <p>Status: {selectedDept.status}</p>
                      <p>Approval Time: {selectedDept.status === "cleared" ? formatDate(selectedDept.updated_at) : "Pending"}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="glass-card shadow-2xl border-none">
              <CardHeader className="p-8 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-xl font-black uppercase tracking-widest text-primary flex items-center gap-3">
                  <Phone className="w-6 h-6" /> Portal Contact Directory
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {['transport', 'library', 'finance', 'hostel', profile?.department_name || 'Academic'].map((key) => {
                    const portal = getPortalContact(key.startsWith('Academic') ? `academic-${normalizeDepartmentKey(profile?.department_name || '')}` : key);
                    const colors: any = { transport: 'amber', library: 'violet', finance: 'rose', hostel: 'emerald' };
                    const color = colors[portal.key] || 'blue';
                    
                    return (
                      <div key={portal.key} className="flex flex-col gap-4 p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-xl bg-${color}-500/10 text-${color}-500`}>
                            {portal.key === 'library' ? <BookOpen className="w-5 h-5" /> : 
                             portal.key === 'transport' ? <Truck className="w-5 h-5" /> :
                             portal.key === 'finance' ? <Building2 className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{portal.label}</p>
                            <p className="font-bold text-sm tracking-tighter">{portal.phone}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 border-t pt-4 border-slate-100 dark:border-slate-800">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1 rounded-xl text-[9px] uppercase font-black"
                            onClick={() => window.open(`https://wa.me/${portal.phone.replace(/\+/g, '')}`, '_blank')}
                          >
                            WhatsApp
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1 rounded-xl text-[9px] uppercase font-black"
                            onClick={() => window.location.href = `mailto:${portal.email}`}
                          >
                            Email
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card bg-slate-900 text-white border-none shadow-2xl p-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full -mr-32 -mt-32 group-hover:scale-110 transition-transform duration-700" />
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h3 className="text-3xl font-black uppercase tracking-tighter">Need Assistance?</h3>
                  <p className="text-white/60 mt-2 font-medium italic">Contact the administration office for urgent clearance queries.</p>
                </div>
                <Button onClick={() => window.open('tel:+923054128282')} className="bg-primary hover:bg-primary/90 text-white rounded-full px-8 h-14 font-black uppercase tracking-widest shadow-xl shadow-primary/20">
                  Call Admin Office
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </main>

      {/* Profile Edit Modal */}
      <Dialog isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Profile">
        <div className="space-y-4 py-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Full Name</label>
            <Input 
              value={editProfile.full_name} 
              onChange={(e) => setEditProfile({...editProfile, full_name: e.target.value})}
              className="rounded-xl border-none bg-slate-50 dark:bg-slate-800"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Father Name</label>
            <Input 
              value={editProfile.father_name} 
              onChange={(e) => setEditProfile({...editProfile, father_name: e.target.value})}
              className="rounded-xl border-none bg-slate-50 dark:bg-slate-800"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Phone</label>
            <Input 
              value={editProfile.phone} 
              onChange={(e) => setEditProfile({...editProfile, phone: e.target.value})}
              className="rounded-xl border-none bg-slate-50 dark:bg-slate-800"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">CGPA</label>
            <Input 
              value={editProfile.cgpa} 
              onChange={(e) => setEditProfile({...editProfile, cgpa: e.target.value})}
              className="rounded-xl border-none bg-slate-50 dark:bg-slate-800"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setShowEditModal(false)} className="rounded-xl font-bold uppercase text-[10px]">Cancel</Button>
          <Button 
            onClick={async () => {
              const { error } = await supabase.from('profiles').update({
                full_name: editProfile.full_name,
                father_name: editProfile.father_name,
                phone: editProfile.phone,
                cgpa: editProfile.cgpa
              }).eq('id', profile.id)
              if (error) toast.error(error.message)
              else {
                toast.success("Profile updated successfully")
                setShowEditModal(false)
                fetchData()
              }
            }}
            className="rounded-xl font-black uppercase text-[10px] tracking-widest bg-primary text-white"
          >
            Save Changes
          </Button>
        </div>
      </Dialog>

      {/* Certificate Modal */}
      <Dialog isOpen={showCertificate} onClose={() => setShowCertificate(false)} title="University Clearance Certificate">
         <div className="p-4 relative overflow-hidden" id="clearance-certificate">
            {/* Ornate Border */}
            <div className="absolute inset-2 border-[8px] border-double border-slate-100 dark:border-slate-800 pointer-events-none rounded-[2rem]" />
            <div className="absolute inset-4 border border-slate-200 dark:border-slate-700 pointer-events-none rounded-[1.5rem]" />
            
            <div className="relative z-10 text-center space-y-6">
               <div className="flex justify-center mb-2">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary border-4 border-primary/20 shadow-inner">
                     <GraduationCap className="w-10 h-10" />
                  </div>
               </div>
               
               <div className="space-y-1">
                  <h2 className="text-4xl font-black tracking-tighter uppercase italic text-slate-900 dark:text-white">
                     Certificate <span className="text-primary">of Clearance</span>
                  </h2>
                  <p className="text-xs font-black tracking-[0.4em] uppercase text-slate-400">University Student Administration</p>
               </div>
               
               <div className="py-6 space-y-4">
                  <p className="text-base font-medium text-slate-600 dark:text-slate-300 italic">This document certifies that the student</p>
                  <div className="space-y-1">
                     <h3 className="text-3xl font-black tracking-tight text-primary">{profile?.full_name}</h3>
                     <p className="text-lg font-bold tracking-widest uppercase text-slate-500">{profile?.reg_no}</p>
                  </div>
                  <div className="max-w-md mx-auto pt-4 pb-6 border-b border-slate-100 dark:border-slate-800">
                     <p className="text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                        Has successfully completed all university clearance protocols from Library, Transport, Finance, Hostel, and the 
                        <span className="font-bold text-slate-900 dark:text-white uppercase ml-1">{profile?.department_name}</span> department.
                     </p>
                  </div>
               </div>
               
               <div className="grid grid-cols-3 gap-6 pt-4">
                  <div className="space-y-2">
                     <div className="h-0.5 bg-slate-200 dark:bg-slate-800 w-full mb-2" />
                     <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Registrar Signature</p>
                  </div>
                  <div className="flex flex-col items-center justify-center">
                     <div className="w-12 h-12 rounded-full border-4 border-emerald-500/20 flex items-center justify-center relative">
                        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                     </div>
                     <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500 mt-2">Verified System Copy</p>
                  </div>
                  <div className="space-y-2">
                     <div className="h-0.5 bg-slate-200 dark:bg-slate-800 w-full mb-2" />
                     <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Department Head</p>
                  </div>
               </div>
               
               <div className="pt-6 text-[8px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-widest">
                  Generated on {new Date().toLocaleDateString()} • ID: {profile?.id.slice(0, 8).toUpperCase()}
               </div>
            </div>
         </div>
         <div className="p-4 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3 rounded-b-3xl">
            <Button variant="ghost" onClick={() => setShowCertificate(false)} className="rounded-xl font-bold uppercase text-[10px]">Close</Button>
            <Button 
              onClick={() => window.print()} 
              className="rounded-xl font-black uppercase text-[10px] tracking-widest bg-slate-900 text-white"
            >
              Print Certificate
            </Button>
         </div>
      </Dialog>
    </div>
  )
}

function History(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  )
}
