import { motion as M } from "framer-motion";
import { cn } from "../../utils/cn";
import { AppLogo } from "../brand/AppLogo";

/** Public / student booking — strict 7-color palette only */
export const BookingHero = ({ eyebrow, title, description, children, className, showBrandLogo = true }) => (
  <M.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    className={cn(
      "relative overflow-hidden rounded-3xl border border-[#8BBCEB]/35 bg-gradient-to-br from-[#0B3C5D] via-[#1E73D8] to-[#8BBCEB] p-6 text-[#FFFFFF] shadow-[0_24px_56px_-24px_rgba(11,60,93,0.45)] md:p-8",
      className,
    )}
  >
    <div
      className="pointer-events-none absolute -left-6 bottom-0 h-36 w-36 rounded-full bg-[#F4D35E]/15 blur-2xl"
      aria-hidden
    />
    <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        {showBrandLogo ? (
          <M.div
            className="mb-4"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.08, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            <AppLogo size="lg" linkTo="/" className="rounded-lg focus-visible:ring-offset-[#0B3C5D]" />
          </M.div>
        ) : null}
        {eyebrow ? (
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#F4D35E]">{eyebrow}</p>
        ) : null}
        <h1 className="mt-2 font-heading text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
        {description ? (
          <p className="mt-3 text-sm font-medium leading-relaxed text-[#FFFFFF]/93">{description}</p>
        ) : null}
      </div>
      {children ? <div className="flex shrink-0 flex-wrap gap-2">{children}</div> : null}
    </div>
  </M.div>
);

export const BookingPanel = ({ children, className, ...rest }) => (
  <M.section
    initial={{ opacity: 0, y: 12 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-40px" }}
    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    className={cn(
      "rounded-3xl border border-[#8BBCEB]/35 bg-[#FFFFFF] p-6 shadow-[0_14px_40px_-22px_rgba(11,60,93,0.28)]",
      className,
    )}
    {...rest}
  >
    {children}
  </M.section>
);

export const BookingNotice = ({ title, children }) => (
  <div
    className="relative overflow-hidden rounded-2xl border border-[#F4D35E]/50 bg-[#FFFFFF] p-4 shadow-[0_8px_28px_-12px_rgba(244,211,94,0.35)] md:p-5"
    role="note"
  >
    <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-[#F4D35E] to-[#1E73D8]" />
    <div className="pl-4">
      <p className="font-heading text-sm font-bold text-[#0B3C5D]">{title}</p>
      <div className="mt-2 text-sm font-medium leading-relaxed text-[#1E73D8]/90">{children}</div>
    </div>
  </div>
);
