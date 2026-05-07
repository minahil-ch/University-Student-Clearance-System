"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { departmentPortalPathSlug } from "@/lib/departmentKeys"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import { 
  Lock, Moon, Sun, ArrowLeft, Settings2, 
  CheckCircle2, ShieldCheck, User, Phone, 
  BookOpen, Hash, Briefcase, Mail
} from "lucide-react"

export default function SettingsPage() {
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [formData, setFormData] = useState({
    full_name: "",
    father_name: "",
    phone: "",
    cgpa: ""
  })
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const savedTheme = window.localStorage.getItem('theme') as 'light' | 'dark' | null
    const isDark = savedTheme ? savedTheme === 'dark' : document.documentElement.classList.contains('dark')
    setTheme(isDark ? 'dark' : 'light')

    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (data) {
          setProfile(data)
          setFormData({
            full_name: data.full_name || "",
            father_name: data.father_name || "",
            phone: data.phone || "",
            cgpa: data.cgpa?.toString() || ""
          })
        }
      } else {
        router.push('/login')
      }
    }
    loadUser()
  }, [router, supabase])

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
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: formData.full_name,
        father_name: formData.father_name,
        phone: formData.phone,
        cgpa: formData.cgpa ? parseFloat(formData.cgpa) : null
      })
      .eq('id', profile.id)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success("Identity profile synchronized successfully!")
      setProfile({ ...profile, ...formData, cgpa: formData.cgpa ? parseFloat(formData.cgpa) : null })
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
    else if (profile.role === 'department') {
      router.push(`/${departmentPortalPathSlug(profile.department_name)}`)
    } else if (profile.role === 'library') router.push('/library')
    else if (profile.role === 'transport') router.push('/transport')
    else router.push('/dashboard')
  }

  if (!profile) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-12 transition-colors duration-500">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <Button variant="ghost" onClick={handleBackToDashboard} className="mb-8 font-bold tracking-wider gap-2 text-slate-400 hover:text-primary transition-all">
            <ArrowLeft className="w-5 h-5" /> Back to Authorization Hub
          </Button>
        </motion.div>

        <header className="mb-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="p-5 bg-primary rounded-[2rem] text-white shadow-2xl shadow-primary/20 rotate-3">
              <Settings2 className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-white leading-none">
                Protocol <span className="text-primary italic">Settings</span>
              </h1>
              <div className="flex items-center gap-3 mt-3">
                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-xs font-bold font-medium text-muted-foreground">Live Identity</span>
                <p className="text-slate-400 font-bold tracking-widest uppercase text-xs">{profile?.email}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-2 rounded-[2rem] shadow-xl border border-slate-100 dark:border-white/5">
             <button 
               onClick={toggleTheme}
               className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 ${theme === 'light' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'text-slate-400'}`}
             >
               <Sun className="w-6 h-6" />
             </button>
             <button 
               onClick={toggleTheme}
               className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 ${theme === 'dark' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400'}`}
             >
               <Moon className="w-6 h-6" />
             </button>
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Profile Identity Panel */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            className="xl:col-span-2"
          >
            <Card className="glass-card border-none shadow-2xl overflow-hidden rounded-[3rem]">
              <CardHeader className="bg-white/40 dark:bg-slate-900/40 p-10 border-b border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-4">
                  <User className="w-8 h-8 text-primary" />
                  <div>
                    <CardTitle className="text-2xl font-bold tracking-tight">Identity Profile</CardTitle>
                    <CardDescription className="font-bold text-slate-400 uppercase text-xs tracking-widest mt-1">Manage your institutional data</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-10">
                <form onSubmit={handleUpdateProfile} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-[11px] font-bold font-medium text-muted-foreground text-slate-400 ml-1">Full Legal Name</label>
                      <div className="relative group">
                        <User className="absolute left-5 top-5 w-5 h-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                        <Input 
                          value={formData.full_name}
                          onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                          className="pl-14 h-16 rounded-[1.5rem] bg-slate-50 dark:bg-slate-950 border-none focus:ring-2 focus:ring-primary/20 text-sm font-bold"
                          placeholder="Your Name"
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[11px] font-bold font-medium text-muted-foreground text-slate-400 ml-1">Father&apos;s Name</label>
                      <div className="relative group">
                        <User className="absolute left-5 top-5 w-5 h-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                        <Input 
                          value={formData.father_name}
                          onChange={(e) => setFormData({...formData, father_name: e.target.value})}
                          className="pl-14 h-16 rounded-[1.5rem] bg-slate-50 dark:bg-slate-950 border-none focus:ring-2 focus:ring-primary/20 text-sm font-bold"
                          placeholder="Father's Name"
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[11px] font-bold font-medium text-muted-foreground text-slate-400 ml-1">Contact Phone</label>
                      <div className="relative group">
                        <Phone className="absolute left-5 top-5 w-5 h-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                        <Input 
                          value={formData.phone}
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                          className="pl-14 h-16 rounded-[1.5rem] bg-slate-50 dark:bg-slate-950 border-none focus:ring-2 focus:ring-primary/20 text-sm font-bold"
                          placeholder="+92 XXX XXXXXXX"
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[11px] font-bold font-medium text-muted-foreground text-slate-400 ml-1">Current CGPA</label>
                      <div className="relative group">
                        <Hash className="absolute left-5 top-5 w-5 h-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                        <Input 
                          type="number"
                          step="0.01"
                          value={formData.cgpa}
                          onChange={(e) => setFormData({...formData, cgpa: e.target.value})}
                          className="pl-14 h-16 rounded-[1.5rem] bg-slate-50 dark:bg-slate-950 border-none focus:ring-2 focus:ring-primary/20 text-sm font-bold"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-6">
                    <Button
                      type="submit"
                      disabled={loading}
                      className="h-16 px-12 rounded-[1.5rem] bg-primary text-white font-bold font-medium text-muted-foreground text-xs shadow-2xl shadow-primary/20 hover:scale-[1.02] transition-all"
                    >
                      {loading ? "Syncing Identity..." : "Synchronize Profile Details"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          {/* Security & Info Panel */}
          <div className="space-y-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="glass-card border-none shadow-2xl overflow-hidden rounded-[3rem]">
                <CardHeader className="p-10 bg-slate-900 text-white">
                  <div className="flex items-center gap-4">
                    <ShieldCheck className="w-8 h-8 text-emerald-400" />
                    <div>
                      <CardTitle className="text-xl font-bold tracking-tight">Security Center</CardTitle>
                      <CardDescription className="text-slate-400 font-bold text-xs font-medium text-muted-foreground mt-1">Access Protocol Controls</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-10">
                  <form onSubmit={handleUpdatePassword} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold font-medium text-muted-foreground text-slate-400 ml-1">New Terminal Password</label>
                      <div className="relative">
                        <Lock className="absolute left-5 top-5 w-5 h-5 text-slate-300" />
                        <Input 
                          type="password" 
                          placeholder="••••••••" 
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="pl-14 h-16 rounded-[1.5rem] bg-slate-100 dark:bg-slate-950 border-none font-bold" 
                          required 
                          minLength={6}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold font-medium text-muted-foreground text-slate-400 ml-1">Confirm Configuration</label>
                      <div className="relative">
                        <Lock className="absolute left-5 top-5 w-5 h-5 text-slate-300" />
                        <Input 
                          type="password" 
                          placeholder="••••••••" 
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="pl-14 h-16 rounded-[1.5rem] bg-slate-100 dark:bg-slate-950 border-none font-bold" 
                          required 
                          minLength={6}
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={loading || !newPassword}
                      className="w-full h-16 bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold font-medium text-muted-foreground text-xs rounded-[1.5rem] shadow-xl transition-all active:scale-[0.98]"
                    >
                      {loading ? "Verifying..." : "Update Security Token"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
               <Card className="p-10 bg-gradient-to-br from-primary to-indigo-600 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                  <div className="flex items-center gap-4 mb-6">
                     <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                        <Briefcase className="w-6 h-6 text-white" />
                     </div>
                     <h4 className="text-xl font-bold tracking-tight">Institutional Log</h4>
                  </div>
                  <div className="space-y-4">
                     <div className="flex justify-between items-center border-b border-white/10 pb-4">
                        <span className="text-xs font-bold font-medium text-muted-foreground opacity-60">Auth Level</span>
                        <span className="text-xs font-bold uppercase">{profile.role}</span>
                     </div>
                     <div className="flex justify-between items-center border-b border-white/10 pb-4">
                        <span className="text-xs font-bold font-medium text-muted-foreground opacity-60">Department</span>
                        <span className="text-xs font-bold uppercase">{profile.department_name || "General"}</span>
                     </div>
                     <div className="flex justify-between items-center">
                        <span className="text-xs font-bold font-medium text-muted-foreground opacity-60">Status</span>
                        <div className="flex items-center gap-1.5">
                           <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                           <span className="text-xs font-bold font-medium text-muted-foreground text-emerald-400">Authorized</span>
                        </div>
                     </div>
                  </div>
               </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
