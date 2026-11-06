import { useEffect, useState } from "react"
import { usePrefersReducedMotion } from "../lib/hooks"

/** A floating button that appears after scrolling down and returns to the top. */
export function BackToTop() {
  const [visible, setVisible] = useState(false)
  const reduced = usePrefersReducedMotion()
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])
  if (!visible) return null
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" })}
      aria-label="Back to top"
      title="Back to top"
      className="liquid fixed bottom-5 right-5 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-emerald-900/20 bg-emerald-900 text-white shadow-lg"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 15V3M4 8l5-5 5 5" />
      </svg>
    </button>
  )
}
