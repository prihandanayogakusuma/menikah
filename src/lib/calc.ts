import type { Category, Expense, HealthStatus, SavingsGoal, SavingsLog, Wedding } from "./types";
import { daysUntil, parseDate } from "./utils";

// ---------------------------------------------------------------------
// Anggaran & Pembayaran Vendor
// ---------------------------------------------------------------------

/** Biaya acuan sebuah item: biaya aktual jika sudah ada, jika belum pakai estimasi. */
export function costOf(e: Pick<Expense, "actual_cost" | "estimated_cost">) {
  const actual = Number(e.actual_cost) || 0;
  return actual > 0 ? actual : Number(e.estimated_cost) || 0;
}

/** Nominal yang sudah dibayarkan ke vendor berdasarkan status pembayaran. */
export function paidAmount(e: Pick<Expense, "status" | "dp_amount" | "actual_cost" | "estimated_cost">) {
  if (e.status === "fully_paid") return costOf(e);
  if (e.status === "dp_paid") return Number(e.dp_amount) || 0;
  return 0;
}

export function outstandingAmount(e: Expense) {
  return Math.max(0, costOf(e) - paidAmount(e));
}

export interface CategorySummary {
  category: Category;
  items: Expense[];
  allocated: number;
  estimated: number;
  actual: number;
  committed: number;
  paid: number;
  outstanding: number;
  isOverBudget: boolean;
  doneCount: number;
}

export function summarizeCategories(categories: Category[], expenses: Expense[]): CategorySummary[] {
  return categories.map((category) => {
    const items = expenses
      .filter((e) => e.category_id === category.id)
      .sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));
    const estimated = sum(items.map((e) => Number(e.estimated_cost) || 0));
    const actual = sum(items.map((e) => Number(e.actual_cost) || 0));
    const committed = sum(items.map(costOf));
    const paid = sum(items.map(paidAmount));
    const allocated = Number(category.allocated_budget) || 0;
    return {
      category,
      items,
      allocated,
      estimated,
      actual,
      committed,
      paid,
      outstanding: Math.max(0, committed - paid),
      isOverBudget: allocated > 0 && committed > allocated,
      doneCount: items.filter((e) => e.status === "fully_paid").length,
    };
  });
}

export interface BudgetSummary {
  budgetTarget: number;
  totalAllocated: number;
  totalEstimated: number;
  totalActual: number;
  totalCommitted: number;
  totalPaid: number;
  totalOutstanding: number;
  remainingBudget: number;
  itemCount: number;
  statusCount: Record<Expense["status"], number>;
}

export function summarizeBudget(wedding: Wedding, categories: Category[], expenses: Expense[]): BudgetSummary {
  const totalEstimated = sum(expenses.map((e) => Number(e.estimated_cost) || 0));
  const totalCommitted = sum(expenses.map(costOf));
  const totalPaid = sum(expenses.map(paidAmount));
  const budgetTarget = Number(wedding.total_budget_target) > 0 ? Number(wedding.total_budget_target) : totalEstimated;
  return {
    budgetTarget,
    totalAllocated: sum(categories.map((c) => Number(c.allocated_budget) || 0)),
    totalEstimated,
    totalActual: sum(expenses.map((e) => Number(e.actual_cost) || 0)),
    totalCommitted,
    totalPaid,
    totalOutstanding: Math.max(0, totalCommitted - totalPaid),
    remainingBudget: budgetTarget - totalCommitted,
    itemCount: expenses.length,
    statusCount: {
      unpaid: expenses.filter((e) => e.status === "unpaid").length,
      dp_paid: expenses.filter((e) => e.status === "dp_paid").length,
      fully_paid: expenses.filter((e) => e.status === "fully_paid").length,
    },
  };
}

export interface UpcomingPayment {
  expense: Expense;
  categoryName: string;
  daysLeft: number;
  outstanding: number;
}

export function upcomingPayments(categories: Category[], expenses: Expense[], today = new Date()): UpcomingPayment[] {
  const names = new Map(categories.map((c) => [c.id, c.name]));
  return expenses
    .filter((e) => e.status !== "fully_paid" && e.due_date)
    .map((e) => ({
      expense: e,
      categoryName: names.get(e.category_id) ?? "-",
      daysLeft: daysUntil(e.due_date!, today),
      outstanding: outstandingAmount(e),
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft);
}

// ---------------------------------------------------------------------
// Tabungan (Savings Tracker)
// ---------------------------------------------------------------------

export interface ScheduleRow {
  index: number;
  month: Date;
  /** Rencana awal (flat): target / jumlah bulan */
  baseline: number;
  /** Target yang disesuaikan otomatis (auto-recalculate) */
  required: number;
  deposited: number;
  cumulative: number;
  plannedCumulative: number;
  phase: "past" | "current" | "future";
  met: boolean;
}

export interface ContributorSummary {
  key: "groom" | "bride";
  share: number; // 0..1
  target: number;
  collected: number;
  remaining: number;
  requiredThisMonth: number;
  depositedThisMonth: number;
}

export interface SavingsSummary {
  target: number;
  collected: number;
  remaining: number;
  progress: number; // 0..1
  totalMonths: number;
  monthsLeft: number;
  elapsedMonths: number;
  expectedByNow: number;
  shortfall: number;
  health: HealthStatus;
  requiredThisMonth: number;
  depositedThisMonth: number;
  remainingThisMonth: number;
  nextMonthsTarget: number;
  baselineMonthly: number;
  schedule: ScheduleRow[];
  contributors: ContributorSummary[];
  otherCollected: number;
  periodStart: Date;
  periodEnd: Date;
  periodOver: boolean;
  nominalMismatch: boolean;
}

function monthDiff(from: Date, to: Date) {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
}

function addMonths(date: Date, n: number) {
  return new Date(date.getFullYear(), date.getMonth() + n, 1);
}

/**
 * Menghitung seluruh metrik tabungan.
 *
 * Periode menabung: dari bulan `start_date` sampai bulan sebelum bulan pernikahan
 * (minimal 1 bulan). Target bulanan dihitung ulang setiap bulan:
 *   target_bulan_i = (target total - total setoran sebelum bulan i) / sisa bulan
 * sehingga kekurangan/kelebihan setoran otomatis tersebar ke bulan-bulan berikutnya.
 */
export function summarizeSavings(
  wedding: Wedding,
  goal: SavingsGoal | null,
  logs: SavingsLog[],
  budgetTarget: number,
  today = new Date(),
): SavingsSummary {
  const target = Math.max(0, budgetTarget);
  const startRaw = goal?.start_date ? parseDate(goal.start_date) : parseDate(wedding.created_at);
  const weddingDate = parseDate(wedding.wedding_date);
  const periodStart = new Date(startRaw.getFullYear(), startRaw.getMonth(), 1);
  const weddingMonth = new Date(weddingDate.getFullYear(), weddingDate.getMonth(), 1);
  const totalMonths = Math.max(1, monthDiff(periodStart, weddingMonth));
  const periodEnd = addMonths(periodStart, totalMonths - 1);
  const currentIdx = monthDiff(periodStart, today); // bisa < 0 (belum mulai) atau >= totalMonths (sudah lewat)

  // Bucket setoran per bulan periode
  const buckets = new Array<number>(totalMonths).fill(0);
  const personBuckets = {
    groom: new Array<number>(totalMonths).fill(0),
    bride: new Array<number>(totalMonths).fill(0),
    other: new Array<number>(totalMonths).fill(0),
  };
  for (const log of logs) {
    const amount = Number(log.amount) || 0;
    const idx = clamp(monthDiff(periodStart, parseDate(log.deposit_date)), 0, totalMonths - 1);
    buckets[idx] += amount;
    personBuckets[log.contributor_type ?? "other"][idx] += amount;
  }

  const collected = sum(buckets);
  const baselineMonthly = target / totalMonths;
  const schedule: ScheduleRow[] = [];

  const cIdx = Math.min(currentIdx, totalMonths); // posisi bulan berjalan dalam periode
  let cumulative = 0;
  // Asumsi kumulatif setelah bulan berjalan (dianggap target bulan ini terpenuhi)
  let assumedAfterCurrent = 0;

  for (let i = 0; i < totalMonths; i++) {
    const cumBefore = cumulative;
    const deposited = buckets[i];
    cumulative += deposited;
    let phase: ScheduleRow["phase"];
    let required: number;

    if (currentIdx < 0) {
      phase = "future";
      required = Math.max(0, target - collected) / totalMonths;
    } else if (i < cIdx) {
      phase = "past";
      required = Math.max(0, target - cumBefore) / (totalMonths - i);
    } else if (i === cIdx) {
      phase = "current";
      required = Math.max(0, target - cumBefore) / (totalMonths - i);
      assumedAfterCurrent = Math.max(cumulative, cumBefore + required);
    } else {
      phase = "future";
      required = Math.max(0, target - assumedAfterCurrent) / (totalMonths - cIdx - 1);
    }

    schedule.push({
      index: i,
      month: addMonths(periodStart, i),
      baseline: baselineMonthly,
      required,
      deposited,
      cumulative,
      plannedCumulative: (target * (i + 1)) / totalMonths,
      phase,
      met: deposited >= required - 0.5,
    });
  }

  const current = schedule.find((r) => r.phase === "current");
  const future = schedule.find((r) => r.phase === "future");
  const elapsedMonths = clamp(currentIdx, 0, totalMonths);
  const expectedByNow = (target * elapsedMonths) / totalMonths;
  const periodOver = currentIdx >= totalMonths;
  const remaining = Math.max(0, target - collected);

  let health: HealthStatus;
  if (target > 0 && collected >= target) health = "achieved";
  else if (periodOver && collected < target) health = "behind";
  else health = collected + 0.5 >= expectedByNow ? "on_track" : "behind";

  // Porsi kontribusi CPP / CPW
  const splitMode = goal?.split_mode ?? "percent";
  let groomTarget: number;
  let brideTarget: number;
  if (splitMode === "nominal") {
    groomTarget = Number(goal?.groom_target_amount) || 0;
    brideTarget = Number(goal?.bride_target_amount) || 0;
  } else {
    const gp = goal?.groom_share_percent ?? 50;
    groomTarget = (target * gp) / 100;
    brideTarget = (target * (goal?.bride_share_percent ?? 100 - gp)) / 100;
  }
  const shareBase = groomTarget + brideTarget;
  const groomShare = shareBase > 0 ? groomTarget / shareBase : 0.5;
  const otherCollected = sum(personBuckets.other);
  const monthsLeftFromCurrent = Math.max(1, totalMonths - Math.max(0, cIdx));

  const contributor = (key: "groom" | "bride", personTarget: number, share: number): ContributorSummary => {
    const own = personBuckets[key];
    const otherShare = personBuckets.other.map((v) => v * share);
    const ownCollected = sum(own) + sum(otherShare);
    const before = (arr: number[]) => (cIdx > 0 ? sum(arr.slice(0, Math.min(cIdx, totalMonths))) : 0);
    const collectedBefore = before(own) + before(otherShare);
    const inCurrent = current ? own[current.index] + otherShare[current.index] : 0;
    const requiredThisMonth = periodOver ? 0 : Math.max(0, personTarget - collectedBefore) / monthsLeftFromCurrent;
    return {
      key,
      share,
      target: personTarget,
      collected: ownCollected,
      remaining: Math.max(0, personTarget - ownCollected),
      requiredThisMonth,
      depositedThisMonth: inCurrent,
    };
  };

  return {
    target,
    collected,
    remaining,
    progress: target > 0 ? Math.min(1, collected / target) : 0,
    totalMonths,
    monthsLeft: periodOver ? 0 : totalMonths - Math.max(0, currentIdx),
    elapsedMonths,
    expectedByNow,
    shortfall: Math.max(0, expectedByNow - collected),
    health,
    requiredThisMonth: current?.required ?? 0,
    depositedThisMonth: current?.deposited ?? 0,
    remainingThisMonth: current ? Math.max(0, current.required - current.deposited) : 0,
    nextMonthsTarget: future?.required ?? 0,
    baselineMonthly,
    schedule,
    contributors: [contributor("groom", groomTarget, groomShare), contributor("bride", brideTarget, 1 - groomShare)],
    otherCollected,
    periodStart,
    periodEnd,
    periodOver,
    nominalMismatch: splitMode === "nominal" && target > 0 && Math.abs(shareBase - target) > 1,
  };
}

export const HEALTH_LABEL: Record<HealthStatus, string> = {
  on_track: "On Track",
  behind: "Behind Schedule",
  achieved: "Target Achieved",
};

export function sum(values: number[]) {
  return values.reduce((a, b) => a + b, 0);
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
