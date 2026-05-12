import { cn } from "../../utils/cn";

const variants = {
  info: "bg-brand-100 text-brand-700",
  warning: "bg-accent-300/70 text-slate-800",
  neutral: "bg-slate-100 text-slate-600",
  danger: "bg-red-100 text-red-800",
};

export const Badge = ({ children, variant = "neutral", className }) => (
  <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", variants[variant], className)}>
    {children}
  </span>
);
