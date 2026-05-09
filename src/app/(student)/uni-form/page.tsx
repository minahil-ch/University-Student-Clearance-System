"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Sidebar } from "@/components/layout/Sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { GraduationCap, Globe, ArrowRight, AlertCircle } from "lucide-react"
import { Logo } from "@/components/ui/Logo"
import { sendEmailNotification } from "@/lib/notifications"

export default function UniversityFormPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [alreadySubmitted, setAlreadySubmitted] = useState(false)
  const [futureData, setFutureData] = useState({
    personal_email: "",
    alternate_phone: "",
    job_secured: "No",
    company_name: "",
    job_title: "",
    salary_range: "",
    pursuing_higher_ed: "No",
    higher_education_uni: "",
    country: "",
    degree: "",
    placement_satisfaction: "Satisfied",
    how_cui_helped: "",
    feedback: "",
    willing_to_mentor: "Yes",
  })
  const [rejectionRemarks, setRejectionRemarks] = useState("")

  useEffect(() => {
    async function boot() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = "/login/student?switch=1"
        return
      }
      const { data: fData } = await supabase
        .from("future_data")
        .select("*")
        .eq("student_id", user.id)
        .maybeSingle()

      if (fData) {
        if (fData.status === 'rejected') {
          // Allow re-submission
          setFutureData({
            personal_email: fData.personal_email || "",
            alternate_phone: fData.alternate_phone || "",
            job_secured: fData.experience || "No",
            company_name: fData.company_name || "",
            job_title: fData.job_title || "",
            salary_range: fData.salary_range || "",
            pursuing_higher_ed: fData.higher_education_uni ? "Yes" : "No",
            higher_education_uni: fData.higher_education_uni || "",
            country: fData.country || "",
            degree: fData.degree || "",
            placement_satisfaction: "Satisfied",
            how_cui_helped: "",
            feedback: "",
            willing_to_mentor: "Yes",
          })
          setRejectionRemarks(fData.admin_remarks || "")
        } else {
          setAlreadySubmitted(true)
        }
        return
      }
    }
    boot()
  }, [])

  if (alreadySubmitted) {
    return (
      <div className="flex min-h-screen bg-sky-50/50 dark:bg-slate-950">
        <Sidebar role="student" />
        <main className="flex-1 lg:ml-64 flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <GraduationCap className="w-12 h-12 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">Already Submitted!</h2>
              <p className="text-slate-500 font-medium mt-3 leading-relaxed">
                Your University Survey form has already been submitted successfully. Your responses have been recorded.
              </p>
            </div>
            <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100 text-left space-y-2">
              <p className="text-xs font-bold font-medium text-muted-foreground text-blue-600">Next Step</p>
              <p className="text-sm text-blue-800 font-medium">You can now proceed to submit your Clearance Form to initiate the departmental clearance process.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="flex-1 h-14 rounded-2xl bg-slate-100 text-slate-700 font-bold font-medium text-muted-foreground text-sm hover:bg-slate-200 transition-all"
              >
                Dashboard
              </button>
              <button
                onClick={() => window.location.href = '/form'}
                className="flex-1 h-14 rounded-2xl bg-slate-900 text-white font-bold font-medium text-muted-foreground text-sm hover:bg-primary transition-all"
              >
                Clearance Form →
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const combinedFeedback = `Satisfaction: ${futureData.placement_satisfaction} | CUI Help: ${futureData.how_cui_helped} | Mentoring: ${futureData.willing_to_mentor} | Suggestions: ${futureData.feedback}`

      const { error } = await supabase
        .from("future_data")
        .upsert({
          student_id: user.id,
          personal_email: futureData.personal_email,
          alternate_phone: futureData.alternate_phone,
          company_name: futureData.company_name,
          job_title: futureData.job_title,
          experience: futureData.job_secured,
          salary_range: futureData.salary_range,
          skills: futureData.willing_to_mentor,
          higher_education_uni: futureData.higher_education_uni,
          country: futureData.country,
          degree: futureData.degree,
          feedback: combinedFeedback,
          status: 'pending',
          admin_remarks: null
        })

      if (error) throw error

      // Uni form goes to Admin only (via Apps Script)
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "admin@university.com"
      await sendEmailNotification({
        name: user.user_metadata?.full_name || "Student",
        email: user.email || "",
        phone: "",
        recipientEmail: adminEmail,
        eventType: "portal_alert",
        remarks: "New University Form submitted (Admin-only).",
        futureData,
      })

      toast.success("University form submitted. Now fill Clearance Form.")
      window.location.href = "/form"
    } catch (e: any) {
      toast.error(e.message || "Failed to submit university form")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-sky-50/50 dark:bg-slate-950">
      <Sidebar role="student" />
      <main className="flex-1 w-full lg:ml-64 p-4 md:p-6 xl:p-8">
        <header className="mb-10 text-center max-w-2xl mx-auto">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight px-4">
              University <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-emerald-500 uppercase italic">Form</span>
            </h2>
            
            {rejectionRemarks ? (
              <div className="mt-6 p-6 bg-rose-50 border border-rose-100 rounded-3xl text-left">
                <div className="flex items-center gap-3 text-rose-600 font-bold uppercase text-xs mb-2">
                  <AlertCircle className="w-5 h-5" /> Submission Rejected
                </div>
                <p className="text-sm text-rose-800 font-medium leading-relaxed italic">
                  &quot;{rejectionRemarks}&quot;
                </p>
                <p className="text-xs font-bold text-rose-400 uppercase mt-4 tracking-widest">Please correct your details and re-submit.</p>
              </div>
            ) : (
              <p className="text-muted-foreground mt-4 text-lg font-medium">
                This form goes to Admin only. After submission you can start clearance.
              </p>
            )}
          </motion.div>
        </header>
        <div className="max-w-4xl mx-auto pb-20">
          <Card className="glass-card border-none shadow-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-[2.5rem] md:rounded-[3rem] overflow-hidden group">
            <CardHeader className="p-10 md:p-14 border-b border-slate-100 dark:border-white/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full -mr-20 -mt-20 blur-3xl group-hover:scale-150 transition-transform duration-700" />
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                 <div className="space-y-4 text-center md:text-left">
                    <div className="inline-flex items-center gap-3 px-4 py-1.5 bg-primary/10 rounded-full border border-primary/20">
                       <GraduationCap className="w-4 h-4 text-primary" />
                       <span className="text-xs font-bold tracking-wider text-primary italic">Official University Survey</span>
                    </div>
                    <CardTitle className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-white leading-none">
                       FUTURE <span className="text-primary italic">MAPPING</span>
                    </CardTitle>
                    <p className="text-slate-500 dark:text-slate-400 font-bold text-sm tracking-tight italic">
                      Please provide accurate data for university alumni records and placement monitoring.
                    </p>
                 </div>
                 <div className="flex flex-col items-center gap-2">
                    <div className="w-20 h-20 rounded-full border-4 border-slate-50 dark:border-white/5 flex items-center justify-center shadow-xl p-3 bg-white dark:bg-slate-950">
                       <Logo className="w-full h-full" />
                    </div>
                 </div>
              </div>
            </CardHeader>
            <CardContent className="p-10 md:p-14 space-y-12">
              {/* Section 1: Contact Foundation */}
              <div className="space-y-8">
                <div className="flex items-center gap-4">
                   <div className="w-1 h-8 bg-primary rounded-full" />
                   <h4 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">Contact <span className="text-primary">Continuity</span></h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2.5">
                    <label className="text-xs font-bold tracking-wider text-slate-400 ml-1">Personal Email Address</label>
                    <Input
                      placeholder="e.g. name@outlook.com"
                      value={futureData.personal_email}
                      onChange={(e) => setFutureData({ ...futureData, personal_email: e.target.value })}
                      className="h-16 rounded-2xl bg-sky-50/50 dark:bg-slate-950/50 border-slate-100 dark:border-white/5 shadow-sm focus:shadow-xl focus:border-primary/30 transition-all font-bold"
                    />
                  </div>
                  <div className="space-y-2.5">
                    <label className="text-xs font-bold tracking-wider text-slate-400 ml-1">Alternate WhatsApp (Optional)</label>
                    <Input
                      placeholder="+92 3XX XXXXXXX"
                      value={futureData.alternate_phone}
                      onChange={(e) => setFutureData({ ...futureData, alternate_phone: e.target.value })}
                      className="h-16 rounded-2xl bg-sky-50/50 dark:bg-slate-950/50 border-slate-100 dark:border-white/5 shadow-sm focus:shadow-xl focus:border-primary/30 transition-all font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Professional Status */}
              <div className="space-y-8 pt-10 border-t border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-4">
                   <div className="w-1 h-8 bg-indigo-500 rounded-full" />
                   <h4 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">Employment <span className="text-indigo-500">Details</span></h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2.5">
                    <label className="text-xs font-bold tracking-wider text-slate-400 ml-1">Job Secured before Graduation?</label>
                    <select
                      className="w-full h-16 px-6 rounded-2xl bg-sky-50/50 dark:bg-slate-950/50 border-slate-100 dark:border-white/5 shadow-sm focus:ring-2 focus:ring-primary outline-none font-bold appearance-none cursor-pointer"
                      value={futureData.job_secured}
                      onChange={(e) => setFutureData({ ...futureData, job_secured: e.target.value })}
                    >
                      <option value="Yes">Yes, Job Secured</option>
                      <option value="No">No, Still Searching / Higher Ed</option>
                    </select>
                  </div>

                  <div className="space-y-2.5">
                    <label className="text-xs font-bold tracking-wider text-slate-400 ml-1">Organization / Company Name</label>
                    <Input
                      placeholder="e.g. Systems Ltd, Google, etc."
                      value={futureData.company_name}
                      onChange={(e) => setFutureData({ ...futureData, company_name: e.target.value })}
                      className="h-16 rounded-2xl bg-sky-50/50 dark:bg-slate-950/50 border-slate-100 dark:border-white/5 shadow-sm disabled:opacity-30 transition-all font-bold"
                      disabled={futureData.job_secured === "No"}
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Academic Path */}
              <div className="space-y-8 pt-10 border-t border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-4">
                   <div className="w-1 h-8 bg-emerald-500 rounded-full" />
                   <h4 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">Higher <span className="text-emerald-500">Aspiration</span></h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2.5">
                    <label className="text-xs font-bold tracking-wider text-slate-400 ml-1">Prospective Institution (Optional)</label>
                    <Input
                      placeholder="Target University for MS/PhD"
                      value={futureData.higher_education_uni}
                      onChange={(e) => setFutureData({ ...futureData, higher_education_uni: e.target.value })}
                      className="h-16 rounded-2xl bg-sky-50/50 dark:bg-slate-950/50 border-slate-100 dark:border-white/5 shadow-sm focus:shadow-xl focus:border-primary/30 transition-all font-bold"
                    />
                  </div>
                  <div className="space-y-2.5">
                    <label className="text-xs font-bold tracking-wider text-slate-400 ml-1">Intended Degree Program</label>
                    <Input
                      placeholder="e.g. MS Computer Science"
                      value={futureData.degree}
                      onChange={(e) => setFutureData({ ...futureData, degree: e.target.value })}
                      className="h-16 rounded-2xl bg-sky-50/50 dark:bg-slate-950/50 border-slate-100 dark:border-white/5 shadow-sm focus:shadow-xl focus:border-primary/30 transition-all font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center justify-between gap-8 pt-10 border-t border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-3 text-slate-400">
                   <AlertCircle className="w-5 h-5 animate-pulse" />
                   <p className="text-xs font-bold font-medium text-muted-foreground italic">Ensure all data is accurate before submission.</p>
                </div>
                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full md:w-auto h-16 px-14 rounded-2xl bg-slate-900 dark:bg-white dark:text-slate-900 text-white shadow-2xl shadow-slate-900/20 font-bold font-medium text-muted-foreground text-[11px] gap-4 transition-all active:scale-95"
                >
                  {loading ? "Capturing Data..." : <>Verify & Submit Form <ArrowRight className="w-5 h-5" /></>}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

