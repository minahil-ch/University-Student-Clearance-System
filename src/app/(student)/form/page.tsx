"use client"

import { useState, useEffect } from "react"
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
  GraduationCap, 
  Globe, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle2,
  BookOpen,
  ShieldCheck
} from "lucide-react"
import { sendEmailNotification, sendWhatsAppNotification } from "@/lib/notifications"
import { getPortalContact } from "@/lib/portalContacts"

export default function ClearanceForm() {
  const [step, setStep] = useState(1)
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
    willing_to_mentor: "Yes"
  })

  const supabase = createClient()

  useEffect(() => {
    async function getData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Load profile
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
          // If trigger failed, autofill from raw metadata
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
        
        // Load existing future data if any
        const { data: fData } = await supabase.from('future_data').select('*').eq('student_id', user.id).single()
        if (fData) {
          setFutureData(prev => ({
            ...prev,
            ...fData,
            personal_email: fData.personal_email || "",
            alternate_phone: fData.alternate_phone || "",
            job_secured: fData.experience || "No",
            company_name: fData.company_name || "",
            job_title: fData.job_title || "",
            salary_range: fData.salary_range || "",
            pursuing_higher_ed: fData.degree ? "Yes" : "No",
            higher_education_uni: fData.higher_education_uni || "",
            country: fData.country || "",
            degree: fData.degree || "",
            willing_to_mentor: fData.skills || "Yes",
            feedback: fData.feedback || ""
          }))
        }
        
        // Prevent duplicate form submissions based on actual submitted form data
        if (fData) setStep(4)
      }
    }
    getData()
  }, [])

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

      // 2. Upsert Future Data (Mapping alumni fields to existing schema columns to prevent crash)
      const combinedFeedback = `Satisfaction: ${futureData.placement_satisfaction} | CUI Help: ${futureData.how_cui_helped} | Mentoring: ${futureData.willing_to_mentor} | Suggestions: ${futureData.feedback} | Graduating Year: ${profile.graduated_year}`
      
      const { error: fError } = await supabase
        .from('future_data')
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
          feedback: combinedFeedback
        })

      if (fError) throw fError

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
          futureData: { ...futureData, graduated_year: profile.graduated_year }
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
      setStep(3) // Success step
    } catch (error: any) {
      toast.error(error.message || "Failed to submit form")
    } finally {
      setLoading(false)
    }
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

          {/* Progress Indicator */}
          <div className="flex items-center justify-center gap-4 mt-8">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm transition-all duration-300 ${
                  step === s ? "bg-primary text-white scale-110 shadow-2xl shadow-primary/20" : 
                  step > s ? "bg-emerald-500 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-400"
                }`}>
                  {step > s ? <CheckCircle2 className="w-6 h-6" /> : s}
                </div>
                {s < 3 && <div className={`w-16 h-1 ${step > s ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-800"}`} />}
              </div>
            ))}
          </div>
        </header>

        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Card className="glass-card border-none shadow-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-[2.5rem]">
                  <CardHeader className="p-10 border-b border-slate-100 dark:border-slate-800">
                    <CardTitle className="flex items-center gap-4 text-3xl font-black uppercase tracking-tighter">
                      <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                        <GraduationCap className="w-8 h-8" />
                      </div> 
                      Detailed Alumni Survey
                    </CardTitle>
                    <p className="text-muted-foreground font-medium">This survey is mandatory for university records and goes directly to the administration before clearance can proceed.</p>
                  </CardHeader>
                  <CardContent className="p-10 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Personal Email Address</label>
                        <Input 
                          placeholder="johndoe@gmail.com" 
                          value={futureData.personal_email}
                          onChange={(e) => setFutureData({...futureData, personal_email: e.target.value})}
                          className="h-14 rounded-2xl bg-slate-50 border-none shadow-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Alternate Phone (Optional)</label>
                        <Input 
                          placeholder="+92 3XX XXXXXXX" 
                          value={futureData.alternate_phone}
                          onChange={(e) => setFutureData({...futureData, alternate_phone: e.target.value})}
                          className="h-14 rounded-2xl bg-slate-50 border-none shadow-sm"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Did you secure a job before graduation?</label>
                        <select 
                          className="w-full h-14 px-4 rounded-2xl bg-slate-50 border-none shadow-sm focus:ring-2"
                          value={futureData.job_secured}
                          onChange={(e) => setFutureData({...futureData, job_secured: e.target.value})}
                        >
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Current Employer / Company Name</label>
                        <Input 
                          placeholder="e.g. Google, Systems Ltd" 
                          value={futureData.company_name}
                          onChange={(e) => setFutureData({...futureData, company_name: e.target.value})}
                          className="h-14 rounded-2xl bg-slate-50 border-none shadow-sm"
                          disabled={futureData.job_secured === "No"}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Job Title / Designation</label>
                        <Input 
                          placeholder="e.g. Associate Software Engineer" 
                          value={futureData.job_title}
                          onChange={(e) => setFutureData({...futureData, job_title: e.target.value})}
                          className="h-14 rounded-2xl bg-slate-50 border-none shadow-sm"
                          disabled={futureData.job_secured === "No"}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Salary Range (Monthly/Yearly)</label>
                        <Input 
                          placeholder="e.g. 50k - 100k PKR" 
                          value={futureData.salary_range}
                          onChange={(e) => setFutureData({...futureData, salary_range: e.target.value})}
                          className="h-14 rounded-2xl bg-slate-50 border-none shadow-sm"
                          disabled={futureData.job_secured === "No"}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-4 pt-8 border-t border-slate-100 dark:border-slate-800">
                      <h4 className="font-black uppercase tracking-widest text-sm flex items-center gap-2 text-primary">
                        <Globe className="w-5 h-5" /> Higher Education Information
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Pursuing Higher Education?</label>
                          <select 
                            className="w-full h-14 px-4 rounded-2xl bg-slate-50 border-none shadow-sm focus:ring-2"
                            value={futureData.pursuing_higher_ed}
                            onChange={(e) => setFutureData({...futureData, pursuing_higher_ed: e.target.value})}
                          >
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Institution Name</label>
                          <Input 
                            placeholder="University Name" 
                            value={futureData.higher_education_uni}
                            onChange={(e) => setFutureData({...futureData, higher_education_uni: e.target.value})}
                            className="h-14 rounded-2xl bg-slate-50 border-none shadow-sm"
                            disabled={futureData.pursuing_higher_ed === "No"}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Country of Institution</label>
                          <Input 
                            placeholder="e.g. Pakistan, UK, USA" 
                            value={futureData.country}
                            onChange={(e) => setFutureData({...futureData, country: e.target.value})}
                            className="h-14 rounded-2xl bg-slate-50 border-none shadow-sm"
                            disabled={futureData.pursuing_higher_ed === "No"}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Degree Program</label>
                          <Input 
                            placeholder="e.g. Master's in Data Science" 
                            value={futureData.degree}
                            onChange={(e) => setFutureData({...futureData, degree: e.target.value})}
                            className="h-14 rounded-2xl bg-slate-50 border-none shadow-sm"
                            disabled={futureData.pursuing_higher_ed === "No"}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6 pt-8 border-t border-slate-100 dark:border-slate-800">
                       <h4 className="font-black uppercase tracking-widest text-sm flex items-center gap-2 text-primary">
                        <BookOpen className="w-5 h-5" /> Experience & Feedback
                      </h4>
                      
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Satisfied with placement support by CUI?</label>
                        <select 
                          className="w-full h-14 px-4 rounded-2xl bg-slate-50 border-none shadow-sm focus:ring-2"
                          value={futureData.placement_satisfaction}
                          onChange={(e) => setFutureData({...futureData, placement_satisfaction: e.target.value})}
                        >
                          <option value="Very Satisfied">Very Satisfied</option>
                          <option value="Satisfied">Satisfied</option>
                          <option value="Neutral">Neutral</option>
                          <option value="Dissatisfied">Dissatisfied</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">How did CUI help you in securing your first job?</label>
                        <textarea 
                          className="w-full p-4 rounded-2xl border-none bg-slate-50 min-h-[80px] shadow-sm text-sm"
                          placeholder="Your experience..."
                          value={futureData.how_cui_helped}
                          onChange={(e) => setFutureData({...futureData, how_cui_helped: e.target.value})}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Any suggestions to improve the CUI Placement network?</label>
                        <textarea 
                          className="w-full p-4 rounded-2xl border-none bg-slate-50 min-h-[80px] shadow-sm text-sm"
                          placeholder="Your suggestions..."
                          value={futureData.feedback}
                          onChange={(e) => setFutureData({...futureData, feedback: e.target.value})}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Are you willing to mentor current CUI students?</label>
                        <select 
                          className="w-full h-14 px-4 rounded-2xl bg-slate-50 border-none shadow-sm focus:ring-2"
                          value={futureData.willing_to_mentor}
                          onChange={(e) => setFutureData({...futureData, willing_to_mentor: e.target.value})}
                        >
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end pt-8">
                       <Button onClick={() => setStep(2)} className="h-14 px-12 rounded-2xl bg-primary shadow-xl shadow-primary/20 font-black uppercase tracking-widest gap-3 transition-transform active:scale-95">
                        Continue to Clearance <ArrowRight className="w-5 h-5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

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

                    <div className="flex justify-between items-center pt-10">
                      <Button variant="ghost" onClick={() => setStep(1)} className="h-14 px-8 rounded-2xl font-black uppercase tracking-widest gap-2">
                        <ArrowLeft className="w-5 h-5" /> Previous
                      </Button>
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
