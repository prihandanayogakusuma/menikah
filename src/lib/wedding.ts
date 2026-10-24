import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { Category, Expense, SavingsGoal, SavingsLog, Wedding, WeddingInvitation, WeddingMember } from "./types";

export const ACTIVE_WEDDING_COOKIE = "active_wedding_id";

export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getMemberships = cache(async () => {
  const user = await getUser();
  if (!user) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("wedding_members")
    .select("*, wedding:weddings(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as (WeddingMember & { wedding: Wedding })[]).map((m) => ({
    ...m,
    wedding: { ...m.wedding, total_budget_target: Number(m.wedding.total_budget_target ?? 0) },
  }));
});

/** Wedding aktif untuk user (dari cookie, fallback ke board pertama). Redirect bila belum login / belum punya board. */
export const requireWedding = cache(async () => {
  const user = await getUser();
  if (!user) redirect("/login");
  const memberships = await getMemberships();
  if (memberships.length === 0) redirect("/onboarding");

  const cookieStore = await cookies();
  const activeId = cookieStore.get(ACTIVE_WEDDING_COOKIE)?.value;
  const membership = memberships.find((m) => m.wedding_id === activeId) ?? memberships[0];
  return { user, membership, wedding: membership.wedding, memberships };
});

/** ID wedding aktif untuk Server Actions (RLS tetap menjadi penjaga utama). */
export async function getActiveWeddingId() {
  const { wedding } = await requireWedding();
  return wedding.id;
}

export const getBoardData = cache(async (weddingId: string) => {
  const supabase = await createClient();
  const [categories, expenses, goal, logs] = await Promise.all([
    supabase.from("categories").select("*").eq("wedding_id", weddingId).order("sort_order").order("created_at"),
    supabase.from("expenses").select("*").eq("wedding_id", weddingId).order("sort_order").order("created_at"),
    supabase.from("savings_goals").select("*").eq("wedding_id", weddingId).maybeSingle(),
    supabase.from("savings_logs").select("*").eq("wedding_id", weddingId).order("deposit_date", { ascending: false }).order("created_at", { ascending: false }),
  ]);
  const err = categories.error || expenses.error || goal.error || logs.error;
  if (err) throw new Error(err.message);
  return {
    categories: normalize<Category>(categories.data, ["allocated_budget"]),
    expenses: normalize<Expense>(expenses.data, ["estimated_cost", "actual_cost", "dp_amount"]),
    goal: goal.data ? normalize<SavingsGoal>([goal.data], ["groom_target_amount", "bride_target_amount"])[0] : null,
    logs: normalize<SavingsLog>(logs.data, ["amount"]),
  };
});

export async function getMembersData(weddingId: string) {
  const supabase = await createClient();
  const [members, invitations] = await Promise.all([
    supabase.from("wedding_members").select("*").eq("wedding_id", weddingId).order("created_at"),
    supabase.from("wedding_invitations").select("*").eq("wedding_id", weddingId).order("created_at", { ascending: false }),
  ]);
  if (members.error) throw new Error(members.error.message);
  if (invitations.error) throw new Error(invitations.error.message);
  return {
    members: (members.data ?? []) as WeddingMember[],
    invitations: (invitations.data ?? []) as WeddingInvitation[],
  };
}

/** Undangan pending yang ditujukan ke email user yang sedang login. */
export async function getMyPendingInvitations() {
  const user = await getUser();
  if (!user?.email) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("wedding_invitations")
    .select("*")
    .eq("status", "pending")
    .ilike("email", user.email);
  const memberships = await getMemberships();
  const joined = new Set(memberships.map((m) => m.wedding_id));
  const invitations = ((data ?? []) as WeddingInvitation[]).filter((i) => !joined.has(i.wedding_id));

  // Judul board diambil via RPC karena user belum menjadi anggota (terhalang RLS)
  return Promise.all(
    invitations.map(async (inv) => {
      const { data: info } = await supabase.rpc("get_invitation", { p_token: inv.token });
      const row = Array.isArray(info) ? info[0] : null;
      return {
        token: inv.token,
        title: (row?.wedding_title as string | undefined) ?? "Wedding Board",
        inviter: (row?.inviter_name as string | null | undefined) ?? null,
        role: inv.role,
      };
    }),
  );
}

/** Supabase mengembalikan kolom DECIMAL sebagai string — ubah ke number. */
function normalize<T>(rows: unknown[] | null, numericKeys: string[]): T[] {
  return (rows ?? []).map((row) => {
    const r = { ...(row as Record<string, unknown>) };
    for (const k of numericKeys) r[k] = Number(r[k] ?? 0);
    return r as T;
  });
}
