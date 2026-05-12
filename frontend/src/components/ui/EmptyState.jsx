export const EmptyState = ({ title, description, tone = "default" }) => {
  const admin = tone === "admin" || tone === "brand";
  return (
    <div
      className={
        admin
          ? "rounded-2xl border border-dashed border-[#8BBCEB]/60 bg-[#F5F5F5]/80 px-5 py-10 text-center"
          : "rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center"
      }
    >
      <h3
        className={
          admin ? "font-heading text-base font-bold text-[#0B3C5D]" : "text-base font-semibold text-slate-700"
        }
      >
        {title}
      </h3>
      <p className={admin ? "mt-2 text-sm font-medium leading-relaxed text-[#1E73D8]/85" : "mt-1 text-sm text-slate-500"}>
        {description}
      </p>
    </div>
  );
};
