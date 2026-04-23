"use client"

import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { 
  ShieldAlert, 
  Building2, 
  Truck,
  BookOpen,
  ArrowRight,
  GraduationCap,
  Landmark,
  Home
} from "lucide-react"

export default function LandingPage() {
  const router = useRouter()

  const portals = [
    { 
      name: "Student Portal", 
      icon: GraduationCap, 
      color: "blue", 
      desc: "Apply for clearance and track your status", 
      href: "/login" 
    },
    { 
      name: "Library Portal", 
      icon: BookOpen, 
      color: "violet", 
      desc: "Manage library returns and fines", 
      href: "/login" 
    },
    { 
      name: "Transport Portal", 
      icon: Truck, 
      color: "amber", 
      desc: "Approve or flag transport dues", 
      href: "/login" 
    },
    { 
      name: "Finance Portal", 
      icon: Landmark, 
      color: "indigo", 
      desc: "Clear financial dues and fees", 
      href: "/login" 
    },
    { 
      name: "Hostel Portal", 
      icon: Home, 
      color: "orange", 
      desc: "Manage hostel clearance", 
      href: "/login" 
    },
    { 
      name: "Admin Portal", 
      icon: ShieldAlert, 
      color: "rose", 
      desc: "Supervise full university clearance metrics", 
      href: "/login" 
    },
    { 
      name: "Academic Portal", 
      icon: Building2, 
      color: "emerald", 
      desc: "Final clearance by Academic department - The final authority for graduation", 
      href: "/login",
      isLarge: true
    },
  ]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100 via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-black">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-16"
      >
        <div className="flex items-center justify-center gap-4 mb-6 mt-10">
          <div className="w-16 h-16 rounded-3xl bg-blue-600 flex items-center justify-center shadow-2xl shadow-blue-600/20">
            <GraduationCap className="text-white w-10 h-10" />
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-slate-900 dark:text-white">
            Clearance<span className="text-blue-600 italic">Sys</span>
          </h1>
        </div>
        <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto font-medium">
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
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push(portal.href)}
            className={`group cursor-pointer flex items-center p-8 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl hover:shadow-2xl hover:border-blue-500/50 transition-all duration-300 relative overflow-hidden ${portal.isLarge ? 'md:col-span-2 lg:col-span-3 border-emerald-500/30' : ''}`}
          >
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center bg-slate-50 dark:bg-slate-800 mr-6 shadow-sm group-hover:bg-blue-50 transition-colors ${portal.isLarge ? 'w-24 h-24' : ''}`}>
              <portal.icon className={`w-8 h-8 font-bold text-slate-700 group-hover:text-blue-600 transition-colors ${portal.isLarge ? 'w-12 h-12' : ''}`} />
            </div>
            
            <div className="flex-1">
              <h3 className={`font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors ${portal.isLarge ? 'text-3xl' : 'text-xl'}`}>
                {portal.name}
              </h3>
              <p className={`text-slate-500 mt-1 leading-relaxed ${portal.isLarge ? 'text-lg' : 'text-sm'}`}>
                {portal.desc}
              </p>
            </div>
            
            <ArrowRight className={`w-5 h-5 text-slate-300 group-hover:text-blue-600 transition-all group-hover:translate-x-1 ${portal.isLarge ? 'w-8 h-8' : ''}`} />
          </motion.div>
        ))}
      </div>

      <p className="mt-20 text-slate-400 dark:text-slate-500 text-sm font-medium tracking-widest uppercase mb-10">
        &copy; 2026 University Student Clearance System
      </p>
    </div>
  )
}
