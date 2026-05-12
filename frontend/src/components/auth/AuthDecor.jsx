import { useId } from "react";

/** White line grid for gradient panels — palette-safe (white only). Unique pattern id per instance. */
export const AuthGridPattern = ({ className = "" }) => {
  const uid = useId().replace(/:/g, "");
  const pid = `auth-grid-${uid}`;
  return (
    <svg
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      aria-hidden
    >
      <defs>
        <pattern id={pid} width="28" height="28" patternUnits="userSpaceOnUse">
          <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#FFFFFF" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${pid})`} />
    </svg>
  );
};

/** Soft dots on light grey backgrounds — uses only #8BBCEB. */
export const AuthDotField = ({ className = "" }) => {
  const uid = useId().replace(/:/g, "");
  const pid = `auth-dots-${uid}`;
  return (
    <svg className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} aria-hidden>
      <defs>
        <pattern id={pid} width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.25" fill="#8BBCEB" fillOpacity="0.22" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${pid})`} />
    </svg>
  );
};

/** Large arc rings for hero depth — stroke #8BBCEB at low opacity only. */
export const AuthArcRings = ({ className = "" }) => (
  <svg
    className={`pointer-events-none absolute -right-20 bottom-0 h-[min(90vh,720px)] w-[min(90vw,520px)] text-[#8BBCEB] ${className}`}
    viewBox="0 0 400 400"
    aria-hidden
  >
    <circle cx="200" cy="200" r="180" fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="1" />
    <circle cx="200" cy="200" r="140" fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="1" />
    <circle cx="200" cy="200" r="100" fill="none" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />
  </svg>
);
