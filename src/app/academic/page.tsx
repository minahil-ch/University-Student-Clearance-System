"use client"

import { useRouter } from "next/navigation"
import { Building2, ArrowRight } from "lucide-react"

const academicDepartments = [
  "Computer Science",
  "Software Engineering",
  "Mathematics",
  "Humanities",
  "Environmental Sciences",
]

export default function AcademicPortalPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            Academic Portal
          </h1>
          <p className="text-muted-foreground mt-2">
            Select your academic department. Library, Transport, Finance, and Hostel are separate portals.
          </p>
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
