"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { departmentPortalPathSlug } from "@/lib/departmentKeys"
import { 
  LayoutDashboard, 
  FileText, 
  CheckCircle2,
  AlertCircle, 
  Settings, 
  LogOut,
  User,
  UserPlus,
  Shield,
  Truck,
  BookOpen,
  Mail,
  Menu,
  X,
  Clock,
  Bell,
  History,
  GraduationCap
} from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { Logo } from "@/components/ui/Logo"
import { motion } from "framer-motion"

interface SidebarProps {
  role: 'admin' | 'student' | 'department' | 'transport' | 'library' | 'hostel' | 'finance' | 'dispatch'
  departmentName?: string
}

export function Sidebar({ role, departmentName }: SidebarProps) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  const navItems: Record<string, { label: string; href: string; icon: any }[]> = {
    student: [
      { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
      { label: "Identity", href: "/details", icon: User },
      { label: "Logistics", href: "/degree-dispatch", icon: Truck },
      { label: "Messages", href: "/notifications", icon: Mail },
    ],
    department: [
      { label: "Portal Hub", href: `/${departmentPortalPathSlug(departmentName || '')}`, icon: LayoutDashboard },
      { label: "Evaluations", href: `/${departmentPortalPathSlug(departmentName || '')}/requests`, icon: Clock },
      { label: "Certified", href: `/${departmentPortalPathSlug(departmentName || '')}/cleared`, icon: CheckCircle2 },
      { label: "Issues", href: `/${departmentPortalPathSlug(departmentName || '')}/rejected`, icon: AlertCircle },
      { label: "Forms", href: `/${departmentPortalPathSlug(departmentName || '')}/forms`, icon: FileText },
    ],
    transport: [
      { label: "Transport Hub", href: "/transport", icon: LayoutDashboard },
      { label: "Verified", href: "/transport/cleared", icon: CheckCircle2 },
      { label: "Issues", href: "/transport/rejected", icon: AlertCircle },
    ],
    library: [
      { label: "Library Hub", href: "/library", icon: LayoutDashboard },
      { label: "Verified", href: "/library/cleared", icon: CheckCircle2 },
      { label: "Issues", href: "/library/rejected", icon: AlertCircle },
    ],
    hostel: [
      { label: "Hostel Hub", href: "/hostel", icon: LayoutDashboard },
      { label: "Verified", href: "/hostel/cleared", icon: CheckCircle2 },
      { label: "Issues", href: "/hostel/rejected", icon: AlertCircle },
    ],
    finance: [
      { label: "Finance Hub", href: "/finance", icon: LayoutDashboard },
      { label: "Verified", href: "/finance/cleared", icon: CheckCircle2 },
      { label: "Issues", href: "/finance/rejected", icon: AlertCircle },
    ],
    dispatch: [
      { label: "Degree Hub", href: "/dispatch", icon: LayoutDashboard },
      { label: "Awarded", href: "/dispatch/cleared", icon: CheckCircle2 },
      { label: "Logistics", href: "/dispatch/rejected", icon: Truck },
    ],
    admin: [
      { label: "Intelligence", href: "/admin", icon: Shield },
      { label: "Registry", href: "/admin/students", icon: User },
      { label: "Onboarding", href: "/admin/add-student", icon: UserPlus },
      { label: "Evaluations", href: "/admin/requests", icon: FileText },
      { label: "Logistics", href: "/admin/dispatch", icon: Truck },
      { label: "Security Log", href: "/admin/audit", icon: History },
    ],
  }

  const items = navItems[role] || []

  return (
    <>
      <Button 
        variant="ghost" 
        size="icon" 
        className="fixed top-6 left-6 z-50 lg:hidden bg-white dark:bg-slate-900 shadow-xl rounded-2xl"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      <div className={cn(
        "fixed inset-y-0 left-0 z-40 w-72 bg-white dark:bg-slate-950 border-r border-slate-100 dark:border-white/5 transition-transform duration-500 transform lg:translate-x-0 shadow-[20px_0_40px_rgba(0,0,0,0.02)]",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full p-8">
          <div className="flex items-center gap-4 mb-12 px-2">
            <div className="p-2 bg-slate-900 dark:bg-white rounded-2xl shadow-xl shadow-slate-900/10">
               <Logo className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-slate-900 dark:text-white font-bold leading-none text-lg tracking-tight">CUI <span className="text-primary italic">Portal</span></h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{role}</p>
            </div>
          </div>

          <nav className="flex-1 space-y-2">
            {items.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-500 group relative overflow-hidden",
                    isActive 
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-950 shadow-2xl shadow-slate-900/20" 
                      : "text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                  )}
                  onClick={() => setIsOpen(false)}
                >
                  <Icon className={cn("w-5 h-5", isActive ? "text-primary" : "group-hover:scale-110 group-hover:text-primary transition-all")} />
                  <span className="text-[11px] font-bold uppercase tracking-[0.15em]">{item.label}</span>
                  {isActive && (
                    <motion.div 
                      layoutId="sidebar-active"
                      className="absolute right-3 w-1.5 h-1.5 rounded-full bg-primary"
                    />
                  )}
                </Link>
              )
            })}
          </nav>

          <div className="mt-auto pt-8 border-t border-slate-50 dark:border-white/5">
            <div className="px-5 py-5 mb-6 rounded-[2rem] bg-slate-50 dark:bg-white/5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shadow-inner shrink-0">
                {role[0].toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold truncate capitalize text-slate-900 dark:text-white tracking-tight">{role === 'admin' ? 'System Control' : departmentName || role}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-1">
              <Link href="/settings">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start gap-4 h-12 rounded-xl text-[11px] font-bold uppercase tracking-widest text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/5 dark:hover:text-white transition-all"
                >
                  <Settings className="w-4 h-4" />
                  <span>Config</span>
                </Button>
              </Link>

              <Button 
                variant="ghost" 
                className="w-full justify-start gap-4 h-12 rounded-xl text-[11px] font-bold uppercase tracking-widest text-rose-400 hover:bg-rose-500/10 hover:text-rose-500 transition-all"
                onClick={async () => {
                  const { createClient } = await import("@/lib/supabase/client")
                  const supabase = createClient()
                  await supabase.auth.signOut()
                  window.location.href = "/"
                }}
              >
                <LogOut className="w-4 h-4" />
                <span>Exit</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
