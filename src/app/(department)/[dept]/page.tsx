"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Sidebar } from "@/components/layout/Sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { useParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Mail, User, BookOpen } from "lucide-react"
import { toast } from "sonner"
import { sendEmailNotification, sendWhatsAppNotification } from "@/lib/notifications"

export default function DepartmentDashboard() {
  const { dept } = useParams()
  const departmentKey = (dept as string) || ''
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentTab, setCurrentTab] = useState<'pending' | 'today' | 'month' | 'all'>('pending')
  const [remarks, setRemarks] = useState<{ [key: string]: string }>({})
  const supabase = createClient()

  useEffect(() => {
    if (!departmentKey) return

    async function fetchStudents() {
      setLoading(true)
      // The department slug (e.g., 'computer-science') matches the department_key in DB
      const dbKey = departmentKey.toLowerCase()

      let query = supabase
        .from('clearance_status')
        .select(`
          id,
          status,
          remarks,
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

    fetchStudents()
  }, [departmentKey, currentTab])

  const openWhatsApp = (phone: string, name: string) => {
    if (!phone) { toast.error("No phone number on record."); return }
    const msg = `Hello ${name}, I am contacting you from the ${departmentKey.replace(/-/g, ' ')} department regarding your university clearance.`
    window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const handleUpdateStatus = async (clearanceId: string, status: 'cleared' | 'issue', studentProfile: any) => {
    try {
      const isAcademicPortal = departmentKey.startsWith("academic-")
      if (isAcademicPortal) {
        const { data: statuses, error: statusesError } = await supabase
          .from("clearance_status")
          .select("department_key,status")
          .eq("student_id", studentProfile.id)

        if (statusesError) throw statusesError
        const nonAcademic = (statuses || []).filter((s) => !s.department_key.startsWith("academic-"))
        const allNonAcademicCleared = nonAcademic.length > 0 && nonAcademic.every((s) => s.status === "cleared")
        if (!allNonAcademicCleared) {
          toast.error("Academic approval is locked until all departments clear the student.")
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
      if (!departmentKey.startsWith("academic-") && status === "cleared") {
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
      <Sidebar role="department" />

      <main className="flex-1 w-full lg:max-w-[calc(100%-16rem)] lg:ml-64 p-6 md:p-8">
        <header className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-10">
          <div>
            <h2 className="text-4xl font-black tracking-tight uppercase italic">
              {deptLabel} <span className="text-primary font-black">Portal</span>
            </h2>
            <p className="text-muted-foreground mt-2 text-lg font-medium">
              Manage student clearances for your department.
            </p>
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
                              {student.profiles?.full_name?.[0] || 'U'}
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
                              onClick={() => openWhatsApp(student.profiles?.phone, student.profiles?.full_name)}
                              title="WhatsApp"
                              className="w-9 h-9 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition-colors"
                            >
                              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.417-.003 6.557-5.338 11.892-11.893 11.892-1.997-.001-3.951-.5-5.688-1.448l-6.305 1.652zm6.599-3.835c1.52.909 3.292 1.389 5.096 1.391 5.514 0 10.005-4.49 10.008-10.007.002-2.673-1.04-5.186-2.935-7.082-1.895-1.896-4.407-2.937-7.08-2.938-5.517 0-10.008 4.489-10.01 10.007-.001 1.83.479 3.618 1.391 5.174l-.912 3.33 3.442-.904z" />
                              </svg>
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
