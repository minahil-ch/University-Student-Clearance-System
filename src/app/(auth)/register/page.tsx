"use client"
export const dynamic = 'force-dynamic'

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Mail, Lock, User, ArrowRight, Building2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import Link from "next/link"

export default function RegisterPage() {
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState<"student" | "department">("student")
  const [registrationType, setRegistrationType] = useState<string | null>(null)
  const [lockedDept, setLockedDept] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()
  const lockStudent = registrationType === "student"
  const lockStaff = registrationType === "staff"

  const academicDepartments = [
    "Computer Science",
    "Software Engineering",
    "Mathematics",
    "Humanities",
    "Environmental Sciences",
  ]

  const staffDepartments = [...academicDepartments, "transport", "library", "hostel", "finance"]

  // Minimal signup states
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [departmentName, setDepartmentName] = useState("Computer Science")

  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    setRegistrationType(params.get("type"))
    const deptParam = params.get("dept")
    if (deptParam) {
      const decoded = decodeURIComponent(deptParam)
      setLockedDept(decoded)
      setDepartmentName(decoded)
    }
  }, [])

  useEffect(() => {
    if (lockStaff) setRole("department")
    if (lockStudent) setRole("student")
  }, [lockStaff, lockStudent])

  const handleRoleSwitch = (newRole: string) => {
    setRole(newRole as "student" | "department")
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (password !== confirmPassword) {
        throw new Error("Password and confirm password do not match")
      }
      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters")
      }

      const normalizedName =
        (role === "student" ? email.split("@")[0] : fullName).trim() || "Student"

      const normalizedRole =
        role === "department" && ["transport", "library", "hostel", "finance"].includes(departmentName)
          ? departmentName
          : role

      // 1. Supabase Auth Signup (resilient fallback for trigger/db errors)
      let authResponse = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: normalizedName,
            role: normalizedRole,
            department_name: role === "student" ? departmentName : (lockedDept || departmentName)
          }
        }
      })

      if (authResponse.error?.message?.toLowerCase().includes("database error saving new user")) {
        authResponse = await supabase.auth.signUp({ email, password })
      }

      const { data, error } = authResponse

      if (error) {
        if (error.message.includes("rate limit")) {
          throw new Error("Too many attempts. Please disable 'Confirm Email' in Supabase to register instantly.")
        }
        if (error.message.toLowerCase().includes("database error saving new user") || error.status === 500) {
          throw new Error("Supabase auth trigger failed. Run AUTH_HOTFIX.sql in Supabase SQL Editor, then try again.")
        }
        throw error
      }

      // 2. Ensure profile is present even when auth trigger fails silently
      if (data.user?.id) {
        await supabase
          .from("profiles")
          .upsert(
            {
              id: data.user.id,
              full_name: normalizedName,
              email,
              role: normalizedRole,
              department_name: role === "student" ? departmentName : (lockedDept || departmentName),
              is_approved: role === "student",
            },
            { onConflict: "id" }
          )
      }

      if (role === "student") {
        toast.success("Signup Successful")
      } else {
        toast.success("Staff request submitted. Wait for admin approval.")
      }
      router.push(role === "student" ? "/login/student" : "/login/staff")
    } catch (error: any) {
      toast.error(error.message || "Registration failed. Verify your data.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-100 via-white to-slate-200 dark:from-slate-900 dark:via-slate-950 dark:to-black">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        <Card className="border-none shadow-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-[2rem] overflow-hidden">
          <CardHeader className="p-8 pb-4">
            <CardTitle className="text-3xl font-black tracking-tight">
              {role === "student" ? "Student Signup" : "Faculty/Staff Signup"}
            </CardTitle>
            <CardDescription>
              {role === "student"
                ? "Create account with your university email."
                : "Create staff account request for approval."}
            </CardDescription>
            <div className="flex items-center gap-2 mt-4 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
                  {!lockStaff && (
                    <button 
                      onClick={() => handleRoleSwitch("student")}
                      className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${role === 'student' ? 'bg-white dark:bg-slate-700 shadow-lg text-primary' : 'text-slate-400'}`}
                    >
                      Student
                    </button>
                  )}
              {!lockStudent && (
                    <button 
                      onClick={() => handleRoleSwitch("department")}
                      className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${role === 'department' ? 'bg-white dark:bg-slate-700 shadow-lg text-emerald-500' : 'text-slate-400'}`}
                    >
                      Staff/Official
                    </button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-8 pt-2">
            <form onSubmit={handleRegister} className="grid grid-cols-1 gap-5">
              {role !== "student" && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Enter full name" className="pl-11 h-12" required />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder={role === "student" ? "fa23-bse-039@cuivehari.com" : "staff email"} className="pl-11 h-12" required />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                  <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" className="pl-11 h-12" required />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                  <Input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type="password" className="pl-11 h-12" required />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500">{role === "student" ? "Academic Department" : "Portal Department"}</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                  {role === "department" && lockedDept ? (
                    <Input value={lockedDept} className="pl-11 h-12" disabled />
                  ) : (
                    <select
                      value={departmentName}
                      onChange={(e) => setDepartmentName(e.target.value)}
                      className="w-full h-12 pl-11 pr-4 rounded-md border bg-background text-sm"
                    >
                      {(role === "student" ? academicDepartments : staffDepartments).map((dept) => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <Button type="submit" disabled={loading} className="h-12 mt-2">
                {loading ? "Please wait..." : "Signup"} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>

            <p className="text-sm text-slate-500 mt-6 text-center">
              Already have account?{" "}
              <Link href={lockStudent ? "/login/student" : lockStaff ? "/login/staff" : "/login"} className="text-primary font-semibold">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
