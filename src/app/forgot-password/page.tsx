"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { Mail, Lock, Key, ArrowRight } from "lucide-react"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [step, setStep] = useState(1) // 1: Email, 2: OTP & New Password
  const [loading, setLoading] = useState(false)

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success("Recovery code sent to your email!")
      setStep(2)
    }
    setLoading(false)
  }

  const handleVerifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    // In Supabase, if you use the link flow, it redirects. 
    // If you want OTP flow, you use verifyOtp with type 'recovery'
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'recovery'
    })

    if (verifyError) {
      toast.error(verifyError.message)
      setLoading(false)
      return
    }

    // Now user is logged in, update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (updateError) {
      toast.error(updateError.message)
    } else {
      toast.success("Password updated successfully! Redirecting...")
      setTimeout(() => router.push('/login'), 2000)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100 via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-black">
      <Card className="w-full max-w-md border-none shadow-2xl rounded-[2rem] overflow-hidden">
        <CardHeader className="bg-slate-900 text-white p-8">
          <CardTitle className="text-2xl font-black uppercase tracking-tight">Security <span className="text-blue-400 italic">Recovery</span></CardTitle>
          <CardDescription className="text-slate-400 font-medium">Reset your system access credentials</CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.form 
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleSendOtp} 
                className="space-y-6"
              >
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Registered Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-4 w-5 h-5 text-slate-400" />
                    <Input 
                      type="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      placeholder="Ex: student@university.com"
                      className="pl-12 h-14 rounded-2xl bg-slate-100 border-none font-medium" 
                      required 
                    />
                  </div>
                </div>
                <Button type="submit" disabled={loading} className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-blue-500/20">
                  {loading ? "Sending Code..." : "Send Recovery Code"}
                </Button>
              </motion.form>
            ) : (
              <motion.form 
                key="step2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleVerifyAndReset} 
                className="space-y-6"
              >
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Recovery OTP</label>
                  <div className="relative">
                    <Key className="absolute left-4 top-4 w-5 h-5 text-slate-400" />
                    <Input 
                      type="text" 
                      value={otp} 
                      onChange={(e) => setOtp(e.target.value)} 
                      placeholder="6-digit code"
                      className="pl-12 h-14 rounded-2xl bg-slate-100 border-none font-medium tracking-[0.5em] text-center" 
                      required 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">New Terminal Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-4 w-5 h-5 text-slate-400" />
                    <Input 
                      type="password" 
                      value={newPassword} 
                      onChange={(e) => setNewPassword(e.target.value)} 
                      placeholder="••••••••"
                      className="pl-12 h-14 rounded-2xl bg-slate-100 border-none font-medium" 
                      required 
                      minLength={6}
                    />
                  </div>
                </div>
                <Button type="submit" disabled={loading} className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-500/20">
                  {loading ? "Resetting Access..." : "Update Password & Login"}
                </Button>
                <button 
                  type="button" 
                  onClick={() => setStep(1)}
                  className="w-full text-center text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center gap-2"
                >
                  Change Email Address <ArrowRight className="w-3 h-3" />
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  )
}

