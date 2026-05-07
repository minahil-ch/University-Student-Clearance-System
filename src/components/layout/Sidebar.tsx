"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { departmentPortalPathSlug } from "@/lib/departmentKeys"
import { 
  LayoutDashboard, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Settings, 
  LogOut,
  User,
  Shield,
  Truck,
  BookOpen,
  Mail,
  Menu,
  X
} from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { Logo } from "@/components/ui/Logo"

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
      { 
        label: "Dashboard", 
        href: departmentName?.toLowerCase() === 'library' ? '/library' :
              departmentName?.toLowerCase() === 'transport' ? '/transport' :
              departmentName?.toLowerCase() === 'hostel' ? '/hostel' :
              departmentName?.toLowerCase() === 'finance' ? '/finance' :
              `/${departmentPortalPathSlug(departmentName)}`, 
        icon: LayoutDashboard 
      },
      { label: "History", href: "/history", icon: FileText },
    ],
    transport: [
      { label: "Dashboard", href: "/transport", icon: Truck },
      { label: "History", href: "/history", icon: FileText },
    ],
    library: [
      { label: "Dashboard", href: "/library", icon: BookOpen },
      { label: "History", href: "/history", icon: FileText },
    ],
    hostel: [
      { label: "Dashboard", href: "/hostel", icon: LayoutDashboard },
      { label: "History", href: "/history", icon: FileText },
    ],
    finance: [
      { label: "Dashboard", href: "/finance", icon: LayoutDashboard },
      { label: "History", href: "/history", icon: FileText },
    ],
    admin: [
      { label: "Overview", href: "/admin", icon: Shield },
      { label: "Students", href: "/admin/students", icon: User },
      { label: "Staff Requests", href: "/admin/requests", icon: AlertCircle },
      { label: "Reports", href: "/admin/reports", icon: FileText },
      { label: "Audit Logs", href: "/admin/audit", icon: Shield },
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
        "fixed inset-y-0 left-0 z-40 w-64 glass-card border-r transition-transform duration-300 transform lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full p-6">
          <div className="flex items-center gap-3 mb-10 px-2">
            <Logo className="w-12 h-12" />
            <div>
              <h1 className="text-slate-900 dark:text-white font-black leading-tight text-sm tracking-tight italic">COMSATS</h1>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">Vehari Campus</p>
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
                  <span className="text-[11px] font-black uppercase tracking-[0.1em]">{item.label}</span>
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
              <div className="w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center font-black text-xs shadow-lg shadow-primary/20 shrink-0">
                {role[0].toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-black truncate capitalize text-slate-900 dark:text-white uppercase tracking-tight">{role === 'admin' ? 'System Admin' : departmentName || role}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-[9px] font-bold text-slate-400 truncate uppercase tracking-widest">Active Session</p>
                </div>
              </div>
            </div>
            
            <Link href="/settings">
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-3 mb-2 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </Button>
            </Link>

            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
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
