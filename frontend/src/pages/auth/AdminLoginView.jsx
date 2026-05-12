import { useState } from "react";
import { Link } from "react-router-dom";
import { motion as M } from "framer-motion";
import {
  FiActivity,
  FiArrowRight,
  FiCheck,
  FiEye,
  FiEyeOff,
  FiLock,
  FiMail,
  FiShield,
} from "react-icons/fi";
import { cn } from "../../utils/cn";
import { AppLogo } from "../../components/brand/AppLogo";
import { AuthArcRings, AuthDotField, AuthGridPattern } from "../../components/auth/AuthDecor";
import { pageEase } from "../../components/motion/motionPresets";

const field =
  "w-full rounded-xl border border-[#8BBCEB]/50 bg-[#FFFFFF] py-3.5 pl-12 pr-4 text-base text-[#0B3C5D] outline-none transition placeholder:text-[#1E73D8]/35 focus:border-[#1E73D8] focus:ring-2 focus:ring-[#8BBCEB]/35";

const steps = [
  { label: "Connect", tone: "gold" },
  { label: "Verify", tone: "blue" },
  { label: "Access", tone: "green" },
];

export const AdminLoginView = ({ onLogin, loading }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    onLogin({ email: email.trim(), password });
  };

  return (
    <M.div
      className="relative min-h-screen overflow-hidden bg-[#F5F5F5]"
      style={{ fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: pageEase }}
    >
      <AuthDotField className="opacity-[0.65]" />
      <div
        className="pointer-events-none absolute -left-32 top-1/3 h-[420px] w-[420px] rounded-full bg-[#8BBCEB]/18 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 right-0 h-[380px] w-[380px] rounded-full bg-[#F4D35E]/14 blur-3xl"
        aria-hidden
      />

      <div className="relative z-10 flex min-h-screen flex-col lg:flex-row">
        {/* Mobile hero */}
        <div className="relative overflow-hidden border-b border-[#8BBCEB]/30 bg-gradient-to-br from-[#0B3C5D] via-[#1E73D8] to-[#0B3C5D] px-5 py-8 text-[#FFFFFF] lg:hidden">
          <AuthGridPattern className="opacity-[0.12]" />
          <div
            className="pointer-events-none absolute -right-10 top-0 h-40 w-40 rounded-full bg-[#F4D35E]/20 blur-2xl"
            aria-hidden
          />
          <div className="relative z-10">
            <AppLogo size="sm" className="mb-4 focus-visible:ring-offset-[#0B3C5D]" linkTo="/" />
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#FFFFFF]/20 bg-[#FFFFFF]/10">
                  <FiShield className="h-6 w-6 text-[#F4D35E]" />
                </span>
                <div>
                  <p className="text-lg font-extrabold tracking-tight">MeetReserve</p>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8BBCEB]">Admin gateway</p>
                </div>
              </div>
              <span className="rounded-full border border-[#25D366]/50 bg-[#25D366]/15 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[#25D366]">
                Secure
              </span>
            </div>
            <h1 className="mt-6 font-heading text-2xl font-bold leading-tight">
              Operations
              <span className="text-[#F4D35E]"> console</span>
            </h1>
            <p className="mt-2 max-w-sm text-sm font-medium text-[#8BBCEB]/95">
              Authorized personnel only. All access attempts are logged.
            </p>
          </div>
        </div>

        {/* Desktop left column */}
        <div className="relative hidden overflow-hidden lg:flex lg:min-h-screen lg:w-[48%] lg:max-w-xl lg:flex-col lg:justify-center lg:px-12 xl:px-16">
          <div className="absolute inset-0 bg-gradient-to-b from-[#0B3C5D] via-[#1E73D8] to-[#0B3C5D]" />
          <AuthGridPattern className="opacity-[0.11]" />
          <AuthArcRings />
          <div
            className="pointer-events-none absolute left-8 top-24 h-px w-24 bg-gradient-to-r from-[#F4D35E] to-transparent"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -left-32 top-1/3 h-80 w-80 rounded-full bg-[#8BBCEB]/22 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute bottom-12 right-8 h-64 w-64 rounded-full bg-[#F4D35E]/12 blur-3xl"
            aria-hidden
          />

          <div className="relative z-10 space-y-12 text-[#FFFFFF]">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <AppLogo size="lg" className="shrink-0 focus-visible:ring-offset-[#0B3C5D]" linkTo="/" />
              <div className="hidden h-[4.5rem] w-px bg-[#FFFFFF]/15 sm:block" aria-hidden />
              <div>
                <p className="text-2xl font-extrabold tracking-tight">MeetReserve</p>
                <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.28em] text-[#8BBCEB]">Administration</p>
                <div className="mt-4 flex gap-2">
                  {steps.map((s, i) => (
                    <div key={s.label} className="flex items-center gap-2">
                      {i > 0 ? <span className="text-[#8BBCEB]/50">→</span> : null}
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider",
                          s.tone === "gold" && "bg-[#F4D35E]/25 text-[#F4D35E]",
                          s.tone === "blue" && "bg-[#8BBCEB]/25 text-[#8BBCEB]",
                          s.tone === "green" && "bg-[#25D366]/20 text-[#25D366]",
                        )}
                      >
                        {s.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <h2 className="font-heading text-4xl font-bold leading-[1.1] tracking-tight xl:text-[2.75rem]">
                Command
                <br />
                <span className="text-[#8BBCEB]">your campus</span>
                <br />
                <span className="text-[#F4D35E]">booking stack</span>
              </h2>
              <p className="mt-6 max-w-md text-base font-medium leading-relaxed text-[#8BBCEB]/95">
                Teachers, rosters, windows, and reporting — one authenticated surface for your operations team.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#8BBCEB]/35 bg-[#FFFFFF]/10 p-5 backdrop-blur-md">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#F4D35E]/20">
                  <FiLock className="h-5 w-5 text-[#F4D35E]" />
                </div>
                <p className="font-bold text-[#FFFFFF]">Zero-trust ready</p>
                <p className="mt-2 text-sm font-medium leading-snug text-[#8BBCEB]/88">
                  Encrypted session handshake on every login.
                </p>
              </div>
              <div className="rounded-2xl border border-[#8BBCEB]/35 bg-[#FFFFFF]/10 p-5 backdrop-blur-md">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#F4D35E]/20">
                  <FiActivity className="h-5 w-5 text-[#F4D35E]" />
                </div>
                <p className="font-bold text-[#FFFFFF]">Audit visibility</p>
                <p className="mt-2 text-sm font-medium leading-snug text-[#8BBCEB]/88">
                  Policy-friendly trails for sensitive actions.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-2xl border border-[#25D366]/40 bg-[#0B3C5D]/50 px-5 py-4 backdrop-blur-md">
              <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#25D366]/25">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#25D366]/25 opacity-50" />
                <FiCheck className="relative h-5 w-5 text-[#25D366]" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#8BBCEB]">Channel status</p>
                <p className="mt-0.5 text-sm font-bold text-[#FFFFFF]">Verified path — you may authenticate</p>
              </div>
            </div>

            {/* Decorative signal bars — heights only, palette colors */}
            <div className="flex h-10 items-end gap-1.5 opacity-90" aria-hidden>
              <span className="w-2 rounded-sm bg-[#8BBCEB]" style={{ height: "35%" }} />
              <span className="w-2 rounded-sm bg-[#8BBCEB]" style={{ height: "55%" }} />
              <span className="w-2 rounded-sm bg-[#F4D35E]" style={{ height: "75%" }} />
              <span className="w-2 rounded-sm bg-[#1E73D8]" style={{ height: "100%" }} />
              <span className="w-2 rounded-sm bg-[#25D366]" style={{ height: "65%" }} />
            </div>
          </div>
        </div>

        {/* Form column */}
        <div className="flex flex-1 flex-col justify-center px-4 py-10 sm:px-8 lg:px-10 xl:px-14">
          <div className="mx-auto w-full max-w-[440px]">
            <div className="relative">
              <div
                className="pointer-events-none absolute -inset-px rounded-[1.35rem] bg-gradient-to-br from-[#F4D35E]/40 via-[#8BBCEB]/30 to-[#1E73D8]/35 opacity-75 blur-[2px]"
                aria-hidden
              />
              <div className="relative overflow-hidden rounded-3xl border border-[#8BBCEB]/45 bg-[#FFFFFF] shadow-[0_32px_64px_-28px_rgba(11,60,93,0.35)]">
                <div className="h-1.5 w-full bg-gradient-to-r from-[#F4D35E] via-[#1E73D8] to-[#8BBCEB]" />
                <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full border border-[#8BBCEB]/20 bg-[#F5F5F5]/90" aria-hidden />
                <div className="relative p-8 sm:p-10">
                  <AppLogo size="md" className="mb-6" linkTo="/" />
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#1E73D8]">Authenticate</p>
                      <h3 className="mt-2 font-heading text-3xl font-bold tracking-tight text-[#0B3C5D]">
                        Admin sign-in
                      </h3>
                      <p className="mt-2 text-sm font-medium text-[#1E73D8]/85">
                        Use your issued admin email and password.
                      </p>
                    </div>
                  </div>

                  <form className="mt-10 space-y-5" onSubmit={handleSubmit}>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#0B3C5D]">
                        Email address
                      </label>
                      <div className="relative">
                        <FiMail
                          className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#8BBCEB]"
                          aria-hidden
                        />
                        <input
                          className={field}
                          type="email"
                          autoComplete="email"
                          placeholder="name@meetreserve.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#0B3C5D]">
                        Password
                      </label>
                      <div className="relative">
                        <FiLock
                          className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#8BBCEB]"
                          aria-hidden
                        />
                        <input
                          className={cn(field, "pr-12")}
                          type={showPassword ? "text" : "password"}
                          autoComplete="current-password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-[#1E73D8] hover:bg-[#F5F5F5]"
                          onClick={() => setShowPassword((v) => !v)}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0B3C5D] py-4 text-base font-bold text-[#FFFFFF] shadow-[0_14px_36px_-12px_rgba(11,60,93,0.55)] transition hover:bg-[#1E73D8] disabled:opacity-60"
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <span
                            className="h-5 w-5 animate-spin rounded-full border-2 border-[#8BBCEB] border-t-[#FFFFFF]"
                            aria-hidden
                          />
                          Authenticating…
                        </span>
                      ) : (
                        <>
                          Enter console
                          <FiArrowRight className="h-5 w-5" aria-hidden />
                        </>
                      )}
                    </button>
                  </form>

                </div>
              </div>
            </div>

            <nav className="mt-10 flex flex-wrap items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#1E73D8]/70">
              <Link to="/" className="rounded-full px-3 py-1.5 transition hover:bg-[#F5F5F5] hover:text-[#0B3C5D]">
                Public site
              </Link>
              <span aria-hidden className="text-[#8BBCEB]">
                ·
              </span>
              <a href="#" className="rounded-full px-3 py-1.5 transition hover:bg-[#F5F5F5] hover:text-[#0B3C5D]">
                Status
              </a>
              <span aria-hidden className="text-[#8BBCEB]">
                ·
              </span>
              <a href="#" className="rounded-full px-3 py-1.5 transition hover:bg-[#F5F5F5] hover:text-[#0B3C5D]">
                Help desk
              </a>
            </nav>
          </div>
        </div>
      </div>
    </M.div>
  );
};
