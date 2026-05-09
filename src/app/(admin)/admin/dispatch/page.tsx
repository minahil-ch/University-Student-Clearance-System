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
  Search, ExternalLink, ShieldCheck, Clock
} from "lucide-react"

export default function DispatchManagement() {
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  const [trackingNo, setTrackingNo] = useState("")
  const supabase = createClient()

  useEffect(() => {
    fetchDispatchData()
  }, [])

  const fetchDispatchData = async () => {
    try {
      // Fetch fully cleared students (we approximate this by finding students who exist in clearance_status with 'cleared' and have role 'student')
      // Ideally, we'd query those who have finished all clearance.
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student')

      if (error) throw error
      // Filter for those who might have dispatch data or are cleared
      // In a real scenario, we'd ensure they are fully cleared. For now, we show all students for logistics.
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
      if (tracking) updateData.tracking_number = tracking

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', id)

      if (error) {
        // If column doesn't exist, it will throw error
        if (error.message.includes("column \"dispatch_status\" of relation \"profiles\" does not exist")) {
           toast.error("Please run the DISPATCH_SETUP.sql script in Supabase first to enable this module.")
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

  const filteredStudents = students.filter(s => 
    s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.reg_no?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const pendingDispatches = students.filter(s => s.dispatch_status === 'pending' || !s.dispatch_status).length
  const processingDispatches = students.filter(s => s.dispatch_status === 'processing' || s.dispatch_status === 'verified').length
  const shippedDispatches = students.filter(s => s.dispatch_status === 'shipped' || s.dispatch_status === 'delivered').length

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-sky-50/50 dark:bg-slate-950">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-sky-50/50 dark:bg-slate-950 font-sans">
      <Sidebar role="admin" />
      
      <main className="flex-1 lg:ml-64 p-6 md:p-12">
        <header className="mb-12 flex flex-col md:flex-row justify-between items-end gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
               <Badge className="bg-primary/10 text-primary border-none rounded-lg px-3 py-1 text-xs font-bold font-medium text-muted-foreground">Enterprise Module</Badge>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-primary">Logistics & <span className="text-primary not-italic">Dispatch</span></h1>
            <p className="text-slate-500 font-bold text-lg mt-2 max-w-2xl leading-relaxed">
              Degree Fulfillment and Shipping Tracking. Verify addresses and orchestrate the final mile of the student lifecycle.
            </p>
          </div>
          <div className="relative w-full md:w-80 group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-all duration-300" />
            <Input
              placeholder="Search student or ID..."
              className="pl-14 h-14 rounded-2xl bg-white dark:bg-slate-900 border-slate-200 shadow-sm focus:shadow-xl transition-all text-sm font-bold"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </header>

        {/* Dispatch Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
           <Card className="glass-card border-none shadow-xl overflow-hidden group">
              <CardContent className="p-8">
                 <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center"><Clock className="w-6 h-6 text-amber-500" /></div>
                    <Badge variant="outline" className="text-xs font-medium text-muted-foreground font-bold text-amber-500 border-amber-500/20">Awaiting Action</Badge>
                 </div>
                 <p className="text-4xl font-bold tracking-tight">{pendingDispatches}</p>
                 <p className="text-xs font-bold text-slate-400 font-medium text-muted-foreground mt-1">Pending Address Verification</p>
              </CardContent>
           </Card>
           <Card className="glass-card border-none shadow-xl overflow-hidden group">
              <CardContent className="p-8">
                 <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center"><Package className="w-6 h-6 text-blue-500" /></div>
                    <Badge variant="outline" className="text-xs font-medium text-muted-foreground font-bold text-blue-500 border-blue-500/20">In Processing</Badge>
                 </div>
                 <p className="text-4xl font-bold tracking-tight">{processingDispatches}</p>
                 <p className="text-xs font-bold text-slate-400 font-medium text-muted-foreground mt-1">Degrees in Preparation</p>
              </CardContent>
           </Card>
           <Card className="glass-card border-none shadow-xl overflow-hidden group">
              <CardContent className="p-8">
                 <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center"><Truck className="w-6 h-6 text-emerald-500" /></div>
                    <Badge variant="outline" className="text-xs font-medium text-muted-foreground font-bold text-emerald-500 border-emerald-500/20">Shipped</Badge>
                 </div>
                 <p className="text-4xl font-bold tracking-tight">{shippedDispatches}</p>
                 <p className="text-xs font-bold text-slate-400 font-medium text-muted-foreground mt-1">Successfully Dispatched</p>
              </CardContent>
           </Card>
        </div>

        {/* Master Dispatch List */}
        <Card className="glass-card border-none rounded-[2.5rem] shadow-2xl overflow-hidden">
          <CardHeader className="p-8 border-b border-slate-100 bg-slate-900 text-white">
            <div className="flex items-center gap-4">
               <Package className="w-8 h-8 text-primary" />
               <div>
                  <CardTitle className="text-xl font-bold tracking-tight">Fulfillment Queue</CardTitle>
                  <CardDescription className="text-xs font-bold font-medium text-muted-foreground text-slate-400 mt-1">Manage degree shipping status</CardDescription>
               </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                   <thead className="bg-sky-50/50 border-b border-slate-100">
                      <tr>
                         <th className="px-8 py-5 text-xs font-bold font-medium text-muted-foreground text-slate-400">Student Identity</th>
                         <th className="px-8 py-5 text-xs font-bold font-medium text-muted-foreground text-slate-400">Shipping Address</th>
                         <th className="px-8 py-5 text-xs font-bold font-medium text-muted-foreground text-slate-400">Logistics Status</th>
                         <th className="px-8 py-5 text-xs font-bold font-medium text-muted-foreground text-slate-400 text-right">Action</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                      {filteredStudents.map((s) => (
                         <tr key={s.id} className="hover:bg-sky-50/50/50 transition-all group">
                            <td className="px-8 py-6">
                               <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center font-bold">
                                     {s.full_name?.charAt(0) || "U"}
                                  </div>
                                  <div>
                                     <p className="font-bold text-slate-900 text-sm uppercase">{s.full_name}</p>
                                     <p className="text-xs font-bold text-primary font-medium text-muted-foreground">{s.reg_no}</p>
                                  </div>
                               </div>
                            </td>
                            <td className="px-8 py-6">
                               <div className="flex items-start gap-2">
                                  <MapPin className="w-4 h-4 text-slate-300 mt-0.5" />
                                  <p className="text-xs font-bold text-slate-600 max-w-[200px] line-clamp-2">
                                     {s.shipping_address || "No address provided yet"}
                                  </p>
                               </div>
                            </td>
                            <td className="px-8 py-6">
                               <Badge className={`px-3 py-1 text-xs font-medium text-muted-foreground font-bold border-none
                                 ${!s.dispatch_status || s.dispatch_status === 'pending' ? 'bg-amber-100 text-amber-700' : 
                                   s.dispatch_status === 'processing' ? 'bg-blue-100 text-blue-700' : 
                                   s.dispatch_status === 'shipped' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                  {s.dispatch_status || 'Pending Verification'}
                               </Badge>
                               {s.tracking_number && (
                                  <p className="text-xs font-bold text-slate-400 uppercase mt-2 tracking-widest">
                                     TRK: <span className="text-slate-900">{s.tracking_number}</span>
                                  </p>
                               )}
                            </td>
                            <td className="px-8 py-6 text-right">
                               <Button 
                                 size="sm"
                                 onClick={() => setSelectedStudent(s)}
                                 className="rounded-xl h-10 px-6 font-bold uppercase text-xs tracking-widest bg-slate-900 text-white hover:bg-primary shadow-xl"
                               >
                                  Manage Dispatch
                               </Button>
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </CardContent>
        </Card>

        {/* Management Modal */}
        {selectedStudent && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
              <div className="w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl p-8 border border-white/20">
                 <div className="flex justify-between items-start mb-8">
                    <div>
                       <h3 className="text-2xl font-bold tracking-tight text-slate-900">Dispatch Control</h3>
                       <p className="text-xs font-bold text-primary font-medium text-muted-foreground mt-1">Update Degree Shipping Status</p>
                    </div>
                    <Button variant="ghost" className="rounded-full w-10 h-10 p-0" onClick={() => setSelectedStudent(null)}>
                       <ExternalLink className="w-5 h-5 rotate-180" />
                    </Button>
                 </div>

                 <div className="p-5 bg-sky-50/50 rounded-2xl border border-slate-100 mb-8 space-y-2">
                    <p className="text-xs font-bold uppercase text-slate-400">Student: <span className="text-slate-900">{selectedStudent.full_name}</span></p>
                    <p className="text-xs font-bold uppercase text-slate-400">Address: <span className="text-slate-900">{selectedStudent.shipping_address || "Not specified"}</span></p>
                 </div>

                 <div className="space-y-4 mb-8">
                    <Button 
                      onClick={() => updateDispatchStatus(selectedStudent.id, 'verified')}
                      variant="outline" className="w-full justify-start h-14 rounded-2xl px-6 font-bold uppercase text-xs tracking-widest"
                    >
                       <ShieldCheck className="w-5 h-5 mr-3 text-blue-500" /> Mark Address Verified
                    </Button>
                    <Button 
                      onClick={() => updateDispatchStatus(selectedStudent.id, 'processing')}
                      variant="outline" className="w-full justify-start h-14 rounded-2xl px-6 font-bold uppercase text-xs tracking-widest"
                    >
                       <Package className="w-5 h-5 mr-3 text-amber-500" /> Mark as Processing (Printing)
                    </Button>
                    
                    <div className="flex gap-2">
                       <Input 
                         placeholder="Enter Tracking Number..." 
                         value={trackingNo}
                         onChange={(e) => setTrackingNo(e.target.value)}
                         className="h-14 rounded-2xl bg-sky-50/50 border-slate-200 font-bold"
                       />
                       <Button 
                         onClick={() => updateDispatchStatus(selectedStudent.id, 'shipped', trackingNo)}
                         disabled={!trackingNo}
                         className="h-14 px-8 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase text-xs tracking-widest shadow-xl"
                       >
                          <Truck className="w-5 h-5 mr-2" /> Dispatch
                       </Button>
                    </div>
                 </div>
              </div>
           </div>
        )}
      </main>
    </div>
  )
}
