"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, type AuthState } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { FormAlert } from "@/components/form-alert";

export function LoginForm({ next, initialError }: { next?: string; initialError?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(signIn, { error: initialError });
  const registerHref = next ? `/register?next=${encodeURIComponent(next)}` : "/register";

  return (
    <div>
      <h2 className="font-serif text-3xl font-semibold text-stone-900">Selamat datang 👋</h2>
      <p className="mt-2 text-sm text-stone-500">Masuk untuk melanjutkan perencanaan pernikahan Anda.</p>

      <form action={action} className="mt-8 space-y-4">
        <input type="hidden" name="next" value={next ?? ""} />
        <FormAlert error={state.error} message={state.message} />
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required placeholder="nama@email.com" />
        </Field>
        <Field label="Password" htmlFor="password">
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </Field>
        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-sm text-primary-600 hover:underline">
            Lupa password?
          </Link>
        </div>
        <Button type="submit" className="w-full" size="lg" loading={pending}>
          Masuk
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-stone-500">
        Belum punya akun?{" "}
        <Link href={registerHref} className="font-medium text-primary-600 hover:underline">
          Daftar gratis
        </Link>
      </p>
    </div>
  );
}
