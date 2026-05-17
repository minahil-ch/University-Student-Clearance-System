"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Sidebar } from "@/components/layout/Sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { toast } from "sonner"
import { UserPlus, CheckCircle2, ShieldCheck, Mail, BookOpen, GraduationCap } from "lucide-react"

export default function AddStudentPage() {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "Password123!",
    full_name: "",
    reg_no: "",
    department_name: "",
    session: ""
  })

  const supabase = createClient()

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // 1. Create Auth User
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
            role: 'student'
          }
        }
      })

      if (authError) throw authError
      if (!authData.user) throw new Error("Failed to create user")

      const userId = authData.user.id;

      // 2. Update Profile with full details
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          reg_no: formData.reg_no,
          department_name: formData.department_name,
          session: formData.session,
          role: 'student'
        })
        .eq('id', userId)

      if (profileError) throw profileError

      // 3. Manually add Future Data (University Form)
      const { error: futureError } = await supabase
        .from('future_data')
        .insert({
          student_id: userId,
          reason: "Manual Addition by Admin",
          status: "completed"
        })

      if (futureError) throw futureError

      // 4. Manually add Cleared Status for all departments
      const departments = ['library', 'transport', 'finance', 'hostel', `academic-${formData.department_name.toLowerCase().replace(/\s+/g, '-')}`]
      const clearanceInserts = departments.map(dept => ({
        student_id: userId,
        department_key: dept,
        status: 'cleared',
        remarks: 'Manually cleared by Admin'
      }))

      const { error: clearanceError } = await supabase
        .from('clearance_status')
        .insert(clearanceInserts)

      if (clearanceError) throw clearanceError

      toast.success("Student manually registered and fully cleared!")
      setFormData({
        email: "",
        password: "Password123!",
        full_name: "",
        reg_no: "",
        department_name: "",
        session: ""
      })
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-sky-50/50 dark:bg-slate-950 font-sans">
      <Sidebar role="admin" />
      
      <main className="flex-1 lg:ml-64 p-6 md:p-10">
        <header className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight">Manual <span className="text-primary italic">Registration</span></h1>
          <p className="text-slate-400 font-bold font-medium text-muted-foreground text-xs mt-2">Force Clear Student Access Protocol</p>
        </header>

        <div className="max-w-4xl">
          <Card className="glass-card border-none rounded-[2.5rem] shadow-2xl overflow-hidden">
            <CardHeader className="bg-slate-900 p-10 text-white">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-primary rounded-2xl">
                  <UserPlus className="w-8 h-8" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold tracking-tight">Direct Enrollment</CardTitle>
                  <p className="text-slate-400 text-xs font-bold font-medium text-muted-foreground mt-1">This will automatically file University and Clearance forms as CLEARED</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-10">
              <form onSubmit={handleManualAdd} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[11px] font-bold font-medium text-muted-foreground text-slate-400 ml-1">Official Email</label>
                    <div className="relative">
                       <Mail className="absolute left-5 top-5 w-5 h-5 text-slate-300" />
                       <Input 
                         type="email" 
                         value={formData.email} 
                         onChange={e => setFormData({...formData, email: e.target.value})}
                         className="pl-14 h-11 rounded-2xl bg-sky-50/50 dark:bg-slate-900 border-none font-bold" 
                         placeholder="student@cui.edu.pk"
                         required
                       />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[11px] font-bold font-medium text-muted-foreground text-slate-400 ml-1">Full Legal Name</label>
                    <Input 
                      value={formData.full_name} 
                      onChange={e => setFormData({...formData, full_name: e.target.value})}
                      className="h-11 rounded-2xl bg-sky-50/50 dark:bg-slate-900 border-none font-bold" 
                      placeholder="Muhammad Abdullah"
                      required
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[11px] font-bold font-medium text-muted-foreground text-slate-400 ml-1">Registration No</label>
                    <Input 
                      value={formData.reg_no} 
                      onChange={e => setFormData({...formData, reg_no: e.target.value})}
                      className="h-11 rounded-2xl bg-sky-50/50 dark:bg-slate-900 border-none font-bold uppercase" 
                      placeholder="CIIT/FA20-BCS-001/VHR"
                      required
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[11px] font-bold font-medium text-muted-foreground text-slate-400 ml-1">Department</label>
                    <Input 
                      value={formData.department_name} 
                      onChange={e => setFormData({...formData, department_name: e.target.value})}
                      className="h-11 rounded-2xl bg-sky-50/50 dark:bg-slate-900 border-none font-bold" 
                      placeholder="Computer Science"
                      required
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[11px] font-bold font-medium text-muted-foreground text-slate-400 ml-1">Academic Session</label>
                    <Input 
                      value={formData.session} 
                      onChange={e => setFormData({...formData, session: e.target.value})}
                      className="h-11 rounded-2xl bg-sky-50/50 dark:bg-slate-900 border-none font-bold" 
                      placeholder="Fall 2020"
                      required
                    />
                  </div>
                </div>

                <div className="pt-6">
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="h-12 px-12 rounded-2xl bg-primary text-white font-bold text-xs shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all w-full md:w-auto"
                  >
                    {loading ? "Registering & Clearing..." : "Execute Force Enrollment"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
