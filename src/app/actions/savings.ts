"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveWeddingId } from "@/lib/wedding";
import type { ActionResult, ContributorType } from "@/lib/types";
import { errorMessage, parseMoney } from "@/lib/utils";

const CONTRIBUTORS: ContributorType[] = ["groom", "bride", "other"];

function readLog(formData: FormData) {
  const amount = parseMoney(formData.get("amount"));
  const contributor = String(formData.get("contributor_type") ?? "") as ContributorType;
  const depositDate = String(formData.get("deposit_date") ?? "");
  if (amount <= 0) return { error: "Nominal setoran harus lebih dari 0." } as const;
  if (!CONTRIBUTORS.includes(contributor)) return { error: "Kontributor tidak valid." } as const;
  if (!depositDate) return { error: "Tanggal setoran wajib diisi." } as const;
  return {
    data: {
      amount,
      contributor_type: contributor,
      deposit_date: depositDate,
      account_name: String(formData.get("account_name") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
    },
  } as const;
}

export async function createSavingsLog(formData: FormData): Promise<ActionResult> {
  const parsed = readLog(formData);
  if ("error" in parsed) return { ok: false, error: parsed.error };
  const weddingId = await getActiveWeddingId();
  const supabase = await createClient();
  const { error } = await supabase.from("savings_logs").insert({ ...parsed.data, wedding_id: weddingId });
  if (error) return { ok: false, error: errorMessage(error) };
  revalidatePath("/", "layout");
  return { ok: true, message: "Setoran dicatat" };
}

export async function updateSavingsLog(id: string, formData: FormData): Promise<ActionResult> {
  const parsed = readLog(formData);
  if ("error" in parsed) return { ok: false, error: parsed.error };
  const supabase = await createClient();
  const { error } = await supabase.from("savings_logs").update(parsed.data).eq("id", id);
  if (error) return { ok: false, error: errorMessage(error) };
  revalidatePath("/", "layout");
  return { ok: true, message: "Setoran diperbarui" };
}

export async function deleteSavingsLog(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("savings_logs").delete().eq("id", id);
  if (error) return { ok: false, error: errorMessage(error) };
  revalidatePath("/", "layout");
  return { ok: true, message: "Setoran dihapus" };
}

export async function updateSavingsGoal(formData: FormData): Promise<ActionResult> {
  const weddingId = await getActiveWeddingId();
  const splitMode = formData.get("split_mode") === "nominal" ? "nominal" : "percent";
  const groomPct = Math.round(Number(formData.get("groom_share_percent") ?? 50));
  if (!Number.isFinite(groomPct) || groomPct < 0 || groomPct > 100) return { ok: false, error: "Persentase harus 0-100." };
  const startDate = String(formData.get("start_date") ?? "");
  if (!startDate) return { ok: false, error: "Tanggal mulai menabung wajib diisi." };

  const supabase = await createClient();
  const { error } = await supabase.from("savings_goals").upsert(
    {
      wedding_id: weddingId,
      split_mode: splitMode,
      groom_share_percent: groomPct,
      bride_share_percent: 100 - groomPct,
      groom_target_amount: parseMoney(formData.get("groom_target_amount")),
      bride_target_amount: parseMoney(formData.get("bride_target_amount")),
      start_date: startDate,
    },
    { onConflict: "wedding_id" },
  );
  if (error) return { ok: false, error: errorMessage(error) };

  const budget = formData.get("total_budget_target");
  if (budget != null) {
    const { error: wErr } = await supabase.from("weddings").update({ total_budget_target: parseMoney(budget) }).eq("id", weddingId);
    if (wErr) return { ok: false, error: errorMessage(wErr) };
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Pengaturan target tabungan disimpan" };
}
