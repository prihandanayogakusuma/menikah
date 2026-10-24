"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_WEDDING_COOKIE, getActiveWeddingId, getUser } from "@/lib/wedding";
import type { ActionResult, MemberRole } from "@/lib/types";
import { errorMessage } from "@/lib/utils";

const ROLES: MemberRole[] = ["groom", "bride", "family", "planner", "partner"];

export type InviteResult = ActionResult & { token?: string };

export async function inviteMember(formData: FormData): Promise<InviteResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "partner") as MemberRole;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Format email tidak valid." };
  if (!ROLES.includes(role)) return { ok: false, error: "Peran tidak valid." };

  const user = await getUser();
  if (user?.email?.toLowerCase() === email) return { ok: false, error: "Anda tidak dapat mengundang diri sendiri." };

  const weddingId = await getActiveWeddingId();
  const supabase = await createClient();

  const { data: existingMember } = await supabase
    .from("wedding_members")
    .select("id")
    .eq("wedding_id", weddingId)
    .ilike("email", email)
    .maybeSingle();
  if (existingMember) return { ok: false, error: "Email ini sudah menjadi anggota board." };

  const { data: pending } = await supabase
    .from("wedding_invitations")
    .select("token")
    .eq("wedding_id", weddingId)
    .eq("status", "pending")
    .ilike("email", email)
    .maybeSingle();
  if (pending) {
    revalidatePath("/members");
    return { ok: true, token: pending.token, message: "Undangan untuk email ini sudah ada — link undangan ditampilkan kembali." };
  }

  const { data, error } = await supabase
    .from("wedding_invitations")
    .insert({ wedding_id: weddingId, email, role })
    .select("token")
    .single();
  if (error) return { ok: false, error: errorMessage(error) };
  revalidatePath("/members");
  return { ok: true, token: data.token, message: "Undangan dibuat. Bagikan link undangan ke pasangan Anda." };
}

export async function revokeInvitation(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("wedding_invitations").update({ status: "revoked" }).eq("id", id);
  if (error) return { ok: false, error: errorMessage(error) };
  revalidatePath("/members");
  return { ok: true, message: "Undangan dibatalkan" };
}

export async function deleteInvitation(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("wedding_invitations").delete().eq("id", id);
  if (error) return { ok: false, error: errorMessage(error) };
  revalidatePath("/members");
  return { ok: true, message: "Riwayat undangan dihapus" };
}

export async function removeMember(memberId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("wedding_members").delete().eq("id", memberId).select("id");
  if (error) return { ok: false, error: errorMessage(error) };
  if (!data?.length) return { ok: false, error: "Hanya pemilik board yang dapat mengeluarkan anggota." };
  revalidatePath("/", "layout");
  return { ok: true, message: "Anggota dikeluarkan dari board" };
}

export async function updateMemberRole(memberId: string, role: MemberRole): Promise<ActionResult> {
  if (!ROLES.includes(role)) return { ok: false, error: "Peran tidak valid." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("wedding_members").update({ role }).eq("id", memberId).select("id");
  if (error) return { ok: false, error: errorMessage(error) };
  if (!data?.length) return { ok: false, error: "Anda tidak memiliki akses untuk mengubah peran ini." };
  revalidatePath("/", "layout");
  return { ok: true, message: "Peran diperbarui" };
}

export async function acceptInvitation(token: string): Promise<ActionResult & { weddingId?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_invitation", { p_token: token });
  if (error) return { ok: false, error: errorMessage(error) };
  const store = await cookies();
  store.set(ACTIVE_WEDDING_COOKIE, data as string, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", httpOnly: true });
  revalidatePath("/", "layout");
  return { ok: true, weddingId: data as string, message: "Selamat bergabung! Anda sekarang anggota board ini." };
}
