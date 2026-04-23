"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { Lock, Moon, Sun, ArrowLeft, Settings2, CheckCircle2, ShieldCheck } from "lucide-react"

export default function SettingsPage() {
  const [name, setName] = useState("")
  
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    // Check initial theme from persisted preference or current html class
    const savedTheme = window.localStorage.getItem('theme') as 'light' | 'dark' | null
    const isDark = savedTheme ? savedTheme === 'dark' : document.documentElement.classList.contains('dark')
    setTheme(isDark ? 'dark' : 'light')

    // Fetch Profile
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('users').select('*').eq('id', user.id).single()
        setProfile(data || { role: 'unknown' })
        if (data) setName(data.name || "")
      } else {
        router.push('/login')
      }
    }
    loadUser()
  }, [router, supabase.auth, supabase])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    window.localStorage.setItem('theme', newTheme)
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(newTheme)
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('users').update({ name }).eq('id', user.id)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success("Profile updated successfully!")
    }
    setLoading(false)
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match!")
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success("Security configuration updated securely!")
      setNewPassword("")
      setConfirmPassword("")
    }
    setLoading(false)
  }

  const handleBackToDashboard = () => {
    if (!profile) return
    if (profile.role === 'admin') router.push('/admin')
    else if (profile.role === 'student') router.push('/dashboard')
    else if (profile.role === 'department' || ['academic', 'library', 'transport', 'finance', 'hostel'].includes(profile.role)) {
      router.push(`/${profile.role}`)
    } else router.push('/dashboard')
  }

  if (!profile) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" onClick={handleBackToDashboard} className="mb-8 font-black uppercase tracking-widest gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" /> Back to Dashboard
        </Button>

        <header className="mb-12 flex items-center gap-4">
          <div className="p-4 bg-primary/10 rounded-2xl text-primary">
            <Settings2 className="w-10 h-10" />
          </div>
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter">System <span className="text-primary italic">Settings</span></h1>
            <p className="text-muted-foreground font-bold tracking-widest uppercase text-[10px] mt-2">Active Protocol: {profile?.role}</p>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Profile Panel */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="glass-card border-none shadow-2xl overflow-hidden rounded-[2rem]">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-500 p-8 text-white">
                <CardTitle className="text-2xl font-black uppercase tracking-widest flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-white" /> Profile Identity
                </CardTitle>
                <CardDescription className="text-blue-100 font-medium">Manage your personal identification</CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Full Name</label>
                    <Input 
                      type="text" 
                      placeholder="Your Name" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-14 rounded-2xl border-none bg-slate-100 dark:bg-slate-900 font-medium" 
                      required 
                    />
                  </div>
                  <div className="space-y-2 opacity-50 cursor-not-allowed">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Email Address (Primary Key)</label>
                    <Input 
                      type="email" 
                      value={profile.email}
                      disabled
                      className="h-14 rounded-2xl border-none bg-slate-100 dark:bg-slate-900 font-medium" 
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98]"
                  >
                    {loading ? "Updating..." : "Save Identity"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          {/* Security Panel */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="glass-card border-none shadow-2xl overflow-hidden rounded-[2rem]">
              <CardHeader className="bg-gradient-to-r from-slate-900 to-slate-800 p-8 text-white">
                <CardTitle className="text-2xl font-black uppercase tracking-widest flex items-center gap-3">
                  <ShieldCheck className="w-6 h-6 text-emerald-500" /> Account Security
                </CardTitle>
                <CardDescription className="text-slate-400 font-medium">Update your cryptographic access token</CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <form onSubmit={handleUpdatePassword} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">New Terminal Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-4 w-5 h-5 text-slate-400" />
                      <Input 
                        type="password" 
                        placeholder="••••••••" 
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="pl-12 h-14 rounded-2xl border-none bg-slate-100 dark:bg-slate-900 font-medium" 
                        required 
                        minLength={6}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Confirm Terminal Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-4 w-5 h-5 text-slate-400" />
                      <Input 
                        type="password" 
                        placeholder="••••••••" 
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-12 h-14 rounded-2xl border-none bg-slate-100 dark:bg-slate-900 font-medium" 
                        required 
                        minLength={6}
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading || !newPassword}
                    className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-[0.98]"
                  >
                    {loading ? "Reconfiguring..." : "Update Password"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Preferences Panel */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-8">
          <Card className="glass-card border-none shadow-2xl overflow-hidden rounded-[2rem]">
            <CardHeader className="p-8 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-2xl font-black uppercase tracking-widest text-primary flex items-center gap-3">
                <Sun className="w-6 h-6" /> System Preferences
              </CardTitle>
              <CardDescription className="font-medium text-muted-foreground">Adjust local client interfaces</CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <div className="flex items-center justify-between p-6 bg-slate-100 dark:bg-slate-900 rounded-2xl">
                <div>
                  <h4 className="font-black uppercase tracking-widest text-sm">Visual Theme</h4>
                  <p className="text-xs text-muted-foreground font-medium mt-1">Switch between light/dark environments</p>
                </div>
                <Button 
                  onClick={toggleTheme} 
                  variant="outline" 
                  className="h-14 w-14 rounded-2xl border-2 hover:bg-primary hover:text-white hover:border-primary transition-all"
                >
                  {theme === 'light' ? <Moon className="w-6 h-6" /> : <Sun className="w-6 h-6" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
  )
}
