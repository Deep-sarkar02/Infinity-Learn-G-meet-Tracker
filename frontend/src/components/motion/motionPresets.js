/** Framer Motion presets — opacity / transform only (no color changes). */

export const pageEase = [0.16, 1, 0.3, 1];

export const pageTransition = {
  duration: 0.42,
  ease: pageEase,
};

export const fadeUp = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: pageTransition,
};

export const fadeSlide = {
  initial: { opacity: 0, x: 10 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -8 },
  transition: { duration: 0.32, ease: pageEase },
};

export const staggerParent = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.06 },
  },
};

export const staggerChild = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: pageEase } },
};

export const cardHover = {
  rest: { scale: 1, y: 0 },
  hover: {
    y: -4,
    transition: { type: "spring", stiffness: 420, damping: 28 },
  },
  tap: { scale: 0.992 },
};
