"use client";

import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ComposedChart,
} from "recharts";
import { formatRupiah, formatRupiahShort } from "@/lib/utils";

export const CATEGORY_COLORS = [
  "#c92d5b",
  "#c58f37",
  "#3b6fb6",
  "#10b981",
  "#8b5cf6",
  "#f97316",
  "#0ea5e9",
  "#ec7894",
  "#64748b",
  "#84cc16",
  "#a855f7",
  "#14b8a6",
];

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid #e7e5e4",
  boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
  fontSize: 12,
};

const moneyFormatter = (v: unknown) => formatRupiah(Number(v));

export function SavingsTrajectoryChart({
  data,
}: {
  data: { label: string; planned: number; actual: number | null; required: number; deposited: number | null }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="actualFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c92d5b" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#c92d5b" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0eeec" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#78716c" }} tickLine={false} axisLine={false} minTickGap={12} />
        <YAxis tickFormatter={formatRupiahShort} tick={{ fontSize: 11, fill: "#78716c" }} tickLine={false} axisLine={false} width={56} />
        <Tooltip formatter={moneyFormatter} contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Area type="monotone" dataKey="actual" name="Terkumpul (kumulatif)" stroke="#c92d5b" strokeWidth={2.5} fill="url(#actualFill)" connectNulls={false} />
        <Line type="monotone" dataKey="planned" name="Rencana (kumulatif)" stroke="#c58f37" strokeDasharray="5 4" strokeWidth={2} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function MonthlyDepositChart({ data }: { data: { label: string; required: number; deposited: number | null }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0eeec" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#78716c" }} tickLine={false} axisLine={false} minTickGap={8} />
        <YAxis tickFormatter={formatRupiahShort} tick={{ fontSize: 11, fill: "#78716c" }} tickLine={false} axisLine={false} width={56} />
        <Tooltip formatter={moneyFormatter} contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="required" name="Target bulanan" fill="#ebd9aa" radius={[6, 6, 0, 0]} />
        <Bar dataKey="deposited" name="Setoran" fill="#c92d5b" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CategoryDonut({ data }: { data: { name: string; value: number }[] }) {
  const filtered = data.filter((d) => d.value > 0);
  const total = filtered.reduce((a, b) => a + b.value, 0);
  if (filtered.length === 0) {
    return <div className="flex h-[260px] items-center justify-center text-sm text-stone-400">Belum ada data alokasi</div>;
  }
  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={filtered} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={2} stroke="none">
            {filtered.map((_, i) => (
              <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={moneyFormatter} contentStyle={tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
      <ul className="mt-2 space-y-1.5">
        {filtered.map((d, i) => (
          <li key={d.name} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
            <span className="min-w-0 flex-1 truncate text-stone-600">{d.name}</span>
            <span className="font-medium text-stone-900 tabular-nums">{((d.value / total) * 100).toFixed(0)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BudgetVsActualChart({ data }: { data: { name: string; allocated: number; committed: number; paid: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(260, data.length * 44)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }} barGap={2}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0eeec" horizontal={false} />
        <XAxis type="number" tickFormatter={formatRupiahShort} tick={{ fontSize: 11, fill: "#78716c" }} tickLine={false} axisLine={false} />
        <YAxis
          type="category"
          dataKey="name"
          width={130}
          tick={{ fontSize: 11, fill: "#57534e" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: string) => (v.length > 20 ? `${v.slice(0, 19)}…` : v)}
        />
        <Tooltip formatter={moneyFormatter} contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="allocated" name="Alokasi" fill="#ebd9aa" radius={[0, 4, 4, 0]} barSize={10} />
        <Bar dataKey="committed" name="Estimasi/Aktual" fill="#ec7894" radius={[0, 4, 4, 0]} barSize={10} />
        <Bar dataKey="paid" name="Terbayar" fill="#10b981" radius={[0, 4, 4, 0]} barSize={10} />
      </BarChart>
    </ResponsiveContainer>
  );
}
