"use client"
export const dynamic = 'force-dynamic'

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Sidebar } from "@/components/layout/Sidebar"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { Search, BookOpen } from "lucide-react"
import { toast } from "sonner"
import { sendEmailNotification, sendWhatsAppNotification } from "@/lib/notifications"

export default function LibraryPortal() {
  const [students, setStudents] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [currentTab, setCurrentTab] = useState<'pending' | 'today' | 'month' | 'all'>('pending')
  const [remarks, setRemarks] = useState<{ [key: string]: string }>({})
  const supabase = createClient()

  useEffect(() => {
    async function fetchStudents() {
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
            cgpa
          )
        `)
        .eq('department_key', 'library')

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
        toast.error("Failed to fetch students")
      } else {
        setStudents(data || [])
      }
    }

    fetchStudents()
  }, [currentTab])

  const openWhatsApp = (phone: string, name: string) => {
    const msg = `Hello ${name}, this is the Library. We are contacting you regarding your university clearance.`
    window.open(`https://wa.me/${phone?.replace(/\+/g, '')}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const handleUpdateStatus = async (clearanceId: string, status: 'cleared' | 'issue', studentProfile: any) => {
    try {
      const { error } = await supabase
        .from('clearance_status')
        .update({ 
          status, 
          remarks: status === 'issue' ? remarks[clearanceId] : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', clearanceId)

      if (error) throw error

      toast.success(`Student ${studentProfile.full_name} status updated to ${status}`)
      
      const notificationData = {
        name: studentProfile.full_name,
        email: studentProfile.email,
        phone: studentProfile.phone,
        department: 'LIBRARY',
        status,
        remarks: remarks[clearanceId]
      }

      await sendEmailNotification(notificationData)
      await sendWhatsAppNotification(notificationData)

      setStudents(prev => prev.map(s => s.id === clearanceId ? { ...s, status, remarks: status === 'issue' ? remarks[clearanceId] : null } : s))
    } catch (error: any) {
      toast.error(error.message || "Failed to update status")
    }
  }

  const filteredStudents = students.filter(s => 
    s.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.profiles?.reg_no?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar role="library" />
      
      <main className="flex-1 w-full lg:ml-64 p-4 md:p-6 xl:p-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h2 className="text-4xl font-black tracking-tight uppercase italic">
              Library <span className="text-primary text-violet-500 font-black">Portal</span>
            </h2>
            <p className="text-muted-foreground mt-2 text-lg font-medium">Verify book returns and overdue fines before graduation.</p>
          </div>
          <div className="flex flex-col gap-4">
             <div className="relative w-full md:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input 
                   placeholder="Search Reg No..." 
                   className="pl-12 h-14 rounded-2xl bg-white border-none shadow-xl focus:ring-2"
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
             <div className="flex bg-white/50 dark:bg-slate-900/50 p-1.5 rounded-2xl w-fit glass-card">
              {(['pending', 'today', 'month', 'all'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setCurrentTab(tab)}
                  className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    currentTab === tab ? 'bg-violet-500 text-white shadow-lg' : 'text-slate-400 hover:text-violet-500'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </header>

        <Card className="glass-card shadow-2xl border-none">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                    <th className="px-8 py-5 text-xs font-black uppercase tracking-[0.2em]">Student Details</th>
                    <th className="px-8 py-5 text-xs font-black uppercase tracking-[0.2em]">Academic Info</th>
                    <th className="px-8 py-5 text-xs font-black uppercase tracking-[0.2em]">Status</th>
                    <th className="px-8 py-5 text-xs font-black uppercase tracking-[0.2em]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="font-black group-hover:text-primary transition-colors">{student.profiles?.full_name}</div>
                        <div className="text-xs text-muted-foreground font-bold">{student.profiles?.reg_no}</div>
                      </td>
                      <td className="px-8 py-6">
                         <div className="text-xs font-bold text-slate-500 flex items-center gap-2">
                           <BookOpen className="w-4 h-4" /> CGPA: {student.profiles?.cgpa || "0.0"}
                         </div>
                      </td>
                      <td className="px-8 py-6">
                        <StatusBadge status={student.status} />
                      </td>
                      <td className="px-8 py-6 flex items-center gap-3">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-10 w-10 p-0 rounded-xl hover:bg-emerald-50 text-emerald-600"
                            onClick={() => openWhatsApp(student.profiles?.phone, student.profiles?.full_name)}
                         >
                            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.417-.003 6.557-5.338 11.892-11.893 11.892-1.997-.001-3.951-.5-5.688-1.448l-6.305 1.652zm6.599-3.835c1.52.909 3.292 1.389 5.096 1.391 5.514 0 10.005-4.49 10.008-10.007.002-2.673-1.04-5.186-2.935-7.082-1.895-1.896-4.407-2.937-7.08-2.938-5.517 0-10.008 4.489-10.01 10.007-.001 1.83.479 3.618 1.391 5.174l-.912 3.33 3.442-.904zm11.215-7.657c-.301-.15-1.779-.879-2.053-.979s-.476-.15-.675.151-.775.979-.95 1.179-.351.226-.651.075c-.302-.15-1.274-.469-2.427-1.496-.897-.801-1.503-1.791-1.68-2.091s-.019-.462.131-.611c.135-.135.301-.351.451-.526.151-.176.201-.301.301-.501s.051-.376-.025-.526c-.076-.151-.675-1.628-.926-2.228-.244-.583-.493-.504-.675-.513-.175-.008-.375-.01-.575-.01s-.526.075-.801.376c-.275.301-1.052 1.028-1.052 2.508s1.077 2.907 1.227 3.108c.15.201 2.119 3.235 5.132 4.535.717.309 1.276.493 1.711.631.72.229 1.375.197 1.892.12.576-.085 1.779-.727 2.03-1.43.25-.702.25-1.303.175-1.43-.075-.127-.275-.201-.576-.351z"/></svg>
                        </Button>
                        {student.status !== 'cleared' ? (
                          <>
                            <Button 
                              size="sm" 
                              className="bg-emerald-500 hover:bg-emerald-600 font-black uppercase tracking-widest text-[10px] h-10 px-6 rounded-xl shadow-lg"
                              onClick={() => handleUpdateStatus(student.id, 'cleared', student.profiles)}
                            >
                              OK Cleared
                            </Button>
                            <Input 
                              placeholder="Fines/Missing books..." 
                              className="h-10 text-[10px] w-48 bg-slate-50 border-none rounded-xl"
                              value={remarks[student.id] || ""}
                              onChange={(e) => setRemarks({ ...remarks, [student.id]: e.target.value })}
                            />
                            <Button 
                              size="sm" 
                              variant="destructive"
                              className="font-black uppercase tracking-widest text-[10px] h-10 px-6 rounded-xl shadow-lg shadow-rose-500/10"
                               onClick={() => handleUpdateStatus(student.id, 'issue', student.profiles)}
                            >
                              Flag
                            </Button>
                          </>
                        ) : (
                          <div className="text-emerald-500 font-black uppercase tracking-widest text-[10px] bg-emerald-50 px-4 py-2 rounded-xl">Verified OK</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredStudents.length === 0 && (
                <div className="py-20 text-center font-black uppercase tracking-widest text-slate-300">Queue is Clear</div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
