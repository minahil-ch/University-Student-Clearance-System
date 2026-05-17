"use client"
import { useState } from 'react'
import { GraduationCap } from 'lucide-react'

export function Logo({ className = "w-12 h-12" }: { className?: string }) {
  const [errorCount, setErrorCount] = useState(0)

  // Use the specific Vehari campus logo for maximum reliability and local relevance
  const logoUrl = "https://cuivehari.edu.pk/wp-content/uploads/2021/04/comsats-logo.png"

  return (
    <div className={`relative flex items-center justify-center transition-all duration-300 hover:scale-110 ${className}`}>
      {errorCount === 0 ? (
        <img 
          src="https://upload.wikimedia.org/wikipedia/en/5/52/COMSATS_University_Islamabad_logo.png"
          alt="CUI Logo"
          className="w-full h-full object-contain"
          loading="eager"
          onError={() => setErrorCount(1)}
        />
      ) : (
        /* Professional SVG Fallback - Represents the CUI logo structure */
        <div className="w-full h-full rounded-full bg-white border-2 border-primary/20 flex items-center justify-center p-1 shadow-inner overflow-hidden">
           <div className="w-full h-full rounded-full bg-primary flex items-center justify-center text-white relative">
              <GraduationCap className="w-1/2 h-1/2 relative z-10" />
              {/* Abstract decorative elements to make it look like a seal */}
              <div className="absolute inset-0 border-2 border-white/20 rounded-full scale-90" />
              <div className="absolute inset-0 border border-white/10 rounded-full scale-110" />
           </div>
        </div>
      )}
    </div>
  )
}

