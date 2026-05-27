import { cn } from "../../utils/cn";

/** Compact hero for non-dashboard admin routes — palette only. */
export const AdminPageHero = ({ eyebrow, title, description, children, className }) => (
  <div
    className={cn(
      "relative overflow-hidden rounded-2xl border border-[#8BBCEB]/35 bg-gradient-to-br from-[#0B3C5D] via-[#1E73D8] to-[#8BBCEB] p-4 text-[#FFFFFF] shadow-[0_20px_48px_-18px_rgba(11,60,93,0.42)] md:p-5",
      className,
    )}
  >
    <div
      className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#F4D35E]/15 blur-2xl"
      aria-hidden
    />
    <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#F4D35E]">{eyebrow}</p>
        ) : null}
        <h1 className="mt-2 font-heading text-xl font-bold tracking-tight md:text-2xl">{title}</h1>
        {description ? (
          <p className="mt-2 text-sm font-medium leading-relaxed text-[#FFFFFF]/92">{description}</p>
        ) : null}
      </div>
      {children ? <div className="flex shrink-0 flex-wrap gap-2 md:justify-end">{children}</div> : null}
    </div>
  </div>
);

/** White panel — charts / forms */
export const AdminPanel = ({ children, className }) => (
  <section
    className={cn(
      "rounded-2xl border border-[#8BBCEB]/35 bg-[#FFFFFF] p-4 shadow-[0_12px_36px_-20px_rgba(11,60,93,0.28)] md:p-5",
      className,
    )}
  >
    {children}
  </section>
);
