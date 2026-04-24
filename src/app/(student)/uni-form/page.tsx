"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Sidebar } from "@/components/layout/Sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { GraduationCap, Globe, ArrowRight } from "lucide-react"
import { sendEmailNotification } from "@/lib/notifications"

export default function UniversityFormPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
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
        window.location.href = "/form"
        return
      }
    }
    boot()
  }, [])

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
            <h2 className="text-4xl font-extrabold tracking-tight">
              University <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-emerald-500 uppercase italic">Form</span>
            </h2>
            <p className="text-muted-foreground mt-4 text-lg font-medium">
              This form goes to Admin only. After submission you can start clearance.
            </p>
          </motion.div>
        </header>

        <div className="max-w-4xl mx-auto">
          <Card className="glass-card border-none shadow-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-[2.5rem]">
            <CardHeader className="p-10 border-b border-slate-100 dark:border-slate-800">
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
            <CardContent className="p-10 space-y-8">
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

