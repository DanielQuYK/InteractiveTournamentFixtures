/** Small line icons for navigation and status; each is decorative (the text beside it carries the meaning). */
const PATHS: Record<string, string> = {
  group: 'M4 6h16M4 12h16M4 18h10',
  knockout: 'M3 5h5v4H3zM3 15h5v4H3zM16 10h5v4h-5zM8 7h3v10H8M11 12h5',
  leaderboard: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0zM7 6H4a3 3 0 003 4M17 6h3a3 3 0 01-3 4',
  stats: 'M5 20V10M12 20V4M19 20v-7',
  simulation: 'M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z',
  back: 'M15 6l-6 6 6 6',
  search: 'M11 4a7 7 0 100 14 7 7 0 000-14zM21 21l-4.3-4.3',
  clock: 'M12 7v5l3 2M12 3a9 9 0 100 18 9 9 0 000-18z',
  pin: 'M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11zM12 12a2 2 0 100-4 2 2 0 000 4z',
  school: 'M3 9l9-5 9 5-9 5zM7 11.5V16c0 1.5 2.2 3 5 3s5-1.5 5-3v-4.5',
  ball: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 8l3 2-1 3.5h-4L9 10zM12 3v5M15 10l5-1.5M14 13.5l3 4M10 13.5l-3 4M9 10L4 8.5',
  trophy: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0z',
  arrow: 'M5 12h14M13 6l6 6-6 6',
}

export function Icon({ name, size = 16, className = '' }: { name: keyof typeof PATHS | string; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d={PATHS[name] ?? ''} />
    </svg>
  )
}
