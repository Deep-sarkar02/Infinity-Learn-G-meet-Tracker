import { cn } from "../../utils/cn";

export const Input = ({ label, error, icon: Icon, className, required, tone = "default", ...props }) => {
  const strict = tone === "admin" || tone === "brand";
  return (
    <label className="block space-y-1">
      {label ? (
        <span
          className={
            strict ? "text-sm font-semibold text-[#0B3C5D]" : "text-sm font-medium text-slate-600"
          }
        >
          {label}
          {required ? (
            <span className={strict ? "text-[#F4D35E]" : "text-red-500"} aria-hidden="true">
              {" "}
              *
            </span>
          ) : null}
        </span>
      ) : null}
      <div className="relative">
        {Icon ? (
          <Icon
            className={
              strict
                ? "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8BBCEB]"
                : "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            }
          />
        ) : null}
        <input
          className={cn(
            strict
              ? "w-full rounded-xl border border-[#8BBCEB]/50 bg-[#FFFFFF] px-3 py-2.5 text-sm text-[#0B3C5D] outline-none transition placeholder:text-[#1E73D8]/40 focus:border-[#1E73D8] focus:ring-2 focus:ring-[#8BBCEB]/35"
              : "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100",
            Icon ? "pl-10" : "",
            error
              ? strict
                ? "border-[#F4D35E] focus:border-[#1E73D8] focus:ring-[#F4D35E]/30"
                : "border-red-300 focus:border-red-400 focus:ring-red-100"
              : "",
            className,
          )}
          required={required}
          {...props}
        />
      </div>
      {error ? (
        <p className={strict ? "text-xs font-medium text-[#0B3C5D]" : "text-xs text-red-600"}>{error}</p>
      ) : null}
    </label>
  );
};
