import { useState } from "react";
import { motion as M } from "framer-motion";
import { FiArrowRight, FiEye, FiEyeOff, FiLock, FiMail, FiUsers } from "react-icons/fi";
import { cn } from "../../utils/cn";
import { AppLogo } from "../../components/brand/AppLogo";
import { AuthDotField, AuthGridPattern } from "../../components/auth/AuthDecor";
import { pageEase } from "../../components/motion/motionPresets";

const field =
  "w-full rounded-xl border border-[#8BBCEB]/50 bg-[#FFFFFF] py-3.5 pl-12 pr-4 text-base text-[#0B3C5D] outline-none transition placeholder:text-[#1E73D8]/35 focus:border-[#1E73D8] focus:ring-2 focus:ring-[#8BBCEB]/35";

export const TeacherLoginView = ({
  form,
  setForm,
  onSubmit,
  loading,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <M.div
      className="relative flex min-h-screen flex-col bg-[#F5F5F5] lg:flex-row"
      style={{ fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: pageEase }}
    >
      <AuthDotField className="opacity-60 lg:opacity-100" />
      <div className="relative border-b border-[#8BBCEB]/25 bg-gradient-to-r from-[#1E73D8] to-[#0B3C5D] px-5 py-7 text-[#FFFFFF] lg:hidden">
        <AuthGridPattern className="opacity-[0.1]" />
        <div className="relative z-10">
          <AppLogo size="md" className="mb-3 focus-visible:ring-offset-[#0B3C5D]" linkTo="/" />
          <p className="text-xl font-extrabold tracking-tight">MeetReserve</p>
          <p className="mt-2 text-2xl font-bold leading-tight">Welcome back, Teacher</p>
          <div className="mt-4 flex gap-2">
            <span className="rounded-full bg-[#F4D35E]/25 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#F4D35E]">
              Faculty
            </span>
          </div>
        </div>
      </div>

      <div className="relative hidden overflow-hidden lg:flex lg:min-h-screen lg:w-[52%] lg:flex-col lg:justify-center lg:px-14 xl:px-20">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0B3C5D] via-[#1E73D8] to-[#8BBCEB]" />
        <AuthGridPattern className="opacity-[0.11]" />
        <div
          className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-[#F4D35E]/22 blur-[70px]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-24 -left-16 h-[28rem] w-[28rem] rounded-full bg-[#8BBCEB]/30 blur-[80px]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-2/5 bg-gradient-to-t from-[#0B3C5D]/40 to-transparent"
          aria-hidden
        />

        <M.div
          className="relative z-10 max-w-xl space-y-8 text-[#FFFFFF]"
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, ease: pageEase, delay: 0.08 }}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <AppLogo size="lg" className="focus-visible:ring-offset-[#0B3C5D]" linkTo="/" />
            <div className="hidden h-12 w-px bg-[#FFFFFF]/20 sm:block" aria-hidden />
            <div>
              <p className="text-2xl font-extrabold tracking-tight">MeetReserve</p>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#8BBCEB]">Instructor access</p>
            </div>
          </div>

          <h1 className="text-4xl font-bold leading-[1.08] tracking-tight md:text-5xl xl:text-[3.25rem]">
            Welcome back,
            <br />
            <span className="text-[#F4D35E]">Teacher</span>
          </h1>
          <p className="max-w-md text-lg font-medium leading-relaxed text-[#FFFFFF]/93">
            Your studio for availability, bookings, and weekly rhythm — without the clutter.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <div className="flex items-center gap-2 rounded-xl border border-[#FFFFFF]/15 bg-[#0B3C5D]/25 px-4 py-3 backdrop-blur-sm">
              <FiUsers className="h-5 w-5 text-[#8BBCEB]" />
              <span className="text-sm font-bold">Students & slots</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-[#FFFFFF]/15 bg-[#0B3C5D]/25 px-4 py-3 backdrop-blur-sm">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#25D366] opacity-40" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#25D366]" />
              </span>
              <span className="text-sm font-bold">Live sync</span>
            </div>
          </div>

          <div className="flex gap-3 pt-4" aria-hidden>
            <span className="h-1.5 w-14 rounded-full bg-[#F4D35E]" />
            <span className="h-1.5 w-6 rounded-full bg-[#F4D35E]/45" />
            <span className="h-1.5 w-6 rounded-full bg-[#FFFFFF]/25" />
          </div>
        </M.div>
      </div>

      <div className="relative z-10 flex flex-1 flex-col justify-center px-5 py-10 sm:px-8 lg:px-12 xl:px-16">
        <div className="mx-auto w-full max-w-[448px]">
          <div className="relative overflow-hidden rounded-3xl border border-[#8BBCEB]/40 bg-[#FFFFFF] p-8 shadow-[0_28px_60px_-28px_rgba(11,60,93,0.3)] sm:p-10">
            <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-[#F4D35E] to-[#1E73D8]" aria-hidden />
            <div className="pl-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-heading text-2xl font-bold text-[#0B3C5D]">Teacher login</h2>
                  <p className="mt-1 text-sm font-medium text-[#1E73D8]/85">Credentials on file with your school</p>
                </div>
                <span className="shrink-0 rounded-lg bg-[#F5F5F5] px-2.5 py-1 font-mono text-xs font-bold text-[#1E73D8]">
                  01
                </span>
              </div>

              <form className="mt-8 space-y-6" onSubmit={onSubmit}>
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
                      name="email"
                      autoComplete="email"
                      placeholder="name@school.edu"
                      value={form.email}
                      onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
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
                      name="password"
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={form.password}
                      onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
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
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1E73D8] py-4 text-base font-bold text-[#FFFFFF] shadow-[0_12px_32px_-12px_rgba(30,115,216,0.55)] transition hover:bg-[#0B3C5D] disabled:opacity-60"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span
                        className="h-5 w-5 animate-spin rounded-full border-2 border-[#8BBCEB] border-t-[#FFFFFF]"
                        aria-hidden
                      />
                      Signing in…
                    </span>
                  ) : (
                    <>
                      Enter workspace
                      <FiArrowRight className="h-5 w-5" aria-hidden />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-8 border-t border-[#8BBCEB]/30 pt-8 text-center">
                <p className="text-sm font-medium text-[#1E73D8]/85">
                  Need an account?{" "}
                  <span className="font-bold text-[#0B3C5D]">Contact administrator</span>
                </p>
              </div>
            </div>
          </div>

          <footer className="mt-10 flex flex-col items-center gap-6 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#1E73D8]/65 sm:flex-row sm:justify-center sm:gap-8">
            <p className="text-center sm:text-left">
              © {new Date().getFullYear()} MeetReserve
            </p>
            <div className="flex flex-wrap justify-center gap-6">
              <a href="#" className="transition hover:text-[#0B3C5D]">
                Privacy
              </a>
              <a href="#" className="transition hover:text-[#0B3C5D]">
                Terms
              </a>
              <a href="#" className="transition hover:text-[#0B3C5D]">
                Contact
              </a>
            </div>
          </footer>
        </div>
      </div>
    </M.div>
  );
};
