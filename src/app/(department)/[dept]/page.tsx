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
import { Search, Mail, User, BookOpen, Building2, Truck, GraduationCap, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
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
  const [loading, setLoading] = useState(true)
  const [accessReady, setAccessReady] = useState(false)
  const [sidebarRole, setSidebarRole] = useState<'department' | 'transport' | 'library' | 'admin' | 'student'>('department')
  const [sidebarDeptName, setSidebarDeptName] = useState<string>("")
  const [searchTerm, setSearchTerm] = useState("")
  const [currentTab, setCurrentTab] = useState<'pending' | 'today' | 'month' | 'all'>('pending')
  const [remarks, setRemarks] = useState<{ [key: string]: string }>({})
  const [googleFormLink, setGoogleFormLink] = useState("")
  const [isEditingLink, setIsEditingLink] = useState(false)
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
        (profile.role === "department" &&
          requestedClearance === canonicalClearanceDepartmentKey(profile.department_name || ""))

      if (!allowed) {
        toast.error("Access denied for this portal.")
        if (profile.role === "library") router.replace("/library")
        else if (profile.role === "transport") router.replace("/transport")
        else if (profile.role === "department" && profile.department_name)
          router.replace(`/dept/${departmentPortalPathSlug(profile.department_name)}`)
        else router.replace("/login/staff?role=staff")
        return
      }

      if (profile.role === "library" || profile.role === "transport") {
        setSidebarRole(profile.role)
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

    async function fetchStudents() {
      setLoading(true)
      const dbKey = canonicalClearanceDepartmentKey(departmentKey)

      let query = supabase
        .from('clearance_status')
        .select(`
          id,
          status,
          remarks,
          form_submitted,
          updated_at,
          profiles:student_id (
            id,
            full_name,
            father_name,
            reg_no,
            email,
            phone,
            cgpa,
            department_name
          )
        `)
        .eq('department_key', dbKey)

      if (currentTab === 'pending') {
        query = query.eq('status', 'pending')
      } else if (currentTab === 'today') {
        const today = new Date().toISOString().split('T')[0]
        query = query.gte('updated_at', today)
      } else if (currentTab === 'month') {
        const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
        query = query.gte('updated_at', firstDay)
      }

      const { data, error } = await query

      if (error) {
        toast.error("Failed to fetch students: " + error.message)
      } else {
        setStudents(data || [])
      }
      setLoading(false)
    }

    async function fetchSettings() {
      if (isAcademic) {
        const { data } = await supabase
          .from('department_settings')
          .select('google_form_link')
          .eq('department_key', canonicalClearanceDepartmentKey(departmentKey))
          .maybeSingle()
        if (data) {
          setGoogleFormLink(data.google_form_link || "")
        }
      }
    }

    fetchStudents()
    fetchSettings()
  }, [departmentKey, currentTab, accessReady, isAcademic])

  const saveGoogleFormLink = async () => {
    try {
      const dbKey = canonicalClearanceDepartmentKey(departmentKey)
      const { error } = await supabase
        .from('department_settings')
        .upsert({ department_key: dbKey, google_form_link: googleFormLink })
      if (error) throw error
      toast.success("Google Form link saved successfully")
      setIsEditingLink(false)
    } catch (err: any) {
      toast.error("Failed to save link: " + err.message)
    }
  }

  const handleOpenWhatsApp = (phone: string, name: string, studentStatus: string, studentRemarks: string) => {
    if (!phone) { toast.error("No phone number on record."); return }
    
    let msg = `Hello ${name}, I am contacting you from the ${departmentKey.replace(/-/g, ' ').toUpperCase()} department regarding your university clearance.`
    
    if (studentStatus === 'cleared') {
      msg = CLEARANCE_MESSAGES.CERTIFICATE_READY(name)
    } else if (studentStatus === 'issue') {
      msg = CLEARANCE_MESSAGES.ISSUE_REPORTED(name, departmentKey, studentRemarks || "Please check the portal for details.")
    }
    
    const link = getWhatsAppLink(phone, msg)
    if (link) window.open(link, '_blank')
  }

  const handleOpenEmail = (email: string, name: string, studentStatus: string, studentRemarks: string) => {
    if (!email) { toast.error("No email address on record."); return }
    
    const subject = `University Clearance Update - ${departmentKey.replace(/-/g, ' ').toUpperCase()}`
    let body = `Hello ${name},\n\nI am contacting you from the ${departmentKey.replace(/-/g, ' ').toUpperCase()} department regarding your university clearance.\n\n`
    
    if (studentStatus === 'cleared') {
      body += `Your clearance has been approved by our department.`
    } else if (studentStatus === 'issue') {
      body += `There is an issue with your clearance: ${studentRemarks || "Please check the portal for details."}`
    }
    
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  const handleUpdateStatus = async (clearanceId: string, status: 'cleared' | 'issue', studentProfile: any) => {
    try {
      const isAcademicPortal = isAcademicClearancePortal(departmentKey)
      if (isAcademicPortal) {
        const { data: statuses, error: statusesError } = await supabase
          .from("clearance_status")
          .select("department_key,status,form_submitted")
          .eq("student_id", studentProfile.id)

        if (statusesError) throw statusesError
        const nonAcademic = (statuses || []).filter((s) => !s.department_key.startsWith("academic-"))
        const allNonAcademicCleared = nonAcademic.length > 0 && nonAcademic.every((s) => s.status === "cleared")
        if (!allNonAcademicCleared) {
          toast.error("Academic approval is locked until all departments clear the student.")
          return
        }

        const studentStatus = statuses?.find(s => s.department_key === canonicalClearanceDepartmentKey(departmentKey))
        if (status === 'cleared' && googleFormLink && !studentStatus?.form_submitted) {
          toast.error("Student has not yet marked the Google Form as completed.")
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

      toast.success(`${studentProfile.full_name} marked as ${status}`)

      // Log to audit table
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('audit_logs').insert({
          actor_id: user.id,
          action: `status_update_${status}`,
          target_student_id: studentProfile.id,
          department_key: departmentKey,
          details: { remarks: remarks[clearanceId] || null }
        }).throwOnError()
      }

      // Send notifications (non-blocking)
      sendEmailNotification({
        name: studentProfile.full_name,
        email: studentProfile.email,
        phone: studentProfile.phone,
        department: departmentKey.toUpperCase().replace(/-/g, ' '),
        status,
        remarks: remarks[clearanceId]
      }).catch(console.warn)

      sendWhatsAppNotification({
        name: studentProfile.full_name,
        email: studentProfile.email,
        phone: studentProfile.phone,
        department: departmentKey.toUpperCase().replace(/-/g, ' '),
        status,
        remarks: remarks[clearanceId]
      }).catch(console.warn)

      // Auto-forward to academic department after core departments clear.
      if (!isAcademicClearancePortal(departmentKey) && status === "cleared") {
        const { data: statuses } = await supabase
          .from("clearance_status")
          .select("department_key,status")
          .eq("student_id", studentProfile.id)

        const nonAcademic = (statuses || []).filter((s) => !s.department_key.startsWith("academic-"))
        const allNonAcademicCleared = nonAcademic.length > 0 && nonAcademic.every((s) => s.status === "cleared")
        if (allNonAcademicCleared) {
          const academicKey = `academic-${(studentProfile?.department_name || "").toLowerCase().replace(/\s+/g, "-")}`
          await supabase
            .from("clearance_status")
            .upsert(
              {
                student_id: studentProfile.id,
                department_key: academicKey,
                status: "pending",
                remarks: "Auto-forwarded after all departments approved",
                updated_at: new Date().toISOString(),
              },
              { onConflict: "student_id,department_key" }
            )
        }
      }

      setStudents(prev => prev.map(s =>
        s.id === clearanceId
          ? { ...s, status, remarks: status === 'issue' ? remarks[clearanceId] : null }
          : s
      ))
    } catch (err: any) {
      toast.error(err.message || "Failed to update status")
    }
  }

  const filteredStudents = students.filter(s =>
    s.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.profiles?.reg_no?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const deptLabel = departmentKey.replace(/-/g, ' ').toUpperCase()

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar role={sidebarRole} departmentName={sidebarDeptName} />

      <main className="flex-1 w-full lg:max-w-[calc(100%-16rem)] lg:ml-64 p-6 md:p-8">
        <header className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-10">
          <div>
            <h2 className="text-4xl font-black tracking-tight uppercase italic">
              {deptLabel} <span className="text-primary font-black">Portal</span>
            </h2>
            <p className="text-muted-foreground mt-2 text-lg font-medium">
              Manage student clearances for your department.
            </p>
            {isAcademic && (
              <div className="mt-4 flex items-center gap-2 max-w-md">
                {isEditingLink ? (
                  <>
                    <Input 
                      placeholder="Paste Google Form Link..." 
                      value={googleFormLink} 
                      onChange={e => setGoogleFormLink(e.target.value)} 
                      className="bg-white"
                    />
                    <Button size="sm" onClick={saveGoogleFormLink}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setIsEditingLink(false)}>Cancel</Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium">
                      Form Link: {googleFormLink ? <a href={googleFormLink} target="_blank" className="text-blue-500 underline">View Link</a> : <span className="text-slate-400 italic">None set</span>}
                    </p>
                    <Button size="sm" variant="outline" onClick={() => setIsEditingLink(true)}>Edit Form Link</Button>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search name or Reg No..."
                className="pl-12 h-14 rounded-2xl bg-white border-none shadow-xl"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex bg-white/60 dark:bg-slate-900/60 p-1.5 rounded-2xl w-fit shadow-lg">
              {(['pending', 'today', 'month', 'all'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setCurrentTab(tab)}
                  className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    currentTab === tab
                      ? 'bg-primary text-white shadow-md'
                      : 'text-slate-400 hover:text-primary'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </header>

        <Card className="glass-card shadow-2xl border-none overflow-hidden">
          <CardHeader className="bg-slate-100/50 dark:bg-slate-900/50 p-6 border-b border-slate-200 dark:border-slate-800">
            <CardTitle className="text-lg font-black uppercase tracking-widest">
              {currentTab === 'pending' ? 'Active Requests' : `${currentTab.toUpperCase()} History`}
            </CardTitle>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Student</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Info</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Status</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <AnimatePresence mode="popLayout">
                    {filteredStudents.map((student) => (
                      <motion.tr
                        key={student.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-all"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                              {departmentKey === 'library' ? <BookOpen className="w-5 h-5" /> :
                               departmentKey === 'transport' ? <Truck className="w-5 h-5" /> :
                               departmentKey === 'finance' ? <Building2 className="w-5 h-5" /> :
                               departmentKey === 'hostel' ? <ShieldCheck className="w-5 h-5" /> :
                               isAcademicClearancePortal(departmentKey) ? <GraduationCap className="w-5 h-5" /> :
                               student.profiles?.full_name?.[0] || 'U'}
                            </div>
                            <div>
                              <div className="font-black text-slate-900 dark:text-white">
                                {student.profiles?.full_name}
                              </div>
                              <div className="text-[10px] font-black uppercase tracking-widest text-primary">
                                {student.profiles?.reg_no}
                              </div>
                              <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 mt-0.5">
                                <User className="w-3 h-3" /> {student.profiles?.father_name || 'N/A'}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-xs font-bold text-emerald-600">
                              <BookOpen className="w-3 h-3" /> CGPA: {student.profiles?.cgpa || '—'}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-medium text-slate-400">
                              <Mail className="w-3 h-3" /> {student.profiles?.email}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <StatusBadge status={student.status} />
                        </td>

                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* WhatsApp */}
                            <button
                              onClick={() => handleOpenWhatsApp(student.profiles?.phone, student.profiles?.full_name, student.status, student.remarks)}
                              title="WhatsApp Student"
                              className="w-9 h-9 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition-colors border border-emerald-100"
                            >
                              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.417-.003 6.557-5.338 11.892-11.893 11.892-1.997-.001-3.951-.5-5.688-1.448l-6.305 1.652zm6.599-3.835c1.52.909 3.292 1.389 5.096 1.391 5.514 0 10.005-4.49 10.008-10.007.002-2.673-1.04-5.186-2.935-7.082-1.895-1.896-4.407-2.937-7.08-2.938-5.517 0-10.008 4.489-10.01 10.007-.001 1.83.479 3.618 1.391 5.174l-.912 3.33 3.442-.904z" />
                              </svg>
                            </button>

                            {/* Email */}
                            <button
                              onClick={() => handleOpenEmail(student.profiles?.email, student.profiles?.full_name, student.status, student.remarks)}
                              title="Email Student"
                              className="w-9 h-9 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-colors border border-blue-100"
                            >
                              <Mail className="w-4 h-4" />
                            </button>

                            {student.status !== 'cleared' ? (
                              <>
                                <Button
                                  size="sm"
                                  className="bg-emerald-500 hover:bg-emerald-600 font-black uppercase text-[9px] h-9 px-5 rounded-xl"
                                  onClick={() => handleUpdateStatus(student.id, 'cleared', student.profiles)}
                                >
                                  Approve
                                </Button>
                                <Input
                                  placeholder="Remarks..."
                                  className="h-9 text-[9px] w-28 bg-slate-50 border-none rounded-xl"
                                  value={remarks[student.id] || ""}
                                  onChange={(e) => setRemarks({ ...remarks, [student.id]: e.target.value })}
                                />
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="font-black uppercase text-[9px] h-9 px-5 rounded-xl"
                                  onClick={() => handleUpdateStatus(student.id, 'issue', student.profiles)}
                                >
                                  Issue
                                </Button>
                              </>
                            ) : (
                              <div className="flex items-center gap-1 text-emerald-500 font-black text-[9px] uppercase tracking-widest bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-200">
                                ✓ Cleared
                              </div>
                            )}
                          </div>
                          {isAcademic && (
                            <div className="mt-2 text-[10px] font-bold">
                              {student.form_submitted ? (
                                <span className="text-emerald-500">✓ Form Submitted</span>
                              ) : (
                                <span className="text-rose-500">✗ Form Pending</span>
                              )}
                            </div>
                          )}
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>

              {loading && (
                <div className="py-20 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400 mt-4">Loading...</p>
                </div>
              )}
              {!loading && filteredStudents.length === 0 && (
                <div className="py-20 text-center text-slate-300 font-black uppercase tracking-[0.3em]">
                  No records found
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
