"use client"

import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { 
  Building2, 
  Truck,
  BookOpen,
  ArrowRight,
  GraduationCap
} from "lucide-react"

import { Logo } from "@/components/ui/Logo"

export default function LandingPage() {
  const router = useRouter()

  const portals = [
    { 
      name: "Student Portal", 
      icon: GraduationCap, 
      color: "blue", 
      desc: "Apply for clearance and track your status", 
      href: "/login/student?switch=1" 
    },
    { 
      name: "Transport Portal", 
      icon: Truck, 
      color: "amber", 
      desc: "Approve or flag transport dues", 
      href: "/login/staff?role=staff&dept=transport&switch=1" 
    },
    { 
      name: "Library Portal", 
      icon: BookOpen, 
      color: "violet", 
      desc: "Manage library returns and fines", 
      href: "/login/staff?role=staff&dept=library&switch=1" 
    },
    {
      name: "Finance Portal",
      icon: Building2,
      color: "teal",
      desc: "Handle finance dues and approvals",
      href: "/login/staff?role=staff&dept=finance&switch=1"
    },
    {
      name: "Hostel Portal",
      icon: Building2,
      color: "cyan",
      desc: "Handle hostel clearance and approvals",
      href: "/login/staff?role=staff&dept=hostel&switch=1"
    },
    { 
      name: "Academic Portal", 
      icon: BookOpen, 
      color: "emerald", 
      desc: "Final authority by student selected department", 
      href: "/academic" 
    },
  ]

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Premium Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.05),transparent)] pointer-events-none" />
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />

      <motion.div 
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-center mb-16 md:mb-24 relative z-10"
      >
        <div className="flex flex-col items-center justify-center gap-8 mb-10">
          <motion.div 
            whileHover={{ rotate: 5, scale: 1.05 }}
            className="relative"
          >
            <Logo className="w-24 h-24 md:w-32 md:h-32 drop-shadow-2xl" />
          </motion.div>
          <div>
            <h1 className="text-4xl md:text-7xl font-black tracking-tighter text-slate-900 dark:text-white leading-none uppercase">
              COMSATS <span className="text-primary italic">UNIVERSITY</span>
            </h1>
            <div className="flex items-center justify-center gap-4 mt-2">
               <div className="h-px w-12 bg-slate-200 dark:bg-white/10" />
               <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.6em] text-slate-400">Official Clearance Hub</p>
               <div className="h-px w-12 bg-slate-200 dark:bg-white/10" />
            </div>
          </div>
        </div>
        <p className="text-xl md:text-2xl text-slate-500 dark:text-slate-400 max-w-3xl mx-auto font-bold tracking-tight px-4 leading-relaxed italic">
          Empowering the graduating class with a seamless, digitalized verification ecosystem.
        </p>
      </motion.div>

      <div className="max-w-7xl w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10 relative z-10">
        {portals.map((portal, i) => (
          <motion.div
            key={portal.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.6 }}
            whileHover={{ y: -12, scale: 1.02 }}
            onClick={() => router.push(portal.href)}
            className="group cursor-pointer relative p-10 rounded-[3.5rem] glass-card overflow-hidden transition-all duration-500"
          >
            {/* Logo Watermark Backdrop */}
            <div className="absolute -right-8 -bottom-8 opacity-[0.03] group-hover:opacity-[0.08] group-hover:scale-110 transition-all duration-700 pointer-events-none">
               <Logo className="w-48 h-48" />
            </div>

            {/* Glowing Accent */}
            <div className={`absolute top-0 left-0 w-1 h-full bg-${portal.color}-500 opacity-0 group-hover:opacity-100 transition-opacity`} />
            
            <div className="flex flex-col items-start gap-10">
              <div className="flex justify-between items-start w-full">
                <div className={`w-20 h-20 rounded-[1.75rem] flex items-center justify-center bg-${portal.color}-500/10 text-${portal.color}-500 shadow-inner group-hover:bg-${portal.color}-500 group-hover:text-white transition-all duration-500`}>
                  <portal.icon className="w-10 h-10" />
                </div>
                <Logo className="w-10 h-10 opacity-20 group-hover:opacity-100 transition-opacity duration-500" />
              </div>
              
              <div className="space-y-4">
                <div className="space-y-1">
                   <p className={`text-[10px] font-black uppercase tracking-[0.3em] text-${portal.color}-500/70`}>Institutional Portal</p>
                   <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">
                     {portal.name.split(' ')[0]} <span className="text-primary italic">{portal.name.split(' ')[1]}</span>
                   </h3>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-[220px]">
                  {portal.desc}
                </p>
              </div>

              <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                <span className="relative">
                  Enter Portal
                  <span className="absolute -bottom-1 left-0 w-0 h-px bg-primary group-hover:w-full transition-all duration-300" />
                </span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform duration-300" />
              </div>
            </div>

            {/* Hover Shine Effect */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
               <div className="absolute inset-0 shimmer" />
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-24 md:mt-32 flex flex-col items-center gap-10 relative z-10"
      >
        <button 
          onClick={() => router.push('/login/admin?switch=1')}
          className="group flex items-center gap-4 px-10 py-5 rounded-[2rem] bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-black uppercase tracking-[0.3em] hover:scale-105 transition-all shadow-2xl"
        >
          System Management <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
        
        <div className="flex flex-col items-center gap-2">
           <p className="text-slate-300 dark:text-slate-700 text-[9px] font-black tracking-[0.5em] uppercase">
             Vehari Campus Infrastructure
           </p>
           <p className="text-slate-400 dark:text-slate-500 text-[10px] font-bold">
             &copy; 2026 CUI Official Portal. All Rights Reserved.
           </p>
        </div>
      </motion.div>
    </div>

  )
}
