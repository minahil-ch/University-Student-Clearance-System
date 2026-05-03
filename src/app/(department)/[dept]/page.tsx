"use client"
export const dynamic = 'force-dynamic'

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
import { sendEmailNotification, sendWhatsAppNotification } from "@/lib/notifications"
import {
  canonicalClearanceDepartmentKey,
  departmentPortalPathSlug,
  isAcademicClearancePortal,
} from "@/lib/departmentKeys"
import { CLEARANCE_MESSAGES, getWhatsAppLink } from "@/lib/messages"

export default function DepartmentDashboard(props: any) {
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
        .select("role, department_name, is_approved")
        .eq("id", user.id)
        .single()

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
          router.replace(`/dept/${departmentPortalPathSlug(profile.department_name)}`)
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
            id, full_name, father_name, reg_no, email, phone, cgpa, department_name
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

        const nonAcademic = (statuses || []).filter((s) => !s.department_key.startsWith("academic-"))
        const allNonAcademicCleared = nonAcademic.length > 0 && nonAcademic.every((s) => s.status === "cleared")
        
        if (!allNonAcademicCleared) {
          toast.error("Student must be cleared by Library, Finance, Hostel, and Transport first.")
          return
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

      toast.success(`${studentProfile.full_name} is now ${status}`)
      
      // Notify
      sendEmailNotification({ ...studentProfile, department: departmentKey, status }).catch(console.warn)
      sendWhatsAppNotification({ ...studentProfile, department: departmentKey, status }).catch(console.warn)

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
      setSurveyData(prev => prev.filter(s => s.id !== surveyId))
      setSelectedStudent(null)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const filteredItems = currentTab === 'surveys' ? surveyData : students.filter(s =>
    s.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.profiles?.reg_no?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const deptLabel = departmentKey.replace(/-/g, ' ').toUpperCase()

  return (
    <div className="flex min-h-screen bg-[#f8fafc] dark:bg-slate-950 font-sans">
      <Sidebar role={sidebarRole} departmentName={sidebarDeptName} />

      <main className="flex-1 lg:ml-64 p-6 md:p-10">
        <header className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12">
          <div className="space-y-1 text-center md:text-left">
            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3 justify-center md:justify-start">
              <span className="p-3 rounded-2xl bg-primary/10 text-primary">
                {isAcademic ? <GraduationCap className="w-8 h-8" /> : <Building2 className="w-8 h-8" />}
              </span>
              {deptLabel} <span className="text-primary/40 text-2xl font-light">|</span> <span className="gradient-text">PORTAL</span>
            </h2>
            <p className="text-slate-500 font-medium ml-1">Department Authority & Survey Hub</p>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
             <div className="relative w-full md:w-72 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Search name or reg..."
                className="pl-12 h-14 rounded-2xl bg-white border-slate-100 shadow-sm focus:shadow-xl transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {isAcademic && (
              <Button 
                variant="outline" 
                onClick={() => setIsEditingLink(true)}
                className="h-14 px-6 rounded-2xl bg-white border-slate-100 shadow-sm hover:shadow-md gap-2 font-bold"
              >
                <Settings2 className="w-5 h-5" /> Form Settings
              </Button>
            )}
          </div>
        </header>

        {/* Stats Overview Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
           <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-4 group hover:shadow-xl transition-all">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                 <ClipboardList className="w-6 h-6" />
              </div>
              <div>
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Clearance Pending</p>
                 <h4 className="text-2xl font-black text-slate-900">{stats.pending}</h4>
              </div>
           </motion.div>
           <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-4 group hover:shadow-xl transition-all">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                 <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Approved</p>
                 <h4 className="text-2xl font-black text-slate-900">{stats.cleared}</h4>
              </div>
           </motion.div>
           <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-4 group hover:shadow-xl transition-all">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                 <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Issues Flagged</p>
                 <h4 className="text-2xl font-black text-slate-900">{stats.issues}</h4>
              </div>
           </motion.div>
           <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-4 group hover:shadow-xl transition-all">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                 <FileText className="w-6 h-6" />
              </div>
              <div>
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pending Surveys</p>
                 <h4 className="text-2xl font-black text-slate-900">{stats.surveys}</h4>
              </div>
           </motion.div>
        </div>

        {/* Global Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-6 mb-8 bg-white/50 p-4 rounded-[2rem] border border-white/20 backdrop-blur-sm">
          <div className="flex gap-2 p-1 bg-slate-200/50 rounded-2xl">
            {(['pending', 'surveys', 'history'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setCurrentTab(tab)}
                className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  currentTab === tab ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab === 'surveys' ? 'Alumni Survey Hub' : tab === 'pending' ? 'Pending Requests' : 'Completed Details'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
               <Filter className="w-3.5 h-3.5" /> Timeframe:
            </div>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              {(['all', 'today', 'month'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setTimeFilter(filter)}
                  className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                    timeFilter === filter ? 'bg-white text-primary shadow-sm' : 'text-slate-400'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Survey Specific Sub-Tabs */}
        {currentTab === 'surveys' && (
          <div className="flex gap-4 mb-6 ml-4">
            {(['pending', 'approved', 'rejected'] as const).map((sub) => (
              <button
                key={sub}
                onClick={() => setSurveySubTab(sub)}
                className={`flex items-center gap-2 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
                  surveySubTab === sub 
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
                    : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'
                }`}
              >
                {sub === 'pending' && <Clock className="w-3 h-3" />}
                {sub === 'approved' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                {sub === 'rejected' && <XCircle className="w-3 h-3 text-rose-400" />}
                {sub}
              </button>
            ))}
          </div>
        )}

        <Card className="glass-card border-none overflow-hidden rounded-[2.5rem] shadow-2xl">
          <CardHeader className="bg-white/40 dark:bg-slate-900/40 p-8 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-slate-300" />
                <CardTitle className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">
                  {currentTab === 'pending' ? 'Active Clearance Queue' : 
                   currentTab === 'surveys' ? `Survey ${surveySubTab.toUpperCase()} Records` : 'Cleared History'}
                </CardTitle>
              </div>
              <div className="text-[10px] font-black bg-primary/10 text-primary px-4 py-1.5 rounded-full">
                {filteredItems.length} Entries in {timeFilter} view
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Student Profile</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Personal Details</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Verification Status</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Actions</th>
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
                                <div className="font-black text-slate-900 text-lg leading-tight mb-1">
                                  {student?.full_name}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/5 px-2 py-0.5 rounded-md">
                                    {student?.reg_no}
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-400 italic">
                                    {student?.department_name}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-8 py-6">
                            <div className="space-y-1">
                               <p className="text-[10px] font-black text-slate-900 uppercase">F. Name: <span className="text-slate-500">{student?.father_name || 'N/A'}</span></p>
                               <p className="text-[10px] font-black text-slate-900 uppercase">CGPA: <span className="text-emerald-600">{student?.cgpa || '0.00'}</span></p>
                               <p className="text-[10px] font-black text-slate-900 uppercase">Contact: <span className="text-slate-500">{student?.phone || 'N/A'}</span></p>
                            </div>
                          </td>

                          <td className="px-8 py-6">
                            {currentTab === 'surveys' ? (
                              <div className="space-y-1">
                                <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${
                                  item.status === 'approved' ? 'text-emerald-500' : 
                                  item.status === 'rejected' ? 'text-rose-500' : 'text-indigo-500'
                                }`}>
                                  {item.status === 'approved' ? <CheckCircle2 className="w-3.5 h-3.5" /> : 
                                   item.status === 'rejected' ? <XCircle className="w-3.5 h-3.5" /> : <ClipboardList className="w-3.5 h-3.5" />}
                                  {item.status}
                                </div>
                                <p className="text-[9px] font-bold text-slate-400">Captured: {formatDate(item.created_at)}</p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <StatusBadge status={item.status} />
                                {isAcademic && (
                                  <div className={`flex items-center gap-1.5 text-[10px] font-bold ${item.form_submitted ? 'text-emerald-500' : 'text-slate-400'}`}>
                                    {item.form_submitted ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                                    {item.form_submitted ? 'Form Marked: Filled' : 'Form: Not Filled'}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>

                          <td className="px-8 py-6">
                            <div className="flex items-center gap-3">
                              {currentTab === 'surveys' ? (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedStudent({ ...item, isSurvey: true })}
                                    className="rounded-xl font-black uppercase text-[10px] h-10 px-5 gap-2 border-slate-100 hover:bg-slate-50"
                                  >
                                    <Eye className="w-4 h-4" /> Review Data
                                  </Button>
                                  {(item.status === 'pending' || item.status === 'rejected') && (
                                    <div className="flex gap-2">
                                       <Button
                                          size="sm"
                                          onClick={() => handleUpdateSurveyStatus(item.id, 'approved', item.profiles)}
                                          className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white w-9 h-9 p-0 flex items-center justify-center shadow-lg shadow-emerald-500/20"
                                          title="Approve Survey"
                                       >
                                          <CheckCircle2 className="w-5 h-5" />
                                       </Button>
                                       {item.status === 'pending' && (
                                         <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => handleUpdateSurveyStatus(item.id, 'rejected', item.profiles)}
                                            className="rounded-xl w-9 h-9 p-0 flex items-center justify-center"
                                            title="Reject Survey"
                                         >
                                            <XCircle className="w-5 h-5" />
                                         </Button>
                                       )}
                                    </div>
                                  )}
                                </>
                              ) : (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => setSelectedStudent({ ...item, isSurvey: false })}
                                    className="rounded-xl font-black uppercase text-[10px] h-10 px-5 gap-2 bg-slate-100 text-slate-900 hover:bg-slate-200"
                                  >
                                    <ClipboardList className="w-4 h-4" /> Full Profile
                                  </Button>
                                  
                                  {(item.status === 'pending' || item.status === 'issue') && (
                                    <div className="flex items-center gap-2">
                                      <Button
                                        size="sm"
                                        onClick={() => handleUpdateStatus(item.id, 'cleared', item.profiles)}
                                        className="rounded-xl font-black uppercase text-[10px] h-10 px-6 bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20"
                                      >
                                        Approve
                                      </Button>
                                      {item.status === 'pending' && (
                                        <Button
                                          size="sm"
                                          variant="destructive"
                                          onClick={() => handleUpdateStatus(item.id, 'issue', item.profiles)}
                                          className="rounded-xl font-black uppercase text-[10px] h-10 px-6"
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
              {loading && <div className="p-20 text-center text-slate-400 font-black uppercase tracking-widest animate-pulse">Syncing Department Data...</div>}
              {!loading && filteredItems.length === 0 && (
                <div className="p-20 text-center">
                   <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-slate-200">
                      <Search className="w-6 h-6 text-slate-200" />
                   </div>
                   <p className="text-slate-300 font-black uppercase tracking-[0.4em] text-xs">No Records Found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Review Modal */}
      <AnimatePresence>
        {selectedStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedStudent(null)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-start">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
                      {selectedStudent.isSurvey ? <FileText className="w-6 h-6" /> : <User className="w-6 h-6" />}
                   </div>
                   <div>
                      <h3 className="text-2xl font-black text-slate-900">Verification Material Review</h3>
                      <p className="text-slate-400 font-black uppercase text-[9px] tracking-[0.2em] mt-1">Official Academic Authority Control</p>
                   </div>
                </div>
                <Button variant="ghost" onClick={() => setSelectedStudent(null)} className="rounded-full w-10 h-10 p-0 text-slate-400 hover:text-slate-900">×</Button>
              </div>

              <div className="p-10 space-y-10 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {/* Official Student Profile Section */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2 px-2">
                    <User className="w-3.5 h-3.5" /> Official Student Profile
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Father Name</p>
                      <p className="text-xs font-black text-slate-900">{selectedStudent.profiles?.father_name || 'Not Listed'}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">WhatsApp</p>
                      <p className="text-xs font-black text-slate-900">{selectedStudent.profiles?.phone || 'No Contact'}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">CGPA</p>
                      <p className="text-xs font-black text-emerald-600">{selectedStudent.profiles?.cgpa || '0.00'}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Reg Date</p>
                      <p className="text-xs font-black text-slate-900">{formatDate(selectedStudent.profiles?.created_at)}</p>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-slate-100" />

                {selectedStudent.isSurvey ? (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                             <Briefcase className="w-3 h-3" /> Employment status
                          </label>
                          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                            <p className="font-black text-slate-900 text-lg">{selectedStudent.job_status || 'Unemployed'}</p>
                            <p className="text-xs font-bold text-slate-500 mt-1">{selectedStudent.employer_name || 'No Employer Data'}</p>
                            {selectedStudent.designation && <p className="text-[10px] font-medium text-slate-400 mt-1">Designation: {selectedStudent.designation}</p>}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                             <BookOpen className="w-3 h-3" /> Academics / Higher Studies
                          </label>
                          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                            <p className="font-black text-slate-900 text-lg">{selectedStudent.higher_study_status || 'None'}</p>
                            <p className="text-xs font-bold text-slate-500 mt-1">{selectedStudent.institution || 'N/A'}</p>
                            {selectedStudent.program && <p className="text-[10px] font-medium text-slate-400 mt-1">Program: {selectedStudent.program}</p>}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                             <Phone className="w-3 h-3" /> Verification Contact
                          </label>
                          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                            <div className="flex items-center gap-3">
                              <Mail className="w-4 h-4 text-slate-300" />
                              <p className="text-xs font-black text-slate-700">{selectedStudent.current_email}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <Phone className="w-4 h-4 text-slate-300" />
                              <p className="text-xs font-black text-slate-700">{selectedStudent.contact_number}</p>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                             <AlertCircle className="w-3 h-3" /> Student Feedback
                          </label>
                          <div className="p-5 bg-indigo-50/30 rounded-2xl border border-indigo-100/50 italic text-xs text-slate-600 leading-relaxed font-medium">
                            &quot;{selectedStudent.feedback || 'The student left no additional comments.'}&quot;
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Decision Input for Survey */}
                    {selectedStudent.status === 'pending' && (
                       <div className="space-y-3 pt-6 border-t border-slate-100">
                          <label className="text-[10px] font-black uppercase tracking-widest text-rose-500">Rejection Remarks (Required if rejecting)</label>
                          <Input 
                            placeholder="State reason for rejection..."
                            className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-medium"
                            value={remarks[selectedStudent.id] || ""}
                            onChange={(e) => setRemarks({...remarks, [selectedStudent.id]: e.target.value})}
                          />
                       </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 shadow-sm">
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Clearance Registration</p>
                        <p className="font-black text-slate-900 text-2xl tracking-tighter">{selectedStudent.profiles.reg_no}</p>
                      </div>
                      <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100 shadow-sm">
                        <p className="text-[9px] font-black uppercase text-emerald-600 tracking-widest mb-1">Final Academic GPA</p>
                        <p className="font-black text-emerald-700 text-2xl tracking-tighter">{selectedStudent.profiles.cgpa || '—'}</p>
                      </div>
                    </div>
                    <div className="p-8 bg-blue-50/50 rounded-[2rem] border border-blue-100 flex items-start gap-5">
                       <div className="w-12 h-12 rounded-2xl bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
                          <ShieldCheck className="w-6 h-6" />
                       </div>
                       <div className="space-y-1">
                          <h4 className="font-black text-blue-900 text-lg">Academic Clearance Protocol</h4>
                          <p className="text-sm text-blue-800/60 font-medium leading-relaxed">
                            Verify that the student has completed all degree requirements and filled the mandatory university survey. 
                            Academic approval is the final administrative block before degree issuance.
                          </p>
                       </div>
                    </div>
                    
                    {selectedStudent.status === 'pending' && (
                       <div className="space-y-3 pt-4">
                          <label className="text-[10px] font-black uppercase tracking-widest text-rose-500">Department Remarks (Optional)</label>
                          <Input 
                            placeholder="Add specific issue details if not clearing..."
                            className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-medium"
                            value={remarks[selectedStudent.id] || ""}
                            onChange={(e) => setRemarks({...remarks, [selectedStudent.id]: e.target.value})}
                          />
                       </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setSelectedStudent(null)} className="rounded-xl font-black uppercase text-[10px] h-12 px-8">Close Review</Button>
                
                {selectedStudent.isSurvey && selectedStudent.status === 'pending' && (
                  <div className="flex gap-3">
                    <Button 
                      variant="destructive"
                      onClick={() => handleUpdateSurveyStatus(selectedStudent.id, 'rejected', selectedStudent.profiles)}
                      className="rounded-xl font-black uppercase text-[10px] h-12 px-8"
                    >
                      Reject Survey
                    </Button>
                    <Button 
                      onClick={() => handleUpdateSurveyStatus(selectedStudent.id, 'approved', selectedStudent.profiles)}
                      className="rounded-xl font-black uppercase text-[10px] h-12 px-10 bg-emerald-500 hover:bg-emerald-600 shadow-xl shadow-emerald-500/20"
                    >
                      Approve Survey
                    </Button>
                  </div>
                )}

                {!selectedStudent.isSurvey && selectedStudent.status === 'pending' && (
                  <div className="flex gap-3">
                    <Button 
                      variant="destructive"
                      onClick={() => handleUpdateStatus(selectedStudent.id, 'issue', selectedStudent.profiles)}
                      className="rounded-xl font-black uppercase text-[10px] h-12 px-8"
                    >
                      Report Issue
                    </Button>
                    <Button 
                      onClick={() => {
                        handleUpdateStatus(selectedStudent.id, 'cleared', selectedStudent.profiles)
                        setSelectedStudent(null)
                      }}
                      className="rounded-xl font-black uppercase text-[10px] h-12 px-10 bg-emerald-500 hover:bg-emerald-600 shadow-xl shadow-emerald-500/20"
                    >
                      Confirm Clearance
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settings Modal (Multi-Form) */}
      <AnimatePresence>
        {isEditingLink && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setIsEditingLink(false); setEditingForm(null); }}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl p-10 overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-primary" />
              <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                       <Settings2 className="w-6 h-6" />
                    </div>
                    <div>
                       <h3 className="text-xl font-black text-slate-900">Form Management</h3>
                       <p className="text-slate-500 font-medium text-xs">Manage departmental survey links.</p>
                    </div>
                 </div>
                 <Button 
                   variant="ghost" 
                   onClick={() => { setIsEditingLink(false); setEditingForm(null); }}
                   className="rounded-full w-10 h-10 p-0"
                 >×</Button>
              </div>
              
              <div className="space-y-8 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {/* Form List */}
                <div className="space-y-4">
                  {departmentForms.length === 0 && (
                    <div className="p-10 border-2 border-dashed border-slate-100 rounded-[2rem] text-center">
                       <p className="text-xs font-black text-slate-300 uppercase tracking-widest">No Forms Generated Yet</p>
                    </div>
                  )}
                  {departmentForms.map((form) => (
                    <div key={form.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group">
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm text-slate-400 group-hover:text-primary transition-colors">
                             <Link2 className="w-5 h-5" />
                          </div>
                          <div>
                             <p className="text-sm font-black text-slate-900">{form.form_name}</p>
                             <p className="text-[10px] text-slate-400 truncate max-w-[200px] font-medium">{form.form_link}</p>
                          </div>
                       </div>
                       <div className="flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="w-9 h-9 p-0 rounded-xl hover:bg-white hover:shadow-sm"
                            onClick={() => {
                              setEditingForm(form)
                              setNewForm({ name: form.form_name, link: form.form_link })
                            }}
                          >
                             <Edit3 className="w-4 h-4 text-slate-400" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="w-9 h-9 p-0 rounded-xl hover:bg-rose-50 hover:text-rose-500"
                            onClick={async () => {
                              const { error } = await supabase.from('department_forms').delete().eq('id', form.id)
                              if (!error) {
                                setDepartmentForms(prev => prev.filter(f => f.id !== form.id))
                                toast.success("Form deleted")
                              }
                            }}
                          >
                             <Trash2 className="w-4 h-4" />
                          </Button>
                       </div>
                    </div>
                  ))}
                </div>

                {/* Add/Edit Form Section */}
                <div className="p-8 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200 space-y-6">
                   <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                      {editingForm ? <Edit3 className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                      {editingForm ? 'Update Existing Form' : 'Generate New Form Link'}
                   </h4>
                   <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Internal Form Name</label>
                        <Input 
                          placeholder="e.g., Employment Survey 2024"
                          value={newForm.name}
                          onChange={e => setNewForm({...newForm, name: e.target.value})}
                          className="h-14 rounded-2xl bg-white border-slate-100 font-medium"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Google Form URL</label>
                        <Input 
                          placeholder="https://docs.google.com/forms/..."
                          value={newForm.link}
                          onChange={e => setNewForm({...newForm, link: e.target.value})}
                          className="h-14 rounded-2xl bg-white border-slate-100 font-medium"
                        />
                      </div>
                   </div>
                   <div className="flex gap-3">
                      <Button 
                        className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-slate-900 shadow-xl shadow-slate-900/10"
                        onClick={async () => {
                          if (!newForm.name || !newForm.link) return toast.error("Fill all fields")
                          const dbKey = canonicalClearanceDepartmentKey(departmentKey)
                          
                          if (editingForm) {
                            const { error } = await supabase
                              .from('department_forms')
                              .update({ form_name: newForm.name, form_link: newForm.link })
                              .eq('id', editingForm.id)
                            if (!error) {
                              setDepartmentForms(prev => prev.map(f => f.id === editingForm.id ? {...f, form_name: newForm.name, form_link: newForm.link} : f))
                              toast.success("Form updated")
                              setEditingForm(null)
                              setNewForm({ name: "", link: "" })
                            }
                          } else {
                            const { data, error } = await supabase
                              .from('department_forms')
                              .insert({ 
                                department_key: dbKey, 
                                form_name: newForm.name, 
                                form_link: newForm.link 
                              })
                              .select()
                              .single()
                            if (!error) {
                              setDepartmentForms(prev => [...prev, data])
                              toast.success("New form added")
                              setNewForm({ name: "", link: "" })
                            }
                          }
                        }}
                      >
                        {editingForm ? 'Save Changes' : 'Generate Form Link'}
                      </Button>
                      {editingForm && (
                        <Button 
                          variant="ghost" 
                          className="h-14 px-8 rounded-2xl font-bold"
                          onClick={() => { setEditingForm(null); setNewForm({ name: "", link: "" }); }}
                        >Cancel</Button>
                      )}
                   </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

