"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Sidebar } from "@/components/layout/Sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { motion, AnimatePresence } from "framer-motion"
import { 
  FileText, Download, TrendingUp, Users, CheckCircle, 
  Clock, ArrowRight, GraduationCap, Building2, BarChart3,
  ShieldCheck, AlertCircle, Calendar
} from "lucide-react"
import { toast } from "sonner"
import { jsPDF } from "jspdf"
import "jspdf-autotable"

export default function AnalyticsContent() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchAnalytics()
    fetchUser()
  }, [])

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setCurrentUser(profile)
    }
  }

  const fetchAnalytics = async () => {
    try {
      const { data: students } = await supabase.from('profiles').select('id, session').eq('role', 'student')
      const { data: clearance } = await supabase.from('clearance_status').select(`
        id, status, department_key, updated_at,
        student:student_id (full_name, reg_no, session)
      `)

      const totalStudents = students?.length || 0
      const totalRequests = clearance?.length || 0
      const clearedCount = clearance?.filter(c => c.status === 'cleared').length || 0
      const pendingCount = clearance?.filter(c => c.status === 'pending').length || 0
      const issueCount = clearance?.filter(c => c.status === 'issue').length || 0

      // Department breakdown
      const deptMap: any = {}
      clearance?.forEach(c => {
        if (!deptMap[c.department_key]) {
          deptMap[c.department_key] = { total: 0, cleared: 0, pending: 0, issues: 0 }
        }
        deptMap[c.department_key].total++
        if (c.status === 'cleared') deptMap[c.department_key].cleared++
        else if (c.status === 'pending') deptMap[c.department_key].pending++
        else deptMap[c.department_key].issues++
      })

      const deptPerformance = Object.keys(deptMap).map(key => ({
        name: key.replace('academic-', '').replace(/-/g, ' ').toUpperCase(),
        total: deptMap[key].total,
        cleared: deptMap[key].cleared,
        pending: deptMap[key].pending,
        clearanceRate: Math.round((deptMap[key].cleared / deptMap[key].total) * 100) || 0
      }))

      // Batch Distribution
      const batchMap: any = {}
      students?.forEach(s => {
        const batch = s.session || 'Unknown'
        batchMap[batch] = (batchMap[batch] || 0) + 1
      })
      const batchDistribution = Object.keys(batchMap).map(b => ({ batch: b, count: batchMap[b] }))

      setData({
        summary: { totalStudents, totalRequests, cleared: clearedCount, pending: pendingCount, issues: issueCount },
        deptPerformance,
        batchDistribution,
        recentPending: clearance?.filter(c => c.status === 'pending').slice(0, 5) || []
      })
    } finally {
      setLoading(false)
    }
  }

  const exportToPDF = async () => {
    setIsExporting(true)
    try {
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      
      // Header Section
      doc.setFillColor(0, 102, 255)
      doc.rect(0, 0, pageWidth, 45, 'F')
      
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(24)
      doc.setFont('helvetica', 'bold')
      doc.text('CUI CLEARANCE SYSTEM', 20, 25)
      
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`INSTITUTIONAL PERFORMANCE AUDIT | GENERATED: ${new Date().toLocaleString()}`, 20, 35)
      
      // Report Metadata
      doc.setTextColor(50, 50, 50)
      doc.setFontSize(14)
      doc.text('SYSTEM ANALYTICS OVERVIEW', 20, 65)
      
      doc.setFontSize(10)
      doc.text(`Lead Auditor: ${currentUser?.full_name || 'System Administrator'}`, 20, 72)
      doc.text(`Security Level: Enterprise Grade (Verified)`, 20, 78)

      // Summary Table
      const summaryData = [
        ['Total Registered Students', data.summary.totalStudents.toString()],
        ['Total Clearance Requests', data.summary.totalRequests.toString()],
        ['Successfully Cleared', data.summary.cleared.toString()],
        ['Pending Verification', data.summary.pending.toString()],
        ['Issue Reports', data.summary.issues.toString()]
      ]

      ;(doc as any).autoTable({
        startY: 85,
        head: [['Metric Definition', 'Current Value']],
        body: summaryData,
        theme: 'striped',
        headStyles: { fillStyle: [0, 102, 255], fontStyle: 'bold' }
      })

      // Department Performance
      doc.setFontSize(14)
      doc.text('DEPARTMENTAL EFFICIENCY MATRIX', 20, (doc as any).lastAutoTable.finalY + 20)

      const deptData = data.deptPerformance.map((d: any) => [
        d.name,
        `${d.clearanceRate}%`,
        d.total.toString(),
        d.cleared.toString(),
        d.pending.toString()
      ])

      ;(doc as any).autoTable({
        startY: (doc as any).lastAutoTable.finalY + 25,
        head: [['Department Name', 'Clearance Rate', 'Total Nodes', 'Cleared', 'Pending']],
        body: deptData,
        theme: 'grid',
        headStyles: { fillStyle: [30, 41, 59], fontStyle: 'bold' }
      })

      // Footer
      const totalPages = (doc as any).internal.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(150, 150, 150)
        doc.text(
          `CONFIDENTIAL: COMSATS University Islamabad | Vehari Campus | Audit Page ${i} of ${totalPages}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        )
      }

      doc.save(`CUI_Audit_Report_${new Date().toISOString().split('T')[0]}.pdf`)
      toast.success('Institutional audit report exported successfully')
    } catch (error) {
      toast.error('Failed to generate audit report')
    } finally {
      setIsExporting(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-sky-50/50 dark:bg-slate-950">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-sky-50/50 dark:bg-slate-950 font-sans">
      <Sidebar role="admin" />

      <main className="flex-1 lg:ml-64 p-6 md:p-12">
        <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-8 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-2">
               <Badge className="bg-primary/10 text-primary border-none rounded-lg px-3 py-1 text-xs font-bold font-medium text-muted-foreground">Enterprise Ready</Badge>
               <span className="text-xs font-bold text-slate-400 font-medium text-muted-foreground">Session 2024-25 Audit</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-primary">CUI <span className="text-primary">Clearance System</span></h1>
            <p className="text-slate-500 font-bold text-lg mt-2 max-w-2xl leading-relaxed">
              Institutional intelligence and operational telemetry. Review clearance velocity and export verified performance audits.
            </p>
          </div>
          <div className="flex items-center gap-4">
             <Button 
               onClick={fetchAnalytics}
               variant="outline"
               className="h-14 px-6 rounded-2xl border-slate-200 font-bold uppercase text-xs tracking-widest gap-2"
             >
               <TrendingUp className="w-4 h-4" /> Refresh Data
             </Button>
             <Button 
               onClick={exportToPDF}
               disabled={isExporting}
               className="h-14 px-8 rounded-2xl bg-slate-900 text-white hover:bg-black font-bold uppercase text-xs tracking-widest shadow-2xl shadow-black/20 gap-3 min-w-[200px]"
             >
               {isExporting ? <Clock className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
               {isExporting ? "Generating..." : "Export Audit PDF"}
             </Button>
          </div>
        </header>

        {/* Global Summary Hub */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {[
            { label: "Registered Students", value: data.summary.totalStudents, icon: Users, color: "blue" },
            { label: "Completed Clearances", value: data.summary.cleared, icon: CheckCircle, color: "emerald" },
            { label: "Pending Reviews", value: data.summary.pending, icon: Clock, color: "amber" },
            { label: "Issue Reports", value: data.summary.issues, icon: AlertCircle, color: "rose" }
          ].map((stat, i) => (
            <Card key={i} className="glass-card border-none shadow-xl overflow-hidden group hover:scale-[1.02] transition-all">
              <CardContent className="p-8">
                <div className={`w-14 h-14 rounded-2xl bg-${stat.color}-500/10 flex items-center justify-center mb-4 transition-transform group-hover:rotate-6`}>
                   <stat.icon className={`w-7 h-7 text-${stat.color}-500`} />
                </div>
                <p className="text-xs font-bold text-slate-400 font-medium text-muted-foreground leading-none mb-2">{stat.label}</p>
                <p className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Efficiency Matrix */}
          <div className="xl:col-span-2">
            <Card className="glass-card border-none rounded-[2.5rem] shadow-2xl overflow-hidden">
               <CardHeader className="p-8 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold tracking-tight">Department Efficiency Matrix</CardTitle>
                    <p className="text-xs font-bold font-medium text-muted-foreground text-slate-400 mt-1">Real-time clearance velocity tracking</p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-slate-200" />
               </CardHeader>
               <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                       <thead className="bg-sky-50/50/50">
                         <tr>
                           <th className="px-8 py-5 text-xs font-bold font-medium text-muted-foreground text-slate-400">Department Node</th>
                           <th className="px-8 py-5 text-xs font-bold font-medium text-muted-foreground text-slate-400 text-center">Clearance Rate</th>
                           <th className="px-8 py-5 text-xs font-bold font-medium text-muted-foreground text-slate-400 text-right">Operational Load</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-50">
                          {data.deptPerformance.map((dept: any, i: number) => (
                            <tr key={i} className="hover:bg-sky-50/50/40 transition-all">
                               <td className="px-8 py-6">
                                  <div className="flex items-center gap-4">
                                     <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                                        <Building2 className="w-5 h-5" />
                                     </div>
                                     <span className="font-bold text-slate-900 uppercase text-xs tracking-tight">{dept.name}</span>
                                  </div>
                               </td>
                               <td className="px-8 py-6">
                                  <div className="flex flex-col items-center gap-2">
                                     <div className="w-full max-w-[120px] h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-primary" style={{ width: `${dept.clearanceRate}%` }} />
                                     </div>
                                     <span className="text-xs font-bold text-primary italic">{dept.clearanceRate}% Efficiency</span>
                                  </div>
                               </td>
                               <td className="px-8 py-6 text-right">
                                  <div className="flex flex-col items-end">
                                     <span className="text-sm font-bold text-slate-900">{dept.total} Total</span>
                                     <span className="text-xs font-bold text-slate-400 font-medium text-muted-foreground">{dept.pending} Pending Reviews</span>
                                  </div>
                               </td>
                            </tr>
                          ))}
                       </tbody>
                    </table>
                  </div>
               </CardContent>
            </Card>
          </div>

          {/* Batch Distribution & Quick Audit */}
          <div className="xl:col-span-1 space-y-8">
             <Card className="glass-card border-none rounded-[2.5rem] shadow-2xl overflow-hidden">
                <CardHeader className="p-8 bg-primary text-white">
                   <div className="flex items-center gap-4">
                      <GraduationCap className="w-8 h-8" />
                      <div>
                         <CardTitle className="text-xl font-bold tracking-tight leading-none">Batch Distribution</CardTitle>
                         <p className="text-xs font-bold font-medium text-muted-foreground text-white/60 mt-2 italic">Student Census by Session</p>
                      </div>
                   </div>
                </CardHeader>
                <CardContent className="p-8 space-y-4">
                   {data.batchDistribution.map((batch: any, i: number) => (
                     <div key={i} className="flex items-center justify-between p-5 bg-sky-50/50 rounded-[1.5rem] hover:bg-white hover:shadow-lg transition-all border border-slate-100/50">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center font-bold text-primary text-xs shadow-sm">
                              {batch.batch.slice(-2)}
                           </div>
                           <span className="font-bold text-slate-900 uppercase text-xs">Session {batch.batch}</span>
                        </div>
                        <span className="text-lg font-bold text-primary">{batch.count}</span>
                     </div>
                   ))}
                </CardContent>
             </Card>

             <Card className="p-10 bg-indigo-600 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group cursor-pointer" onClick={exportToPDF}>
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl group-hover:scale-110 transition-transform duration-700" />
                <ShieldCheck className="w-12 h-12 mb-6 opacity-50" />
                <h4 className="text-2xl font-bold tracking-tight">Generate Audit Report</h4>
                <p className="text-indigo-100 text-xs mt-3 font-medium leading-relaxed opacity-80">
                  One-click generation of the official institutional performance audit. Secure, branded, and verified for university registry.
                </p>
                <div className="mt-8 flex items-center gap-3 font-bold text-xs font-medium text-muted-foreground text-white">
                   Click to Export <ArrowRight className="w-4 h-4" />
                </div>
             </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
