import { Link } from "react-router-dom";
import { motion as M } from "framer-motion";
import { FiArrowRight, FiCalendar, FiLock, FiShield, FiUser, FiUsers, FiZap } from "react-icons/fi";
import { AppLogo } from "../components/brand/AppLogo";
import { Button } from "../components/ui/Button";
import { AuthDotField, AuthGridPattern } from "../components/auth/AuthDecor";
import { pageEase, staggerChild, staggerParent } from "../components/motion/motionPresets";

const portals = [
  {
    key: "admin",
    title: "Admin portal",
    description: "Teachers, roster, booking window, and operations — full control.",
    icon: FiShield,
    to: "/login/admin",
    accent: "from-[#F4D35E] to-[#1E73D8]",
    chip: "Operations",
    chipClass: "bg-[#F4D35E]/25 text-[#0B3C5D]",
    cta: "adminPrimary",
  },
  {
    key: "teacher",
    title: "Teacher portal",
    description: "Publish availability and run your week from one calendar.",
    icon: FiUsers,
    to: "/login/teacher",
    accent: "from-[#1E73D8] to-[#8BBCEB]",
    chip: "Faculty",
    chipClass: "bg-[#8BBCEB]/30 text-[#0B3C5D]",
    cta: "adminSecondary",
  },
  {
    key: "student",
    title: "Book a session",
    description: "Open booking with your roster mobile — no account required.",
    icon: FiUser,
    to: "/book",
    accent: "from-[#25D366] to-[#1E73D8]",
    chip: "Learners",
    chipClass: "bg-[#25D366]/20 text-[#0B3C5D]",
    cta: "adminGhost",
  },
];

const highlights = [
  {
    title: "Aligned scheduling",
    body: "Teachers publish slots; students claim them with clear IST timing.",
    icon: FiCalendar,
  },
  {
    title: "Guarded access",
    body: "Role-based paths for admin, instructor, and open roster flows.",
    icon: FiLock,
  },
  {
    title: "Fast path",
    body: "From landing to booking in a few taps — minimal friction.",
    icon: FiZap,
  },
];

const floatOrb = {
  animate: {
    y: [0, -10, 0],
    opacity: [0.45, 0.65, 0.45],
  },
  transition: { duration: 7, repeat: Infinity, ease: "easeInOut" },
};

export const HomePage = () => (
  <div className="relative min-h-screen overflow-x-hidden bg-[#F5F5F5] font-body">
    <AuthDotField className="opacity-[0.55]" />
    <M.div
      className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-[#8BBCEB]/20 blur-3xl"
      aria-hidden
      {...floatOrb}
    />
    <M.div
      className="pointer-events-none absolute -right-16 bottom-32 h-96 w-96 rounded-full bg-[#F4D35E]/15 blur-3xl"
      aria-hidden
      animate={{
        y: [0, 12, 0],
        opacity: [0.4, 0.58, 0.4],
      }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
    />

    <div className="relative z-10 mx-auto max-w-6xl px-4 pb-16 pt-8 md:px-8 md:pt-12">
      <M.header
        className="mb-8 flex flex-col items-center justify-between gap-4 sm:flex-row sm:items-center"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: pageEase }}
      >
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:gap-5">
          <AppLogo size="lg" linkTo="/" />
          <div className="hidden h-10 w-px bg-[#8BBCEB]/40 sm:block" aria-hidden />
          <div className="text-center sm:text-left">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#1E73D8]">MeetReserve</p>
            <p className="mt-0.5 text-xs font-semibold text-[#0B3C5D]/85">Campus scheduling suite</p>
          </div>
        </div>
        <M.div
          className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#1E73D8]/75"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.5 }}
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#25D366] opacity-40" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#25D366]" />
          </span>
          Live product
        </M.div>
      </M.header>

      {/* Hero */}
      <M.section
        className="relative overflow-hidden rounded-3xl border border-[#8BBCEB]/35 bg-gradient-to-br from-[#0B3C5D] via-[#1E73D8] to-[#8BBCEB] px-6 py-12 text-[#FFFFFF] shadow-[0_32px_64px_-28px_rgba(11,60,93,0.45)] md:px-12 md:py-16"
        initial={{ opacity: 0, y: 24, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.65, ease: pageEase, delay: 0.06 }}
      >
        <AuthGridPattern className="opacity-[0.12]" />
        <M.div
          className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#F4D35E]/25 blur-3xl"
          aria-hidden
          animate={{ scale: [1, 1.08, 1], rotate: [0, 4, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <div
          className="pointer-events-none absolute bottom-0 left-1/2 h-48 w-[120%] -translate-x-1/2 bg-gradient-to-t from-[#0B3C5D]/45 to-transparent"
          aria-hidden
        />

        <M.div
          className="relative z-10 mx-auto max-w-3xl text-center"
          variants={staggerParent}
          initial="hidden"
          animate="show"
        >
          <M.p
            className="text-[10px] font-bold uppercase tracking-[0.35em] text-[#F4D35E]"
            variants={staggerChild}
          >
            MeetReserve
          </M.p>
          <M.h1
            className="mt-4 font-heading text-3xl font-bold leading-tight tracking-tight md:text-5xl"
            variants={staggerChild}
          >
            Meetings that fit
            <span className="text-[#F4D35E]"> your school day</span>
          </M.h1>
          <M.p
            className="mx-auto mt-5 max-w-xl text-base font-medium leading-relaxed text-[#FFFFFF]/93 md:text-lg"
            variants={staggerChild}
          >
            One place for admins, teachers, and learners to coordinate sessions — with roster-aware booking and a
            calendar built around your policies.
          </M.p>
          <M.div
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4"
            variants={staggerChild}
          >
            <Link to="/book">
              <Button
                variant="adminSecondary"
                className="inline-flex min-w-[200px] items-center justify-center gap-2 px-8 py-3.5 text-base transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                Book without login
                <FiArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link to="/login/teacher">
              <Button
                variant="adminGhost"
                className="inline-flex min-w-[200px] items-center justify-center border-[#FFFFFF]/40 bg-[#FFFFFF]/15 px-8 py-3.5 text-base text-[#FFFFFF] transition-transform duration-200 hover:bg-[#FFFFFF]/25 hover:scale-[1.02] active:scale-[0.98]"
              >
                Teacher sign-in
              </Button>
            </Link>
          </M.div>
          <M.div
            className="mt-10 flex flex-wrap items-center justify-center gap-4 text-xs font-bold uppercase tracking-[0.15em] text-[#8BBCEB]"
            variants={staggerChild}
          >
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#25D366]" />
              IST-aware
            </span>
            <span className="text-[#8BBCEB]/50">·</span>
            <span>Roster ready</span>
            <span className="text-[#8BBCEB]/50">·</span>
            <span>Role-based</span>
          </M.div>
        </M.div>
      </M.section>

      {/* Portals */}
      <section className="mt-14 md:mt-20" aria-labelledby="portals-heading">
        <M.div
          className="mb-8 text-center md:mb-12"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, ease: pageEase }}
        >
          <h2 id="portals-heading" className="font-heading text-2xl font-bold text-[#0B3C5D] md:text-3xl">
            Choose your path
          </h2>
          <p className="mt-2 text-sm font-medium text-[#1E73D8]/85 md:text-base">
            Three entry points — pick what matches your role today.
          </p>
        </M.div>

        <div className="grid gap-6 md:grid-cols-3">
          {portals.map((portal, i) => (
            <M.article
              key={portal.key}
              className="group relative flex flex-col overflow-hidden rounded-3xl border border-[#8BBCEB]/40 bg-[#FFFFFF] p-6 shadow-[0_16px_48px_-24px_rgba(11,60,93,0.25)] md:p-7"
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: pageEase }}
              whileHover={{ y: -6, transition: { type: "spring", stiffness: 400, damping: 22 } }}
            >
              <div
                className={`absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b ${portal.accent}`}
                aria-hidden
              />
              <div className="pl-3">
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${portal.chipClass}`}
                  >
                    {portal.chip}
                  </span>
                  <M.span
                    className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5F5F5] text-[#1E73D8] transition-colors duration-200 group-hover:bg-[#8BBCEB]/25"
                    whileHover={{ rotate: [0, -6, 6, 0] }}
                    transition={{ duration: 0.45 }}
                  >
                    <portal.icon className="h-6 w-6" aria-hidden />
                  </M.span>
                </div>
                <h3 className="mt-5 font-heading text-xl font-bold text-[#0B3C5D]">{portal.title}</h3>
                <p className="mt-2 min-h-[3.5rem] text-sm font-medium leading-relaxed text-[#1E73D8]/88">
                  {portal.description}
                </p>
                <div className="mt-6">
                  <Link to={portal.to} className="block">
                    <Button
                      variant={portal.cta}
                      className="w-full justify-center gap-2 py-3 transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      Continue
                      <FiArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </M.article>
          ))}
        </div>
      </section>

      {/* Highlights strip */}
      <M.section
        className="mt-14 rounded-3xl border border-[#8BBCEB]/35 bg-[#FFFFFF] p-6 shadow-[0_12px_40px_-20px_rgba(11,60,93,0.18)] md:mt-20 md:p-10"
        aria-labelledby="why-heading"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.55, ease: pageEase }}
      >
        <h2 id="why-heading" className="text-center font-heading text-xl font-bold text-[#0B3C5D] md:text-2xl">
          Built for clarity
        </h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3 md:gap-8">
          {highlights.map((h, i) => {
            const Icon = h.icon;
            return (
              <M.div
                key={h.title}
                className="relative rounded-2xl border border-[#F5F5F5] bg-[#F5F5F5]/80 p-5 text-center md:text-left"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07, duration: 0.45, ease: pageEase }}
                whileHover={{ scale: 1.02 }}
              >
                <M.span
                  className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFFFFF] text-[#1E73D8] shadow-sm md:mx-0"
                  whileHover={{ y: -2 }}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </M.span>
                <p className="mt-4 font-heading text-sm font-bold text-[#0B3C5D]">{h.title}</p>
                <p className="mt-2 text-sm font-medium leading-relaxed text-[#1E73D8]/85">{h.body}</p>
              </M.div>
            );
          })}
        </div>
      </M.section>

      <M.footer
        className="mt-14 border-t border-[#8BBCEB]/25 pt-8 text-center"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.45 }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1E73D8]/65">
          © {new Date().getFullYear()} MeetReserve · Campus scheduling
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs font-bold text-[#1E73D8]/75">
          <Link
            to="/book"
            className="rounded-full px-3 py-1 transition-colors duration-200 hover:bg-[#FFFFFF] hover:text-[#0B3C5D]"
          >
            Book without login
          </Link>
          <span className="text-[#8BBCEB]">·</span>
          <Link
            to="/login/admin"
            className="rounded-full px-3 py-1 transition-colors duration-200 hover:bg-[#FFFFFF] hover:text-[#0B3C5D]"
          >
            Admin login
          </Link>
          <span className="text-[#8BBCEB]">·</span>
          <Link
            to="/login/teacher"
            className="rounded-full px-3 py-1 transition-colors duration-200 hover:bg-[#FFFFFF] hover:text-[#0B3C5D]"
          >
            Teacher login
          </Link>
        </div>
      </M.footer>
    </div>
  </div>
);
