import { Link } from "react-router-dom";
import { cn } from "../../utils/cn";

const sizes = {
  xs: "h-6 max-h-6 w-auto",
  sm: "h-8 max-h-8 w-auto",
  md: "h-10 max-h-10 w-auto",
  lg: "h-12 max-h-12 w-auto",
  xl: "h-14 max-h-14 w-auto",
};

/**
 * Infinity Learn brand mark — `/il-logo.png` in `public/`.
 */
export const AppLogo = ({ size = "md", className, linkTo = "/", withLink = true, imgClassName }) => {
  const img = (
    <img
      src="/il-logo.png"
      alt="Infinity Learn"
      width={200}
      height={56}
      loading="eager"
      decoding="async"
      className={cn("object-contain object-left", sizes[size], imgClassName)}
    />
  );

  if (withLink && linkTo !== false) {
    return (
      <Link
        to={linkTo}
        className={cn(
          "inline-flex shrink-0 items-center rounded-lg outline-none transition-transform duration-300 ease-out hover:opacity-95 focus-visible:ring-2 focus-visible:ring-[#8BBCEB] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F5F5F5] active:scale-[0.98]",
          className,
        )}
      >
        {img}
      </Link>
    );
  }

  return <span className={cn("inline-flex shrink-0 items-center", className)}>{img}</span>;
};
