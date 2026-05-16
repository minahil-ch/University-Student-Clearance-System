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
    { 
      name: "Degree Awarded Portal", 
      icon: Truck, 
      color: "indigo", 
      desc: "Degree issuance and final award processing", 
      href: "/login/staff?role=staff&dept=dispatch&switch=1" 
    },
  ]

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col items-center justify-center p-8 md:p-20 relative overflow-hidden">
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
            <h1 className="text-4xl md:text-7xl font-bold tracking-tight text-slate-900 dark:text-white leading-none uppercase">
              COMSATS <span className="text-primary italic">UNIVERSITY</span>
            </h1>
            <div className="flex items-center justify-center gap-4 mt-2">
               <div className="h-px w-12 bg-slate-200 dark:bg-white/10" />
               <p className="text-xs md:text-xs font-bold uppercase tracking-[0.6em] text-slate-400">Official Clearance Hub</p>
               <div className="h-px w-12 bg-slate-200 dark:bg-white/10" />
            </div>
          </div>
        </div>
        <p className="text-xl md:text-2xl text-slate-500 dark:text-slate-400 max-w-3xl mx-auto font-bold tracking-tight px-4 leading-relaxed italic">
          Empowering the graduating class with a seamless, digitalized verification ecosystem.
        </p>
      </motion.div>

      <div className="max-w-7xl w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 relative z-10">
        {portals.map((portal, i) => (
          <motion.div
            key={portal.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            whileHover={{ y: -5, scale: 1.02 }}
            onClick={() => router.push(portal.href)}
            className="group cursor-pointer relative p-8 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center gap-6 min-h-[160px]"
          >
            {/* Colored Icon Container */}
            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center bg-${portal.color}-500/10 text-${portal.color}-600 shrink-0 group-hover:bg-${portal.color}-500 group-hover:text-white transition-all duration-500`}>
              <portal.icon className="w-10 h-10" />
            </div>

            <div className="flex-1 space-y-2">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
                {portal.name}
              </h3>
              <p className="text-[13px] text-slate-400 dark:text-slate-500 font-bold leading-relaxed">
                {portal.desc}
              </p>
            </div>

            <div className="text-slate-200 group-hover:text-primary group-hover:translate-x-2 transition-all shrink-0">
               <ArrowRight className="w-5 h-5" />
            </div>

            {/* Subtle Accent Glow */}
            <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-1 bg-${portal.color}-500 group-hover:w-1/2 transition-all duration-500 rounded-full`} />
          </motion.div>
        ))}
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-24 md:mt-32 flex flex-col items-center gap-10 relative z-10"
      >
        <div className="flex flex-wrap justify-center gap-6">
          <button 
            onClick={() => router.push('/login/admin?switch=1')}
            className="group flex items-center gap-4 px-10 py-5 rounded-[2rem] bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold uppercase tracking-[0.3em] hover:scale-105 transition-all shadow-2xl"
          >
            System Management <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          <button 
            onClick={() => router.push('/login/staff?role=staff&dept=dispatch&switch=1')}
            className="group flex items-center gap-4 px-10 py-5 rounded-[2rem] bg-primary text-white text-xs font-bold uppercase tracking-[0.3em] hover:scale-105 transition-all shadow-2xl"
          >
            Degree Awarded Portal <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
        
        <div className="flex flex-col items-center gap-2">
           <p className="text-slate-300 dark:text-slate-700 text-xs font-bold tracking-[0.5em] uppercase">
             Vehari Campus Infrastructure
           </p>
           <p className="text-slate-400 dark:text-slate-500 text-xs font-bold">
             &copy; 2026 CUI Official Portal. All Rights Reserved.
           </p>
        </div>
      </motion.div>
    </div>

  )
}
