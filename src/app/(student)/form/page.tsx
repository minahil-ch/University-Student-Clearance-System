"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Sidebar } from "@/components/layout/Sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import { 
  Send, 
  User, 
  Building2, 
  CheckCircle2,
  ShieldCheck,
  ArrowRight
} from "lucide-react"
import { sendEmailNotification, sendWhatsAppNotification } from "@/lib/notifications"
import { getPortalContact } from "@/lib/portalContacts"

export default function ClearanceForm() {
  const router = useRouter()
  const [step, setStep] = useState<2 | 3 | 4>(2)
  const [pageReady, setPageReady] = useState(false)
  const [alreadySubmitted, setAlreadySubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState({
    full_name: "",
    father_name: "",
    reg_no: "",
    phone: "",
    email: "",
    cgpa: "",
    department_name: "Computer Science",
    session: new Date().getFullYear().toString()
  })

  const supabase = createClient()

  useEffect(() => {
    async function getData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace("/login/student?switch=1")
        return
      }

      const { data: pData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (pData) {
        setProfile(prev => ({
          ...prev,
          full_name: pData.full_name || "",
          father_name: pData.father_name || "",
          reg_no: pData.reg_no || "",
          phone: pData.phone || "",
          email: pData.email || "",
          cgpa: pData.cgpa || "",
          session: pData.session || "",
          department_name: pData.department_name || "Computer Science"
        }))
      } else {
        setProfile(prev => ({
          ...prev,
          full_name: user?.user_metadata?.full_name || "",
          father_name: user?.user_metadata?.father_name || "",
          reg_no: user?.user_metadata?.reg_no || "",
          phone: user?.user_metadata?.phone || "",
          email: user?.email || "",
          cgpa: user?.user_metadata?.cgpa || "",
          department_name: user?.user_metadata?.department_name || "Computer Science"
        }))
      }

      const { data: uniForm } = await supabase
        .from("future_data")
        .select("id")
        .eq("student_id", user.id)
        .maybeSingle()

      if (!uniForm) {
        router.replace("/uni-form")
        return
      }

      const { data: existingClearance } = await supabase
        .from('clearance_status')
        .select('id')
        .eq('student_id', user.id)
        .limit(1)

      if (existingClearance && existingClearance.length > 0) {
        setAlreadySubmitted(true)
        setPageReady(true)
        return
      }

      setPageReady(true)
    }
    getData()
  }, [router, supabase])

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      // Registration Number Validation (Format: SP25-BSE-039)
      const regPattern = /^(SP|FA)\d{2}-[A-Z]{2,4}-\d{3,4}$/i
      if (!regPattern.test(profile.reg_no)) {
        throw new Error("Invalid Registration Number format. Example: SP25-BSE-039")
      }

      // 1. Check if profile exists and Update or Insert
      const { data: existingProfile } = await supabase.from('profiles').select('id').eq('id', user.id).single()

      if (existingProfile) {
        const { error: pError } = await supabase
          .from('profiles')
          .update({
            full_name: profile.full_name,
            father_name: profile.father_name,
            phone: profile.phone,
            cgpa: profile.cgpa,
            department_name: profile.department_name,
            reg_no: profile.reg_no,
            session: profile.session,
            email: user.email // Strictly match auth to avoid RLS mismatches!
          })
          .eq('id', user.id)
        if (pError) throw pError
      } else {
        const { error: pError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            full_name: profile.full_name,
            father_name: profile.father_name,
            phone: profile.phone,
            cgpa: profile.cgpa,
            department_name: profile.department_name,
            reg_no: profile.reg_no,
            session: profile.session,
            email: user.email, // Strictly match auth
            role: 'student'
          })
        if (pError) throw pError
      }

      // 3. Initialize Clearance Rows
      // Core flow: library/transport/finance/hostel; academic is final authority.
      const academicKey = `academic-${(profile.department_name || "Computer Science").toLowerCase().trim().replace(/\s+/g, "-")}`
      const allDepts = ['library', 'transport', 'finance', 'hostel', academicKey]
      
      for (const deptKey of allDepts) {
        await supabase
          .from('clearance_status')
          .upsert({
            student_id: user.id,
            department_key: deptKey,
            status: 'pending',
            ...(deptKey.startsWith('academic-') ? {} : { form_submitted: true })
          }, { onConflict: 'student_id,department_key' })
      }

      // 4. Backup to Google Sheets
      if (process.env.NEXT_PUBLIC_GAS_WEBHOOK_URL) {
        await sendEmailNotification({
          name: profile.full_name,
          email: profile.email,
          phone: profile.phone,
          regNo: profile.reg_no,
          department: profile.department_name,
          eventType: 'form_submission',
          futureData: { graduated_year: profile.graduated_year }
        })
      }

      // 5. Real-time notifications
      // a) Student receives submission acknowledgement
      await Promise.allSettled([
        sendEmailNotification({
          name: profile.full_name,
          email: profile.email,
          phone: profile.phone,
          recipientEmail: profile.email,
          recipientPhone: profile.phone,
          regNo: profile.reg_no,
          department: profile.department_name,
          eventType: "form_submission",
          remarks: "Your clearance request has been submitted successfully."
        }),
        sendWhatsAppNotification({
          name: profile.full_name,
          email: profile.email,
          phone: profile.phone,
          recipientPhone: profile.phone,
          regNo: profile.reg_no,
          department: profile.department_name,
          eventType: "form_submission",
          remarks: "Your request was submitted and shared with departments."
        })
      ])

      // b) Related portals receive request notification
      const portalTargets = [
        getPortalContact("transport"),
        getPortalContact("library"),
        getPortalContact("finance"),
        getPortalContact("hostel"),
      ]

      await Promise.allSettled(
        portalTargets.map((portal) =>
          Promise.allSettled([
            sendEmailNotification({
              name: profile.full_name,
              email: profile.email,
              phone: profile.phone,
              recipientEmail: portal.email,
              recipientPhone: portal.phone,
              regNo: profile.reg_no,
              department: portal.label,
              eventType: "form_submission",
              remarks: `New student request for ${portal.label} portal`
            }),
            sendWhatsAppNotification({
              name: profile.full_name,
              email: profile.email,
              phone: profile.phone,
              recipientPhone: portal.phone,
              regNo: profile.reg_no,
              department: portal.label,
              eventType: "form_submission",
              remarks: `Please review ${profile.full_name} (${profile.reg_no}) in ${portal.label} portal`
            })
          ])
        )
      )

      toast.success("Clearance form submitted successfully.")
      setStep(3)
    } catch (error: any) {
      toast.error(error.message || "Failed to submit form")
    } finally {
      setLoading(false)
    }
  }

  if (!pageReady) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-sky-50/50 dark:bg-slate-950 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        <p className="text-sm font-bold font-medium text-muted-foreground text-muted-foreground">Preparing clearance form…</p>
      </div>
    )
  }

  if (alreadySubmitted) {
    return (
      <div className="flex min-h-screen bg-sky-50/50 dark:bg-slate-950">
        <Sidebar role="student" />
        <main className="flex-1 lg:ml-64 flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">Already Submitted!</h2>
              <p className="text-slate-500 font-medium mt-3 leading-relaxed">
                Your clearance form has already been submitted successfully. You can track your clearance status on your dashboard.
              </p>
            </div>
            <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100 text-left space-y-2">
              <p className="text-xs font-bold font-medium text-muted-foreground text-emerald-600">What's Next?</p>
              <p className="text-sm text-emerald-800 font-medium">Your request is currently being reviewed by the departmental staff. You will receive email notifications as each department processes your clearance.</p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full h-14 rounded-2xl bg-slate-900 text-white font-bold font-medium text-muted-foreground text-sm hover:bg-primary transition-all"
            >
              Go to My Dashboard →
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-sky-50/50 dark:bg-slate-950">
      <Sidebar role="student" />
      
      <main className="flex-1 w-full lg:ml-64 p-4 md:p-6 xl:p-8">
        <header className="mb-10 text-center max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight px-4 text-slate-900 dark:text-white uppercase italic">
              OFFICIAL <span className="gradient-text italic">CLEARANCE FORM</span>
            </h2>
            <p className="text-muted-foreground mt-4 text-lg font-medium">
              Please verify your institutional data to initiate campus-wide clearance.
            </p>
          </motion.div>

          {/* Progress: Survey (Done) → clearance form → submitted */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <div className="flex items-center">
              {/* Step 1: Survey (Always done here) */}
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-bold shadow-lg shadow-emerald-500/20">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-tighter">Survey Done</span>
              </div>
              
              <div className="w-12 h-1 bg-emerald-500 mx-2" />

              {/* Step 2: Clearance Form */}
              <div className="flex flex-col items-center gap-2">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                  step >= 3 ? "bg-emerald-500 text-white" : "bg-primary text-white scale-110 shadow-2xl shadow-primary/20"
                }`}>
                  {step >= 3 ? <CheckCircle2 className="w-6 h-6" /> : 2}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-tighter ${step >= 3 ? 'text-emerald-500' : 'text-primary'}`}>Clearance Form</span>
              </div>

              <div className={`w-12 h-1 mx-2 ${step >= 3 ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-800"}`} />

              {/* Step 3: Monitoring */}
              <div className="flex flex-col items-center gap-2">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                  step >= 3 ? "bg-emerald-500 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-400"
                }`}>
                  {step >= 3 ? <CheckCircle2 className="w-6 h-6" /> : 3}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-tighter ${step >= 3 ? 'text-emerald-500' : 'text-slate-400'}`}>Monitoring</span>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-4xl mx-auto pb-20">
          <AnimatePresence mode="wait">
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card className="glass-card border-none shadow-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-[3rem] overflow-hidden group">
                  <CardHeader className="p-10 md:p-14 border-b border-slate-100 dark:border-white/5 relative overflow-hidden text-center md:text-left">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/5 rounded-full -mr-20 -mt-20 blur-3xl group-hover:scale-150 transition-transform duration-700" />
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                       <div className="space-y-4">
                          <div className="inline-flex items-center gap-3 px-4 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                             <ShieldCheck className="w-4 h-4 text-emerald-500" />
                             <span className="text-xs font-bold tracking-wider text-emerald-500 italic">Identity Verification</span>
                          </div>
                          <CardTitle className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-white leading-none">
                             INSTITUTIONAL <span className="text-emerald-500 italic">VERIFICATION</span>
                          </CardTitle>
                          <p className="text-slate-500 dark:text-slate-400 font-bold text-sm tracking-tight italic">
                            Step 2/2: Confirm your details to trigger the campus-wide verification queue.
                          </p>
                       </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-10 md:p-14 space-y-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-8">
                         <div className="space-y-2.5">
                            <label className="text-xs font-bold tracking-wider text-slate-400 ml-1">Full Name (Per Records)</label>
                            <Input 
                              value={profile.full_name}
                              onChange={(e) => setProfile({...profile, full_name: e.target.value})}
                              className="h-16 rounded-2xl bg-sky-50/50 dark:bg-slate-950/50 border-slate-100 dark:border-white/5 shadow-sm focus:shadow-xl focus:border-emerald-500/30 transition-all font-bold"
                            />
                         </div>
                         <div className="space-y-2.5">
                            <label className="text-xs font-bold tracking-wider text-slate-400 ml-1">Registration Number (SP25-BSE-039)</label>
                            <Input 
                              value={profile.reg_no}
                              onChange={(e) => setProfile({...profile, reg_no: e.target.value.toUpperCase()})}
                              placeholder="e.g. SP25-BSE-039"
                              className="h-16 rounded-2xl bg-sky-50/50 dark:bg-slate-950/50 border-slate-100 dark:border-white/5 shadow-sm focus:shadow-xl focus:border-emerald-500/30 transition-all font-bold placeholder:text-slate-300"
                            />
                         </div>
                      </div>

                      <div className="space-y-8">
                         <div className="space-y-2.5">
                            <label className="text-xs font-bold tracking-wider text-slate-400 ml-1">Father&apos;s Name</label>
                            <Input 
                              value={profile.father_name}
                              onChange={(e) => setProfile({...profile, father_name: e.target.value})}
                              className="h-16 rounded-2xl bg-sky-50/50 dark:bg-slate-950/50 border-slate-100 dark:border-white/5 shadow-sm focus:shadow-xl focus:border-emerald-500/30 transition-all font-bold"
                            />
                         </div>
                         <div className="space-y-2.5">
                            <label className="text-xs font-bold tracking-wider text-slate-400 ml-1">Current CGPA</label>
                            <Input 
                              value={profile.cgpa}
                              onChange={(e) => setProfile({...profile, cgpa: e.target.value})}
                              className="h-16 rounded-2xl bg-sky-50/50 dark:bg-slate-950/50 border-slate-100 dark:border-white/5 shadow-sm focus:shadow-xl focus:border-emerald-500/30 transition-all font-bold"
                            />
                         </div>
                      </div>
                    </div>

                    <div className="pt-10 border-t border-slate-100 dark:border-white/5 space-y-8">
                       <div className="flex items-center gap-4">
                          <div className="w-1 h-8 bg-primary rounded-full" />
                          <h4 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">Academic <span className="text-primary italic">Routing</span></h4>
                       </div>
                       
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                          <div className="space-y-2.5">
                             <label className="text-xs font-bold tracking-wider text-slate-400 ml-1">Select Your Department</label>
                             <div className="relative">
                               <Building2 className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-primary pointer-events-none" />
                               <select 
                                 className="w-full h-16 pl-16 pr-8 rounded-2xl bg-sky-50/50 dark:bg-slate-950/50 border-slate-100 dark:border-white/5 text-sm font-bold font-medium text-muted-foreground outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
                                 value={profile.department_name}
                                 onChange={(e) => setProfile({...profile, department_name: e.target.value})}
                               >
                                 <option disabled value="">Select Department</option>
                                 <option>Computer Science</option>
                                 <option>Software Engineering</option>
                                 <option>Information Technology</option>
                                 <option>Mathematics</option>
                                 <option>Humanities</option>
                                 <option>Management Sciences</option>
                                 <option>Environmental Sciences</option>
                                 <option>Electrical Engineering</option>
                               </select>
                             </div>
                          </div>
                          <div className="space-y-2.5">
                             <label className="text-xs font-bold tracking-wider text-slate-400 ml-1">Batch / Session (e.g., 2022-2026)</label>
                             <Input 
                               value={profile.session}
                               onChange={(e) => setProfile((prev: any) => ({...prev, session: e.target.value}))}
                               className="h-16 rounded-2xl bg-sky-50/50 dark:bg-slate-950/50 border-slate-100 dark:border-white/5 shadow-sm focus:shadow-xl focus:border-primary/30 transition-all font-bold"
                               placeholder="e.g. 2022-2026"
                             />
                          </div>
                       </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-center justify-between gap-10 pt-10 border-t border-slate-100 dark:border-white/5">
                      <div className="flex items-center gap-3 p-5 bg-blue-50 dark:bg-blue-500/5 rounded-2xl border border-blue-100 dark:border-blue-500/10">
                         <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
                            <Send className="w-5 h-5" />
                         </div>
                         <p className="text-xs font-bold text-blue-800 dark:text-blue-400 leading-tight">
                           Your request will be broadcasted to all departments for verification.
                         </p>
                      </div>
                      <Button onClick={handleSubmit} disabled={loading} className="w-full md:w-auto h-16 px-16 rounded-2xl bg-slate-900 hover:bg-black shadow-2xl shadow-slate-900/20 text-white font-bold font-medium text-muted-foreground text-[11px] gap-4 transition-all active:scale-95 uppercase tracking-widest">
                        {loading ? "Registering Application..." : (
                          <>Submit Final Clearance Request <ArrowRight className="w-5 h-5" /></>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <div className="p-16 glass-card rounded-[3rem] space-y-8 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-emerald-500 to-primary" />
                  <div className="w-32 h-32 rounded-[2.5rem] bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto mb-8 animate-bounce">
                    <CheckCircle2 className="w-16 h-16" />
                  </div>
                  <h3 className="text-4xl font-bold tracking-tight">Request Transmitted!</h3>
                  <p className="text-muted-foreground text-xl max-w-lg mx-auto leading-relaxed">
                    Your clearance identity has been established. You can now monitor the approvals from your command center.
                  </p>
                  <div className="pt-10">
                    <Button onClick={() => window.location.href = "/dashboard"} size="lg" className="h-16 px-12 rounded-2xl bg-primary shadow-2xl shadow-primary/30 font-bold tracking-wider">
                      Enter Dashboard
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <div className="p-16 glass-card rounded-[3rem] space-y-8 shadow-2xl relative overflow-hidden border-2 border-amber-500/20">
                  <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-amber-500 to-orange-500" />
                  <div className="w-32 h-32 rounded-[2.5rem] bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-8">
                    <ShieldCheck className="w-16 h-16" />
                  </div>
                  <h3 className="text-4xl font-bold tracking-tight">Already Submitted</h3>
                  <p className="text-muted-foreground text-lg max-w-lg mx-auto leading-relaxed">
                    You have already established your clearance profile and cannot submit it again. Your information is safely locked in the system.
                  </p>
                  <div className="pt-10">
                    <Button onClick={() => window.location.href = "/dashboard"} size="lg" className="h-16 px-12 rounded-2xl bg-amber-500 hover:bg-amber-600 shadow-2xl shadow-amber-500/20 font-bold tracking-wider">
                      Return to Dashboard
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
