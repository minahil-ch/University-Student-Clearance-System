"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Sidebar } from "@/components/layout/Sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Check, X, Truck, Phone, Mail, User } from "lucide-react"
import { toast } from "sonner"
import { sendEmailNotification, sendWhatsAppNotification } from "@/lib/notifications"

export default function TransportPortal() {
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [remarks, setRemarks] = useState<{ [key: string]: string }>({})
  const supabase = createClient()

  useEffect(() => {
    async function fetchStudents() {
      const { data, error } = await supabase
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
        .eq('department_key', 'transport')
        .eq('status', 'pending')

      if (error) {
        toast.error("Failed to fetch students")
      } else {
        setStudents(data || [])
      }
      setLoading(false)
    }

    fetchStudents()
  }, [])

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
        department: 'TRANSPORT',
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
      <Sidebar role="transport" />
      
      <main className="flex-1 w-full lg:ml-64 p-4 md:p-6 xl:p-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h2 className="text-4xl font-black tracking-tight uppercase italic">
              Transport <span className="text-primary text-amber-500 font-black">Management</span>
            </h2>
            <p className="text-muted-foreground mt-2 text-lg font-medium">Clear student transport dues and verify permit status.</p>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input 
              placeholder="Search Reg No..." 
              className="pl-12 h-14 rounded-2xl bg-white border-none shadow-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </header>

        <Card className="glass-card shadow-2xl border-none">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                    <th className="px-8 py-5 text-xs font-black uppercase tracking-[0.2em]">Student Details</th>
                    <th className="px-8 py-5 text-xs font-black uppercase tracking-[0.2em]">Status</th>
                    <th className="px-8 py-5 text-xs font-black uppercase tracking-[0.2em]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-8 py-6">
                        <div className="font-black">{student.profiles?.full_name}</div>
                        <div className="text-xs text-muted-foreground font-bold">{student.profiles?.reg_no}</div>
                      </td>
                      <td className="px-8 py-6">
                        <StatusBadge status={student.status} />
                      </td>
                      <td className="px-8 py-6 flex items-center gap-3">
                        {student.status !== 'cleared' ? (
                          <>
                            <Button 
                              size="sm" 
                              className="bg-emerald-500 hover:bg-emerald-600 font-black uppercase tracking-widest text-[10px] h-10 px-6 rounded-xl"
                              onClick={() => handleUpdateStatus(student.id, 'cleared', student.profiles)}
                            >
                              Clear
                            </Button>
                            <Input 
                              placeholder="Issue description" 
                              className="h-10 text-[10px] w-48 bg-slate-50 border-none rounded-xl"
                              value={remarks[student.id] || ""}
                              onChange={(e) => setRemarks({ ...remarks, [student.id]: e.target.value })}
                            />
                            <Button 
                              size="sm" 
                              variant="destructive"
                              className="font-black uppercase tracking-widest text-[10px] h-10 px-6 rounded-xl"
                               onClick={() => handleUpdateStatus(student.id, 'issue', student.profiles)}
                            >
                              Report
                            </Button>
                          </>
                        ) : (
                          <div className="text-emerald-500 font-black uppercase tracking-widest text-[10px]">✅ Fully Cleared</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredStudents.length === 0 && (
                <div className="py-20 text-center font-black uppercase tracking-widest text-slate-300">No requests found</div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
