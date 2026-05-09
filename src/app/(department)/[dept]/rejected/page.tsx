"use client"

import { useEffect, useState, useMemo } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Sidebar } from "@/components/layout/Sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { canonicalClearanceDepartmentKey } from "@/lib/departmentKeys"
import { AlertCircle, Download, Search, User, XCircle } from "lucide-react"
import { Input } from "@/components/ui/Input"
import { toast } from "sonner"

export default function RejectedStudentsPage() {
  const { dept } = useParams()
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const supabase = createClient()

  const departmentKey = canonicalClearanceDepartmentKey(dept as string)

  useEffect(() => {
    fetchRejectedStudents()
  }, [departmentKey])

  const fetchRejectedStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('clearance_status')
        .select(`
          id,
          status,
          remarks,
          updated_at,
          profiles!student_id (
            full_name,
            reg_no,
            email,
            department_name
          )
        `)
        .eq('department_key', departmentKey)
        .eq('status', 'issue')
        .order('updated_at', { ascending: false })

      if (error) throw error
      setStudents(data || [])
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const filteredStudents = useMemo(() => {
    return students.filter(s => 
      s.profiles.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.profiles.reg_no.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [students, searchQuery])

  const exportToCSV = () => {
    const headers = ["Full Name", "Reg No", "Email", "Department", "Remarks", "Date"]
    const rows = filteredStudents.map(s => [
      s.profiles.full_name,
      s.profiles.reg_no,
      s.profiles.email,
      s.profiles.department_name,
      s.remarks || "No remarks",
      new Date(s.updated_at).toLocaleDateString()
    ])

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n")

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `rejected_students_${dept}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="flex min-h-screen bg-blue-50/50 dark:bg-slate-950 font-sans">
      <Sidebar role="department" departmentName={dept as string} />
      
      <main className="flex-1 lg:ml-64 p-6 md:p-10">
        <header className="mb-12 flex flex-col md:flex-row justify-between items-start gap-6">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Rejected <span className="text-rose-500 italic">Requests</span></h1>
            <p className="text-slate-400 font-bold font-medium text-muted-foreground text-xs mt-2">Active Issues and Blocking Concerns List</p>
          </div>
          <Button 
            onClick={exportToCSV}
            className="h-14 px-8 rounded-2xl bg-slate-900 text-white font-bold font-medium text-muted-foreground text-xs gap-2 shadow-xl hover:bg-slate-800 transition-all"
          >
            <Download className="w-4 h-4" /> Export Issues List
          </Button>
        </header>

        <div className="mb-8 relative max-w-md">
          <Search className="absolute left-5 top-5 w-5 h-5 text-slate-300" />
          <Input 
            placeholder="Search by Name or Registration Number..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-14 h-16 rounded-2xl bg-white dark:bg-slate-900 border-none shadow-sm font-bold"
          />
        </div>

        <Card className="glass-card border-none rounded-[2.5rem] shadow-2xl overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-50 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/50">
                    <th className="px-8 py-6 text-xs font-bold font-medium text-muted-foreground text-slate-400">Student Profile</th>
                    <th className="px-8 py-6 text-xs font-bold font-medium text-muted-foreground text-slate-400">Issue Details</th>
                    <th className="px-8 py-6 text-xs font-bold font-medium text-muted-foreground text-slate-400">Department</th>
                    <th className="px-8 py-6 text-xs font-bold font-medium text-muted-foreground text-slate-400 text-right">Date Flagged</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((s) => (
                      <tr key={s.id} className="group hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
                              <User className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white uppercase text-sm leading-none">{s.profiles.full_name}</p>
                              <p className="text-[10px] text-slate-400 font-bold mt-1.5 uppercase tracking-wider">{s.profiles.reg_no}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                           <div className="flex flex-col gap-1">
                              <p className="font-bold text-sm text-slate-600 dark:text-slate-400">{s.remarks || "No specific reason provided"}</p>
                              <p className="text-[10px] text-rose-500 font-bold uppercase flex items-center gap-1.5">
                                 <AlertCircle className="w-3 h-3" /> Action Required
                              </p>
                           </div>
                        </td>
                        <td className="px-8 py-6 text-sm font-bold text-slate-400 uppercase">{s.profiles.department_name}</td>
                        <td className="px-8 py-6 text-right font-bold text-xs text-rose-500 font-medium text-muted-foreground">
                          <span className="px-3 py-1 bg-rose-500/10 rounded-full">{new Date(s.updated_at).toLocaleDateString()}</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-8 py-20 text-center">
                        <div className="flex flex-col items-center gap-4">
                           <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
                             <XCircle className="w-8 h-8 text-slate-200" />
                           </div>
                           <p className="text-xs font-bold font-medium text-muted-foreground text-slate-300">No rejected requests found</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
