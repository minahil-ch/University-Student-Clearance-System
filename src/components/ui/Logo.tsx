"use client"

export function Logo({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center transition-all duration-300 hover:scale-105 ${className}`}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md select-none animate-fade-in" xmlns="http://www.w3.org/2000/svg">
        {/* Outer Oval Border (COMSATS Seal is classically oval/circular) */}
        <circle cx="50" cy="50" r="48" fill="#4B1248" stroke="#E0A72E" strokeWidth="2.5" />
        <circle cx="50" cy="50" r="44" fill="none" stroke="white" strokeWidth="0.75" strokeDasharray="2, 2" opacity="0.6" />
        
        {/* Curved Text Path for Top */}
        <path id="topTextPath" d="M 16 50 A 34 34 0 1 1 84 50" fill="none" />
        
        {/* Curved Text Path for Bottom */}
        <path id="bottomTextPath" d="M 84 50 A 34 34 0 0 1 16 50" fill="none" />

        <text className="fill-white font-sans font-extrabold" fontSize="6.2" letterSpacing="0.8">
          <textPath href="#topTextPath" startOffset="50%" textAnchor="middle">
            COMSATS UNIVERSITY ISLAMABAD
          </textPath>
        </text>

        <text className="fill-[#E0A72E] font-sans font-extrabold" fontSize="5.2" letterSpacing="1.2">
          <textPath href="#bottomTextPath" startOffset="50%" textAnchor="middle">
            • VEHARI CAMPUS •
          </textPath>
        </text>

        {/* Inner Golden Circle */}
        <circle cx="50" cy="50" r="24" fill="#3D0B3A" stroke="#E0A72E" strokeWidth="1.5" />

        {/* Crescent Moon & Star at the Top of Inner Circle */}
        <path d="M 50 31.5 A 4 4 0 0 0 54.5 35.5 A 3.5 3.5 0 0 1 50 32.5 Z" fill="white" />
        <polygon points="53,30.5 53.6,31.7 54.9,31.7 53.8,32.5 54.2,33.7 53,32.9 51.8,33.7 52.2,32.5 51.1,31.7 52.4,31.7" fill="#E0A72E" />

        {/* Central Globe Lines */}
        <path d="M 32 50 Q 50 41 68 50 Q 50 59 32 50 Z" fill="none" stroke="white" strokeWidth="0.75" opacity="0.8" />
        <path d="M 50 32 Q 41 50 50 68 Q 59 50 50 32 Z" fill="none" stroke="white" strokeWidth="0.75" opacity="0.8" />
        <line x1="32" y1="50" x2="68" y2="50" stroke="white" strokeWidth="0.75" opacity="0.8" />
        <line x1="50" y1="32" x2="50" y2="68" stroke="white" strokeWidth="0.75" opacity="0.8" />

        {/* Open Book of Knowledge in lower middle */}
        <path d="M 38 56 C 44 53 50 55 50 56 C 50 55 56 53 62 56 L 62 62 C 56 59 50 61 50 62 C 50 61 44 59 38 62 Z" fill="white" />
        <path d="M 38 56 C 44 53 50 55 50 56 M 50 56 C 50 55 56 53 62 56" fill="none" stroke="#4B1248" strokeWidth="0.5" />
        <line x1="50" y1="56" x2="50" y2="62" stroke="#4B1248" strokeWidth="0.75" />

        {/* Small Laurel leaves for Academic Excellence */}
        <path d="M 29 55 Q 26 50 28 45 Q 30 50 29 55 Z" fill="#E0A72E" opacity="0.8" />
        <path d="M 71 55 Q 74 50 72 45 Q 70 50 71 55 Z" fill="#E0A72E" opacity="0.8" />
      </svg>
    </div>
  )
}
