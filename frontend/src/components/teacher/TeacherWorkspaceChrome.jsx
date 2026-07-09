import {
  BookingHero as BaseBookingHero,
  BookingNotice as BaseBookingNotice,
  BookingPanel as BaseBookingPanel,
} from "../public/BookingPageChrome";
import { cn } from "../../utils/cn";

/** Consistent page width and vertical rhythm for teacher routes */
export const TeacherPageShell = ({ children, className }) => (
  <div className={cn("mx-auto w-full max-w-5xl space-y-5", className)}>{children}</div>
);

export const BookingHero = ({ className, showBrandLogo = false, ...props }) => (
  <BaseBookingHero
    showBrandLogo={showBrandLogo}
    className={cn(
      "rounded-2xl border-[#8BBCEB]/30 p-4 shadow-[0_10px_28px_-18px_rgba(11,60,93,0.38)] md:p-5",
      "[&_h1]:text-xl [&_h1]:md:text-2xl [&_h1]:mt-1",
      "[&_p]:mt-1.5 [&_p]:text-xs",
      className,
    )}
    {...props}
  />
);

export const BookingPanel = ({ className, ...props }) => (
  <BaseBookingPanel
    className={cn(
      "rounded-2xl border-[#8BBCEB]/30 p-4 shadow-[0_8px_24px_-16px_rgba(11,60,93,0.2)]",
      className,
    )}
    {...props}
  />
);

export const BookingNotice = BaseBookingNotice;
