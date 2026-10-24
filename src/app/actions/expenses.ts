"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveWeddingId } from "@/lib/wedding";
import type { ActionResult, ExpenseStatus } from "@/lib/types";
import { errorMessage, parseMoney } from "@/lib/utils";

const STATUSES: ExpenseStatus[] = ["unpaid", "dp_paid", "fully_paid"];

function done(message: string): ActionResult {
  revalidatePath("/", "layout");
  return { ok: true, message };
}

// ------------------------------------------------------------------
// Kategori
// ------------------------------------------------------------------

export async function createCategory(formData: FormData): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "Nama kategori wajib diisi." };
  const weddingId = await getActiveWeddingId();
  const supabase = await createClient();
  const { data: last } = await supabase
    .from("categories")
    .select("sort_order")
    .eq("wedding_id", weddingId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase.from("categories").insert({
    wedding_id: weddingId,
    name,
    allocated_budget: parseMoney(formData.get("allocated_budget")),
    sort_order: (last?.sort_order ?? 0) + 1,
  });
  if (error) return { ok: false, error: errorMessage(error) };
  return done("Kategori ditambahkan");
}

export async function updateCategory(id: string, formData: FormData): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "Nama kategori wajib diisi." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .update({ name, allocated_budget: parseMoney(formData.get("allocated_budget")) })
    .eq("id", id);
  if (error) return { ok: false, error: errorMessage(error) };
  return done("Kategori diperbarui");
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { ok: false, error: errorMessage(error) };
  return done("Kategori beserta item di dalamnya dihapus");
}

export async function moveCategory(id: string, direction: "up" | "down"): Promise<ActionResult> {
  const weddingId = await getActiveWeddingId();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, sort_order")
    .eq("wedding_id", weddingId)
    .order("sort_order")
    .order("created_at");
  if (error) return { ok: false, error: errorMessage(error) };
  const list = data ?? [];
  const idx = list.findIndex((c) => c.id === id);
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (idx < 0 || swapIdx < 0 || swapIdx >= list.length) return { ok: true };
  [list[idx], list[swapIdx]] = [list[swapIdx], list[idx]];
  const results = await Promise.all(
    list.map((c, i) => supabase.from("categories").update({ sort_order: i + 1 }).eq("id", c.id)),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return { ok: false, error: errorMessage(failed.error) };
  return done("Urutan kategori diperbarui");
}

/** Set alokasi setiap kategori = total estimasi item di dalamnya. */
export async function syncAllocationsFromEstimates(): Promise<ActionResult> {
  const weddingId = await getActiveWeddingId();
  const supabase = await createClient();
  const [{ data: cats, error: cErr }, { data: items, error: iErr }] = await Promise.all([
    supabase.from("categories").select("id").eq("wedding_id", weddingId),
    supabase.from("expenses").select("category_id, estimated_cost").eq("wedding_id", weddingId),
  ]);
  if (cErr || iErr) return { ok: false, error: errorMessage(cErr || iErr) };
  const totals = new Map<string, number>();
  for (const it of items ?? []) totals.set(it.category_id, (totals.get(it.category_id) ?? 0) + Number(it.estimated_cost || 0));
  const results = await Promise.all(
    (cats ?? []).map((c) => supabase.from("categories").update({ allocated_budget: totals.get(c.id) ?? 0 }).eq("id", c.id)),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return { ok: false, error: errorMessage(failed.error) };
  return done("Alokasi kategori disesuaikan dengan total estimasi");
}

// ------------------------------------------------------------------
// Item Pengeluaran
// ------------------------------------------------------------------

function readExpense(formData: FormData) {
  const itemName = String(formData.get("item_name") ?? "").trim();
  const categoryId = String(formData.get("category_id") ?? "");
  const status = String(formData.get("status") ?? "unpaid") as ExpenseStatus;
  if (!itemName) return { error: "Nama item wajib diisi." } as const;
  if (!categoryId) return { error: "Kategori wajib dipilih." } as const;
  if (!STATUSES.includes(status)) return { error: "Status tidak valid." } as const;

  const estimated = parseMoney(formData.get("estimated_cost"));
  const actual = parseMoney(formData.get("actual_cost"));
  const dp = parseMoney(formData.get("dp_amount"));
  const cost = actual > 0 ? actual : estimated;
  if (status === "dp_paid" && dp <= 0) return { error: "Isi nominal DP untuk status Lunas DP." } as const;
  if (cost > 0 && dp > cost) return { error: "Nominal DP tidak boleh melebihi biaya item." } as const;

  const contractUrl = String(formData.get("contract_url") ?? "").trim();
  return {
    data: {
      item_name: itemName,
      category_id: categoryId,
      status,
      estimated_cost: estimated,
      actual_cost: actual,
      dp_amount: dp,
      due_date: String(formData.get("due_date") ?? "") || null,
      vendor_name: String(formData.get("vendor_name") ?? "").trim() || null,
      vendor_contact: String(formData.get("vendor_contact") ?? "").trim() || null,
      contract_url: contractUrl ? (/^https?:\/\//i.test(contractUrl) ? contractUrl : `https://${contractUrl}`) : null,
      notes: String(formData.get("notes") ?? "").trim() || null,
    },
  } as const;
}

export async function createExpense(formData: FormData): Promise<ActionResult> {
  const parsed = readExpense(formData);
  if ("error" in parsed) return { ok: false, error: parsed.error };
  const weddingId = await getActiveWeddingId();
  const supabase = await createClient();
  const { data: last } = await supabase
    .from("expenses")
    .select("sort_order")
    .eq("category_id", parsed.data.category_id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase
    .from("expenses")
    .insert({ ...parsed.data, wedding_id: weddingId, sort_order: (last?.sort_order ?? 0) + 1 });
  if (error) return { ok: false, error: errorMessage(error) };
  return done("Item pengeluaran ditambahkan");
}

export async function updateExpense(id: string, formData: FormData): Promise<ActionResult> {
  const parsed = readExpense(formData);
  if ("error" in parsed) return { ok: false, error: parsed.error };
  const supabase = await createClient();
  const { error } = await supabase.from("expenses").update(parsed.data).eq("id", id);
  if (error) return { ok: false, error: errorMessage(error) };
  return done("Item pengeluaran diperbarui");
}

export async function setExpenseStatus(id: string, status: ExpenseStatus): Promise<ActionResult> {
  if (!STATUSES.includes(status)) return { ok: false, error: "Status tidak valid." };
  const supabase = await createClient();
  const { data: item, error: getErr } = await supabase.from("expenses").select("dp_amount").eq("id", id).single();
  if (getErr) return { ok: false, error: errorMessage(getErr) };
  if (status === "dp_paid" && Number(item.dp_amount) <= 0) {
    return { ok: false, error: "Nominal DP belum diisi. Edit item untuk mengisi nominal DP." };
  }
  const { error } = await supabase.from("expenses").update({ status }).eq("id", id);
  if (error) return { ok: false, error: errorMessage(error) };
  return done("Status pembayaran diperbarui");
}

export async function deleteExpense(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) return { ok: false, error: errorMessage(error) };
  return done("Item dihapus");
}
