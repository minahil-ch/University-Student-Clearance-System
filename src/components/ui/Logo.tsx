import { useState } from 'react'
import { GraduationCap } from 'lucide-react'

export function Logo({ className = "w-12 h-12" }: { className?: string }) {
  const [error, setError] = useState(false)

  return (
    <div className={`relative flex items-center justify-center p-1 rounded-2xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm shadow-sm ${className}`}>
      {!error ? (
        <img 
          src="/logo.png" 
          alt="CUI Logo"
          className="w-full h-full object-contain"
          onError={() => setError(true)}
        />
      ) : (
        <img 
          src="https://upload.wikimedia.org/wikipedia/en/c/c2/COMSATS_University_Islamabad_logo.png" 
          alt="CUI Logo Fallback"
          className="w-full h-full object-contain"
          onError={(e) => {
            // Final fallback to the GraduationCap if even the remote URL fails
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
          }}
        />
      )}
    </div>
  )
}
