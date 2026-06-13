export function BrandMark({ size = 42, title = "Dugout Lineup" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
      style={{ flexShrink: 0, display: "block" }}
    >
      <title>{title}</title>
      <rect x="2" y="2" width="96" height="96" rx="22" fill="#0f1f3d" stroke="#f5c842" strokeWidth="3" />
      <rect x="30" y="30" width="40" height="40" rx="4" transform="rotate(45 50 50)" fill="#f5c842" />
      <circle cx="50" cy="46" r="11" fill="#ffffff" stroke="#0f1f3d" strokeWidth="1.5" />
      <path d="M44 41 Q50 46 44 51 M56 41 Q50 46 56 51" stroke="#c8102e" strokeWidth="1.2" fill="none" />
      <path d="M50 66 l6 5 v6 h-12 v-6 z" fill="#c8102e" />
    </svg>
  );
}