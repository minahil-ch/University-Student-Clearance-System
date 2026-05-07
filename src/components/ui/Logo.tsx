"use client"
import { useState } from 'react'
import { GraduationCap } from 'lucide-react'

export function Logo({ className = "w-12 h-12" }: { className?: string }) {
  const [errorCount, setErrorCount] = useState(0)

  // Clean, high-quality circular logo
  const logoUrl = "https://upload.wikimedia.org/wikipedia/en/c/c2/COMSATS_University_Islamabad_logo.png"

  return (
    <div className={`relative flex items-center justify-center transition-all duration-300 hover:scale-110 ${className}`}>
      {errorCount === 0 ? (
        <img 
          src={logoUrl}
          alt="CUI Logo"
          className="w-full h-full object-contain"
          onError={() => setErrorCount(1)}
        />
      ) : (
        <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-lg">
          <GraduationCap className="w-1/2 h-1/2" />
        </div>
      )}
    </div>
  )
}

