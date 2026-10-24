import { CircleDollarSign, HandCoins, Layers, ReceiptText, Wallet } from "lucide-react";
import { getBoardData, requireWedding } from "@/lib/wedding";
import { summarizeBudget, summarizeCategories } from "@/lib/calc";
import { formatRupiah } from "@/lib/utils";
import { StatCard } from "@/components/ui/stat-card";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/page-header";
import { ExpenseBoard } from "./expenses-client";

export const metadata = { title: "Pengeluaran & Vendor" };

export default async function ExpensesPage() {
  const { wedding } = await requireWedding();
  const { categories, expenses } = await getBoardData(wedding.id);
  const budget = summarizeBudget(wedding, categories, expenses);
  const summaries = summarizeCategories(categories, expenses);

  return (
    <>
      <PageHeader
        title="Pengeluaran & Vendor"
        description="Kelola kategori, pos pengeluaran, status pembayaran vendor, dan tanggal jatuh tempo."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Target Budget"
          value={formatRupiah(budget.budgetTarget)}
          icon={CircleDollarSign}
          sub={`Dialokasikan ${formatRupiah(budget.totalAllocated)}`}
        />
        <StatCard label="Total Estimasi" value={formatRupiah(budget.totalEstimated)} icon={Layers} tone="gold" sub={`${budget.itemCount} item`} />
        <StatCard
          label="Estimasi/Aktual"
          value={formatRupiah(budget.totalCommitted)}
          icon={ReceiptText}
          tone="stone"
          sub={
            budget.remainingBudget >= 0 ? (
              <>Sisa budget {formatRupiah(budget.remainingBudget)}</>
            ) : (
              <span className="text-red-600">Melebihi budget {formatRupiah(-budget.remainingBudget)}</span>
            )
          }
        />
        <StatCard label="Sudah Dibayar" value={formatRupiah(budget.totalPaid)} icon={HandCoins} tone="emerald">
          <Progress className="mt-3" value={budget.totalCommitted > 0 ? budget.totalPaid / budget.totalCommitted : 0} barClassName="bg-emerald-500" />
        </StatCard>
        <StatCard label="Sisa Tagihan" value={formatRupiah(budget.totalOutstanding)} icon={Wallet} tone="sky" sub="Belum dibayar ke vendor" />
      </div>

      <ExpenseBoard summaries={summaries} categories={categories} />
    </>
  );
}
