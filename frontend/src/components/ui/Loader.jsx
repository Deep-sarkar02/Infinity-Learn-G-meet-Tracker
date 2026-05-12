export const Loader = ({ label = "Loading...", variant = "default" }) => {
  const admin = variant === "admin";
  return (
    <div
      className={
        admin ? "flex items-center gap-2 text-sm font-medium text-[#0B3C5D]" : "flex items-center gap-2 text-sm text-slate-500"
      }
    >
      <span
        className={
          admin
            ? "h-4 w-4 animate-spin rounded-full border-2 border-[#8BBCEB] border-t-[#1E73D8]"
            : "h-4 w-4 animate-spin rounded-full border-2 border-brand-300 border-t-brand-700"
        }
      />
      <span>{label}</span>
    </div>
  );
};
