export function IconWindArrow({ rotationDeg, className = "w-4 h-4" }: { rotationDeg: number; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      style={{ transform: `rotate(${rotationDeg}deg)` }}
      aria-hidden
    >
      <path d="M12 19V5M12 5l-4 4M12 5l4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconGust({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M4 14h10M4 10h14M4 18h6" strokeLinecap="round" />
      <path d="M17 8l3 2-3 2V8z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconThermometer({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M10 3v12.2a4 4 0 1 0 4 0V3a2 2 0 0 0-4 0z" />
      <path d="M10 14h4" strokeLinecap="round" />
    </svg>
  );
}
