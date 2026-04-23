"use client"

import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { 
  ShieldAlert, 
  Building2, 
  Truck,
  BookOpen,
  ArrowRight,
  GraduationCap
} from "lucide-react"

export default function LandingPage() {
  const router = useRouter()

  const portals = [
    { 
      name: "Student Portal", 
      icon: GraduationCap, 
      color: "blue", 
      desc: "Apply for clearance and track your status", 
      href: "/login/student" 
    },
    { 
      name: "Faculty Portal", 
      icon: Building2, 
      color: "emerald", 
      desc: "Academic department portals by faculty", 
      href: "/faculty" 
    },
    { 
      name: "Transport Portal", 
      icon: Truck, 
      color: "amber", 
      desc: "Approve or flag transport dues", 
      href: "/login/staff?role=staff&dept=transport" 
    },
    { 
      name: "Library Portal", 
      icon: BookOpen, 
      color: "violet", 
      desc: "Manage library returns and fines", 
      href: "/login/staff?role=staff&dept=library" 
    },
    { 
      name: "Admin Portal", 
      icon: ShieldAlert, 
      color: "rose", 
      desc: "Supervise full university clearance metrics", 
      href: "/login/admin" 
    },
  ]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100 via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-black">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-16"
      >
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-3xl bg-primary flex items-center justify-center shadow-2xl shadow-primary/20">
            <GraduationCap className="text-white w-10 h-10" />
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-slate-900 dark:text-white">
            Clearance<span className="text-primary text-emerald-500 italic">Sys</span>
          </h1>
        </div>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-medium">
          The official unified clearance portal for university students and departments.
        </p>
      </motion.div>

      <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {portals.map((portal, i) => (
          <motion.div
            key={portal.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ scale: 1.02, translateY: -5 }}
            onClick={() => router.push(portal.href)}
            className="group cursor-pointer flex items-center p-8 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl hover:shadow-2xl hover:border-primary/50 transition-all duration-300 relative overflow-hidden"
          >
            <div className={`absolute top-0 right-0 w-32 h-32 bg-${portal.color}-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500`} />
            
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center bg-${portal.color}-500/10 text-${portal.color}-500 mr-6 shadow-sm`}>
              <portal.icon className="w-8 h-8 font-bold" />
            </div>
            
            <div className="flex-1">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                {portal.name}
              </h3>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                {portal.desc}
              </p>
            </div>
            
            <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-primary transition-all group-hover:translate-x-1" />
          </motion.div>
        ))}
      </div>

      <p className="mt-20 text-slate-400 dark:text-slate-500 text-sm font-medium tracking-widest uppercase">
        &copy; 2026 University Student Clearance System
      </p>
    </div>
  )
}
