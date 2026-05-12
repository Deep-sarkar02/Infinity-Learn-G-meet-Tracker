import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const DEFAULT_BRAND = "#2563eb";
const DEFAULT_SLATE = "#64748b";

const defaultChartPalette = [
  "#2563eb",
  "#0891b2",
  "#7c3aed",
  "#db2777",
  "#ea580c",
  "#16a34a",
  "#ca8a04",
  "#4f46e5",
];

/** Strict admin palette — Primary, Dark, Light, Gold, Green (cycle) */
const ADMIN_SEQUENCE = ["#1E73D8", "#0B3C5D", "#8BBCEB", "#F4D35E", "#25D366"];

const schemes = {
  default: {
    brand: DEFAULT_BRAND,
    axis: DEFAULT_SLATE,
    palette: defaultChartPalette,
    grid: "#e2e8f0",
    tooltipBorder: "#e2e8f0",
    cursor: "rgba(37, 99, 235, 0.06)",
  },
  admin: {
    brand: "#1E73D8",
    axis: "#0B3C5D",
    palette: ADMIN_SEQUENCE,
    grid: "#F5F5F5",
    tooltipBorder: "#8BBCEB",
    cursor: "rgba(30, 115, 216, 0.08)",
  },
};

/** @param {{ rows: Array<{ key: string, label: string, count: number, drill: object }>, onSelectRow: (row: object) => void, palette?: 'default' | 'admin' }} props */
export const HorizontalBookingsBar = ({ rows, onSelectRow, palette = "default" }) => {
  const s = schemes[palette] ?? schemes.default;
  const data = rows.map((r) => ({
    key: r.key,
    name: r.label.length > 28 ? `${r.label.slice(0, 26)}…` : r.label,
    fullLabel: r.label,
    count: r.count,
    row: r,
  }));

  const height = Math.min(420, Math.max(220, 48 + data.length * 44));

  if (!data.length) return null;

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
          barCategoryGap="12%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke={s.grid} horizontal vertical={false} />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fontSize: 12, fill: s.axis }}
            stroke={s.axis}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={120}
            tick={{ fontSize: 11, fill: s.axis }}
            stroke={s.axis}
            interval={0}
          />
          <Tooltip
            cursor={{ fill: s.cursor }}
            contentStyle={{
              borderRadius: "12px",
              border: `1px solid ${s.tooltipBorder}`,
              fontSize: "12px",
              background: "#FFFFFF",
              color: palette === "admin" ? "#0B3C5D" : undefined,
            }}
            formatter={(value) => [value, "Bookings"]}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.fullLabel ?? ""}
          />
          <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={28}>
            {data.map((entry, index) => (
              <Cell
                key={entry.key}
                fill={index === 0 ? s.brand : s.palette[index % s.palette.length]}
                className="outline-none"
                cursor="pointer"
                onClick={() => onSelectRow(entry.row)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

/** @param {{ rows: Array<{ key: string, label: string, count: number, drill: object }>, onSelectRow: (row: object) => void, palette?: 'default' | 'admin' }} props */
export const GradeBookingsPie = ({ rows, onSelectRow, palette = "default" }) => {
  const s = schemes[palette] ?? schemes.default;
  const data = rows.map((r, i) => ({
    key: r.key,
    name: r.label.replace(/^Grade\s+/i, "Gr. "),
    value: r.count,
    row: r,
    fill: s.palette[i % s.palette.length],
  }));

  if (!data.length) return null;

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={56}
            outerRadius={96}
            paddingAngle={2}
            onClick={(_, index) => data[index] && onSelectRow(data[index].row)}
            cursor="pointer"
          >
            {data.map((entry) => (
              <Cell key={entry.key} fill={entry.fill} stroke="#FFFFFF" strokeWidth={1} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => [value, "Bookings"]}
            contentStyle={{
              borderRadius: "12px",
              border: `1px solid ${s.tooltipBorder}`,
              fontSize: "12px",
              background: "#FFFFFF",
              color: palette === "admin" ? "#0B3C5D" : undefined,
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: "11px" }}
            formatter={(value) =>
              palette === "admin" ? (
                <span style={{ color: "#0B3C5D" }}>{value}</span>
              ) : (
                <span className="text-slate-700">{value}</span>
              )
            }
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

/**
 * Stacked vertical bars: weekdays on X-axis, counts on Y-axis, one stack per series (grade or batch).
 * @param {{ weekdays: string[], series: Array<{ key: string, label: string, counts: number[] }>, palette?: 'default' | 'admin' }} props
 */
export const WeekdayStackedBookingsBar = ({ weekdays, series, palette = "default" }) => {
  const s = schemes[palette] ?? schemes.default;
  const paletteColors = s.palette;

  if (!weekdays?.length || !series?.length) {
    return (
      <p className="text-sm font-medium text-[#1E73D8]/80">
        Not enough data for a weekday breakdown in this window.
      </p>
    );
  }

  const data = weekdays.map((day, i) => {
    const row = { day };
    series.forEach((ser, idx) => {
      row[`v${idx}`] = ser.counts?.[i] ?? 0;
    });
    return row;
  });

  return (
    <div className="h-[300px] w-full min-h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={s.grid} vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 11, fill: s.axis }} stroke={s.axis} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: s.axis }} stroke={s.axis} width={36} />
          <Tooltip
            cursor={{ fill: s.cursor }}
            contentStyle={{
              borderRadius: "12px",
              border: `1px solid ${s.tooltipBorder}`,
              fontSize: "12px",
              background: "#FFFFFF",
              color: palette === "admin" ? "#0B3C5D" : undefined,
            }}
            formatter={(value, name) => [value, name]}
            labelFormatter={(label) => `${label}`}
          />
          <Legend
            wrapperStyle={{ fontSize: 11 }}
            formatter={(v) => (
              <span style={{ color: palette === "admin" ? "#0B3C5D" : "#334155" }}>{v}</span>
            )}
          />
          {series.map((ser, idx) => (
            <Bar
              key={ser.key}
              dataKey={`v${idx}`}
              name={ser.label}
              stackId="weekday"
              fill={paletteColors[idx % paletteColors.length]}
              maxBarSize={44}
              radius={[2, 2, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

