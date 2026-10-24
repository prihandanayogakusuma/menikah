"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil, PiggyBank, Plus, Settings2, Trash2 } from "lucide-react";
import { createSavingsLog, deleteSavingsLog, updateSavingsGoal, updateSavingsLog } from "@/app/actions/savings";
import type { ActionResult, ContributorType, SavingsGoal, SavingsLog } from "@/lib/types";
import { cn, formatDate, formatRupiah, toISODate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Modal } from "@/components/ui/modal";
import { ConfirmButton } from "@/components/ui/confirm";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";

type Names = { groom: string; bride: string };

function useSubmit(onSuccess: () => void) {
  const [pending, start] = useTransition();
  const submit = (fn: () => Promise<ActionResult>) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) return void toast.error(res.error);
      toast.success(res.message ?? "Tersimpan");
      onSuccess();
    });
  return { pending, submit };
}

// ------------------------------------------------------------------
// Form setoran
// ------------------------------------------------------------------

function LogForm({ log, names, onDone }: { log?: SavingsLog; names: Names; onDone: () => void }) {
  const { pending, submit } = useSubmit(onDone);
  const [contributor, setContributor] = useState<ContributorType>(log?.contributor_type ?? "groom");

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        submit(() => (log ? updateSavingsLog(log.id, fd) : createSavingsLog(fd)));
      }}
    >
      <Field label="Kontributor">
        <input type="hidden" name="contributor_type" value={contributor} />
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["groom", names.groom],
              ["bride", names.bride],
              ["other", "Keluarga / Lainnya"],
            ] as const
          ).map(([key, label]) => (
            <button
              type="button"
              key={key}
              onClick={() => setContributor(key)}
              className={cn(
                "truncate rounded-lg border px-2 py-2 text-sm font-medium transition-colors",
                contributor === key
                  ? key === "groom"
                    ? "border-groom bg-blue-50 text-groom"
                    : key === "bride"
                      ? "border-bride bg-primary-50 text-bride"
                      : "border-stone-400 bg-stone-100 text-stone-800"
                  : "border-stone-200 text-stone-600 hover:bg-stone-50",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nominal setoran" htmlFor="amount">
          <MoneyInput id="amount" name="amount" defaultValue={log?.amount} required />
        </Field>
        <Field label="Tanggal setoran" htmlFor="deposit_date">
          <Input id="deposit_date" name="deposit_date" type="date" required defaultValue={log?.deposit_date ?? toISODate(new Date())} />
        </Field>
      </div>
      <Field label="Nama rekening / wadah" htmlFor="account_name" hint="cth. BCA Tabungan Nikah, Emas Antam, Reksadana">
        <Input id="account_name" name="account_name" defaultValue={log?.account_name ?? ""} placeholder="Rekening bersama" list="account-suggestions" />
      </Field>
      <Field label="Catatan" htmlFor="notes">
        <Textarea id="notes" name="notes" defaultValue={log?.notes ?? ""} placeholder="Opsional" />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onDone}>
          Batal
        </Button>
        <Button type="submit" loading={pending}>
          {log ? "Simpan Perubahan" : "Catat Setoran"}
        </Button>
      </div>
    </form>
  );
}

export function AddLogButton({ names }: { names: Names }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Catat Setoran
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Catat Setoran Tabungan">
        <LogForm names={names} onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}

// ------------------------------------------------------------------
// Pengaturan target
// ------------------------------------------------------------------

export function GoalSettingsButton({
  goal,
  budgetTarget,
  estimatedTotal,
  names,
}: {
  goal: SavingsGoal | null;
  budgetTarget: number;
  estimatedTotal: number;
  names: Names;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState(goal?.split_mode ?? "percent");
  const [groomPct, setGroomPct] = useState(goal?.groom_share_percent ?? 50);
  const [budget, setBudget] = useState(budgetTarget);
  const { pending, submit } = useSubmit(() => setOpen(false));
  const target = budget > 0 ? budget : estimatedTotal;

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Settings2 className="h-4 w-4" /> Atur Target
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Pengaturan Target Tabungan" size="lg">
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            submit(() => updateSavingsGoal(new FormData(e.currentTarget)));
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Total target budget / tabungan" htmlFor="total_budget_target" hint={budget <= 0 ? `Kosong = pakai total estimasi (${formatRupiah(estimatedTotal)})` : undefined}>
              <MoneyInput id="total_budget_target" name="total_budget_target" defaultValue={budgetTarget} onValueChange={setBudget} />
            </Field>
            <Field label="Mulai menabung sejak" htmlFor="start_date" hint="Menentukan jumlah bulan periode menabung">
              <Input id="start_date" name="start_date" type="date" required defaultValue={goal?.start_date ?? toISODate(new Date())} />
            </Field>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-stone-700">Metode pembagian porsi</p>
            <input type="hidden" name="split_mode" value={mode} />
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["percent", "Persentase", "cth. 50:50, 60:40"],
                  ["nominal", "Nominal", "Tentukan jumlah tiap orang"],
                ] as const
              ).map(([key, label, desc]) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => setMode(key)}
                  className={cn(
                    "rounded-xl border p-3 text-left",
                    mode === key ? "border-primary-500 bg-primary-50" : "border-stone-200 hover:bg-stone-50",
                  )}
                >
                  <p className="text-sm font-medium text-stone-900">{label}</p>
                  <p className="text-xs text-stone-500">{desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className={cn(mode !== "percent" && "hidden")}>
            <div className="flex items-center justify-between text-sm font-medium">
              <span className="text-groom">
                {names.groom} {groomPct}%
              </span>
              <span className="text-bride">
                {names.bride} {100 - groomPct}%
              </span>
            </div>
            <input
              type="range"
              name="groom_share_percent"
              min={0}
              max={100}
              step={5}
              value={groomPct}
              onChange={(e) => setGroomPct(Number(e.target.value))}
              className="mt-2 w-full accent-primary-600"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {[50, 60, 40, 70, 30].map((v) => (
                <button
                  type="button"
                  key={v}
                  onClick={() => setGroomPct(v)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs",
                    groomPct === v ? "border-primary-500 bg-primary-50 text-primary-700" : "border-stone-200 text-stone-600 hover:bg-stone-50",
                  )}
                >
                  {v}:{100 - v}
                </button>
              ))}
            </div>
            <p className="mt-3 text-sm text-stone-600">
              {names.groom}: <b>{formatRupiah((target * groomPct) / 100)}</b> · {names.bride}: <b>{formatRupiah((target * (100 - groomPct)) / 100)}</b>
            </p>
          </div>

          <div className={cn("grid gap-4 sm:grid-cols-2", mode !== "nominal" && "hidden")}>
            <Field label={`Target ${names.groom}`} htmlFor="groom_target_amount">
              <MoneyInput id="groom_target_amount" name="groom_target_amount" defaultValue={goal?.groom_target_amount} />
            </Field>
            <Field label={`Target ${names.bride}`} htmlFor="bride_target_amount">
              <MoneyInput id="bride_target_amount" name="bride_target_amount" defaultValue={goal?.bride_target_amount} />
            </Field>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" loading={pending}>
              Simpan
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

// ------------------------------------------------------------------
// Tabel riwayat setoran
// ------------------------------------------------------------------

export function LogsTable({ logs, names }: { logs: SavingsLog[]; names: Names }) {
  const [filter, setFilter] = useState<"all" | ContributorType>("all");
  const [editing, setEditing] = useState<SavingsLog | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const label = (c: ContributorType) => (c === "groom" ? names.groom : c === "bride" ? names.bride : "Keluarga / Lainnya");
  const filtered = useMemo(() => (filter === "all" ? logs : logs.filter((l) => l.contributor_type === filter)), [logs, filter]);
  const total = filtered.reduce((a, b) => a + Number(b.amount), 0);
  const accounts = useMemo(() => Array.from(new Set(logs.map((l) => l.account_name).filter(Boolean))) as string[], [logs]);

  return (
    <Card className="mt-6 overflow-hidden">
      <datalist id="account-suggestions">
        {accounts.map((a) => (
          <option key={a} value={a} />
        ))}
      </datalist>
      <CardHeader
        title="Riwayat Setoran"
        description={`${filtered.length} setoran · total ${formatRupiah(total)}`}
        action={
          <>
            <Select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="h-9 w-auto">
              <option value="all">Semua kontributor</option>
              <option value="groom">{names.groom}</option>
              <option value="bride">{names.bride}</option>
              <option value="other">Keluarga / Lainnya</option>
            </Select>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" /> Tambah
            </Button>
          </>
        }
      />
      {filtered.length === 0 ? (
        <EmptyState icon={PiggyBank} title="Belum ada setoran" description="Catat setoran pertama Anda untuk mulai melacak progres tabungan." />
      ) : (
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="bg-stone-50 text-left text-xs font-medium tracking-wide text-stone-500 uppercase">
              <tr>
                <th className="px-5 py-3">Tanggal</th>
                <th className="px-5 py-3">Kontributor</th>
                <th className="px-5 py-3">Rekening / Wadah</th>
                <th className="px-5 py-3">Catatan</th>
                <th className="px-5 py-3 text-right">Nominal</th>
                <th className="w-24 px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-stone-50/60">
                  <td className="px-5 py-3 whitespace-nowrap text-stone-700">{formatDate(log.deposit_date)}</td>
                  <td className="px-5 py-3">
                    <Badge tone={log.contributor_type === "groom" ? "info" : log.contributor_type === "bride" ? "primary" : "neutral"}>
                      {label(log.contributor_type)}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-stone-600">{log.account_name || "-"}</td>
                  <td className="max-w-[220px] truncate px-5 py-3 text-stone-500" title={log.notes ?? ""}>
                    {log.notes || "-"}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold whitespace-nowrap text-stone-900 tabular-nums">{formatRupiah(log.amount)}</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setEditing(log)} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <ConfirmButton
                        size="icon"
                        variant="ghost"
                        title="Hapus setoran?"
                        description={`Setoran ${formatRupiah(log.amount)} tanggal ${formatDate(log.deposit_date)} akan dihapus. Target bulanan akan dihitung ulang.`}
                        action={() => deleteSavingsLog(log.id)}
                        className="text-stone-400 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </ConfirmButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Catat Setoran Tabungan">
        <LogForm names={names} onDone={() => setAddOpen(false)} />
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Setoran">
        {editing && <LogForm key={editing.id} log={editing} names={names} onDone={() => setEditing(null)} />}
      </Modal>
    </Card>
  );
}
