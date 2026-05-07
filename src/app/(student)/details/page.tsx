"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Sidebar } from "@/components/layout/Sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { motion } from "framer-motion"
import { 
  User, Mail, Phone, Building2, BookOpen, 
  ShieldCheck, CreditCard, Calendar, Hash, Edit3
} from "lucide-react"
import { Logo } from "@/components/ui/Logo"
import { Button } from "@/components/ui/Button"
import { Dialog } from "@/components/ui/Dialog"
import { Input } from "@/components/ui/Input"
import { toast } from "sonner"
import { NotificationBell } from "@/components/NotificationBell"

export default function StudentDetailsPage() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editProfile, setEditProfile] = useState({
    full_name: "",
    father_name: "",
    phone: "",
    cgpa: ""
  })
  const supabase = createClient()

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(profile)
    if (profile) {
      setEditProfile({
        full_name: profile.full_name || "",
        father_name: profile.father_name || "",
        phone: profile.phone || "",
        cgpa: profile.cgpa || ""
      })
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 gap-6">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary"></div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-[#f8fafc] dark:bg-slate-950 font-sans">
      <Sidebar role="student" />
      
      <main className="flex-1 lg:ml-64 p-6 md:p-10">
        <header className="mb-14 flex flex-col md:flex-row justify-between items-start gap-8 relative z-10">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-white uppercase px-4 leading-none">
              MY <span className="text-primary italic">DETAILS</span>
            </h2>
            <p className="text-slate-500 dark:text-slate-400 font-bold text-sm tracking-tight px-4 mt-4 tracking-wider">
              Manage your institutional identity & profile information
            </p>
          </motion.div>

          <div className="flex items-center gap-4">
            <NotificationBell />
            <Button 
              variant="outline" 
              onClick={() => setShowEditModal(true)}
              className="h-14 px-8 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all gap-2 font-bold text-[11px] tracking-wider"
            >
              <Edit3 className="w-4 h-4 text-primary" /> Edit Profile
            </Button>
          </div>
        </header>

        <div className="max-w-4xl mx-auto space-y-8">
          {/* Identity Card */}
          <Card className="glass-card border-none overflow-hidden rounded-[3rem] shadow-2xl">
            <div className="h-48 bg-slate-900 relative overflow-hidden flex items-center p-12">
               <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full -mr-20 -mt-20 blur-3xl" />
               <div className="relative z-10 flex items-center gap-8">
                 <div className="w-24 h-24 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white shadow-2xl">
                   <User className="w-12 h-12" />
                 </div>
                 <div>
                   <h3 className="text-white font-bold text-4xl tracking-tight uppercase">{profile?.full_name}</h3>
                   <div className="flex items-center gap-4 mt-2">
                     <span className="px-4 py-1 rounded-full bg-primary text-white text-xs font-bold font-medium text-muted-foreground">{profile?.reg_no || 'Registration Pending'}</span>
                     <span className="text-white/40 text-xs font-bold font-medium text-muted-foreground italic">{profile?.department_name} Student</span>
                   </div>
                 </div>
               </div>
            </div>
            <CardContent className="p-12">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                 <div className="space-y-8">
                   <DetailItem icon={User} label="Father's Name" value={profile?.father_name || 'N/A'} />
                   <DetailItem icon={Mail} label="Official Email" value={profile?.email} />
                   <DetailItem icon={Phone} label="Contact Number" value={profile?.phone || 'Not Listed'} />
                 </div>
                 <div className="space-y-8">
                   <DetailItem icon={Building2} label="Department" value={profile?.department_name || 'General'} />
                   <DetailItem icon={BookOpen} label="Academic CGPA" value={profile?.cgpa || '0.00'} color="text-emerald-600" />
                   <DetailItem icon={Hash} label="User UUID" value={profile?.id.slice(0, 18) + '...'} />
                 </div>
               </div>
            </CardContent>
          </Card>

          {/* Institutional Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <StatusCard icon={ShieldCheck} label="Account Status" value="Verified" color="emerald" />
             <StatusCard icon={CreditCard} label="Clearance Mode" value="Digital" color="blue" />
             <StatusCard icon={Calendar} label="Batch" value="2022-2026" color="indigo" />
          </div>
        </div>
      </main>

      {/* Edit Profile Modal */}
      <Dialog isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Update Personal Data">
        <div className="space-y-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold font-medium text-muted-foreground text-slate-400 ml-1">Full Name</label>
              <Input value={editProfile.full_name} onChange={(e) => setEditProfile({...editProfile, full_name: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold font-medium text-muted-foreground text-slate-400 ml-1">Father Name</label>
              <Input value={editProfile.father_name} onChange={(e) => setEditProfile({...editProfile, father_name: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-none" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold font-medium text-muted-foreground text-slate-400 ml-1">WhatsApp Phone</label>
              <Input value={editProfile.phone} onChange={(e) => setEditProfile({...editProfile, phone: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold font-medium text-muted-foreground text-slate-400 ml-1">Current CGPA</label>
              <Input value={editProfile.cgpa} onChange={(e) => setEditProfile({...editProfile, cgpa: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-none" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t pt-6">
          <Button variant="ghost" onClick={() => setShowEditModal(false)} className="rounded-xl font-bold uppercase text-xs">Close</Button>
          <Button 
            onClick={async () => {
              const { error } = await supabase.from('profiles').update(editProfile).eq('id', profile.id)
              if (error) toast.error(error.message)
              else { toast.success("Profile updated"); setShowEditModal(false); fetchData() }
            }}
            className="rounded-xl font-bold uppercase text-xs bg-primary text-white px-8"
          >
            Save Changes
          </Button>
        </div>
      </Dialog>
    </div>
  )
}

function DetailItem({ icon: Icon, label, value, color = "text-slate-900" }: any) {
  return (
    <div className="flex items-center gap-6 p-6 bg-slate-50 rounded-[2rem] border border-slate-100/50 group hover:bg-white hover:shadow-xl transition-all duration-500">
      <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors shadow-sm">
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-xs font-bold font-medium text-muted-foreground text-slate-400 mb-1">{label}</p>
        <p className={`text-base font-bold ${color} tracking-tight`}>{value}</p>
      </div>
    </div>
  )
}

function StatusCard({ icon: Icon, label, value, color }: any) {
  return (
    <div className="p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-white/5 flex flex-col items-center text-center gap-4 group hover:scale-105 transition-transform">
       <div className={`w-14 h-14 rounded-2xl bg-${color}-500/10 text-${color}-500 flex items-center justify-center group-hover:rotate-12 transition-transform`}>
          <Icon className="w-7 h-7" />
       </div>
       <div>
         <p className="text-xs font-bold font-medium text-muted-foreground text-slate-400 mb-1">{label}</p>
         <p className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{value}</p>
       </div>
    </div>
  )
}
