"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const missingSchema = /relation .* does not exist|could not find the (table|function)/i.test(error.message);
  return (
    <div className="mx-auto mt-16 max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
      <AlertTriangle className="mx-auto h-10 w-10 text-red-500" />
      <h2 className="mt-4 text-lg font-semibold text-stone-900">Terjadi kesalahan</h2>
      <p className="mt-2 text-sm text-stone-600">
        {missingSchema
          ? "Tabel/fungsi database belum tersedia. Jalankan file supabase/schema.sql di SQL Editor Supabase."
          : error.message || "Gagal memuat data."}
      </p>
      <Button className="mt-6" onClick={reset}>
        Coba lagi
      </Button>
    </div>
  );
}
