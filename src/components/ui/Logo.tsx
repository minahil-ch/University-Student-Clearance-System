import { useState } from 'react'
import { GraduationCap } from 'lucide-react'

export function Logo({ className = "w-12 h-12" }: { className?: string }) {
  const [error, setError] = useState(false)

  return (
    <div className={`relative flex items-center justify-center p-1 rounded-2xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm shadow-sm ${className}`}>
      {!error ? (
        <img 
          src="https://www.comsats.edu.pk/img/comsats-logo.png" 
          alt="CUI Logo"
          className="w-full h-full object-contain"
          onError={() => setError(true)}
        />
      ) : (
        <div className="w-full h-full rounded-2xl bg-primary flex items-center justify-center text-white shadow-xl">
          <GraduationCap className="w-1/2 h-1/2" />
        </div>
      )}
    </div>
  )
}
