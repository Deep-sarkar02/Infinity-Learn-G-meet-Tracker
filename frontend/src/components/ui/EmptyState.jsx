export const EmptyState = ({ title, description, tone = "default" }) => {
  const admin = tone === "admin" || tone === "brand";
  const il = tone === "il";
  return (
    <div
      className={
        il
          ? "rounded-2xl border border-dashed border-[#B8D9F8] bg-[#F8FBFF] px-5 py-10 text-center"
          : admin
            ? "rounded-2xl border border-dashed border-[#8BBCEB]/60 bg-[#F5F5F5]/80 px-5 py-10 text-center"
            : "rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center"
      }
    >
      <h3
        className={
          il
            ? "text-base font-bold text-[#1A1A1A]"
            : admin
              ? "font-heading text-base font-bold text-[#0B3C5D]"
              : "text-base font-semibold text-slate-700"
        }
      >
        {title}
      </h3>
      <p
        className={
          il
            ? "mt-2 text-sm font-medium leading-relaxed text-[#5C5C5C]"
            : admin
              ? "mt-2 text-sm font-medium leading-relaxed text-[#1E73D8]/85"
              : "mt-1 text-sm text-slate-500"
        }
      >
        {description}
      </p>
    </div>
  );
};
