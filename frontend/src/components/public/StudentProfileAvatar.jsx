/** Shared student avatar illustration for profile picker and booking shell. */
export const StudentProfileAvatar = ({ name, variant = "a", compact = false }) => {
  const isVariantB = variant === "b";

  return (
    <div
      className={
        compact
          ? "flex h-full w-full items-center justify-center overflow-hidden rounded-full"
          : "mx-auto flex h-[4.5rem] w-[4.5rem] items-center justify-center overflow-hidden rounded-full"
      }
      style={{ backgroundColor: "#FFE8D6" }}
      aria-hidden
    >
      <svg viewBox="0 0 80 80" className="h-full w-full" role="presentation">
        <circle cx="40" cy="30" r="16" fill={isVariantB ? "#5C4033" : "#2D2D2D"} />
        {isVariantB ? (
          <path d="M18 58 C22 44 34 40 40 40 C46 40 58 44 62 58 Z" fill="#4A90D9" />
        ) : (
          <path d="M18 58 C22 44 34 40 40 40 C46 40 58 44 62 58 Z" fill="#6BBF59" />
        )}
        {isVariantB ? (
          <path
            d="M24 28 C26 20 34 16 40 16 C48 16 54 22 56 30 C52 24 46 22 40 22 C34 22 28 24 24 28 Z"
            fill="#5C4033"
          />
        ) : null}
      </svg>
    </div>
  );
};
