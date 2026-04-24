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

interface SidebarProps {
  role: 'admin' | 'student' | 'department' | 'transport' | 'library'
  departmentName?: string
}

export function Sidebar({ role, departmentName }: SidebarProps) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  const navItems = {
    student: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "University Form", href: "/uni-form", icon: FileText },
      { label: "Clearance Form", href: "/form", icon: FileText },
      { label: "Notifications", href: "/notifications", icon: Mail },
    ],
    department: [
      { 
        label: "Dashboard", 
        href: departmentName?.toLowerCase() === 'library' ? '/library' :
              departmentName?.toLowerCase() === 'transport' ? '/transport' :
              `/dept/${departmentPortalPathSlug(departmentName)}`, 
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
          <div className="flex items-center gap-2 mb-10">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <CheckCircle className="text-white w-5 h-5" />
            </div>
            <h1 className="font-bold text-xl tracking-tight">Clearance<span className="text-primary">Sys</span></h1>
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
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                    isActive 
                      ? "bg-primary text-white shadow-lg shadow-primary/30" 
                      : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                  )}
                  onClick={() => setIsOpen(false)}
                >
                  <Icon className={cn("w-5 h-5", isActive ? "text-white" : "group-hover:text-primary")} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="mt-auto pt-6 border-t">
            <div className="px-4 py-3 mb-4 rounded-xl bg-muted/50 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                {role[0].toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-semibold truncate capitalize">{role === 'admin' ? 'System Admin' : role}</p>
                <p className="text-xs text-muted-foreground truncate">{departmentName || (role === 'admin' ? 'All Portals' : 'General')}</p>
              </div>
            </div>
            
            <Link href="/settings">
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-3 mb-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <Settings className="w-5 h-5" />
                <span>System Settings</span>
              </Button>
            </Link>

            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={async () => {
                const { createClient } = await import("@/lib/supabase/client")
                const supabase = createClient()
                await supabase.auth.signOut()
                window.location.href = "/login"
              }}
            >
              <LogOut className="w-5 h-5" />
              <span>Sign Out</span>
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
