"use client"

import dynamic from 'next/dynamic'
import { Logo } from "@/components/ui/Logo"

// Enforce client-only rendering for the admin command center
// This prevents hydration mismatches from Recharts and large administrative tables
const AdminDashboardContent = dynamic(
  () => import('./AdminDashboardContent'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 gap-6">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8">
            <Logo className="w-8 h-8" />
          </div>
        </div>
        <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 animate-pulse">
          Establishing Command Center Link...
        </p>
      </div>
    )
  }
)

export default function AdminDashboardPage() {
  return <AdminDashboardContent />
}
