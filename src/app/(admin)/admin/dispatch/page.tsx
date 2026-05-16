"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Sidebar } from "@/components/layout/Sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import { toast } from "sonner"
import { 
  Package, Truck, MapPin, CheckCircle2, 
  Search, ExternalLink, ShieldCheck, Clock,
  Filter, ChevronDown, LayoutGrid, MoreVertical,
  Calendar
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export default function DispatchManagement() {
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  const [trackingNo, setTrackingNo] = useState("")
  const [filterDept, setFilterDept] = useState("All Departments")
  const [filterStatus, setFilterStatus] = useState("all")
  
  const academicDepartments = [
    "Computer Science",
    "Software Engineering",
    "Mathematics",
    "Humanities",
    "Environmental Sciences",
  ]

  const supabase = createClient()

  useEffect(() => {
    fetchDispatchData()
  }, [])

  const fetchDispatchData = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student')

      if (error) throw error
      setStudents(data || [])
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const updateDispatchStatus = async (id: string, status: string, tracking?: string) => {
    try {
      const updateData: any = { dispatch_status: status }
      if (tracking) updateData.tracking_id = tracking // Adjusted to match my SQL migration

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', id)

      if (error) {
        if (error.message.includes("column \"dispatch_status\" of relation \"profiles\" does not exist")) {
           toast.error("Database sync pending. Dispatch columns not found.")
           return
        }
        throw error
      }

      toast.success(`Dispatch status updated to ${status.toUpperCase()}`)
      fetchDispatchData()
      setSelectedStudent(null)
      setTrackingNo("")
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const filteredStudents = students.filter(s => {
    const matchesSearch = !searchTerm || 
      s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.reg_no?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesDept = filterDept === 'All Departments' || s.department_name === filterDept
    
    let matchesStatus = true
    if (filterStatus === 'pending') matchesStatus = !s.dispatch_status || s.dispatch_status === 'pending'
    else if (filterStatus === 'processing') matchesStatus = s.dispatch_status === 'processing' || s.dispatch_status === 'verified'
    else if (filterStatus === 'shipped') matchesStatus = s.dispatch_status === 'shipped'

    return matchesSearch && matchesDept && matchesStatus
  })

  const stats = {
    pending: students.filter(s => !s.dispatch_status || s.dispatch_status === 'pending').length,
    processing: students.filter(s => s.dispatch_status === 'processing' || s.dispatch_status === 'verified').length,
    shipped: students.filter(s => s.dispatch_status === 'shipped').length
  }

  if (loading && students.length === 0) return (
    <div className="flex items-center justify-center min-h-screen bg-sky-50/50 dark:bg-slate-950">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-sky-50/50 dark:bg-slate-950 font-sans">
      <Sidebar role="admin" />
      
      <main className="flex-1 lg:ml-64 p-6 md:p-12">
        <header className="mb-12 flex flex-col xl:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-[2rem] bg-indigo-600 text-white flex items-center justify-center shadow-2xl shadow-indigo-600/20">
               <Package className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white leading-none">
                Logistics <span className="text-indigo-600 italic">& Dispatch</span>
              </h1>
              <div className="flex items-center gap-3 mt-3">
                <span className="px-3 py-1 bg-indigo-500/10 text-indigo-500 rounded-full text-[10px] font-bold uppercase tracking-wider">Fulfillment Hub</span>
                <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Degree Shipping Orchestration</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
             <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                <input 
                  type="text" 
                  placeholder="Search ledger..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-11 pr-4 py-3 bg-white dark:bg-slate-900 rounded-2xl border-none shadow-sm focus:ring-2 focus:ring-indigo-500/20 transition-all w-64 text-sm font-medium"
                />
             </div>
          </div>
        </header>

        {/* 📊 High-Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
           {[
             { label: "Awaiting Verification", value: stats.pending, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
             { label: "In Preparation", value: stats.processing, icon: Package, color: "text-blue-500", bg: "bg-blue-500/10" },
             { label: "Finalized Dispatch", value: stats.shipped, icon: Truck, color: "text-emerald-500", bg: "bg-emerald-500/10" },
           ].map((stat, i) => (
             <Card key={i} className="glass-card border-none shadow-2xl rounded-[2.5rem] overflow-hidden group hover:scale-[1.02] transition-all">
                <CardContent className="p-10 flex items-center justify-between">
                   <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">{stat.label}</p>
                      <h4 className="text-4xl font-bold tracking-tighter">{stat.value}</h4>
                   </div>
                   <div className={`w-14 h-14 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center group-hover:rotate-12 transition-transform`}>
                      <stat.icon className="w-7 h-7" />
                   </div>
                </CardContent>
             </Card>
           ))}
        </div>

        {/* 🔍 Unified Logistics Filter */}
        <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl p-3 rounded-3xl border border-white/20 dark:border-white/5 flex flex-wrap items-center justify-between gap-4 mb-10">
           <div className="flex items-center gap-2">
              <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                 <button onClick={() => setFilterStatus('all')} className={`px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${filterStatus === 'all' ? 'bg-white shadow-md text-primary' : 'text-slate-400 hover:text-slate-600'}`}>All Orders</button>
                 <button onClick={() => setFilterStatus('pending')} className={`px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${filterStatus === 'pending' ? 'bg-white shadow-md text-amber-500' : 'text-slate-400 hover:text-slate-600'}`}>Pending</button>
                 <button onClick={() => setFilterStatus('processing')} className={`px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${filterStatus === 'processing' ? 'bg-white shadow-md text-blue-500' : 'text-slate-400 hover:text-slate-600'}`}>Processing</button>
                 <button onClick={() => setFilterStatus('shipped')} className={`px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${filterStatus === 'shipped' ? 'bg-white shadow-md text-emerald-500' : 'text-slate-400 hover:text-slate-600'}`}>Shipped</button>
              </div>
           </div>

           <div className="flex items-center gap-3">
              <div className="relative">
                 <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                 <select 
                   value={filterDept}
                   onChange={(e) => setFilterDept(e.target.value)}
                   className="pl-10 pr-10 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-2xl border-none text-[10px] font-bold uppercase appearance-none cursor-pointer hover:bg-slate-200 transition-colors"
                 >
                   <option>All Departments</option>
                   {academicDepartments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                 </select>
                 <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
           </div>
        </div>

        <Card className="glass-card border-none rounded-[3rem] shadow-2xl overflow-hidden">
          <CardContent className="p-0">
             <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                   <thead>
                      <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-white/5">
                         <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-slate-400">Recipient Identity</th>
                         <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-slate-400">Shipping Vector</th>
                         <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-slate-400">Order Status</th>
                         <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Logistics Control</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50 dark:divide-white/[0.02]">
                      {filteredStudents.length > 0 ? filteredStudents.map((s) => (
                         <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-all group">
                            <td className="px-8 py-6">
                               <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center font-bold text-slate-400 group-hover:scale-110 transition-transform">
                                     {s.full_name?.charAt(0) || "U"}
                                  </div>
                                  <div>
                                     <p className="font-bold text-slate-900 dark:text-white text-sm">{s.full_name}</p>
                                     <p className="text-[10px] font-bold text-indigo-500 tracking-wider mt-0.5">{s.reg_no}</p>
                                  </div>
                               </div>
                            </td>
                            <td className="px-8 py-6">
                               <div className="flex items-start gap-2">
                                  <MapPin className="w-3.5 h-3.5 text-indigo-400 mt-0.5" />
                                  <div>
                                    <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 max-w-[250px] line-clamp-2 leading-relaxed italic">
                                       {s.shipping_address || "Address Authorization Pending"}
                                    </p>
                                    <p className="text-[9px] font-bold uppercase text-slate-400 mt-1">{s.department_name}</p>
                                  </div>
                               </div>
                            </td>
                            <td className="px-8 py-6">
                               <div className="flex flex-col gap-2">
                                  <span className={`px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest w-fit
                                    ${!s.dispatch_status || s.dispatch_status === 'pending' ? 'bg-amber-100 text-amber-700' : 
                                      s.dispatch_status === 'processing' || s.dispatch_status === 'verified' ? 'bg-blue-100 text-blue-700' : 
                                      s.dispatch_status === 'shipped' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                                     {s.dispatch_status || 'Pending'}
                                  </span>
                                  {s.tracking_id && (
                                     <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                                        <Truck className="w-3 h-3" />
                                        <span>{s.tracking_id}</span>
                                     </div>
                                  )}
                               </div>
                            </td>
                            <td className="px-8 py-6 text-right">
                               <Button 
                                 size="sm"
                                 onClick={() => setSelectedStudent(s)}
                                 className="rounded-xl h-10 px-6 font-bold uppercase text-[10px] tracking-widest bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-600/20"
                               >
                                  Execute
                                </Button>
                            </td>
                         </tr>
                      )) : (
                        <tr>
                           <td colSpan={4} className="px-8 py-24 text-center">
                              <div className="flex flex-col items-center justify-center gap-4">
                                <Package className="w-12 h-12 text-slate-100" />
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Orders Found</h3>
                                <p className="text-sm text-slate-400 font-medium italic">All degree fulfillments are up to date.</p>
                              </div>
                           </td>
                        </tr>
                      )}
                   </tbody>
                </table>
             </div>
          </CardContent>
        </Card>

        {/* Management Modal */}
        <AnimatePresence>
          {selectedStudent && (
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md"
             >
                <motion.div 
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] p-10 relative overflow-hidden"
                >
                   <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/5 rounded-full -mr-20 -mt-20" />
                   
                   <div className="flex justify-between items-start mb-10">
                      <div>
                         <h3 className="text-3xl font-bold tracking-tight">Logistics <span className="text-indigo-600 italic">Control</span></h3>
                         <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Fulfillment Optimization Hub</p>
                      </div>
                      <button onClick={() => setSelectedStudent(null)} className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:scale-110 transition-transform">
                         <XCircle className="w-5 h-5 text-slate-400" />
                      </button>
                   </div>

                   <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-white/5 mb-10 space-y-3">
                      <div className="flex justify-between items-center">
                         <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Recipient</span>
                         <span className="text-sm font-bold">{selectedStudent.full_name}</span>
                      </div>
                      <div className="flex justify-between items-start">
                         <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Vector</span>
                         <span className="text-xs font-bold text-right text-slate-600 dark:text-slate-400 italic max-w-[200px] leading-relaxed">{selectedStudent.shipping_address || "Awaiting Verification"}</span>
                      </div>
                   </div>

                   <div className="space-y-4 mb-10">
                      <Button 
                        onClick={() => updateDispatchStatus(selectedStudent.id, 'verified')}
                        variant="outline" className="w-full justify-start h-16 rounded-[1.25rem] px-8 font-bold uppercase text-[10px] tracking-widest border-slate-200 dark:border-white/10 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 group"
                      >
                         <ShieldCheck className="w-5 h-5 mr-4 text-indigo-500 group-hover:scale-110 transition-transform" /> Authorize Address Integrity
                      </Button>
                      
                      <Button 
                        onClick={() => updateDispatchStatus(selectedStudent.id, 'processing')}
                        variant="outline" className="w-full justify-start h-16 rounded-[1.25rem] px-8 font-bold uppercase text-[10px] tracking-widest border-slate-200 dark:border-white/10 hover:bg-blue-50 dark:hover:bg-blue-900/20 group"
                      >
                         <Package className="w-5 h-5 mr-4 text-blue-500 group-hover:scale-110 transition-transform" /> Initialize Fulfillment Processing
                      </Button>
                      
                      <div className="pt-6 border-t border-slate-100 dark:border-white/5 mt-6">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4 ml-1">Final Dispatch Orchestration</p>
                        <div className="flex gap-3">
                           <input 
                             placeholder="Tracking Reference ID" 
                             value={trackingNo}
                             onChange={(e) => setTrackingNo(e.target.value)}
                             className="h-14 flex-1 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-none px-6 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
                           />
                           <Button 
                             onClick={() => updateDispatchStatus(selectedStudent.id, 'shipped', trackingNo)}
                             disabled={!trackingNo}
                             className="h-14 px-10 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-600/20"
                           >
                              Dispatch
                           </Button>
                        </div>
                      </div>
                   </div>
                </motion.div>
             </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

function XCircle(props: any) {
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
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6" />
      <path d="m9 9 6 6" />
    </svg>
  )
}
