import { cn } from "../../utils/cn";

export const Card = ({ children, className }) => (
  <section className={cn("card-surface", className)}>{children}</section>
);
