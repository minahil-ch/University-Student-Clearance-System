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
  ShieldCheck
} from "lucide-react"
import { sendEmailNotification, sendWhatsAppNotification } from "@/lib/notifications"
import { getPortalContact } from "@/lib/portalContacts"

export default function ClearanceForm() {
  const router = useRouter()
  const [step, setStep] = useState<2 | 3 | 4>(2)
  const [pageReady, setPageReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState({
    full_name: "",
    father_name: "",
    reg_no: "",
    phone: "",
    email: "",
    cgpa: "",
    department_name: "Computer Science",
    graduated_year: new Date().getFullYear().toString()
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

      setPageReady(true)
    }
    getData()
  }, [router, supabase])

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

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
            email: user.email, // Strictly match auth
            role: 'student'
          })
        if (pError) throw pError
      }

      // 3. Initialize Clearance Rows
      // Core flow: library/transport/finance/hostel first; academic is final authority.
      const commonDepts = Array.from(new Set([
        'library',
        'transport',
        'finance',
        'hostel',
      ]))
      
      for (const deptKey of commonDepts) {
        await supabase
          .from('clearance_status')
          .upsert({
            student_id: user.id,
            department_key: deptKey,
            status: 'pending'
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Preparing clearance form…</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar role="student" />
      
      <main className="flex-1 w-full lg:ml-64 p-4 md:p-6 xl:p-8">
        <header className="mb-10 text-center max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-4xl font-extrabold tracking-tight">
              Student <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-emerald-500 uppercase italic">Registration</span>
            </h2>
            <p className="text-muted-foreground mt-4 text-lg font-medium">
              Complete your formal profile to initiate campus-wide clearance.
            </p>
          </motion.div>

          {/* Progress: clearance form → submitted */}
          <div className="flex items-center justify-center gap-4 mt-8">
            {(() => {
              const submitted = step >= 3 || step === 4
              return (
                <>
                  <div className="flex items-center">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm transition-all duration-300 ${
                      submitted ? "bg-emerald-500 text-white" :
                      step === 2 ? "bg-primary text-white scale-110 shadow-2xl shadow-primary/20" :
                      "bg-slate-200 dark:bg-slate-800 text-slate-400"
                    }`}>
                      {submitted ? <CheckCircle2 className="w-6 h-6" /> : 1}
                    </div>
                    <div className={`w-16 h-1 ${submitted ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-800"}`} />
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm transition-all duration-300 ${
                      submitted ? "bg-emerald-500 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-400"
                    }`}>
                      {submitted ? <CheckCircle2 className="w-6 h-6" /> : 2}
                    </div>
                  </div>
                </>
              )
            })()}
          </div>
        </header>

        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Card className="glass-card border-none shadow-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-[2.5rem]">
                  <CardHeader className="p-10 border-b border-slate-100 dark:border-slate-800">
                    <CardTitle className="flex items-center gap-4 text-3xl font-black uppercase tracking-tighter">
                      <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
                        <User className="w-8 h-8" />
                      </div>
                      Clearance Initiation
                    </CardTitle>
                    <p className="text-muted-foreground font-medium">Verify your primary identification for departmental routing.</p>
                  </CardHeader>
                  <CardContent className="p-10 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Full Name</label>
                        <Input 
                          value={profile.full_name}
                          onChange={(e) => setProfile({...profile, full_name: e.target.value})}
                          className="h-14 rounded-2xl bg-slate-50 border-none shadow-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Father Name</label>
                        <Input 
                          value={profile.father_name}
                          onChange={(e) => setProfile({...profile, father_name: e.target.value})}
                          className="h-14 rounded-2xl bg-slate-50 border-none shadow-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Registration No</label>
                        <Input 
                          value={profile.reg_no}
                          onChange={(e) => setProfile({...profile, reg_no: e.target.value})}
                          className="h-14 rounded-2xl bg-slate-50 border-none shadow-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Current CGPA</label>
                        <Input 
                          value={profile.cgpa}
                          onChange={(e) => setProfile({...profile, cgpa: e.target.value})}
                          className="h-14 rounded-2xl bg-slate-50 border-none shadow-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Official Email</label>
                        <Input 
                          value={profile.email}
                          onChange={(e) => setProfile({...profile, email: e.target.value})}
                          className="h-14 rounded-2xl bg-slate-50 border-none shadow-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Phone Number</label>
                        <Input 
                          value={profile.phone}
                          onChange={(e) => setProfile((prev: any) => ({...prev, phone: e.target.value}))}
                          className="h-14 rounded-2xl bg-slate-50 border-none shadow-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Graduating Year</label>
                        <Input 
                          value={profile.graduated_year}
                          onChange={(e) => setProfile((prev: any) => ({...prev, graduated_year: e.target.value}))}
                          className="h-14 rounded-2xl bg-slate-50 border-none shadow-sm"
                          placeholder="e.g. 2026"
                        />
                      </div>
                    </div>

                    <div className="space-y-4 pt-4">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Select Department</label>
                      <div className="relative">
                        <Building2 className="absolute left-4 top-4 w-6 h-6 text-primary" />
                        <select 
                          className="w-full h-14 pl-14 pr-6 rounded-2xl bg-primary/5 border-2 border-primary/20 text-sm font-black uppercase tracking-widest appearance-none focus:ring-2"
                          value={profile.department_name}
                          onChange={(e) => setProfile({...profile, department_name: e.target.value})}
                        >
                          <option>Computer Science</option>
                          <option>Software Engineering</option>
                          <option>Mathematics</option>
                          <option>Humanities</option>
                          <option>Environmental Sciences</option>
                        </select>
                      </div>
                      <p className="text-[10px] text-muted-foreground italic mt-2 px-2">
                        * Your request will be automatically routed to Library, Transport, Finance, and Hostel first, then to your selected Academic department.
                      </p>
                    </div>

                    <div className="flex justify-end items-center pt-10">
                      <Button onClick={handleSubmit} disabled={loading} className="h-14 px-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-500/20 font-black uppercase tracking-widest gap-3 transition-transform active:scale-95">
                        {loading ? "Transmitting..." : (
                          <>Finalize Submission <Send className="w-5 h-5" /></>
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
                  <h3 className="text-4xl font-black uppercase tracking-tighter">Request Transmitted!</h3>
                  <p className="text-muted-foreground text-xl max-w-lg mx-auto leading-relaxed">
                    Your clearance identity has been established. You can now monitor the approvals from your command center.
                  </p>
                  <div className="pt-10">
                    <Button onClick={() => window.location.href = "/dashboard"} size="lg" className="h-16 px-12 rounded-2xl bg-primary shadow-2xl shadow-primary/30 font-black uppercase tracking-[0.2em]">
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
                  <h3 className="text-4xl font-black uppercase tracking-tighter">Already Submitted</h3>
                  <p className="text-muted-foreground text-lg max-w-lg mx-auto leading-relaxed">
                    You have already established your clearance profile and cannot submit it again. Your information is safely locked in the system.
                  </p>
                  <div className="pt-10">
                    <Button onClick={() => window.location.href = "/dashboard"} size="lg" className="h-16 px-12 rounded-2xl bg-amber-500 hover:bg-amber-600 shadow-2xl shadow-amber-500/20 font-black uppercase tracking-[0.2em]">
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
