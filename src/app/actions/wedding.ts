"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_WEDDING_COOKIE, getActiveWeddingId, getUser } from "@/lib/wedding";
import type { ActionResult } from "@/lib/types";
import { errorMessage, parseMoney } from "@/lib/utils";

const COOKIE_OPTS = { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" as const, httpOnly: true };

async function setActiveWedding(id: string) {
  const store = await cookies();
  store.set(ACTIVE_WEDDING_COOKIE, id, COOKIE_OPTS);
}

export interface CreateWeddingState {
  error?: string;
}

export async function createWedding(_: CreateWeddingState, formData: FormData): Promise<CreateWeddingState> {
  const title = String(formData.get("title") ?? "").trim();
  const weddingDate = String(formData.get("wedding_date") ?? "");
  const groomName = String(formData.get("groom_name") ?? "").trim();
  const brideName = String(formData.get("bride_name") ?? "").trim();
  const budget = parseMoney(formData.get("total_budget_target"));
  const role = String(formData.get("role") ?? "partner");
  const groomShare = Math.min(100, Math.max(0, Math.round(Number(formData.get("groom_share_percent") ?? 50))));
  const useTemplate = formData.get("use_template") === "on";

  if (!weddingDate) return { error: "Tanggal pernikahan wajib diisi." };
  const finalTitle = title || (groomName && brideName ? `Pernikahan ${groomName} & ${brideName}` : "Pernikahan Kami");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_wedding", {
    p_title: finalTitle,
    p_wedding_date: weddingDate,
    p_total_budget: budget,
    p_groom_name: groomName || null,
    p_bride_name: brideName || null,
    p_role: role,
    p_use_template: useTemplate,
    p_groom_share: groomShare,
  });
  if (error) return { error: errorMessage(error) };

  await setActiveWedding(data as string);
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function switchWedding(weddingId: string): Promise<ActionResult> {
  await setActiveWedding(weddingId);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateWedding(formData: FormData): Promise<ActionResult> {
  const weddingId = await getActiveWeddingId();
  const title = String(formData.get("title") ?? "").trim();
  const weddingDate = String(formData.get("wedding_date") ?? "");
  if (!title) return { ok: false, error: "Nama board wajib diisi." };
  if (!weddingDate) return { ok: false, error: "Tanggal pernikahan wajib diisi." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("weddings")
    .update({
      title,
      wedding_date: weddingDate,
      total_budget_target: parseMoney(formData.get("total_budget_target")),
      groom_name: String(formData.get("groom_name") ?? "").trim() || null,
      bride_name: String(formData.get("bride_name") ?? "").trim() || null,
    })
    .eq("id", weddingId);
  if (error) return { ok: false, error: errorMessage(error) };
  revalidatePath("/", "layout");
  return { ok: true, message: "Data pernikahan diperbarui" };
}

export async function applyDefaultTemplate(): Promise<ActionResult> {
  const weddingId = await getActiveWeddingId();
  const supabase = await createClient();
  const { error } = await supabase.rpc("seed_default_template", { p_wedding_id: weddingId });
  if (error) return { ok: false, error: errorMessage(error) };
  revalidatePath("/", "layout");
  return { ok: true, message: "Template bawaan berhasil ditambahkan" };
}

export async function deleteWedding(): Promise<ActionResult> {
  const weddingId = await getActiveWeddingId();
  const supabase = await createClient();
  const { data, error } = await supabase.from("weddings").delete().eq("id", weddingId).select("id");
  if (error) return { ok: false, error: errorMessage(error) };
  if (!data?.length) return { ok: false, error: "Hanya pemilik board yang dapat menghapus board ini." };
  const store = await cookies();
  store.delete(ACTIVE_WEDDING_COOKIE);
  revalidatePath("/", "layout");
  return { ok: true, message: "Board dihapus" };
}

export async function leaveWedding(): Promise<ActionResult> {
  const weddingId = await getActiveWeddingId();
  const user = await getUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("wedding_members")
    .delete()
    .eq("wedding_id", weddingId)
    .eq("user_id", user!.id)
    .select("id");
  if (error) return { ok: false, error: errorMessage(error) };
  if (!data?.length) return { ok: false, error: "Pemilik board tidak dapat keluar. Hapus board atau tetap sebagai pemilik." };
  const store = await cookies();
  store.delete(ACTIVE_WEDDING_COOKIE);
  revalidatePath("/", "layout");
  return { ok: true, message: "Anda telah keluar dari board" };
}

export async function updateProfile(formData: FormData): Promise<ActionResult> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const role = String(formData.get("role") ?? "");
  if (!fullName) return { ok: false, error: "Nama wajib diisi." };
  const supabase = await createClient();
  const user = await getUser();
  const { error } = await supabase.auth.updateUser({ data: { full_name: fullName } });
  if (error) return { ok: false, error: errorMessage(error) };

  const weddingId = await getActiveWeddingId();
  await supabase.from("wedding_members").update({ display_name: fullName }).eq("user_id", user!.id);
  if (role) {
    await supabase.from("wedding_members").update({ role }).eq("user_id", user!.id).eq("wedding_id", weddingId);
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Profil diperbarui" };
}

export async function updatePassword(formData: FormData): Promise<ActionResult> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("password_confirm") ?? "");
  if (password.length < 6) return { ok: false, error: "Password minimal 6 karakter." };
  if (password !== confirm) return { ok: false, error: "Konfirmasi password tidak sama." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, error: errorMessage(error) };
  return { ok: true, message: "Password berhasil diubah" };
}
