import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import { BarChart3 } from "lucide-react";

// Peach gradient fill per mismatch count — danger increases with more mismatches
const COLORS = ["#A5D6A7", "#FFBE91", "#FF9D5C", "#8B2626"];

// Custom tooltip
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const value = payload[0].value;
    return (
      <div className="bg-mint border border-sage rounded-xl px-4 py-3 shadow-card">
        <p className="text-forest font-bold text-sm">{label}</p>
        <p className="text-forest/80 text-sm mt-1">
          <span className="font-extrabold text-forest text-lg">{value}</span>
          <span className="ml-1.5 text-xs text-forest/60">off-target site{value !== 1 ? "s" : ""}</span>
        </p>
      </div>
    );
  }
  return null;
};

// Custom bar label
const CustomLabel = ({ x, y, width, value }) => {
  if (!value) return null;
  return (
    <text
      x={x + width / 2}
      y={y - 6}
      textAnchor="middle"
      fill="#2C5745"
      fontSize={12}
      fontWeight="700"
      fontFamily="Inter, sans-serif"
    >
      {value}
    </text>
  );
};

export default function MismatchChart({ distribution = {}, isLoading }) {
  const chartData = [
    { label: "1 Mismatch", count: distribution["1_mismatch"] || 0, shortLabel: "1-MM" },
    { label: "2 Mismatches", count: distribution["2_mismatches"] || 0, shortLabel: "2-MM" },
    { label: "3 Mismatches", count: distribution["3_mismatches"] || 0, shortLabel: "3-MM" },
    { label: "4 Mismatches", count: distribution["4_mismatches"] || 0, shortLabel: "4-MM" },
  ];

  const total = chartData.reduce((sum, d) => sum + d.count, 0);

  if (isLoading) {
    return (
      <div className="card card-hover min-h-[280px]">
        <div className="h-4 w-48 skeleton mb-4" />
        <div className="flex items-end gap-4 h-40 px-4">
          {[60, 90, 50, 30].map((h, i) => (
            <div key={i} className="flex-1 skeleton rounded-t-lg" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card card-hover flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-peach/50 flex items-center justify-center">
            <BarChart3 className="w-3.5 h-3.5 text-forest" />
          </div>
          <div>
            <h3 className="section-title text-sm">Mismatch Distribution</h3>
            <p className="section-subtitle text-[11px]">Off-target count by mismatch count</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-extrabold text-2xl text-forest leading-none">{total}</p>
          <p className="text-[10px] text-forest/50 uppercase tracking-wider font-medium">
            Total Sites
          </p>
        </div>
      </div>

      {/* Bar Chart */}
      <ResponsiveContainer width="100%" height={180}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 8, left: -16, bottom: 0 }}
          barCategoryGap="32%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#A5D6A7" strokeOpacity={0.4} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#2C5745", fontFamily: "Inter", fontWeight: 500 }}
            axisLine={{ stroke: "#A5D6A7" }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "#2C5745", fontFamily: "Inter" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "#E8F5E9", radius: 8 }} />
          <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={64}>
            {chartData.map((_, i) => (
              <Cell key={`cell-${i}`} fill={COLORS[i]} />
            ))}
            <LabelList content={<CustomLabel />} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend pills */}
      <div className="flex flex-wrap gap-2">
        {chartData.map((item, i) => (
          <div
            key={item.label}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cream border border-sage"
          >
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: COLORS[i] }}
            />
            <span className="text-xs text-forest font-medium">{item.label}:</span>
            <span className="text-xs font-bold text-forest">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
