"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { departmentPortalPathSlug } from "@/lib/departmentKeys"
import { 
  LayoutDashboard, 
  FileText, 
  CheckCircle, 
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
  History
} from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { Logo } from "@/components/ui/Logo"
import { motion } from "framer-motion"

interface SidebarProps {
  role: 'admin' | 'student' | 'department' | 'transport' | 'library' | 'hostel' | 'finance'
  departmentName?: string
}

export function Sidebar({ role, departmentName }: SidebarProps) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  const navItems: Record<string, { label: string; href: string; icon: any }[]> = {
    student: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "My Details", href: "/details", icon: User },
      { label: "Clearance Form", href: "/form", icon: FileText },
      { label: "Notifications", href: "/notifications", icon: Mail },
    ],
    department: [
      { label: "Dashboard", href: `/${departmentPortalPathSlug(departmentName || '')}`, icon: LayoutDashboard },
      { label: "Pending Requests", href: `/${departmentPortalPathSlug(departmentName || '')}/requests`, icon: Clock },
      { label: "Approved Students", href: `/${departmentPortalPathSlug(departmentName || '')}/cleared`, icon: CheckCircle2 },
      { label: "Rejected Students", href: `/${departmentPortalPathSlug(departmentName || '')}/rejected`, icon: AlertCircle },
      { label: "Form Management", href: `/${departmentPortalPathSlug(departmentName || '')}/forms`, icon: FileText },
      { label: "Notifications", href: `/${departmentPortalPathSlug(departmentName || '')}/notifications`, icon: Bell },
    ],
    transport: [
      { label: "Dashboard", href: "/transport", icon: LayoutDashboard },
      { label: "Approved Students", href: "/transport/cleared", icon: CheckCircle2 },
      { label: "Rejected Students", href: "/transport/rejected", icon: AlertCircle },
    ],
    library: [
      { label: "Dashboard", href: "/library", icon: LayoutDashboard },
      { label: "Approved Students", href: "/library/cleared", icon: CheckCircle2 },
      { label: "Rejected Students", href: "/library/rejected", icon: AlertCircle },
    ],
    hostel: [
      { label: "Dashboard", href: "/hostel", icon: LayoutDashboard },
      { label: "Approved Students", href: "/hostel/cleared", icon: CheckCircle2 },
      { label: "Rejected Students", href: "/hostel/rejected", icon: AlertCircle },
    ],
    finance: [
      { label: "Dashboard", href: "/finance", icon: LayoutDashboard },
      { label: "Approved Students", href: "/finance/cleared", icon: CheckCircle2 },
      { label: "Rejected Students", href: "/finance/rejected", icon: AlertCircle },
    ],
    admin: [
      { label: "Overview", href: "/admin", icon: Shield },
      { label: "Students", href: "/admin/students", icon: User },
      { label: "Add Student", href: "/admin/add-student", icon: UserPlus },
      { label: "Requests", href: "/admin/requests", icon: FileText },
      { label: "Logistics", href: "/admin/dispatch", icon: Truck },
      { label: "Audit Log", href: "/admin/audit", icon: History },
    ],
  }

  const items = navItems[role] || []

  return (
    <>
      <Button 
        variant="ghost" 
        size="icon" 
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X /> : <Menu />}
      </Button>

      <div className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-slate-950 border-r-[3px] border-slate-200 dark:border-slate-800 transition-transform duration-300 transform lg:translate-x-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)]",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full p-6">
          <div className="flex items-center gap-3 mb-10 px-2">
            <Logo className="w-12 h-12" />
            <div>
              <h1 className="text-foreground font-bold leading-tight text-base tracking-normal">CUI Clearance</h1>
              <p className="text-xs text-muted-foreground leading-none capitalize mt-1">{role}</p>
            </div>
          </div>

          <nav className="flex-1 space-y-1.5">
            {items.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-5 py-4 rounded-2xl transition-all duration-300 group relative overflow-hidden",
                    isActive 
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-950 shadow-2xl shadow-slate-900/20" 
                      : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white"
                  )}
                  onClick={() => setIsOpen(false)}
                >
                  <Icon className={cn("w-5 h-5", isActive ? "" : "group-hover:scale-110 transition-transform")} />
                  <span className="text-[11px] font-bold uppercase tracking-[0.1em]">{item.label}</span>
                  {isActive && (
                    <motion.div 
                      layoutId="sidebar-active"
                      className="absolute right-2 w-1.5 h-1.5 rounded-full bg-primary"
                    />
                  )}
                </Link>
              )
            })}
          </nav>

          <div className="mt-auto pt-6 border-t border-slate-100 dark:border-white/5">
            <div className="px-4 py-4 mb-4 rounded-3xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-white/5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center font-bold text-xs shadow-lg shadow-primary/20 shrink-0">
                {role[0].toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold truncate capitalize text-slate-900 dark:text-white tracking-tight">{role === 'admin' ? 'System Admin' : departmentName || role}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-xs font-bold text-slate-400 truncate font-medium text-muted-foreground">Active Session</p>
                </div>
              </div>
            </div>
            
            <Link href="/settings">
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-3 mb-2 rounded-2xl text-xs font-bold font-medium text-muted-foreground text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </Button>
            </Link>

            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 rounded-2xl text-xs font-bold font-medium text-muted-foreground text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
              onClick={async () => {
                const { createClient } = await import("@/lib/supabase/client")
                const supabase = createClient()
                await supabase.auth.signOut()
                window.location.href = "/login"
              }}
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
