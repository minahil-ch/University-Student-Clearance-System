"use client"

import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { 
  BookOpen, 
  ArrowLeft,
  GraduationCap,
  Microscope,
  Calculator,
  Languages,
  Leaf,
  ArrowRight
} from "lucide-react"

import { Logo } from "@/components/ui/Logo"

export default function AcademicPortalsPage() {
  const router = useRouter()

  const academicDepts = [
    { 
      name: "Computer Science", 
      icon: GraduationCap, 
      color: "blue", 
      desc: "Manage CS student clearance and surveys", 
      href: "/login/staff?role=staff&dept=Computer Science&switch=1" 
    },
    { 
      name: "Software Engineering", 
      icon: Microscope, 
      color: "emerald", 
      desc: "Approve SE student graduation requirements", 
      href: "/login/staff?role=staff&dept=Software Engineering&switch=1" 
    },
    { 
      name: "Mathematics", 
      icon: Calculator, 
      color: "violet", 
      desc: "Final clearance for Mathematics department", 
      href: "/login/staff?role=staff&dept=Mathematics&switch=1" 
    },
    {
      name: "Humanities",
      icon: Languages,
      color: "amber",
      desc: "Manage clearance for Humanities students",
      href: "/login/staff?role=staff&dept=Humanities&switch=1"
    },
    {
      name: "Environmental Sciences",
      icon: Leaf,
      color: "cyan",
      desc: "Clearance for Environmental Sciences students",
      href: "/login/staff?role=staff&dept=Environmental Sciences&switch=1"
    },
  ]

  return (
    <div className="min-h-screen bg-blue-50/50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100 via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-black">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12 md:mb-16 relative"
      >
        <button 
          onClick={() => router.push('/')}
          className="absolute -left-4 md:-left-20 top-1/2 -translate-y-1/2 p-3 rounded-2xl bg-white dark:bg-slate-900 shadow-lg hover:scale-110 transition-all border border-slate-100 dark:border-slate-800"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </button>

        <div className="flex flex-col items-center justify-center gap-4 mb-6">
          <Logo className="w-16 h-16 md:w-20 md:h-20" />
          <h1 className="text-2xl md:text-3xl font-bold italic tracking-tight px-4 text-slate-900 dark:text-white">
            ACADEMIC <span className="text-primary italic">DEPARTMENTS</span>
          </h1>
        </div>
        <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto font-medium px-4 tracking-wider">
          Select your department to access the departmental authority portal
        </p>
      </motion.div>

      <div className="max-w-7xl w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
        {academicDepts.map((portal, i) => (
          <motion.div
            key={portal.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            whileHover={{ y: -5, scale: 1.02 }}
            onClick={() => router.push(portal.href)}
            className="group cursor-pointer relative p-8 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center gap-6 min-h-[140px]"
          >
            {/* Colored Icon Container */}
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center bg-${portal.color}-500/10 text-${portal.color}-600 shrink-0 group-hover:bg-${portal.color}-500 group-hover:text-white transition-all duration-500`}>
              <portal.icon className="w-8 h-8" />
            </div>

            <div className="flex-1 space-y-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-tight uppercase">
                {portal.name}
              </h3>
              <p className="text-[12px] text-slate-400 dark:text-slate-500 font-bold leading-relaxed">
                Departmental Dashboard
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

      <div className="mt-16 text-center">
        <p className="text-slate-400 dark:text-slate-500 text-xs font-medium tracking-widest uppercase">
          &copy; 2026 CUI Vehari Academic Authority Network
        </p>
      </div>
    </div>
  )
}
