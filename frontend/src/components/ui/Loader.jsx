export const Loader = ({ label = "Loading...", variant = "default" }) => {
  const admin = variant === "admin";
  const il = variant === "il";
  return (
    <div
      className={
        il
          ? "flex items-center gap-2 text-sm font-medium text-[#1A1A1A]"
          : admin
            ? "flex items-center gap-2 text-sm font-medium text-[#0B3C5D]"
            : "flex items-center gap-2 text-sm text-slate-500"
      }
    >
      <span
        className={
          il
            ? "h-4 w-4 animate-spin rounded-full border-2 border-[#B8D9F8] border-t-[#007BFF]"
            : admin
              ? "h-4 w-4 animate-spin rounded-full border-2 border-[#8BBCEB] border-t-[#1E73D8]"
              : "h-4 w-4 animate-spin rounded-full border-2 border-brand-300 border-t-brand-700"
        }
      />
      <span>{label}</span>
    </div>
  );
};
