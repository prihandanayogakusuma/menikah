"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp, type AuthState } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { FormAlert } from "@/components/form-alert";

export function RegisterForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(signUp, {});
  const loginHref = next ? `/login?next=${encodeURIComponent(next)}` : "/login";

  return (
    <div>
      <h2 className="font-serif text-3xl font-semibold text-stone-900">Buat akun</h2>
      <p className="mt-2 text-sm text-stone-500">Mulai susun anggaran & target tabungan pernikahan Anda.</p>

      {state.message ? (
        <div className="mt-8 space-y-4">
          <FormAlert message={state.message} />
          <Link href={loginHref} className="block text-center text-sm font-medium text-primary-600 hover:underline">
            Kembali ke halaman masuk
          </Link>
        </div>
      ) : (
        <form action={action} className="mt-8 space-y-4">
          <input type="hidden" name="next" value={next ?? ""} />
          <FormAlert error={state.error} />
          <Field label="Nama lengkap" htmlFor="full_name">
            <Input id="full_name" name="full_name" autoComplete="name" required placeholder="Nama Anda" />
          </Field>
          <Field label="Email" htmlFor="email">
            <Input id="email" name="email" type="email" autoComplete="email" required placeholder="nama@email.com" />
          </Field>
          <Field label="Password" htmlFor="password" hint="Minimal 6 karakter">
            <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={6} />
          </Field>
          <Field label="Konfirmasi password" htmlFor="password_confirm">
            <Input id="password_confirm" name="password_confirm" type="password" autoComplete="new-password" required minLength={6} />
          </Field>
          <Button type="submit" className="w-full" size="lg" loading={pending}>
            Daftar
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-stone-500">
        Sudah punya akun?{" "}
        <Link href={loginHref} className="font-medium text-primary-600 hover:underline">
          Masuk
        </Link>
      </p>
    </div>
  );
}
