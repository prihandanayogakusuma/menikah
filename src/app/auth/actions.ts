"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface AuthState {
  error?: string;
  message?: string;
}

async function siteUrl() {
  const h = await headers();
  return process.env.NEXT_PUBLIC_SITE_URL || h.get("origin") || "http://localhost:3000";
}

function safeNext(value: FormDataEntryValue | null) {
  const next = String(value ?? "");
  return next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

function translateAuthError(message: string) {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Email atau password salah.";
  if (m.includes("email not confirmed")) return "Email belum dikonfirmasi. Silakan cek inbox Anda.";
  if (m.includes("already registered") || m.includes("already been registered")) return "Email sudah terdaftar. Silakan login.";
  if (m.includes("password should be at least")) return "Password minimal 6 karakter.";
  if (m.includes("rate limit")) return "Terlalu banyak percobaan. Coba lagi beberapa saat lagi.";
  return message;
}

export async function signIn(_: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  });
  if (error) return { error: translateAuthError(error.message) };
  redirect(safeNext(formData.get("next")));
}

export async function signUp(_: AuthState, formData: FormData): Promise<AuthState> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("password_confirm") ?? "");
  const next = safeNext(formData.get("next"));

  if (!fullName) return { error: "Nama wajib diisi." };
  if (password.length < 6) return { error: "Password minimal 6 karakter." };
  if (password !== confirm) return { error: "Konfirmasi password tidak sama." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${await siteUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) return { error: translateAuthError(error.message) };
  if (data.user && data.user.identities?.length === 0) return { error: "Email sudah terdaftar. Silakan login." };
  if (data.session) redirect(next);
  return { message: `Kami telah mengirim email konfirmasi ke ${email}. Klik link di email tersebut untuk mengaktifkan akun.` };
}

export async function requestPasswordReset(_: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await siteUrl()}/auth/callback?next=${encodeURIComponent("/settings#password")}`,
  });
  if (error) return { error: translateAuthError(error.message) };
  return { message: "Jika email terdaftar, link reset password sudah dikirim. Silakan cek inbox Anda." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
