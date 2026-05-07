"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Sidebar } from "@/components/layout/Sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { useParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Search, Mail, User, BookOpen, Building2, Truck, 
  GraduationCap, ShieldCheck, ClipboardList, Eye, 
  CheckCircle2, AlertCircle, ExternalLink, Link2, Settings2,
  FileText, Briefcase, Phone,
  XCircle, Filter, Calendar, Clock, Plus, Trash2, Edit3
} from "lucide-react"
import { toast } from "sonner"
import { formatDate } from "@/lib/utils"
import { sendEmailNotification, sendWhatsAppNotification, logNotification } from "@/lib/notifications"
import {
  canonicalClearanceDepartmentKey,
  departmentPortalPathSlug,
  isAcademicClearancePortal,
} from "@/lib/departmentKeys"
import { CLEARANCE_MESSAGES, getWhatsAppLink } from "@/lib/messages"
import { Logo } from "@/components/ui/Logo"
import { NotificationBell } from "@/components/NotificationBell"

export default function DepartmentDashboardContent(props: any) {
  const { dept } = useParams()
  const router = useRouter()
  const departmentKey = props.departmentName || (dept as string) || ''
  const [students, setStudents] = useState<any[]>([])
  const [surveyData, setSurveyData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [accessReady, setAccessReady] = useState(false)
  const [sidebarRole, setSidebarRole] = useState<'department' | 'transport' | 'library' | 'admin' | 'student'>('department')
  const [sidebarDeptName, setSidebarDeptName] = useState<string>("")
  const [searchTerm, setSearchTerm] = useState("")
  const [currentTab, setCurrentTab] = useState<'pending' | 'surveys' | 'history'>('pending')
  const [timeFilter, setTimeFilter] = useState<'today' | 'month' | 'all'>('all')
  const [surveySubTab, setSurveySubTab] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [remarks, setRemarks] = useState<{ [key: string]: string }>({})
  const [departmentForms, setDepartmentForms] = useState<any[]>([])
  const [editingForm, setEditingForm] = useState<any>(null)
  const [newForm, setNewForm] = useState({ name: "", link: "" })
  const [stats, setStats] = useState({ pending: 0, cleared: 0, issues: 0, surveys: 0 })
  const [isEditingLink, setIsEditingLink] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  const [staffEmail, setStaffEmail] = useState<string>("")
  const [customMessageModal, setCustomMessageModal] = useState<{isOpen: boolean, student: any}>({isOpen: false, student: null})
  const [customMessageText, setCustomMessageText] = useState("")
  const [customMessageSending, setCustomMessageSending] = useState(false)
  
  const isAcademic = isAcademicClearancePortal(departmentKey)
  const supabase = createClient()

  useEffect(() => {
    if (!departmentKey) return

    async function verifyAccess() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error("Please login first.")
        router.replace(`/login/staff?role=staff&dept=${encodeURIComponent(departmentKey.replace(/-/g, " "))}`)
        return
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, department_name, is_approved, email")
        .eq("id", user.id)
        .single()
      
      if (profile) {
        setStaffEmail(profile.email || user.email || "")
      }

      if (!profile) {
        await supabase.auth.signOut()
        router.replace("/login")
        return
      }

      if (profile.role === "admin") {
        router.replace("/admin")
        return
      }
      if (profile.role === "student") {
        router.replace("/dashboard")
        return
      }
      if (!profile.is_approved) {
        await supabase.auth.signOut()
        toast.error("Your account is pending admin approval.")
        router.replace("/login/staff?role=staff")
        return
      }

      const routeSlug = departmentKey.toLowerCase().trim()
      const requestedClearance = canonicalClearanceDepartmentKey(departmentKey)

      const allowed =
        (profile.role === "library" && routeSlug === "library") ||
        (profile.role === "transport" && routeSlug === "transport") ||
        (profile.role === "hostel" && routeSlug === "hostel") ||
        (profile.role === "finance" && routeSlug === "finance") ||
        (profile.role === "department" &&
          requestedClearance === canonicalClearanceDepartmentKey(profile.department_name || ""))

      if (!allowed) {
        toast.error("Access denied for this portal.")
        if (profile.role === "library") router.replace("/library")
        else if (profile.role === "transport") router.replace("/transport")
        else if (profile.role === "hostel") router.replace("/hostel")
        else if (profile.role === "finance") router.replace("/finance")
        else if (profile.role === "department" && profile.department_name)
          router.replace(`/${departmentPortalPathSlug(profile.department_name)}`)
        else router.replace("/login/staff?role=staff")
        return
      }

      if (profile.role === "library" || profile.role === "transport" || profile.role === "hostel" || profile.role === "finance") {
        setSidebarRole(profile.role as any)
        setSidebarDeptName(profile.role)
      } else {
        setSidebarRole("department")
        setSidebarDeptName(profile.department_name || departmentKey.replace(/-/g, " "))
      }

      setAccessReady(true)
    }

    verifyAccess()
  }, [departmentKey, router, supabase])

  useEffect(() => {
    if (!departmentKey || !accessReady) return

    async function fetchData() {
      setLoading(true)
      const dbKey = canonicalClearanceDepartmentKey(departmentKey)

      // Fetch Clearance Statuses
      let statusQuery = supabase
        .from('clearance_status')
        .select(`
          id, status, remarks, form_submitted, updated_at,
          profiles:student_id (
            id, full_name, father_name, reg_no, email, phone, cgpa, department_name,
            future_data (*)
          )
        `)
        .eq('department_key', dbKey)

      if (currentTab === 'pending') {
        statusQuery = statusQuery.eq('status', 'pending')
      } else if (currentTab === 'history') {
        statusQuery = statusQuery.neq('status', 'pending')
      }

      // Time Filtering for History
      if (currentTab === 'history' || (currentTab === 'surveys' && surveySubTab !== 'pending')) {
        if (timeFilter === 'today') {
          const today = new Date().toISOString().split('T')[0]
          statusQuery = statusQuery.gte('updated_at', today)
        } else if (timeFilter === 'month') {
          const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
          statusQuery = statusQuery.gte('updated_at', firstDay)
        }
      }

      const { data: statusData } = await statusQuery
      setStudents(statusData || [])

      // Fetch Global Stats for the Bar
      const { data: allStatuses } = await supabase
        .from('clearance_status')
        .select('status')
        .eq('department_key', dbKey)
      
      const deptLabel = sidebarDeptName || departmentKey.replace(/-/g, " ")
      const { data: surveyProfiles } = await supabase.from('future_data').select('id, status, profiles:student_id(department_name)')
      const deptSurveys = (surveyProfiles || []).filter((s: any) => 
        ((s.profiles as any)?.department_name || "").toLowerCase().trim() === deptLabel.toLowerCase().trim()
      )

      setStats({
        pending: (allStatuses || []).filter(s => s.status === 'pending').length,
        cleared: (allStatuses || []).filter(s => s.status === 'cleared').length,
        issues: (allStatuses || []).filter(s => s.status === 'issue').length,
        surveys: deptSurveys.filter(s => s.status === 'pending').length
      })

      // Fetch Survey Data if Academic
      if (isAcademic && currentTab === 'surveys') {
        let surveyQuery = supabase
          .from('future_data')
          .select(`
            *,
            profiles:student_id (id, full_name, father_name, reg_no, email, phone, cgpa, department_name, created_at)
          `)
          .eq('status', surveySubTab)

        if (timeFilter === 'today') {
          const today = new Date().toISOString().split('T')[0]
          surveyQuery = surveyQuery.gte('updated_at', today)
        } else if (timeFilter === 'month') {
          const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
          surveyQuery = surveyQuery.gte('updated_at', firstDay)
        }

        const { data: surveys } = await surveyQuery
        
        const filteredSurveys = (surveys || []).filter(s => 
          (s.profiles?.department_name || "").toLowerCase().trim() === deptLabel.toLowerCase().trim()
        )
        setSurveyData(filteredSurveys)
      }

      setLoading(false)
    }

    async function fetchSettings() {
      if (isAcademic) {
        const { data } = await supabase
          .from('department_forms')
          .select('*')
          .eq('department_key', canonicalClearanceDepartmentKey(departmentKey))
          .order('created_at', { ascending: true })
        setDepartmentForms(data || [])
      }
    }

    fetchData()
    fetchSettings()
  }, [departmentKey, currentTab, timeFilter, surveySubTab, accessReady, isAcademic, sidebarDeptName])

  const handleUpdateStatus = async (clearanceId: string, status: 'cleared' | 'issue', studentProfile: any) => {
    try {
      if (isAcademic) {
        const { data: statuses } = await supabase
          .from("clearance_status")
          .select("department_key,status,form_submitted")
          .eq("student_id", studentProfile.id)

        const coreDepartments = ['library', 'transport', 'finance', 'hostel']
        const nonAcademic = (statuses || []).filter((s) => coreDepartments.includes(s.department_key))
        const allNonAcademicCleared = nonAcademic.length === 4 && nonAcademic.every((s) => s.status === "cleared")
        
        const { data: { user } } = await supabase.auth.getUser()
        const { data: adminProfile } = await supabase.from('profiles').select('role, email').eq('id', user?.id).single()
        const isAdmin = adminProfile?.role === 'admin' || adminProfile?.email === 'minahilch821@gmail.com'

        if (!allNonAcademicCleared && !isAdmin) {
          const pendingDepts = nonAcademic.filter(s => s.status !== 'cleared').map(s => s.department_key).join(', ')
          toast.error(`Cannot approve yet. Student is still pending in: ${pendingDepts.toUpperCase()}`)
          return
        }
        
        if (!allNonAcademicCleared && isAdmin) {
          toast.success("Admin Override: Bypassing core department checks.")
        }
      }

      const { error } = await supabase
        .from('clearance_status')
        .update({
          status,
          remarks: status === 'issue' ? (remarks[clearanceId] || null) : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', clearanceId)

      if (error) throw error

      // After updating, check the full clearance status for this student
      const { data: allStatuses } = await supabase
        .from('clearance_status')
        .select('department_key, status')
        .eq('student_id', studentProfile.id)

      const coreDepts = ['library', 'transport', 'finance', 'hostel']
      const nonAcademicStatuses = (allStatuses || []).filter(s => coreDepts.includes(s.department_key))
      const academicStatuses = (allStatuses || []).filter(s => s.department_key.startsWith('academic-'))
      const allNonAcademicNowCleared = nonAcademicStatuses.length === 4 && nonAcademicStatuses.every(s => s.status === 'cleared')
      const academicNowCleared = academicStatuses.every(s => s.status === 'cleared') && academicStatuses.length > 0
      const fullyCleared = allNonAcademicNowCleared && academicNowCleared

      if (status === 'cleared') {
        if (fullyCleared) {
          // All departments including academic cleared — student is fully done
          toast.success(`🎉 ${studentProfile.full_name} is FULLY CLEARED!`)
          
          if (studentProfile.email) {
            sendEmailNotification({
              ...studentProfile,
              recipientEmail: studentProfile.email,
              eventType: 'portal_alert',
              status: 'cleared',
              remarks: '🎓 Congratulations! You have been fully cleared by all departments including Academic. Your clearance certificate is now available on your dashboard.'
            }).then(() => console.log("Success email sent")).catch(err => console.error("Email fail:", err))
          }

          if (studentProfile.phone) {
            sendWhatsAppNotification({
              ...studentProfile,
              recipientPhone: studentProfile.phone,
              eventType: 'portal_alert',
              status: 'cleared',
              remarks: 'Congratulations! You are fully cleared from all departments. Visit your dashboard to download your clearance certificate.'
            }).catch(console.warn)
          }
        } else if (allNonAcademicNowCleared && !isAcademic) {
          // All core depts cleared — notify student to complete academic forms
          toast.success(`${studentProfile.full_name} cleared! All core depts done — notifying for Academic step.`)
          sendEmailNotification({
            ...studentProfile,
            recipientEmail: studentProfile.email,
            eventType: 'portal_alert',
            status: 'cleared',
            remarks: '✅ You have been cleared by Library, Transport, Finance, and Hostel. Please complete the academic department forms on your dashboard to get final clearance from your academic HOD.'
          }).catch(console.warn)
          sendWhatsAppNotification({
            ...studentProfile,
            recipientPhone: studentProfile.phone,
            eventType: 'portal_alert',
            remarks: 'All core departments cleared! Please complete your academic forms on the student dashboard to finish your clearance.'
          }).catch(console.warn)
        } else {
          toast.success(`${studentProfile.full_name} is now ${status.toUpperCase()}`)
          if (studentProfile.email) {
            sendEmailNotification({ 
              ...studentProfile, 
              department: departmentKey, 
              status,
              remarks: status === 'issue' ? (remarks[clearanceId] || null) : null,
              recipientEmail: studentProfile.email,
              senderEmail: staffEmail
            }).then(() => console.log(`Status email (${status}) sent`)).catch(err => console.error("Email fail:", err))
          }
          if (studentProfile.phone) {
            sendWhatsAppNotification({ ...studentProfile, department: departmentKey, status }).catch(console.warn)
          }
        }
      } else {
        toast.success(`${studentProfile.full_name} flagged with issue`)
        if (studentProfile.email) {
          sendEmailNotification({ 
            ...studentProfile, 
            department: departmentKey, 
            status,
            remarks: remarks[clearanceId] || null,
            recipientEmail: studentProfile.email,
            senderEmail: staffEmail
          }).then(() => console.log("Issue email sent")).catch(err => console.error("Email fail:", err))
        }
        if (studentProfile.phone) {
          sendWhatsAppNotification({ ...studentProfile, department: departmentKey, status }).catch(console.warn)
        }
      }
      
      // In-app Notification
      await logNotification({
        user_id: studentProfile.id,
        title: status === 'cleared' ? 'Clearance Approved' : 'Clearance Issue',
        message: status === 'cleared' 
          ? `You have been cleared by the ${sidebarDeptName || departmentKey} department.` 
          : `The ${sidebarDeptName || departmentKey} department has reported an issue: ${remarks[clearanceId] || 'Please contact the department.'}`,
        type: status === 'cleared' ? 'success' : 'issue'
      })

      setStudents(prev => prev.map(s => s.id === clearanceId ? { ...s, status } : s))
      if (currentTab === 'pending' && status === 'cleared') {
        setStudents(prev => prev.filter(s => s.id !== clearanceId))
      }
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleUpdateSurveyStatus = async (surveyId: string, status: 'approved' | 'rejected', studentProfile: any) => {
    try {
      const { error } = await supabase
        .from('future_data')
        .update({
          status,
          admin_remarks: remarks[surveyId] || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', surveyId)

      if (error) throw error

      toast.success(`Survey for ${studentProfile.full_name} ${status}`)
      
      // Notify for survey status
      if (studentProfile?.email) {
        sendEmailNotification({
          ...studentProfile,
          department: sidebarDeptName,
          status: status === 'approved' ? 'cleared' : 'issue',
          eventType: 'status_update',
          remarks: remarks[surveyId] || null,
          recipientEmail: studentProfile.email,
          senderEmail: staffEmail
        }).then(() => console.log(`Survey email (${status}) sent`)).catch(err => console.error("Email fail:", err))
      }

      await logNotification({
        user_id: studentProfile.id,
        title: status === 'approved' ? 'Survey Approved' : 'Survey Rejected',
        message: status === 'approved' 
          ? `Your alumni survey has been verified by the ${sidebarDeptName || departmentKey} department.`
          : `Your alumni survey was rejected: ${remarks[surveyId] || 'Please review and resubmit.'}`,
        type: status === 'approved' ? 'success' : 'issue'
      })

      setSurveyData(prev => prev.filter(s => s.id !== surveyId))
      setSelectedStudent(null)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleSendCustomMessage = async () => {
    if (!customMessageText.trim() || !customMessageModal.student) return
    setCustomMessageSending(true)
    try {
      const studentProfile = customMessageModal.student
      await sendEmailNotification({
        ...studentProfile,
        department: sidebarDeptName,
        status: 'pending',
        eventType: 'status_update',
        remarks: customMessageText,
        recipientEmail: studentProfile.email,
        senderEmail: staffEmail
      })
      toast.success("Custom message sent successfully to " + studentProfile.email)
      setCustomMessageModal({isOpen: false, student: null})
      setCustomMessageText("")
    } catch (err: any) {
      toast.error(err.message || "Failed to send message")
    } finally {
      setCustomMessageSending(false)
    }
  }

  const filteredItems = currentTab === 'surveys' ? surveyData : students.filter(s =>
    s.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.profiles?.reg_no?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const deptLabel = departmentKey.replace(/-/g, ' ').toUpperCase()

  if (!accessReady || loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 gap-6">
      <div className="relative">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8">
          <Logo className="w-8 h-8" />
        </div>
      </div>
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-400 animate-pulse">
        {loading ? "Syncing Departmental Data..." : "Authorizing Authority Access..."}
      </p>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-[#f8fafc] dark:bg-slate-950 font-sans">
      <Sidebar role={sidebarRole} departmentName={sidebarDeptName} />

      <main className="flex-1 lg:ml-64 p-6 md:p-10">
        <header className="flex flex-col md:flex-row justify-between items-center gap-10 mb-14 relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
            <div className="p-1 bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-white/5">
              <Logo className="w-20 h-20 md:w-24 md:h-24" />
            </div>
            <div>
              <div className="flex items-center gap-3 justify-center md:justify-start">
                <h2 className="text-3xl font-bold tracking-tight text-foreground">
                  {deptLabel} Department
                </h2>
              </div>
              <p className="mt-2 text-sm text-muted-foreground flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" /> Authority Hub &mdash; Manage clearance requests and institutional forms
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
             <div className="relative w-full md:w-80 group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-all duration-300" />
              <Input
                placeholder="Search by ID or Name..."
                className="pl-14 h-16 rounded-3xl bg-white dark:bg-slate-900 border-slate-100 dark:border-white/5 shadow-sm focus:shadow-2xl focus:border-primary/30 transition-all text-sm font-bold"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <NotificationBell />

          </div>
        </header>

        {/* Stats Overview Bar - Premium Style */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10 relative z-10">
           {[
             { label: "Pending Requests", value: stats.pending, icon: ClipboardList, color: "indigo", delay: 0.1 },
             { label: "Total Cleared", value: stats.cleared, icon: CheckCircle2, color: "emerald", delay: 0.2 },
             { label: "Issue Reports", value: stats.issues, icon: AlertCircle, color: "rose", delay: 0.3 },
             { label: "Pending Forms", value: stats.surveys, icon: FileText, color: "amber", delay: 0.4 }
           ].map((stat, i) => (
             <motion.div 
               key={i}
               initial={{ opacity: 0, y: 20 }} 
               animate={{ opacity: 1, y: 0 }} 
               transition={{ delay: stat.delay }} 
               className="group relative p-8 rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-2xl hover:scale-[1.02] transition-all duration-500 overflow-hidden"
             >
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700" />
                <div className="flex items-center gap-5">
                   <div className={`w-14 h-14 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20 group-hover:rotate-12 transition-transform`}>
                      <stat.icon className="w-7 h-7" />
                   </div>
                   <div>
                      <p className="text-xs font-bold tracking-wider text-slate-400 mb-1 leading-none">{stat.label}</p>
                      <h4 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight italic leading-none">{stat.value}</h4>
                   </div>
                </div>
             </motion.div>
           ))}
        </div>

        {/* Global Control Hub */}
        <div className="flex flex-wrap items-center justify-between gap-8 mb-10 bg-white/40 dark:bg-slate-900/40 p-6 rounded-[3rem] border border-slate-100 dark:border-white/5 backdrop-blur-xl shadow-xl relative z-10">
          <div className="flex flex-wrap gap-3 p-1.5 bg-slate-200/30 dark:bg-slate-800/30 rounded-[2rem]">
            {(['pending', 'surveys', 'history'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setCurrentTab(tab)}
                className={`px-10 py-4 rounded-[1.5rem] text-[11px] font-bold uppercase tracking-[0.1em] transition-all duration-500 flex items-center gap-3 ${
                  currentTab === tab 
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xl shadow-slate-900/30' 
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab === 'pending' && <ClipboardList className="w-4 h-4" />}
                {tab === 'surveys' && <FileText className="w-4 h-4" />}
                {tab === 'history' && <CheckCircle2 className="w-4 h-4" />}
                {tab === 'surveys' ? 'Pending Forms' : tab === 'pending' ? 'Pending Requests' : 'History Log'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 text-xs font-bold tracking-wider text-slate-400">
               <Filter className="w-4 h-4" /> Filter Range:
            </div>
            <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-2xl border border-slate-200 dark:border-white/5">
              {(['all', 'today', 'month'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setTimeFilter(filter)}
                  className={`px-6 py-2.5 rounded-xl text-xs font-bold font-medium text-muted-foreground transition-all duration-300 ${
                    timeFilter === filter ? 'bg-white dark:bg-slate-900 text-primary shadow-xl' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        </div>

        <Card className="glass-card border-none overflow-hidden rounded-[2.5rem] shadow-2xl">
          <CardHeader className="bg-white/40 dark:bg-slate-900/40 p-8 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-slate-300" />
                <CardTitle className="text-sm font-bold uppercase tracking-[0.3em] text-slate-400">
                  {currentTab === 'pending' ? 'Pending Requests Queue' : 
                   currentTab === 'surveys' ? `Pending Form Submissions` : 'Cleared History'}
                </CardTitle>
              </div>
              <div className="text-xs font-bold bg-primary/10 text-primary px-4 py-1.5 rounded-full">
                {filteredItems.length} Entries
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-8 py-5 text-xs font-bold tracking-wider text-slate-400">Student Profile</th>
                    <th className="px-8 py-5 text-xs font-bold tracking-wider text-slate-400">Personal Details</th>
                    <th className="px-8 py-5 text-xs font-bold tracking-wider text-slate-400">Verification Status</th>
                    <th className="px-8 py-5 text-xs font-bold tracking-wider text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  <AnimatePresence mode="popLayout">
                    {filteredItems.map((item: any) => {
                      const student = item.profiles
                      return (
                        <motion.tr
                          key={item.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="group hover:bg-white transition-all"
                        >
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-4">
                              <div className="w-14 h-14 rounded-[1.2rem] bg-slate-100 flex items-center justify-center font-bold text-slate-300 border border-slate-100">
                                <User className="w-6 h-6" />
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 text-lg leading-tight mb-1">
                                  {student?.full_name}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold font-medium text-muted-foreground text-primary bg-primary/5 px-2 py-0.5 rounded-md">
                                    {student?.reg_no}
                                  </span>
                                  <span className="text-xs font-bold text-slate-400 italic">
                                    {student?.department_name}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-8 py-6">
                            <div className="space-y-1">
                               <p className="text-xs font-bold text-slate-900 uppercase">F. Name: <span className="text-slate-500">{student?.father_name || 'N/A'}</span></p>
                               <p className="text-xs font-bold text-slate-900 uppercase">CGPA: <span className="text-emerald-600">{student?.cgpa || '0.00'}</span></p>
                               <p className="text-xs font-bold text-slate-900 uppercase">Contact: <span className="text-slate-500">{student?.phone || 'N/A'}</span></p>
                            </div>
                          </td>

                          <td className="px-8 py-6">
                            {currentTab === 'surveys' ? (
                              <div className="space-y-1">
                                <div className={`flex items-center gap-1.5 text-xs font-bold font-medium text-muted-foreground ${
                                  item.status === 'approved' ? 'text-emerald-500' : 
                                  item.status === 'rejected' ? 'text-rose-500' : 'text-indigo-500'
                                }`}>
                                  {item.status === 'approved' ? <CheckCircle2 className="w-3.5 h-3.5" /> : 
                                   item.status === 'rejected' ? <XCircle className="w-3.5 h-3.5" /> : <ClipboardList className="w-3.5 h-3.5" />}
                                  {item.status}
                                </div>
                                <p className="text-xs font-bold text-slate-400">Captured: {formatDate(item.created_at)}</p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <StatusBadge status={item.status} />
                                {isAcademic && (
                                  <div className={`flex items-center gap-1.5 text-xs font-bold ${item.form_submitted ? 'text-emerald-500' : 'text-slate-400'}`}>
                                    {item.form_submitted ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                                    {item.form_submitted ? 'Form: Submitted' : 'Form: Pending'}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>

                          <td className="px-8 py-6">
                            <div className="flex items-center gap-3">
                              {currentTab === 'surveys' ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedStudent({ ...item, isSurvey: true })}
                                  className="rounded-xl font-bold uppercase text-xs h-10 px-5 gap-2 border-slate-100 hover:bg-slate-50"
                                >
                                  <Eye className="w-4 h-4" /> View Details
                                </Button>
                              ) : (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => setSelectedStudent({ ...item, isSurvey: false })}
                                    className="rounded-xl font-bold uppercase text-xs h-10 px-5 gap-2 bg-slate-100 text-slate-900 hover:bg-slate-200"
                                  >
                                    <ClipboardList className="w-4 h-4" /> Review
                                  </Button>
                                  
                                  <Button
                                    size="sm"
                                    onClick={() => setCustomMessageModal({ isOpen: true, student: item.profiles })}
                                    className="rounded-xl font-bold uppercase text-xs h-10 px-4 gap-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 shadow-sm"
                                  >
                                    <Mail className="w-4 h-4" /> Msg
                                  </Button>
                                  
                                  {(item.status === 'pending' || item.status === 'issue') && (
                                    <div className="flex items-center gap-2">
                                      <Button
                                        size="sm"
                                        onClick={() => handleUpdateStatus(item.id, 'cleared', item.profiles)}
                                        className="rounded-xl font-bold uppercase text-xs h-10 px-6 bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20"
                                      >
                                        Approve
                                      </Button>
                                      {item.status === 'pending' && (
                                        <Button
                                          size="sm"
                                          variant="destructive"
                                          onClick={() => handleUpdateStatus(item.id, 'issue', item.profiles)}
                                          className="rounded-xl font-bold uppercase text-xs h-10 px-6"
                                        >
                                          Issue
                                        </Button>
                                      )}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      )
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
              {loading && <div className="p-20 text-center text-slate-400 font-bold font-medium text-muted-foreground animate-pulse">Syncing...</div>}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
