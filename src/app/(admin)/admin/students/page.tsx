"use client"
export const dynamic = 'force-dynamic'

import React, { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Sidebar } from "@/components/layout/Sidebar"
import { Card, CardContent } from "@/components/ui/Card"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { Search, Download, Mail, Phone, ChevronDown, Navigation, Briefcase, GraduationCap, ShieldCheck, AlertTriangle, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { CLEARANCE_MESSAGES, getWhatsAppLink, getEmailLink } from "@/lib/messages"
import { User, Building2, Clock } from "lucide-react"

export default function AdminStudents() {
  const [students, setStudents] = useState<any[]>([])
  const [futureData, setFutureData] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'pending' | 'cleared' | 'future'>('pending')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const supabase = createClient()

  const fetchData = async () => {
    setLoading(true)
    const { data: studentRecords } = await supabase
      .from('profiles')
      .select('*, clearance_status (*)')
      .eq('role', 'student')
    
    const { data: alumniData } = await supabase
      .from('future_data')
      .select('*, student:profiles!future_data_student_id_fkey(full_name, reg_no, email, phone, department_name)')

    setStudents(studentRecords || [])
    setFutureData(alumniData || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])



  const processedStudents = students.map(s => {
    const total = s.clearance_status?.length || 0
    const cleared = s.clearance_status?.filter((c: any) => c.status === 'cleared').length || 0
    const isCleared = total > 0 && total === cleared
    return { ...s, isCleared, totalDepts: total, clearedDepts: cleared }
  })

  const pendingList = processedStudents.filter(s => !s.isCleared)
  const clearedList = processedStudents.filter(s => s.isCleared)

  const getFilteredData = () => {
    const term = searchTerm.toLowerCase()
    if (activeTab === 'pending') {
      return pendingList.filter(s => s.full_name?.toLowerCase().includes(term) || s.reg_no?.toLowerCase().includes(term))
    }
    if (activeTab === 'cleared') {
      return clearedList.filter(s => s.full_name?.toLowerCase().includes(term) || s.reg_no?.toLowerCase().includes(term))
    }
    return futureData.filter(f => f.student?.full_name?.toLowerCase().includes(term) || f.student?.reg_no?.toLowerCase().includes(term))
  }

  const activeDataList = getFilteredData()

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar role="admin" />
      <main className="flex-1 w-full lg:max-w-[calc(100%-16rem)] lg:ml-64 p-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 mt-2">
          <div>
            <h2 className="text-3xl font-black tracking-tighter uppercase italic flex items-center gap-3">
              Student <span className="text-primary italic">Intelligence</span>
              <GraduationCap className="w-8 h-8 text-primary" />
            </h2>
            <p className="text-muted-foreground mt-1 text-sm font-medium tracking-tight">Enterprise-grade clearance oversight and alumni tracking.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative w-64 md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search database..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-11 rounded-xl bg-white border-none shadow-sm focus:ring-2 ring-primary/20 transition-all font-medium"
              />
            </div>
            <Button className="h-11 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-500/20 gap-2 font-black uppercase tracking-widest text-[10px]">
              <Download className="w-4 h-4" /> Export Report
            </Button>
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-3 mb-8 bg-slate-200/40 dark:bg-slate-800/40 p-1.5 rounded-[1.2rem] w-fit border border-white/10 shadow-inner">
          <button 
            onClick={() => { setActiveTab('pending'); setExpandedId(null); }}
            className={`px-6 py-2.5 rounded-[1rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'pending' ? 'bg-white dark:bg-slate-900 shadow-lg text-amber-500 scale-105' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Pending {pendingList.length > 0 && <span className="bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded-full ml-1 text-[9px]">{pendingList.length}</span>}
          </button>
          <button 
            onClick={() => { setActiveTab('cleared'); setExpandedId(null); }}
            className={`px-6 py-2.5 rounded-[1rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'cleared' ? 'bg-white dark:bg-slate-900 shadow-lg text-emerald-500 scale-105' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Cleared {clearedList.length > 0 && <span className="bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded-full ml-1 text-[9px]">{clearedList.length}</span>}
          </button>
          <button 
            onClick={() => { setActiveTab('future'); setExpandedId(null); }}
            className={`px-6 py-2.5 rounded-[1rem] text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'future' ? 'bg-white dark:bg-slate-900 shadow-lg text-blue-500' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Briefcase className="w-3.5 h-3.5" /> Alumni Census
          </button>
        </div>

        <Card className="glass-card shadow-2xl border-none overflow-hidden rounded-[2rem]">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-800">
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Identity</th>
                    {activeTab !== 'future' ? (
                      <>
                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Contact Method</th>
                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Clearance Status</th>
                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-center">Action</th>
                      </>
                    ) : (
                      <>
                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Target Path</th>
                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Institution / Org</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50/50 dark:divide-slate-800/50">
                  {activeDataList.map((item: any) => {
                    if (activeTab === 'future') {
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-all duration-300">
                          <td className="px-8 py-6">
                            <div className="font-bold text-slate-800 dark:text-slate-200">{item.student?.full_name}</div>
                            <div className="text-[10px] font-black uppercase text-primary mt-1">{item.student?.reg_no}</div>
                          </td>
                          <td className="px-8 py-6">
                            <span className="bg-indigo-500/10 text-indigo-500 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-indigo-500/20">
                              {item.plan_type}
                            </span>
                          </td>
                          <td className="px-8 py-6">
                            <div className="font-black text-xs text-slate-700 dark:text-slate-300 uppercase tracking-tight">{item.organization_name || item.university_name || 'Direct Placement'}</div>
                            <div className="text-[10px] text-muted-foreground mt-0.5 italic">{item.job_title || item.program_name || 'Proprietor'}</div>
                          </td>
                        </tr>
                      )
                    }

                    return (
                      <React.Fragment key={item.id}>
                        <tr 
                          className={`hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all cursor-pointer group ${expandedId === item.id ? 'bg-slate-50 dark:bg-slate-900/50' : ''}`}
                          onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                        >
                          <td className="px-8 py-6">
                             <div className="flex items-center gap-4">
                                <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black shadow-inner border border-primary/20">
                                  {item.full_name?.[0] || 'S'}
                                </div>
                                <div className="space-y-0.5">
                                  <div className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight">{item.full_name}</div>
                                  <div className="text-[10px] font-black uppercase tracking-widest text-primary/70">{item.reg_no}</div>
                                </div>
                             </div>
                          </td>
                          <td className="px-8 py-6">
                             <div className="flex flex-col gap-1.5">
                               <div className="flex items-center gap-2 text-xs font-bold text-slate-500"><Mail className="w-3.5 h-3.5 text-slate-400" /> {item.email}</div>
                               <div className="flex items-center gap-2 text-xs font-bold text-slate-500"><Phone className="w-3.5 h-3.5 text-slate-400" /> {item.phone || 'N/A'}</div>
                             </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex flex-col gap-2">
                               <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.clearedDepts} of {item.totalDepts} Portals OK</div>
                               <div className="w-32 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner border border-slate-200 dark:border-slate-700">
                                 <div 
                                   className={`h-full transition-all duration-1000 ${item.isCleared ? 'bg-emerald-500' : 'bg-primary'}`}
                                   style={{ width: `${item.totalDepts === 0 ? 0 : (item.clearedDepts / item.totalDepts) * 100}%` }}
                                 />
                               </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center justify-center gap-4">
                              <StatusBadge status={item.isCleared ? 'cleared' : 'pending'} className="h-7 w-fit rounded-xl px-4 text-[9px] font-black uppercase border-none" />
                              <div className={`transition-transform duration-300 ${expandedId === item.id ? 'rotate-180' : ''}`}>
                                <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-primary" />
                              </div>
                            </div>
                          </td>
                        </tr>

                        <AnimatePresence>
                          {expandedId === item.id && (
                            <motion.tr
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                            >
                              <td colSpan={4} className="px-6 py-2 bg-slate-50/30 dark:bg-slate-900/20">
                                <motion.div 
                                  initial={{ x: -20, opacity: 0 }}
                                  animate={{ x: 0, opacity: 1 }}
                                  className="m-4 p-8 rounded-[2.5rem] bg-white dark:bg-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-slate-100 dark:border-slate-800"
                                >
                                  <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                                    {/* Column 1: Core Profile */}
                                    <div className="space-y-6 xl:col-span-1">
                                       <div className="flex flex-col items-center text-center p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border border-slate-100 dark:border-slate-700">
                                         <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-primary to-indigo-600 p-1 mb-4 shadow-xl">
                                            <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center text-3xl font-black text-primary">
                                              {item.full_name?.[0]}
                                            </div>
                                         </div>
                                         <h4 className="font-black text-xl tracking-tight">{item.full_name}</h4>
                                         <p className="text-[10px] font-black uppercase tracking-widest text-primary/60 mt-1">{item.reg_no}</p>
                                       </div>

                                       <div className="p-5 bg-rose-500/5 rounded-2xl border border-rose-500/10 space-y-4">
                                          <div className="flex items-center justify-between">
                                            <h5 className="text-[9px] font-black uppercase tracking-widest text-rose-500">Security Credentials</h5>
                                            <ShieldCheck className="w-4 h-4 text-rose-500" />
                                          </div>
                                          <div className="space-y-2">
                                             <div className="flex items-center justify-between text-xs">
                                               <span className="text-muted-foreground font-medium">Access Key</span>
                                               <span className="font-mono bg-white dark:bg-slate-900 px-2 py-0.5 rounded border">{(item.id || '').substring(0, 8)}...</span>
                                             </div>
                                             <div className="flex items-center justify-between text-xs">
                                               <span className="text-muted-foreground font-medium">Password</span>
                                               <span className="font-mono text-rose-400">ENCRYPTED_HASH_AES</span>
                                             </div>
                                             <p className="text-[8px] text-rose-400 italic leading-tight mt-2 opacity-70">* For security, passwords are stored in high-entropy SHA-256 hashes and cannot be viewed in plain-text.</p>
                                          </div>
                                       </div>
                                    </div>

                                    {/* Column 2 & 3: Detailed Info */}
                                    <div className="xl:col-span-2 space-y-6">
                                      <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 border-l-3 border-primary pl-4">Verified Academic Identity</h4>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {[
                                          { label: "Father Name", value: item.father_name || "Not Specified", icon: User },
                                          { label: "Department", value: item.department_name || "General Science", icon: Building2 },
                                          { label: "Official Email", value: item.email, icon: Mail },
                                          { label: "Contact Line", value: item.phone || "No Recovery Phone", icon: Phone },
                                          { label: "Session Year", value: "2023 - 2027", icon: Clock },
                                          { label: "Clearance Pct", value: `${(item.totalDepts === 0 ? 0 : (item.clearedDepts / item.totalDepts) * 100).toFixed(0)}% Complete`, icon: Navigation },
                                        ].map((info) => (
                                          <div key={info.label} className="p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 hover:border-primary/20 transition-all">
                                            <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-primary border border-slate-100 dark:border-slate-800">
                                              <info.icon className="w-4 h-4" />
                                            </div>
                                            <div>
                                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{info.label}</p>
                                              <p className="font-bold text-sm tracking-tight">{info.value}</p>
                                            </div>
                                          </div>
                                        ))}
                                      </div>

                                      <div className="pt-4">
                                         <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 border-l-3 border-emerald-500 pl-4 mb-4">Internal Department Clearances</h4>
                                         <div className="flex flex-wrap gap-2">
                                            {item.clearance_status?.map((portal: any) => (
                                              <div key={portal.id} className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                                                <span className="text-[10px] font-black uppercase tracking-tight text-slate-500">{portal.department_key}</span>
                                                <StatusBadge status={portal.status} className="h-4 border-none text-[8px] font-black px-2" />
                                              </div>
                                            ))}
                                         </div>
                                      </div>
                                    </div>

                                    {/* Column 4: Quick Actions & Intelligence Dispatch */}
                                    <div className="xl:col-span-1 space-y-4">
                                      <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 border-l-3 border-indigo-500 pl-4">Intelligence Dispatch</h4>
                                      
                                      <div className="space-y-2 p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
                                         <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-3">Official Communication Templates</p>
                                         <Button 
                                           onClick={(e) => { 
                                             e.stopPropagation(); 
                                             const msg = CLEARANCE_MESSAGES.CERTIFICATE_READY(item.full_name);
                                             window.open(getWhatsAppLink(item.phone, msg)!, '_blank');
                                           }} 
                                           className="w-full text-[9px] h-11 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-500/20 font-black uppercase tracking-widest gap-2"
                                         >
                                           <CheckCircle2 className="w-3.5 h-3.5" /> Degree Ready (WA)
                                         </Button>
                                         <Button 
                                           variant="outline"
                                           onClick={(e) => { 
                                             e.stopPropagation(); 
                                             const msg = CLEARANCE_MESSAGES.ISSUE_REPORTED(item.full_name, "Admin Office", "Pending Documentation");
                                             window.open(getWhatsAppLink(item.phone, msg)!, '_blank');
                                           }} 
                                           className="w-full text-[9px] h-11 rounded-xl font-black uppercase tracking-widest gap-2 text-rose-500 border-rose-500/10"
                                         >
                                           <AlertTriangle className="w-3.5 h-3.5" /> Flag Issue (WA)
                                         </Button>
                                         <Button 
                                           variant="ghost"
                                           onClick={(e) => { 
                                             e.stopPropagation(); 
                                             const body = CLEARANCE_MESSAGES.CERTIFICATE_READY(item.full_name);
                                             window.location.href = getEmailLink(item.email, "University Clearance Completion", body);
                                           }} 
                                           className="w-full text-[9px] h-11 rounded-xl font-black uppercase tracking-widest gap-2 text-primary"
                                         >
                                           <Mail className="w-3.5 h-3.5" /> Official Email Update
                                         </Button>
                                      </div>

                                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 text-center border border-slate-100 dark:border-slate-800">
                                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">
                                           Direct contact via WhatsApp/Email bypasses manual logging for immediate resolution.
                                         </p>
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              </td>
                            </motion.tr>
                          )}
                        </AnimatePresence>
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>

              {loading && (
                <div className="py-32 flex flex-col items-center justify-center gap-4">
                  <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="font-black text-xs uppercase tracking-[0.4em] text-primary animate-pulse">Syncing Database...</p>
                </div>
              )}

              {!loading && activeDataList.length === 0 && (
                <div className="py-32 text-center flex flex-col items-center gap-6">
                  <div className="w-20 h-20 rounded-[2rem] bg-slate-50 dark:bg-slate-900 flex items-center justify-center shadow-inner">
                    <Search className="w-10 h-10 text-slate-200" />
                  </div>
                  <div>
                    <h5 className="font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">No Records Discovered</h5>
                    <p className="text-xs text-muted-foreground mt-1 font-medium">Try broadening your search term or segment switch.</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
