import { CalendarRange, PiggyBank, Target, TrendingUp } from "lucide-react";
import { getBoardData, requireWedding } from "@/lib/wedding";
import { summarizeBudget, summarizeSavings } from "@/lib/calc";
import { cn, formatMonth, formatRupiah } from "@/lib/utils";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { HealthBadge } from "@/components/health-badge";
import { PageHeader } from "@/components/page-header";
import { MonthlyDepositChart } from "@/components/charts";
import { AddLogButton, GoalSettingsButton, LogsTable } from "./savings-client";

export const metadata = { title: "Tabungan" };

export default async function SavingsPage() {
  const { wedding } = await requireWedding();
  const { categories, expenses, goal, logs } = await getBoardData(wedding.id);
  const budget = summarizeBudget(wedding, categories, expenses);
  const s = summarizeSavings(wedding, goal, logs, budget.budgetTarget);

  const chartData = s.schedule.map((r) => ({
    label: formatMonth(r.month),
    required: Math.round(r.required),
    deposited: r.phase === "future" ? null : Math.round(r.deposited),
  }));

  const names = { groom: wedding.groom_name || "Pria (CPP)", bride: wedding.bride_name || "Wanita (CPW)" };

  return (
    <>
      <PageHeader
        title="Savings Tracker"
        description="Target tabungan bulanan dihitung otomatis dari sisa bulan menuju hari pernikahan."
        action={
          <>
            <GoalSettingsButton
              goal={goal}
              budgetTarget={Number(wedding.total_budget_target) || 0}
              estimatedTotal={budget.totalEstimated}
              names={names}
            />
            <AddLogButton names={names} />
          </>
        }
      />

      {Number(wedding.total_budget_target) <= 0 && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Total target budget belum diisi — target tabungan sementara memakai total estimasi item ({formatRupiah(budget.totalEstimated)}). Atur
          lewat tombol <b>Atur Target</b>.
        </div>
      )}
      {s.nominalMismatch && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Jumlah target nominal Pria + Wanita ({formatRupiah(s.contributors[0].target + s.contributors[1].target)}) berbeda dengan total target (
          {formatRupiah(s.target)}).
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Target Tabungan" value={formatRupiah(s.target)} icon={Target} sub={`Rencana awal ${formatRupiah(s.baselineMonthly)}/bulan`} />
        <StatCard label="Dana Terkumpul" value={formatRupiah(s.collected)} icon={PiggyBank} tone="gold" sub={`${(s.progress * 100).toFixed(1)}% dari target`}>
          <Progress className="mt-3" value={s.progress} barClassName="bg-gold-500" />
        </StatCard>
        <StatCard
          label="Sisa Target"
          value={formatRupiah(s.remaining)}
          icon={CalendarRange}
          tone="sky"
          sub={`${s.monthsLeft} dari ${s.totalMonths} bulan tersisa`}
        />
        <StatCard
          label="Target Bulan Ini"
          value={formatRupiah(s.requiredThisMonth)}
          icon={TrendingUp}
          tone="emerald"
          sub={
            s.remainingThisMonth > 0 ? (
              <>
                Kurang <b className="text-stone-700">{formatRupiah(s.remainingThisMonth)}</b> lagi bulan ini
              </>
            ) : s.requiredThisMonth > 0 ? (
              <span className="text-emerald-600">Target bulan ini sudah terpenuhi ✓</span>
            ) : (
              "—"
            )
          }
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader title="Status" />
          <CardBody className="space-y-3 text-sm">
            <HealthBadge status={s.health} />
            <p className="text-stone-600">
              {s.health === "achieved"
                ? "Selamat! Target tabungan sudah tercapai."
                : s.health === "on_track"
                  ? "Tabungan sesuai atau melebihi rencana. Pertahankan!"
                  : s.periodOver
                    ? "Periode menabung telah berakhir namun target belum tercapai."
                    : `Tabungan tertinggal ${formatRupiah(s.shortfall)} dari rencana. Target bulan-bulan berikutnya otomatis dinaikkan.`}
            </p>
            <div className="rounded-lg bg-stone-50 p-3 text-xs text-stone-600">
              <p>
                Seharusnya terkumpul s/d bulan lalu: <b>{formatRupiah(s.expectedByNow)}</b>
              </p>
              {s.nextMonthsTarget > 0 && (
                <p className="mt-1">
                  Proyeksi bulan berikutnya: <b>{formatRupiah(s.nextMonthsTarget)}</b>/bulan
                </p>
              )}
            </div>
          </CardBody>
        </Card>

        {s.contributors.map((c) => (
          <Card key={c.key}>
            <CardHeader
              title={<span className={c.key === "groom" ? "text-groom" : "text-bride"}>{names[c.key]}</span>}
              description={`Porsi ${(c.share * 100).toFixed(0)}% · target ${formatRupiah(c.target)}`}
            />
            <CardBody className="space-y-3">
              <div>
                <p className="text-2xl font-semibold text-stone-900 tabular-nums">{formatRupiah(c.collected)}</p>
                <Progress className="mt-2" value={c.target > 0 ? c.collected / c.target : 0} barClassName={c.key === "groom" ? "bg-groom" : "bg-bride"} />
                <p className="mt-1 text-xs text-stone-500">Sisa {formatRupiah(c.remaining)}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-stone-50 p-2.5">
                  <p className="text-stone-500">Target bulan ini</p>
                  <p className="font-semibold text-stone-900 tabular-nums">{formatRupiah(c.requiredThisMonth)}</p>
                </div>
                <div className="rounded-lg bg-stone-50 p-2.5">
                  <p className="text-stone-500">Disetor bulan ini</p>
                  <p className="font-semibold text-stone-900 tabular-nums">{formatRupiah(c.depositedThisMonth)}</p>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader title="Target vs Setoran Bulanan" description="Target bulanan disesuaikan otomatis bila setoran kurang/lebih" />
        <CardBody>
          <MonthlyDepositChart data={chartData} />
        </CardBody>
      </Card>

      <Card className="mt-6 overflow-hidden">
        <CardHeader title="Jadwal Target Bulanan (Auto-Recalculate)" description="Target disesuaikan = (target total − setoran sebelumnya) ÷ sisa bulan" />
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-stone-50 text-left text-xs font-medium tracking-wide text-stone-500 uppercase">
              <tr>
                <th className="px-5 py-3">Bulan</th>
                <th className="px-5 py-3 text-right">Rencana Awal</th>
                <th className="px-5 py-3 text-right">Target Disesuaikan</th>
                <th className="px-5 py-3 text-right">Setoran</th>
                <th className="px-5 py-3 text-right">Kumulatif</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {s.schedule.map((r) => (
                <tr key={r.index} className={cn(r.phase === "current" && "bg-primary-50/50")}>
                  <td className="px-5 py-2.5 font-medium text-stone-800">
                    {formatMonth(r.month)}
                    {r.phase === "current" && <span className="ml-2 text-xs text-primary-600">(bulan ini)</span>}
                  </td>
                  <td className="px-5 py-2.5 text-right text-stone-500 tabular-nums">{formatRupiah(r.baseline)}</td>
                  <td className="px-5 py-2.5 text-right font-medium text-stone-900 tabular-nums">{formatRupiah(r.required)}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{r.phase === "future" ? "-" : formatRupiah(r.deposited)}</td>
                  <td className="px-5 py-2.5 text-right text-stone-600 tabular-nums">{r.phase === "future" ? "-" : formatRupiah(r.cumulative)}</td>
                  <td className="px-5 py-2.5">
                    {r.phase === "future" ? (
                      <Badge>Akan datang</Badge>
                    ) : r.met ? (
                      <Badge tone="success">Tercapai</Badge>
                    ) : r.phase === "current" ? (
                      <Badge tone="primary">Berjalan</Badge>
                    ) : (
                      <Badge tone="warning">Kurang {formatRupiah(r.required - r.deposited)}</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <LogsTable logs={logs} names={names} />
    </>
  );
}
