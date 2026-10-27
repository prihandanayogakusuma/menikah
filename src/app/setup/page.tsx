import { redirect } from "next/navigation";
import { Database } from "lucide-react";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/supabase/config";
import { Copyright } from "@/components/copyright";

export const metadata = { title: "Setup" };

export default function SetupPage() {
  if (isSupabaseConfigured) redirect("/login");

  const checks = [
    { name: "NEXT_PUBLIC_SUPABASE_URL", ok: SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("xxxxxxxx") },
    { name: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (atau ..._ANON_KEY)", ok: SUPABASE_ANON_KEY.length > 20 },
  ];

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-4 py-12">
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
          <Database className="h-6 w-6" />
        </div>
        <h1 className="font-serif text-2xl font-semibold text-stone-900">Hubungkan ke Supabase</h1>
        <p className="mt-2 text-sm text-stone-600">
          Aplikasi belum terhubung ke database. Ikuti langkah berikut, lalu restart server <code>npm run dev</code>.
        </p>
        <ul className="mt-4 space-y-1.5 rounded-lg bg-stone-50 p-3 text-sm">
          {checks.map((c) => (
            <li key={c.name} className="flex items-center gap-2">
              <span className={c.ok ? "text-emerald-600" : "text-red-600"}>{c.ok ? "✓" : "✗"}</span>
              <code className="text-xs">{c.name}</code>
              <span className="text-xs text-stone-500">{c.ok ? "terbaca" : "belum terbaca"}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <b>Deploy di Vercel?</b> Isi variabel di atas pada Project → Settings → Environment Variables (centang Production, Preview,
          Development), lalu <b>Redeploy</b>. Variabel <code>NEXT_PUBLIC_*</code> dibaca saat build, jadi menambah variabel tanpa redeploy tidak
          akan berpengaruh.
        </div>
        <ol className="mt-6 list-decimal space-y-3 pl-5 text-sm text-stone-700">
          <li>
            Buat project di <span className="font-medium">supabase.com</span>, lalu buka <span className="font-medium">SQL Editor</span> dan jalankan
            seluruh isi file <code className="rounded bg-stone-100 px-1">supabase/schema.sql</code>.
          </li>
          <li>
            Salin <code className="rounded bg-stone-100 px-1">.env.local.example</code> menjadi{" "}
            <code className="rounded bg-stone-100 px-1">.env.local</code>, kemudian isi:
            <pre className="mt-2 overflow-x-auto rounded-lg bg-stone-900 p-3 text-xs text-stone-100">
{`NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon / publishable key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000`}
            </pre>
          </li>
          <li>
            Di Supabase → Authentication → URL Configuration, set <span className="font-medium">Site URL</span> ke{" "}
            <code className="rounded bg-stone-100 px-1">http://localhost:3000</code> dan tambahkan Redirect URL{" "}
            <code className="rounded bg-stone-100 px-1">http://localhost:3000/auth/callback</code>.
          </li>
        </ol>
      </div>
      <Copyright className="mt-6" />
    </main>
  );
}
