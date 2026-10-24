"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronsDownUp,
  ChevronsUpDown,
  ExternalLink,
  FolderPlus,
  ListChecks,
  Pencil,
  Phone,
  Plus,
  Scale,
  Search,
  Trash2,
} from "lucide-react";
import {
  createCategory,
  createExpense,
  deleteCategory,
  deleteExpense,
  moveCategory,
  setExpenseStatus,
  syncAllocationsFromEstimates,
  updateCategory,
  updateExpense,
} from "@/app/actions/expenses";
import { applyDefaultTemplate } from "@/app/actions/wedding";
import { costOf, paidAmount, type CategorySummary } from "@/lib/calc";
import type { ActionResult, Category, Expense, ExpenseStatus } from "@/lib/types";
import { cn, daysUntil, formatDate, formatRupiah, STATUS_LABEL } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Modal } from "@/components/ui/modal";
import { ConfirmButton } from "@/components/ui/confirm";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

const STATUS_STYLE: Record<ExpenseStatus, string> = {
  unpaid: "bg-amber-50 text-amber-700 border-amber-200",
  dp_paid: "bg-sky-50 text-sky-700 border-sky-200",
  fully_paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

function useSubmit(onSuccess?: () => void) {
  const [pending, start] = useTransition();
  const submit = (fn: () => Promise<ActionResult>) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) return void toast.error(res.error);
      if (res.message) toast.success(res.message);
      onSuccess?.();
    });
  return { pending, submit };
}

type ExpenseDialog = { mode: "create"; categoryId?: string } | { mode: "edit"; expense: Expense } | null;
type CategoryDialog = { mode: "create" } | { mode: "edit"; category: Category } | null;

export function ExpenseBoard({ summaries, categories }: { summaries: CategorySummary[]; categories: Category[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | ExpenseStatus | "due">("all");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [expenseDialog, setExpenseDialog] = useState<ExpenseDialog>(null);
  const [categoryDialog, setCategoryDialog] = useState<CategoryDialog>(null);
  const template = useSubmit();
  const move = useSubmit();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return summaries.map((s) => ({
      ...s,
      visibleItems: s.items.filter((e) => {
        if (status === "due" && !(e.status !== "fully_paid" && e.due_date && daysUntil(e.due_date) <= 30)) return false;
        if (status !== "all" && status !== "due" && e.status !== status) return false;
        if (!q) return true;
        return [e.item_name, e.vendor_name, e.notes, s.category.name].some((v) => v?.toLowerCase().includes(q));
      }),
    }));
  }, [summaries, query, status]);

  const isFiltering = query.trim() !== "" || status !== "all";
  const allCollapsed = collapsed.size === summaries.length && summaries.length > 0;

  if (summaries.length === 0) {
    return (
      <>
        <Card className="mt-6">
          <EmptyState
            icon={ListChecks}
            title="Belum ada kategori pengeluaran"
            description="Mulai dari template bawaan (10 kategori & 39 item kebutuhan nikah) atau buat kategori sendiri."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button loading={template.pending} onClick={() => template.submit(applyDefaultTemplate)}>
                  <ListChecks className="h-4 w-4" /> Gunakan Template Bawaan
                </Button>
                <Button variant="secondary" onClick={() => setCategoryDialog({ mode: "create" })}>
                  <FolderPlus className="h-4 w-4" /> Kategori Baru
                </Button>
              </div>
            }
          />
        </Card>
        <CategoryFormModal state={categoryDialog} onClose={() => setCategoryDialog(null)} />
      </>
    );
  }

  return (
    <>
      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari item, vendor, catatan…" className="pl-9" />
          </div>
          <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="sm:w-48">
            <option value="all">Semua status</option>
            <option value="unpaid">Belum DP</option>
            <option value="dp_paid">Lunas DP</option>
            <option value="fully_paid">Lunas Total</option>
            <option value="due">Jatuh tempo ≤ 30 hari</option>
          </Select>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(allCollapsed ? new Set() : new Set(summaries.map((s) => s.category.id)))}
          >
            {allCollapsed ? <ChevronsUpDown className="h-4 w-4" /> : <ChevronsDownUp className="h-4 w-4" />}
            {allCollapsed ? "Buka semua" : "Tutup semua"}
          </Button>
          <ConfirmButton
            variant="secondary"
            size="sm"
            title="Sesuaikan alokasi?"
            description="Alokasi budget setiap kategori akan diganti dengan total estimasi item di dalamnya."
            confirmLabel="Sesuaikan"
            action={syncAllocationsFromEstimates}
          >
            <Scale className="h-4 w-4" /> Alokasi = Estimasi
          </ConfirmButton>
          <Button variant="secondary" size="sm" onClick={() => setCategoryDialog({ mode: "create" })}>
            <FolderPlus className="h-4 w-4" /> Kategori
          </Button>
          <Button size="sm" onClick={() => setExpenseDialog({ mode: "create" })}>
            <Plus className="h-4 w-4" /> Item Pengeluaran
          </Button>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {filtered.map((s, idx) => {
          if (isFiltering && s.visibleItems.length === 0) return null;
          const isCollapsed = collapsed.has(s.category.id) && !isFiltering;
          const ratio = s.allocated > 0 ? s.committed / s.allocated : 0;
          return (
            <Card key={s.category.id} className="overflow-hidden">
              <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                <button
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  onClick={() =>
                    setCollapsed((prev) => {
                      const next = new Set(prev);
                      if (next.has(s.category.id)) next.delete(s.category.id);
                      else next.add(s.category.id);
                      return next;
                    })
                  }
                >
                  <ChevronDown className={cn("h-4 w-4 shrink-0 text-stone-400 transition-transform", isCollapsed && "-rotate-90")} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-semibold text-stone-900">{s.category.name}</h3>
                      {s.isOverBudget && (
                        <Badge tone="danger">
                          <AlertTriangle className="h-3 w-3" /> Over budget {formatRupiah(s.committed - s.allocated)}
                        </Badge>
                      )}
                      <span className="text-xs text-stone-400">
                        {s.doneCount}/{s.items.length} lunas
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-stone-500">
                      Alokasi <b className="text-stone-700">{formatRupiah(s.allocated)}</b> · Estimasi/Aktual{" "}
                      <b className="text-stone-700">{formatRupiah(s.committed)}</b> · Dibayar{" "}
                      <b className="text-emerald-700">{formatRupiah(s.paid)}</b>
                    </p>
                  </div>
                </button>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    title="Naikkan"
                    disabled={idx === 0 || move.pending}
                    onClick={() => move.submit(() => moveCategory(s.category.id, "up"))}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    title="Turunkan"
                    disabled={idx === summaries.length - 1 || move.pending}
                    onClick={() => move.submit(() => moveCategory(s.category.id, "down"))}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" title="Edit kategori" onClick={() => setCategoryDialog({ mode: "edit", category: s.category })}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <ConfirmButton
                    size="icon"
                    variant="ghost"
                    className="text-stone-400 hover:text-red-600"
                    title="Hapus kategori?"
                    description={`Kategori "${s.category.name}" beserta ${s.items.length} item di dalamnya akan dihapus permanen.`}
                    action={() => deleteCategory(s.category.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </ConfirmButton>
                  <Button size="sm" variant="secondary" onClick={() => setExpenseDialog({ mode: "create", categoryId: s.category.id })}>
                    <Plus className="h-4 w-4" /> Item
                  </Button>
                </div>
                {s.allocated > 0 && (
                  <Progress
                    value={ratio}
                    className="h-1.5"
                    barClassName={ratio > 1 ? "bg-red-500" : ratio > 0.9 ? "bg-amber-500" : "bg-primary-500"}
                  />
                )}
              </div>

              {!isCollapsed && (
                <div className="border-t border-stone-100">
                  {s.visibleItems.length === 0 ? (
                    <p className="px-5 py-6 text-center text-sm text-stone-400">Belum ada item di kategori ini.</p>
                  ) : (
                    <div className="scrollbar-thin overflow-x-auto">
                      <table className="w-full min-w-[860px] text-sm">
                        <thead className="bg-stone-50 text-left text-[11px] font-medium tracking-wide text-stone-500 uppercase">
                          <tr>
                            <th className="px-5 py-2.5">Item & Vendor</th>
                            <th className="px-3 py-2.5 text-right">Estimasi</th>
                            <th className="px-3 py-2.5 text-right">Aktual</th>
                            <th className="px-3 py-2.5 text-right">DP</th>
                            <th className="px-3 py-2.5 text-right">Sisa</th>
                            <th className="px-3 py-2.5">Status</th>
                            <th className="px-3 py-2.5">Jatuh Tempo</th>
                            <th className="w-20 px-3 py-2.5" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {s.visibleItems.map((e) => (
                            <ExpenseRow key={e.id} expense={e} onEdit={() => setExpenseDialog({ mode: "edit", expense: e })} />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
        {isFiltering && filtered.every((s) => s.visibleItems.length === 0) && (
          <Card>
            <EmptyState icon={Search} title="Tidak ada item yang cocok" description="Coba ubah kata kunci atau filter status." />
          </Card>
        )}
      </div>

      <ExpenseFormModal state={expenseDialog} categories={categories} onClose={() => setExpenseDialog(null)} />
      <CategoryFormModal state={categoryDialog} onClose={() => setCategoryDialog(null)} />
    </>
  );
}

function ExpenseRow({ expense: e, onEdit }: { expense: Expense; onEdit: () => void }) {
  const [pending, start] = useTransition();
  const days = e.due_date ? daysUntil(e.due_date) : null;
  const outstanding = Math.max(0, costOf(e) - paidAmount(e));

  return (
    <tr className={cn("hover:bg-stone-50/60", pending && "opacity-60")}>
      <td className="px-5 py-3">
        <p className="font-medium text-stone-900">{e.item_name}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-stone-500">
          {e.vendor_name && <span>{e.vendor_name}</span>}
          {e.vendor_contact && (
            <span className="inline-flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {e.vendor_contact}
            </span>
          )}
          {e.contract_url && (
            <a href={e.contract_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary-600 hover:underline">
              <ExternalLink className="h-3 w-3" /> Kontrak
            </a>
          )}
          {e.notes && (
            <span className="max-w-[260px] truncate italic" title={e.notes}>
              “{e.notes}”
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-3 text-right text-stone-600 tabular-nums">{formatRupiah(e.estimated_cost)}</td>
      <td className="px-3 py-3 text-right text-stone-900 tabular-nums">{e.actual_cost > 0 ? formatRupiah(e.actual_cost) : "-"}</td>
      <td className="px-3 py-3 text-right text-stone-600 tabular-nums">{e.dp_amount > 0 ? formatRupiah(e.dp_amount) : "-"}</td>
      <td className={cn("px-3 py-3 text-right font-medium tabular-nums", outstanding > 0 ? "text-stone-900" : "text-emerald-600")}>
        {outstanding > 0 ? formatRupiah(outstanding) : "✓"}
      </td>
      <td className="px-3 py-3">
        <select
          value={e.status}
          disabled={pending}
          onChange={(ev) => {
            const next = ev.target.value as ExpenseStatus;
            start(async () => {
              const res = await setExpenseStatus(e.id, next);
              if (!res.ok) toast.error(res.error);
              else toast.success(`Status: ${STATUS_LABEL[next]}`);
            });
          }}
          className={cn("h-7 rounded-full border px-2 text-xs font-medium focus:outline-none", STATUS_STYLE[e.status])}
        >
          <option value="unpaid">Belum DP</option>
          <option value="dp_paid">Lunas DP</option>
          <option value="fully_paid">Lunas Total</option>
        </select>
      </td>
      <td className="px-3 py-3 whitespace-nowrap">
        {e.due_date ? (
          <div>
            <p className="text-stone-700">{formatDate(e.due_date)}</p>
            {e.status !== "fully_paid" && days !== null && (
              <p className={cn("text-[11px]", days < 0 ? "text-red-600" : days <= 14 ? "text-amber-600" : "text-stone-400")}>
                {days < 0 ? `Lewat ${-days} hari` : days === 0 ? "Hari ini" : `${days} hari lagi`}
              </p>
            )}
          </div>
        ) : (
          <span className="text-stone-400">-</span>
        )}
      </td>
      <td className="px-3 py-3">
        <div className="flex justify-end gap-1">
          <Button size="icon" variant="ghost" title="Edit" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
          <ConfirmButton
            size="icon"
            variant="ghost"
            className="text-stone-400 hover:text-red-600"
            title="Hapus item?"
            description={`"${e.item_name}" akan dihapus permanen.`}
            action={() => deleteExpense(e.id)}
          >
            <Trash2 className="h-4 w-4" />
          </ConfirmButton>
        </div>
      </td>
    </tr>
  );
}

function ExpenseFormModal({ state, categories, onClose }: { state: ExpenseDialog; categories: Category[]; onClose: () => void }) {
  const key = state ? (state.mode === "edit" ? state.expense.id : `new-${state.categoryId ?? ""}`) : "closed";
  return (
    <Modal open={!!state} onClose={onClose} title={state?.mode === "edit" ? "Edit Item Pengeluaran" : "Tambah Item Pengeluaran"} size="lg">
      {state && <ExpenseForm key={key} state={state} categories={categories} onClose={onClose} />}
    </Modal>
  );
}

function ExpenseForm({ state, categories, onClose }: { state: NonNullable<ExpenseDialog>; categories: Category[]; onClose: () => void }) {
  const expense = state.mode === "edit" ? state.expense : undefined;
  const defaultCategory = state.mode === "edit" ? state.expense.category_id : (state.categoryId ?? categories[0]?.id);
  const [statusValue, setStatusValue] = useState<ExpenseStatus>(expense?.status ?? "unpaid");
  const { pending, submit } = useSubmit(onClose);

  return (
      <form
        className="space-y-4"
        onSubmit={(ev) => {
          ev.preventDefault();
          const fd = new FormData(ev.currentTarget);
          submit(() => (expense ? updateExpense(expense.id, fd) : createExpense(fd)));
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nama item" htmlFor="item_name" className="sm:col-span-2">
            <Input id="item_name" name="item_name" required defaultValue={expense?.item_name} placeholder="cth. Sewa Gedung Serbaguna" />
          </Field>
          <Field label="Kategori" htmlFor="category_id">
            <Select id="category_id" name="category_id" defaultValue={defaultCategory} required>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status pembayaran" htmlFor="status">
            <Select
              id="status"
              name="status"
              defaultValue={expense?.status ?? "unpaid"}
              onChange={(e) => setStatusValue(e.target.value as ExpenseStatus)}
            >
              <option value="unpaid">Belum DP</option>
              <option value="dp_paid">Lunas DP</option>
              <option value="fully_paid">Lunas Total</option>
            </Select>
          </Field>
          <Field label="Estimasi biaya" htmlFor="estimated_cost">
            <MoneyInput id="estimated_cost" name="estimated_cost" defaultValue={expense?.estimated_cost} />
          </Field>
          <Field label="Biaya aktual (deal)" htmlFor="actual_cost" hint="Isi setelah harga final disepakati">
            <MoneyInput id="actual_cost" name="actual_cost" defaultValue={expense?.actual_cost} />
          </Field>
          <Field
            label="Nominal DP"
            htmlFor="dp_amount"
            hint={statusValue === "dp_paid" ? "Wajib diisi untuk status Lunas DP" : "Dihitung sebagai terbayar saat status Lunas DP"}
          >
            <MoneyInput id="dp_amount" name="dp_amount" defaultValue={expense?.dp_amount} />
          </Field>
          <Field label="Tanggal jatuh tempo" htmlFor="due_date" hint="Tenggat DP / pelunasan berikutnya">
            <Input id="due_date" name="due_date" type="date" defaultValue={expense?.due_date ?? ""} />
          </Field>
        </div>

        <div className="rounded-xl border border-stone-200 p-4">
          <p className="mb-3 text-sm font-semibold text-stone-800">Informasi Vendor</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nama vendor" htmlFor="vendor_name">
              <Input id="vendor_name" name="vendor_name" defaultValue={expense?.vendor_name ?? ""} placeholder="cth. Gedung Graha Asri" />
            </Field>
            <Field label="Kontak vendor" htmlFor="vendor_contact">
              <Input id="vendor_contact" name="vendor_contact" defaultValue={expense?.vendor_contact ?? ""} placeholder="No. HP / WA / email" />
            </Field>
            <Field label="Link kontrak / dokumen" htmlFor="contract_url" className="sm:col-span-2">
              <Input id="contract_url" name="contract_url" defaultValue={expense?.contract_url ?? ""} placeholder="https://drive.google.com/…" />
            </Field>
          </div>
        </div>

        <Field label="Catatan khusus" htmlFor="notes">
          <Textarea id="notes" name="notes" defaultValue={expense?.notes ?? ""} placeholder="cth. Termasuk 500 pax, free testfood" />
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" loading={pending}>
            {expense ? "Simpan Perubahan" : "Tambah Item"}
          </Button>
        </div>
      </form>
  );
}

function CategoryFormModal({ state, onClose }: { state: CategoryDialog; onClose: () => void }) {
  const category = state?.mode === "edit" ? state.category : undefined;
  const { pending, submit } = useSubmit(onClose);
  return (
    <Modal open={!!state} onClose={onClose} title={category ? "Edit Kategori" : "Kategori Baru"} size="sm">
      <form
        key={category?.id ?? "new"}
        className="space-y-4"
        onSubmit={(ev) => {
          ev.preventDefault();
          const fd = new FormData(ev.currentTarget);
          submit(() => (category ? updateCategory(category.id, fd) : createCategory(fd)));
        }}
      >
        <Field label="Nama kategori" htmlFor="name">
          <Input id="name" name="name" required defaultValue={category?.name} placeholder="cth. Honeymoon" />
        </Field>
        <Field label="Alokasi budget" htmlFor="allocated_budget" hint="Batas anggaran untuk kategori ini">
          <MoneyInput id="allocated_budget" name="allocated_budget" defaultValue={category?.allocated_budget} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" loading={pending}>
            Simpan
          </Button>
        </div>
      </form>
    </Modal>
  );
}
