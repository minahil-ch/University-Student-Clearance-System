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
  Search, Mail, User, ShieldCheck, ClipboardList, Eye, 
  CheckCircle2, AlertCircle, Clock, Filter, Calendar
} from "lucide-react"
import { toast } from "sonner"
import { formatDate } from "@/lib/utils"
import { sendEmailNotification, sendWhatsAppNotification, logNotification } from "@/lib/notifications"
import {
  canonicalClearanceDepartmentKey,
  departmentPortalPathSlug,
  isAcademicClearancePortal,
} from "@/lib/departmentKeys"
import { Logo } from "@/components/ui/Logo"
import { NotificationBell } from "@/components/NotificationBell"

export default function RequestsContent() {
  const { dept } = useParams()
  const router = useRouter()
  const departmentKey = (dept as string) || ''
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [accessReady, setAccessReady] = useState(false)
  const [sidebarDeptName, setSidebarDeptName] = useState<string>("")
  const [searchTerm, setSearchTerm] = useState("")
  const [timeFilter, setTimeFilter] = useState<'today' | 'month' | 'all'>('all')
  const [remarks, setRemarks] = useState<{ [key: string]: string }>({})
  const [staffEmail, setStaffEmail] = useState<string>("")
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  
  const isAcademic = isAcademicClearancePortal(departmentKey)
  const supabase = createClient()

  useEffect(() => {
    if (!departmentKey) return

    async function verifyAccess() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace("/login")
        return
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, department_name, is_approved, email")
        .eq("id", user.id)
        .single()
      
      if (profile) {
        setStaffEmail(profile.email || user.email || "")
        setSidebarDeptName(profile.department_name || departmentKey.replace(/-/g, " "))
        setAccessReady(true)
      }
    }

    verifyAccess()
  }, [departmentKey, router, supabase])

  useEffect(() => {
    if (!departmentKey || !accessReady) return

    async function fetchData() {
      setLoading(true)
      const dbKey = canonicalClearanceDepartmentKey(departmentKey)

      let statusQuery = supabase
        .from('clearance_status')
        .select(`
          id, status, remarks, form_submitted, updated_at,
          profiles:student_id!student_id (
            id, full_name, father_name, reg_no, email, phone, cgpa, department_name,
            future_data (*)
          )
        `)
        .eq('department_key', dbKey)
        .eq('status', 'pending')

      if (timeFilter === 'today') {
        const today = new Date().toISOString().split('T')[0]
        statusQuery = statusQuery.gte('updated_at', today)
      } else if (timeFilter === 'month') {
        const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
        statusQuery = statusQuery.gte('updated_at', firstDay)
      }

      const { data } = await statusQuery
      setStudents(data || [])
      setLoading(false)
    }

    fetchData()
  }, [departmentKey, timeFilter, accessReady])

  const handleUpdateStatus = async (clearanceId: string, status: 'cleared' | 'issue', studentProfile: any) => {
    try {
      const { error } = await supabase
        .from('clearance_status')
        .update({
          status,
          remarks: status === 'issue' ? (remarks[clearanceId] || null) : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', clearanceId)

      if (error) throw error

      toast.success(`Student ${status.toUpperCase()} successfully`)
      
      // Notify
      if (studentProfile.email) {
        sendEmailNotification({ 
          ...studentProfile, 
          department: sidebarDeptName, 
          status,
          remarks: remarks[clearanceId] || null,
          recipientEmail: studentProfile.email,
          senderEmail: staffEmail
        }).catch(console.warn)
      }

      await logNotification({
        user_id: studentProfile.id,
        title: status === 'cleared' ? 'Clearance Approved' : 'Clearance Issue',
        message: status === 'cleared' 
          ? `You have been cleared by the ${sidebarDeptName} department.` 
          : `The ${sidebarDeptName} department has reported an issue: ${remarks[clearanceId] || 'Please contact the department.'}`,
        type: status === 'cleared' ? 'success' : 'issue'
      })

      setStudents(prev => prev.filter(s => s.id !== clearanceId))
      setSelectedStudent(null)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const filteredStudents = students.filter(s =>
    s.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.profiles?.reg_no?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (!accessReady || loading) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-[#f8fafc] dark:bg-slate-950 font-sans">
      <Sidebar role="department" departmentName={sidebarDeptName} />

      <main className="flex-1 lg:ml-64 p-6 md:p-10">
        <header className="mb-12 flex flex-col md:flex-row justify-between items-center gap-8">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter italic text-primary">CUI <span className="text-primary">Clearance System</span></h1>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2 tracking-[0.3em]">Institutional Verification Queue</p>
          </div>
          <div className="relative w-full md:w-80 group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-all duration-300" />
            <Input
              placeholder="Search by ID or Name..."
              className="pl-14 h-16 rounded-3xl bg-white dark:bg-slate-900 border-none shadow-sm focus:shadow-2xl transition-all text-sm font-bold"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </header>

        {/* Global Filter Hub */}
        <div className="flex flex-wrap items-center justify-between gap-8 mb-10 bg-white/40 dark:bg-slate-900/40 p-6 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-xl relative z-10">
           <div className="flex items-center gap-6">
              <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                 <Filter className="w-4 h-4" /> Filter Range:
              </div>
              <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-2xl border border-slate-200 dark:border-white/5">
                {(['all', 'today', 'month'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setTimeFilter(filter)}
                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                      timeFilter === filter ? 'bg-white dark:bg-slate-900 text-primary shadow-xl' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
           </div>
           <div className="px-6 py-3 bg-primary/10 rounded-2xl">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary leading-none">Awaiting Review</p>
              <p className="text-xl font-black text-primary italic mt-1">{filteredStudents.length} Requests</p>
           </div>
        </div>

        <Card className="glass-card border-none overflow-hidden rounded-[2.5rem] shadow-2xl">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Student Profile</th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Personal Details</th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Requirement Status</th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">Verification Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  <AnimatePresence mode="popLayout">
                    {filteredStudents.map((item: any) => (
                      <motion.tr
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="group hover:bg-white transition-all"
                      >
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-[1.2rem] bg-slate-100 flex items-center justify-center font-bold text-slate-300 border border-slate-100">
                              <User className="w-6 h-6" />
                            </div>
                            <div>
                              <div className="font-black text-slate-900 text-base leading-tight mb-1">{item.profiles?.full_name}</div>
                              <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/5 px-2 py-0.5 rounded-md">{item.profiles?.reg_no}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="space-y-1">
                             <p className="text-[10px] font-black text-slate-900 uppercase">CGPA: <span className="text-emerald-600">{item.profiles?.cgpa || '0.00'}</span></p>
                             <p className="text-[10px] font-black text-slate-900 uppercase truncate max-w-[150px]">Email: <span className="text-slate-500">{item.profiles?.email}</span></p>
                          </div>
                        </td>
                         <td className="px-8 py-6">
                          <div className="space-y-2">
                             <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-500">
                               <Clock className="w-3.5 h-3.5" /> Pending Review
                             </div>
                             {isAcademic && (
                               <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${item.form_submitted ? 'text-emerald-500' : 'text-rose-500'}`}>
                                 {item.form_submitted ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                                 {item.form_submitted ? 'Form: Submitted' : 'Form: PENDING'}
                               </div>
                             )}
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                           <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedStudent(item)}
                                className="rounded-xl font-black uppercase text-[10px] h-10 px-4 border-slate-200 hover:bg-slate-50 gap-2"
                              >
                                <Eye className="w-4 h-4" /> Review
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleUpdateStatus(item.id, 'cleared', item.profiles)}
                                disabled={isAcademic && !item.form_submitted}
                                className={`rounded-xl font-black uppercase text-[10px] h-10 px-6 bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 disabled:opacity-30 disabled:grayscale`}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleUpdateStatus(item.id, 'issue', item.profiles)}
                                className="rounded-xl font-black uppercase text-[10px] h-10 px-6"
                              >
                                Issue
                              </Button>
                           </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Student Detail Modal */}
        <AnimatePresence>
          {selectedStudent && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden border border-white/20"
              >
                <div className="p-10">
                  <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-5">
                      <div className="w-20 h-20 rounded-[2rem] bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                        <User className="w-10 h-10" />
                      </div>
                      <div>
                        <h3 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-none mb-2">
                          {selectedStudent.profiles?.full_name}
                        </h3>
                        <Badge className="bg-primary/10 text-primary border-none rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-widest">
                          {selectedStudent.profiles?.reg_no}
                        </Badge>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      onClick={() => setSelectedStudent(null)}
                      className="w-12 h-12 rounded-full p-0 text-slate-400 hover:bg-slate-100"
                    >
                      <X className="w-6 h-6" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-8 mb-10">
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Father&apos;s Name</p>
                        <p className="font-bold text-slate-900 dark:text-white">{selectedStudent.profiles?.father_name || "Not specified"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Current CGPA</p>
                        <p className="font-black text-emerald-600 text-xl tracking-tighter">{selectedStudent.profiles?.cgpa || "0.00"}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Email Address</p>
                        <p className="font-bold text-slate-900 dark:text-white truncate">{selectedStudent.profiles?.email}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Phone Number</p>
                        <p className="font-bold text-slate-900 dark:text-white">{selectedStudent.profiles?.phone || "No contact"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-8 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border border-slate-100 dark:border-white/5">
                     <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                           <FileText className="w-5 h-5 text-primary" />
                           <p className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Departmental Form Status</p>
                        </div>
                        <Badge className={`rounded-xl px-4 py-1.5 text-[9px] font-black uppercase border-none ${selectedStudent.form_submitted ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'}`}>
                           {selectedStudent.form_submitted ? "FORM SUBMITTED" : "PENDING FORM"}
                        </Badge>
                     </div>
                     <p className="text-xs text-slate-500 font-medium leading-relaxed italic">
                       {selectedStudent.form_submitted 
                         ? "The student has successfully submitted all department-specific surveys and requirements for the current clearance cycle."
                         : "Approval is restricted until the student completes the mandatory departmental requirement forms published in the Form Management tab."}
                     </p>
                  </div>
                </div>

                <div className="p-8 bg-slate-900 dark:bg-black flex gap-4">
                  <Button 
                    onClick={() => {
                      handleUpdateStatus(selectedStudent.id, 'cleared', selectedStudent.profiles)
                    }}
                    disabled={isAcademic && !selectedStudent.form_submitted}
                    className="flex-1 h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-500/20 disabled:opacity-30"
                  >
                    Approve Clearance
                  </Button>
                  <Button 
                    onClick={() => {
                      handleUpdateStatus(selectedStudent.id, 'issue', selectedStudent.profiles)
                    }}
                    className="flex-1 h-14 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-rose-500/20"
                  >
                    Flag Issue
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
