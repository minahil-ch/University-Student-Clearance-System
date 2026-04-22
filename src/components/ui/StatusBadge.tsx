import { cn } from "@/lib/utils"
import { CheckCircle, Clock, AlertTriangle } from "lucide-react"

export function StatusBadge({ status, className }: { status: 'cleared' | 'pending' | 'issue', className?: string }) {
  const configs = {
    cleared: {
      label: "Cleared",
      className: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
      icon: CheckCircle
    },
    pending: {
      label: "Pending",
      className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
      icon: Clock
    },
    issue: {
      label: "Issue",
      className: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20",
      icon: AlertTriangle
    }
  }

  const { label, className: configClassName, icon: Icon } = configs[status]

  return (
    <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors", configClassName, className)}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </div>
  )
}
