import { Link } from "react-router-dom";
import { motion as M } from "framer-motion";
import { FiChevronLeft } from "react-icons/fi";
import { cn } from "../../utils/cn";
import { AuthEducationPattern } from "./AuthEducationPattern";
import { pageEase } from "../motion/motionPresets";

const IL_BLUE = "#007BFF";

export const AuthOutlinedField = ({
  id,
  label,
  type = "text",
  value,
  onChange,
  autoComplete,
  required,
  trailing,
  inputClassName,
}) => (
  <div className="relative">
    <input
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      autoComplete={autoComplete}
      required={required}
      placeholder=" "
      className={cn(
        "peer w-full rounded-lg border border-[#007BFF]/80 bg-white px-4 py-[1.05rem] text-[15px] text-[#1A1A1A] outline-none transition placeholder:text-transparent focus:border-[#007BFF] focus:ring-2 focus:ring-[#007BFF]/15",
        trailing && "pr-12",
        inputClassName,
      )}
    />
    <label
      htmlFor={id}
      className="pointer-events-none absolute left-3 top-0 -translate-y-1/2 bg-white px-1 text-[13px] font-medium text-[#5C5C5C] transition peer-focus:text-[#007BFF]"
    >
      {label}
    </label>
    {trailing}
  </div>
);

export const AuthPrimaryButton = ({ children, disabled, loading, type = "submit" }) => (
  <button
    type={type}
    disabled={disabled || loading}
    className={cn(
      "mt-2 flex w-full items-center justify-center rounded-xl py-4 text-base font-semibold text-white transition",
      disabled || loading
        ? "cursor-not-allowed bg-[#C8C8C8] text-white"
        : "bg-[#007BFF] hover:bg-[#0069D9] active:bg-[#005FCC]",
    )}
  >
    {loading ? (
      <span className="flex items-center gap-2">
        <span
          className="h-5 w-5 animate-spin rounded-full border-2 border-white/35 border-t-white"
          aria-hidden
        />
        Signing in…
      </span>
    ) : (
      children
    )}
  </button>
);

export const AuthCheckbox = ({ id, checked, onChange, children }) => (
  <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
    <input
      id={id}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="mt-0.5 h-[18px] w-[18px] shrink-0 rounded border-[#007BFF]/50 text-[#007BFF] focus:ring-[#007BFF]/25"
    />
    <span className="text-[13px] leading-relaxed text-[#4A4A4A]">{children}</span>
  </label>
);

/**
 * Infinity Learn–style split login shell (blue brand panel + white form card).
 */
export const InfinityLearnLoginLayout = ({
  welcomeRole,
  welcomeSubtitle,
  backTo = "/",
  footerLinks = [],
  children,
}) => (
  <M.div
    className="relative min-h-screen overflow-hidden bg-white"
    style={{ fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.4, ease: pageEase }}
  >
    <div className="relative flex min-h-screen flex-col lg:flex-row">
      {/* Brand panel */}
      <aside
        className="relative flex shrink-0 flex-col items-center justify-center px-6 py-10 text-white lg:min-h-screen lg:w-[42%] lg:px-10 xl:w-[40%]"
        style={{ backgroundColor: IL_BLUE }}
      >
        <AuthEducationPattern />
        <div className="relative z-10 flex max-w-sm flex-col items-center text-center">
          <img
            src="/il-login-logo.png"
            alt="Infinity Learn by Sri Chaitanya"
            width={280}
            height={120}
            className="h-auto w-[min(280px,78vw)]"
          />
          <p className="mt-6 text-lg font-medium leading-snug text-white/95">
            Power up your learning journey
          </p>
        </div>
      </aside>

      {/* Form card */}
      <main className="relative flex flex-1 flex-col justify-center bg-white px-5 py-8 sm:px-10 lg:-ml-10 lg:min-h-screen lg:rounded-l-[3rem] lg:px-14 lg:py-12 lg:shadow-[-12px_0_48px_rgba(0,0,0,0.08)] xl:px-20">
        <div className="mx-auto w-full max-w-[420px]">
          <Link
            to={backTo}
            className="mb-8 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#D9D9D9] text-[#4A4A4A] transition hover:border-[#007BFF]/40 hover:text-[#007BFF]"
            aria-label="Go back"
          >
            <FiChevronLeft className="h-5 w-5" />
          </Link>

          <h1 className="text-[2rem] font-bold leading-tight tracking-tight text-[#1A1A1A] sm:text-[2.15rem]">
            Welcome{welcomeRole ? ` ${welcomeRole}` : ""}
          </h1>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-[#5C5C5C]">
            {welcomeSubtitle}
          </p>

          <div className="mt-8">{children}</div>

          {footerLinks.length ? (
            <nav className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-center text-[14px] font-medium text-[#007BFF]">
              {footerLinks.map((link, index) => (
                <span key={link.to + link.label} className="inline-flex items-center gap-5">
                  {index > 0 ? (
                    <span className="hidden text-[#D0D0D0] sm:inline" aria-hidden>
                      |
                    </span>
                  ) : null}
                  {link.external ? (
                    <a href={link.to} className="transition hover:underline">
                      {link.label}
                    </a>
                  ) : (
                    <Link to={link.to} className="transition hover:underline">
                      {link.label}
                    </Link>
                  )}
                </span>
              ))}
            </nav>
          ) : null}
        </div>
      </main>
    </div>
  </M.div>
);
