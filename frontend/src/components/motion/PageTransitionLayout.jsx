import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion as M, useReducedMotion } from "framer-motion";
import { pageEase } from "./motionPresets";

/** Stable key while navigating inside dashboard so the shell does not remount every click. */
const transitionKey = (pathname) =>
  /^\/(admin|teacher)(\/|$)/.test(pathname) ? "__dashboard_shell__" : pathname;

export const PageTransitionLayout = () => {
  const location = useLocation();
  const reduce = useReducedMotion();
  const key = transitionKey(location.pathname);

  return (
    <AnimatePresence mode="wait">
      <M.div
        key={key}
        className="min-h-screen"
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
        exit={reduce ? undefined : { opacity: 0, y: -12 }}
        transition={{ duration: reduce ? 0 : 0.45, ease: pageEase }}
      >
        <Outlet />
      </M.div>
    </AnimatePresence>
  );
};
