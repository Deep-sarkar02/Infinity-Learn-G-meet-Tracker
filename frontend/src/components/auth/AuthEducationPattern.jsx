import { useId } from "react";

/** Faded educational icons on the Infinity Learn login blue panel. */
export const AuthEducationPattern = ({ className = "" }) => {
  const uid = useId().replace(/:/g, "");
  const pid = `il-edu-pattern-${uid}`;

  return (
    <svg
      className={`pointer-events-none absolute inset-0 h-full w-full text-[#FFFFFF] ${className}`}
      aria-hidden
    >
      <defs>
        <pattern id={pid} width="180" height="180" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.14">
            <circle cx="28" cy="32" r="10" />
            <path d="M22 48 L34 48 M28 48 L28 58" />
            <rect x="72" y="18" width="22" height="14" rx="2" />
            <path d="M76 32 L90 32" />
            <path d="M120 24 L132 36 M132 24 L120 36" />
            <path d="M18 108 L38 108 M28 98 L28 118" />
            <path d="M70 92 C70 80 94 80 94 92 C94 104 70 104 70 92 Z" />
            <path d="M118 96 L138 96 M128 86 L128 106" />
            <path d="M150 28 L162 40 M162 28 L150 40" opacity="0.5" />
          </g>
          <text
            x="108"
            y="142"
            fill="currentColor"
            fontSize="9"
            fontWeight="700"
            opacity="0.1"
            fontFamily="Inter, sans-serif"
          >
            ENG
          </text>
          <text
            x="44"
            y="156"
            fill="currentColor"
            fontSize="11"
            fontWeight="600"
            opacity="0.1"
            fontFamily="Inter, sans-serif"
          >
            √x
          </text>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${pid})`} />
    </svg>
  );
};
