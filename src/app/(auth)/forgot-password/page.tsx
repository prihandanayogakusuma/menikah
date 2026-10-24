"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset, type AuthState } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { FormAlert } from "@/components/form-alert";

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(requestPasswordReset, {});

  return (
    <div>
      <h2 className="font-serif text-3xl font-semibold text-stone-900">Lupa password</h2>
      <p className="mt-2 text-sm text-stone-500">Masukkan email akun Anda, kami akan mengirim link untuk membuat password baru.</p>
      <form action={action} className="mt-8 space-y-4">
        <FormAlert error={state.error} message={state.message} />
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" required placeholder="nama@email.com" />
        </Field>
        <Button type="submit" className="w-full" size="lg" loading={pending}>
          Kirim link reset
        </Button>
      </form>
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="font-medium text-primary-600 hover:underline">
          Kembali ke halaman masuk
        </Link>
      </p>
    </div>
  );
}
