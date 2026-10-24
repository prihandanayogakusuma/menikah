import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CircleDollarSign,
  HandCoins,
  PiggyBank,
  Target,
  Wallet,
} from "lucide-react";
import { getBoardData, getMyPendingInvitations, requireWedding } from "@/lib/wedding";
import { summarizeBudget, summarizeCategories, summarizeSavings, upcomingPayments } from "@/lib/calc";
import { cn, formatDate, formatMonth, formatRupiah, STATUS_LABEL } from "@/lib/utils";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { HealthBadge } from "@/components/health-badge";
import { PageHeader } from "@/components/page-header";
import { BudgetVsActualChart, CategoryDonut, SavingsTrajectoryChart } from "@/components/charts";
import { PendingInvitations } from "@/components/pending-invitations";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { wedding } = await requireWedding();
  const { categories, expenses, goal, logs } = await getBoardData(wedding.id);
  const budget = summarizeBudget(wedding, categories, expenses);
  const savings = summarizeSavings(wedding, goal, logs, budget.budgetTarget);
  const catSummary = summarizeCategories(categories, expenses);
  const upcoming = upcomingPayments(categories, expenses).slice(0, 6);
  const readyCash = savings.collected - budget.totalPaid;

  const invitationDetails = await getMyPendingInvitations();

  const trajectory = savings.schedule.map((r) => ({
    label: formatMonth(r.month),
    planned: Math.round(r.plannedCumulative),
    actual: r.phase === "future" ? null : Math.round(r.cumulative),
    required: Math.round(r.required),
    deposited: r.phase === "future" ? null : Math.round(r.deposited),
  }));

  const couple = [wedding.groom_name, wedding.bride_name].filter(Boolean).join(" & ");

  return (
    <>
      <PageHeader
        title={wedding.title}
        description={
          <>
            {couple && <span className="font-medium text-stone-700">{couple} · </span>}
            {formatDate(wedding.wedding_date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </>
        }
        action={<HealthBadge status={savings.health} />}
      />

      {invitationDetails.length > 0 && (
        <div className="mb-6">
          <PendingInvitations invitations={invitationDetails} />
        </div>
      )}

      {/* Ringkasan utama */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Estimasi Budget"
          value={formatRupiah(budget.budgetTarget)}
          icon={CircleDollarSign}
          sub={
            <>
              Estimasi/aktual item: <b className="text-stone-700">{formatRupiah(budget.totalCommitted)}</b>
              {budget.remainingBudget < 0 && <span className="ml-1 text-red-600">(lebih {formatRupiah(-budget.remainingBudget)})</span>}
            </>
          }
        >
          <Progress
            className="mt-3"
            value={budget.budgetTarget > 0 ? budget.totalCommitted / budget.budgetTarget : 0}
            barClassName={budget.remainingBudget < 0 ? "bg-red-500" : "bg-primary-500"}
          />
        </StatCard>
        <StatCard
          label="Total Pengeluaran Aktual"
          value={formatRupiah(budget.totalPaid)}
          icon={HandCoins}
          tone="sky"
          sub={
            <>
              Sudah dibayar · sisa tagihan <b className="text-stone-700">{formatRupiah(budget.totalOutstanding)}</b>
            </>
          }
        >
          <Progress className="mt-3" value={budget.totalCommitted > 0 ? budget.totalPaid / budget.totalCommitted : 0} barClassName="bg-sky-500" />
        </StatCard>
        <StatCard
          label="Dana Terkumpul"
          value={formatRupiah(savings.collected)}
          icon={PiggyBank}
          tone="gold"
          sub={
            <>
              {(savings.progress * 100).toFixed(1)}% · sisa target <b className="text-stone-700">{formatRupiah(savings.remaining)}</b>
            </>
          }
        >
          <Progress className="mt-3" value={savings.progress} barClassName="bg-gold-500" />
        </StatCard>
        <StatCard
          label="Dana Siap Pakai"
          value={<span className={cn(readyCash < 0 && "text-red-600")}>{formatRupiah(readyCash)}</span>}
          icon={Wallet}
          tone="emerald"
          sub="Total tabungan − total DP/pelunasan terbayar"
        />
      </div>

      {/* Kesehatan keuangan */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Perkembangan Tabungan"
            description={`Periode ${formatMonth(savings.periodStart)} – ${formatMonth(savings.periodEnd)} (${savings.totalMonths} bulan)`}
            action={
              <Link href="/savings" className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline">
                Detail <ArrowRight className="h-4 w-4" />
              </Link>
            }
          />
          <CardBody>
            <SavingsTrajectoryChart data={trajectory} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Kesehatan Keuangan" description="Dibandingkan rencana menabung" />
          <CardBody className="space-y-4">
            <div className="flex items-center justify-between">
              <HealthBadge status={savings.health} />
              <span className="text-xs text-stone-500">{savings.monthsLeft} bulan tersisa</span>
            </div>
            <dl className="space-y-3 text-sm">
              <Row label="Seharusnya terkumpul s/d bulan lalu" value={formatRupiah(savings.expectedByNow)} />
              <Row label="Terkumpul saat ini" value={formatRupiah(savings.collected)} />
              {savings.shortfall > 0 && <Row label="Kekurangan" value={formatRupiah(savings.shortfall)} valueClass="text-amber-700" />}
            </dl>
            <div className="rounded-xl bg-primary-50 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-primary-800">
                <Target className="h-4 w-4" /> Target bulan ini
              </div>
              <p className="mt-1 text-2xl font-semibold text-primary-700 tabular-nums">{formatRupiah(savings.requiredThisMonth)}</p>
              <p className="mt-1 text-xs text-primary-700/80">
                Sudah disetor {formatRupiah(savings.depositedThisMonth)} · kurang {formatRupiah(savings.remainingThisMonth)}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                {savings.contributors.map((c) => (
                  <div key={c.key} className="rounded-lg bg-white/70 px-2.5 py-2">
                    <p className={c.key === "groom" ? "text-groom" : "text-bride"}>{c.key === "groom" ? "Pria (CPP)" : "Wanita (CPW)"}</p>
                    <p className="font-semibold text-stone-900 tabular-nums">{formatRupiah(c.requiredThisMonth)}</p>
                  </div>
                ))}
              </div>
            </div>
            {savings.nextMonthsTarget > 0 && (
              <p className="text-xs text-stone-500">
                Proyeksi target bulan berikutnya: <b className="text-stone-700">{formatRupiah(savings.nextMonthsTarget)}</b>/bulan (disesuaikan otomatis).
              </p>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Anggaran */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Anggaran vs Realisasi per Kategori"
            action={
              <Link href="/expenses" className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline">
                Kelola <ArrowRight className="h-4 w-4" />
              </Link>
            }
          />
          <CardBody>
            {catSummary.length === 0 ? (
              <p className="py-10 text-center text-sm text-stone-400">Belum ada kategori pengeluaran.</p>
            ) : (
              <BudgetVsActualChart
                data={catSummary.map((c) => ({ name: c.category.name, allocated: c.allocated, committed: c.committed, paid: c.paid }))}
              />
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Komposisi Alokasi" description="Berdasarkan alokasi tiap kategori" />
          <CardBody>
            <CategoryDonut
              data={catSummary.map((c) => ({ name: c.category.name, value: c.allocated > 0 ? c.allocated : c.committed }))}
            />
          </CardBody>
        </Card>
      </div>

      {/* Pembayaran & kontribusi */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Jadwal Pembayaran Vendor" description="Item belum lunas yang memiliki tanggal jatuh tempo" />
          {upcoming.length === 0 ? (
            <CardBody>
              <p className="py-6 text-center text-sm text-stone-400">Tidak ada tagihan dengan jatuh tempo. 🎉</p>
            </CardBody>
          ) : (
            <ul className="divide-y divide-stone-100">
              {upcoming.map(({ expense, categoryName, daysLeft, outstanding }) => (
                <li key={expense.id} className="flex items-center gap-4 px-5 py-3">
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                      daysLeft < 0 ? "bg-red-50 text-red-600" : daysLeft <= 14 ? "bg-amber-50 text-amber-600" : "bg-stone-100 text-stone-500",
                    )}
                  >
                    {daysLeft < 0 ? <AlertTriangle className="h-5 w-5" /> : <CalendarClock className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-stone-900">{expense.item_name}</p>
                    <p className="truncate text-xs text-stone-500">
                      {expense.vendor_name ? `${expense.vendor_name} · ` : ""}
                      {categoryName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-stone-900 tabular-nums">{formatRupiah(outstanding)}</p>
                    <p className={cn("text-xs", daysLeft < 0 ? "text-red-600" : daysLeft <= 14 ? "text-amber-600" : "text-stone-500")}>
                      {daysLeft < 0 ? `Lewat ${-daysLeft} hari` : daysLeft === 0 ? "Hari ini" : `${daysLeft} hari lagi`} · {formatDate(expense.due_date)}
                    </p>
                  </div>
                  <Badge tone={expense.status === "dp_paid" ? "info" : "warning"} className="hidden sm:inline-flex">
                    {STATUS_LABEL[expense.status]}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Kontribusi Tabungan" description="Porsi calon pengantin pria & wanita" />
          <CardBody className="space-y-5">
            {savings.contributors.map((c) => (
              <div key={c.key}>
                <div className="flex items-center justify-between text-sm">
                  <span className={cn("font-medium", c.key === "groom" ? "text-groom" : "text-bride")}>
                    {c.key === "groom" ? wedding.groom_name || "Pria (CPP)" : wedding.bride_name || "Wanita (CPW)"}
                  </span>
                  <span className="text-xs text-stone-500">{(c.share * 100).toFixed(0)}%</span>
                </div>
                <p className="mt-1 text-lg font-semibold text-stone-900 tabular-nums">
                  {formatRupiah(c.collected)} <span className="text-xs font-normal text-stone-500">/ {formatRupiah(c.target)}</span>
                </p>
                <Progress
                  className="mt-2"
                  value={c.target > 0 ? c.collected / c.target : 0}
                  barClassName={c.key === "groom" ? "bg-groom" : "bg-bride"}
                />
              </div>
            ))}
            {savings.otherCollected > 0 && (
              <p className="text-xs text-stone-500">
                Termasuk {formatRupiah(savings.otherCollected)} dari keluarga/lainnya (dibagi sesuai porsi).
              </p>
            )}
            <div className="grid grid-cols-3 gap-2 border-t border-stone-100 pt-4 text-center">
              <MiniStat label="Belum DP" value={budget.statusCount.unpaid} cls="text-amber-600" />
              <MiniStat label="Lunas DP" value={budget.statusCount.dp_paid} cls="text-sky-600" />
              <MiniStat label="Lunas" value={budget.statusCount.fully_paid} cls="text-emerald-600" />
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-stone-500">{label}</dt>
      <dd className={cn("font-semibold text-stone-900 tabular-nums", valueClass)}>{value}</dd>
    </div>
  );
}

function MiniStat({ label, value, cls }: { label: string; value: number; cls: string }) {
  return (
    <div>
      <p className={cn("text-xl font-semibold tabular-nums", cls)}>{value}</p>
      <p className="text-[11px] text-stone-500">{label}</p>
    </div>
  );
}
