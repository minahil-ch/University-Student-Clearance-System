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
      <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
        <Sidebar role="student" />
        <main className="flex-1 lg:ml-64 flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <GraduationCap className="w-12 h-12 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-3xl font-black uppercase tracking-tight text-slate-900">Already Submitted!</h2>
              <p className="text-slate-500 font-medium mt-3 leading-relaxed">
                Your University Survey form has already been submitted successfully. Your responses have been recorded.
              </p>
            </div>
            <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100 text-left space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Next Step</p>
              <p className="text-sm text-blue-800 font-medium">You can now proceed to submit your Clearance Form to initiate the departmental clearance process.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="flex-1 h-14 rounded-2xl bg-slate-100 text-slate-700 font-black uppercase tracking-widest text-sm hover:bg-slate-200 transition-all"
              >
                Dashboard
              </button>
              <button
                onClick={() => window.location.href = '/form'}
                className="flex-1 h-14 rounded-2xl bg-slate-900 text-white font-black uppercase tracking-widest text-sm hover:bg-primary transition-all"
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
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar role="student" />
      <main className="flex-1 w-full lg:ml-64 p-4 md:p-6 xl:p-8">
        <header className="mb-10 text-center max-w-2xl mx-auto">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight px-4">
              University <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-emerald-500 uppercase italic">Form</span>
            </h2>
            
            {rejectionRemarks ? (
              <div className="mt-6 p-6 bg-rose-50 border border-rose-100 rounded-3xl text-left">
                <div className="flex items-center gap-3 text-rose-600 font-black uppercase text-xs mb-2">
                  <AlertCircle className="w-5 h-5" /> Submission Rejected
                </div>
                <p className="text-sm text-rose-800 font-medium leading-relaxed italic">
                  &quot;{rejectionRemarks}&quot;
                </p>
                <p className="text-[10px] font-black text-rose-400 uppercase mt-4 tracking-widest">Please correct your details and re-submit.</p>
              </div>
            ) : (
              <p className="text-muted-foreground mt-4 text-lg font-medium">
                This form goes to Admin only. After submission you can start clearance.
              </p>
            )}
          </motion.div>
        </header>

        <div className="max-w-4xl mx-auto">
          <Card className="glass-card border-none shadow-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-[2rem] md:rounded-[2.5rem] overflow-hidden">
            <CardHeader className="p-6 md:p-10 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="flex items-center gap-4 text-3xl font-black uppercase tracking-tighter">
                <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                  <GraduationCap className="w-8 h-8" />
                </div>
                University Survey
              </CardTitle>
              <p className="text-muted-foreground font-medium">
                Submit once. Admin uses this for university records.
              </p>
            </CardHeader>
            <CardContent className="p-6 md:p-10 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Personal Email Address</label>
                  <Input
                    placeholder="johndoe@gmail.com"
                    value={futureData.personal_email}
                    onChange={(e) => setFutureData({ ...futureData, personal_email: e.target.value })}
                    className="h-14 rounded-2xl bg-slate-50 border-none shadow-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Alternate Phone (Optional)</label>
                  <Input
                    placeholder="+92 3XX XXXXXXX"
                    value={futureData.alternate_phone}
                    onChange={(e) => setFutureData({ ...futureData, alternate_phone: e.target.value })}
                    className="h-14 rounded-2xl bg-slate-50 border-none shadow-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Did you secure a job before graduation?</label>
                  <select
                    className="w-full h-14 px-4 rounded-2xl bg-slate-50 border-none shadow-sm focus:ring-2"
                    value={futureData.job_secured}
                    onChange={(e) => setFutureData({ ...futureData, job_secured: e.target.value })}
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Company Name</label>
                  <Input
                    placeholder="Company"
                    value={futureData.company_name}
                    onChange={(e) => setFutureData({ ...futureData, company_name: e.target.value })}
                    className="h-14 rounded-2xl bg-slate-50 border-none shadow-sm"
                    disabled={futureData.job_secured === "No"}
                  />
                </div>
              </div>

              <div className="space-y-4 pt-8 border-t border-slate-100 dark:border-slate-800">
                <h4 className="font-black uppercase tracking-widest text-sm flex items-center gap-2 text-primary">
                  <Globe className="w-5 h-5" /> Higher Education (Optional)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Institution Name</label>
                    <Input
                      placeholder="University Name"
                      value={futureData.higher_education_uni}
                      onChange={(e) => setFutureData({ ...futureData, higher_education_uni: e.target.value })}
                      className="h-14 rounded-2xl bg-slate-50 border-none shadow-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Degree</label>
                    <Input
                      placeholder="Degree"
                      value={futureData.degree}
                      onChange={(e) => setFutureData({ ...futureData, degree: e.target.value })}
                      className="h-14 rounded-2xl bg-slate-50 border-none shadow-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-6">
                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="h-14 px-12 rounded-2xl bg-primary shadow-xl shadow-primary/20 font-black uppercase tracking-widest gap-3 transition-transform active:scale-95"
                >
                  {loading ? "Submitting..." : <>Submit & Continue <ArrowRight className="w-5 h-5" /></>}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

