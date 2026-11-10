/**
 * Decorative hero artwork: faint pitch markings with a floating glass ball. Purely visual, so hidden from
 * assistive technology and never intercepts the pointer.
 */
export function PitchArt({ compact = false }: { compact?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute right-[-6%] top-1/2 -z-[1] -translate-y-1/2 ${compact ? 'w-[34rem] opacity-70' : 'w-[52rem]'} max-w-none hidden md:block`}
    >
      <svg viewBox="0 0 800 520" className="w-full" fill="none" stroke="rgba(167,243,208,0.22)" strokeWidth="2">
        <rect x="20" y="20" width="760" height="480" rx="26" />
        <path d="M400 20v480" />
        <circle cx="400" cy="260" r="86" />
        <circle cx="400" cy="260" r="4" fill="rgba(167,243,208,0.4)" />
        <rect x="20" y="150" width="120" height="220" />
        <rect x="660" y="150" width="120" height="220" />
        <rect x="20" y="205" width="48" height="110" />
        <rect x="732" y="205" width="48" height="110" />
        <path d="M140 215a64 64 0 010 90M660 215a64 64 0 000 90" />
      </svg>
      <div className="glass-ball absolute left-[60%] top-[14%] h-40 w-40 sm:h-52 sm:w-52" />
      <div className="glass-ball absolute left-[22%] top-[62%] h-20 w-20 opacity-80" style={{ animationDelay: '-6s' }} />
    </div>
  )
}
