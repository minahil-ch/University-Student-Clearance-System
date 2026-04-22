"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Mail, Lock, LogIn, ArrowRight, ShieldCheck, UserCircle2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import Link from "next/link"

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [portal, setPortal] = useState('student')
  const [roleType, setRoleType] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()
  const lockStudent = roleType === "student"
  const lockStaff = roleType === "staff"
  const lockAdmin = roleType === "admin"

  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    setRoleType(params.get("role"))
  }, [])

  useEffect(() => {
    if (lockAdmin) setPortal("admin")
    else if (lockStaff) setPortal("staff")
    else if (lockStudent) setPortal("student")
  }, [lockAdmin, lockStaff, lockStudent])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const MASTER_ADMIN = process.env.NEXT_PUBLIC_MASTER_ADMIN_EMAIL || 'admin@university.com'
      const MASTER_PASS = process.env.NEXT_PUBLIC_MASTER_ADMIN_PASSWORD
      
      let authResult;

      // 1. MASTER ADMIN ACCESS (configured via environment)
      if (MASTER_PASS && email === MASTER_ADMIN && password === MASTER_PASS) {
        toast.loading("Authenticating Root Controller...")
        
        const { data: adminSignInData, error: adminSignInError } = await supabase.auth.signInWithPassword({ 
          email, 
          password 
        })

        if (adminSignInError) {
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { role: 'admin', full_name: 'Universal Admin', is_approved: true } }
          })
          
          if (signUpError) {
            const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({ email, password })
            if (retryError) throw new Error("⚠️ Master Recovery Failed. Run FINAL_FIX.sql.")
            authResult = { data: retryData, error: null }
          } else {
            authResult = { data: signUpData, error: null }
          }
        } else {
          authResult = { data: adminSignInData, error: null }
        }
      }
      // 2. STANDARD LOGIN
      else {
        authResult = await supabase.auth.signInWithPassword({ email, password })
      }

      if (authResult.error) {
        if (authResult.error.message.includes("Email not confirmed")) {
          throw new Error("⚠️ Email Confirmation Required.")
        }
        throw new Error("❌ Access Refused: Invalid credentials.")
      }

      const { data } = authResult;
      toast.success("Identity Verified Successfully")
      
      // Get user profile to determine redirect and approval
      let { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user?.id)
        .maybeSingle()

      // SELF-HEALING: If profile is missing, create it now
      if (!profile) {
        const meta = data.user?.user_metadata
        const role = meta?.role || (email === MASTER_ADMIN ? 'admin' : 'student')
        const is_approved = (email === MASTER_ADMIN || role === 'student')
        
        // Use UPSERT to handle existing profiles with same ID or Email
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user?.id,
            full_name: meta?.full_name || 'User',
            email: data.user?.email,
            role: role,
            is_approved: is_approved,
            father_name: meta?.father_name,
            reg_no: meta?.reg_no,
            phone: meta?.phone,
            cgpa: meta?.cgpa,
            department_name: meta?.department_name || (email === MASTER_ADMIN ? 'admin' : null)
          }, { 
            onConflict: 'id',
            ignoreDuplicates: false 
          })
          .select('*')
          .maybeSingle()
        
        if (!createError) profile = newProfile
      }

      if (profile) {
        // Ensure Admin role for Master Admin in DB
        if (email === MASTER_ADMIN && profile.role !== 'admin') {
          await supabase.from('profiles').update({ role: 'admin', is_approved: true }).eq('id', profile.id)
          profile.role = 'admin'
        }

        // Approval check for staff (Students and Admin are auto-approved)
        if (!profile.is_approved && profile.role !== 'admin' && profile.role !== 'student') {
          await supabase.auth.signOut()
          toast.error("Your staff account is pending admin approval.")
          setLoading(false)
          return
        }

        // Redirect logic
        if (profile.role === 'admin' || profile.department_name === 'admin' || email === MASTER_ADMIN) {
           router.push('/admin')
        }
        else if (profile.role === 'student') {
           router.push('/dashboard')
        }
        else if (profile.role === 'transport' || profile.department_name === 'transport') {
           router.push('/transport')
        }
        else if (profile.role === 'library' || profile.department_name === 'library') {
           router.push('/library')
        }
        else if (profile.role === 'department') {
          const deptKey = profile.department_name?.toLowerCase().trim().replace(/\s+/g, '-') || 'unknown'
          if (deptKey === 'transport') router.push('/transport')
          else if (deptKey === 'library') router.push('/library')
          else router.push(`/dept/${deptKey}`)
        }
        else {
          router.push('/dashboard')
        }
      } else {
        router.push('/dashboard')
      }
      
    } catch (error: any) {
      toast.error(error.message || "Invalid credentials. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-100 via-white to-slate-200 dark:from-slate-900 dark:via-slate-950 dark:to-black">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[480px]"
      >
        <div className="text-center mb-10">
           <div className="inline-flex items-center justify-center w-20 h-20 rounded-[2rem] bg-primary shadow-2xl shadow-primary/30 text-white mb-6">
              <ShieldCheck className="w-10 h-10" />
           </div>
           <h1 className="text-4xl font-black italic uppercase tracking-tighter">
             Portal <span className="text-primary italic">Access</span>
           </h1>
           <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-2">Professional Clearance Protocol V5.0</p>
        </div>

        <Card className="border-none shadow-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-3xl rounded-[3rem] overflow-hidden">
          <CardHeader className="p-10 pb-4">
             <CardTitle className="text-xl font-black uppercase tracking-widest text-slate-800 dark:text-white flex items-center gap-2">
                {portal === 'admin' ? 'Admin Gateway' : portal === 'staff' ? 'Staff Portal' : 'Student Access'} <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
             </CardTitle>
             <CardDescription className="text-slate-400 font-medium">Verify your {portal} identity to continue</CardDescription>

             <div className="flex items-center gap-2 mt-6 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl w-fit">
                {!lockStaff && !lockAdmin && (
                  <button 
                    onClick={() => setPortal("student")}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${portal === 'student' ? 'bg-white dark:bg-slate-700 shadow-lg text-primary' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    Student
                  </button>
                )}
                {!lockStudent && !lockAdmin && (
                  <button 
                    onClick={() => setPortal("staff")}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${portal === 'staff' ? 'bg-white dark:bg-slate-700 shadow-lg text-emerald-500' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    Staff
                  </button>
                )}
                {!lockStudent && !lockStaff && (
                  <button 
                    onClick={() => setPortal("admin")}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${portal === 'admin' ? 'bg-white dark:bg-slate-700 shadow-lg text-rose-500' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    Admin
                  </button>
                )}
              </div>
          </CardHeader>

          <CardContent className="p-10 pt-4">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Official Identifier</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <Mail className="w-5 h-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                  </div>
                  <Input 
                    type="email" 
                    placeholder="email@example.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-12 h-16 rounded-2xl border-none bg-slate-100 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-700 font-medium text-slate-900 dark:text-white transition-all shadow-inner" 
                    required 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Secure Access Key</label>
                   <Link href="/forgot-password" className="text-[8px] font-black uppercase tracking-widest text-primary hover:underline">Forgot Password?</Link>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <Lock className="w-5 h-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                  </div>
                  <Input 
                    type="password" 
                    placeholder="••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-12 h-16 rounded-2xl border-none bg-slate-100 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-700 font-medium text-slate-900 dark:text-white transition-all shadow-inner" 
                    required 
                  />
                </div>
              </div>

              <div className="pt-4">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-16 bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-[0.98] flex items-center gap-3"
                >
                  {loading ? "Verifying..." : (
                    <>
                      Enter Dashboard <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </Button>
              </div>

              <div className="text-center pt-6 border-t border-slate-100 dark:border-slate-800">
                {portal === 'admin' ? (
                  <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest">
                    System admin accounts are <span className="text-rose-500 font-black ml-1">PERMANENT</span>
                  </p>
                ) : (
                  <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest">
                    {portal === "student" ? (
                      <>No account? <Link href="/register/student" className="text-primary font-black ml-1 hover:underline">Enroll Now</Link></>
                    ) : portal === "staff" ? (
                      <>No account? <Link href="/register/staff" className="text-primary font-black ml-1 hover:underline">Request Access</Link></>
                    ) : (
                      <>Admin registration is disabled</>
                    )}
                  </p>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* System Status Mock */}
        <div className="mt-8 flex justify-center gap-6">
           <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Database Live</span>
           </div>
           <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">SSL Secury</span>
           </div>
           <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Node Sync</span>
           </div>
        </div>
      </motion.div>
    </div>
  )
}
