"use client"

import { useRouter } from "next/navigation"
import { Building2, ArrowRight, ArrowLeft } from "lucide-react"

const academicDepartments = [
  "Computer Science",
  "Software Engineering",
  "Mathematics",
  "Humanities",
  "Environmental Sciences",
]

import { Logo } from "@/components/ui/Logo"

export default function AcademicPortalPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-10 relative">
      <div className="max-w-6xl mx-auto">
        <button 
          onClick={() => router.push('/')}
          className="mb-8 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-primary transition-all active:scale-95 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back to System Home
        </button>
        <div className="mb-12 flex flex-col md:flex-row items-center gap-6">
          <Logo className="w-20 h-20" />
          <div className="text-center md:text-left">
            <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase italic">
              ACADEMIC <span className="text-primary">AUTHORITY</span>
            </h1>
            <p className="text-muted-foreground mt-2 font-medium">
              Official Departmental Clearance Hub for COMSATS University Vehari Campus.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {academicDepartments.map((dept) => (
            <button
              key={dept}
              onClick={() => router.push(`/login/staff?role=staff&dept=${encodeURIComponent(dept)}&switch=1`)}
              className="text-left p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg hover:border-primary/40 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <Building2 className="w-6 h-6" />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">{dept}</h3>
              <p className="text-sm text-muted-foreground mt-1">Final authority clearance dashboard</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
