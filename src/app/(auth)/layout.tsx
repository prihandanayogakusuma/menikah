import { Heart } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-gold-500 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold tracking-wide">
          <Heart className="h-5 w-5 fill-white" /> Wedding Budget Planner
        </div>
        <div className="max-w-md">
          <h1 className="font-serif text-4xl leading-tight font-semibold">Rencanakan hari bahagia tanpa pusing soal anggaran.</h1>
          <ul className="mt-8 space-y-3 text-sm text-white/90">
            <li>✦ Template lengkap 10 kategori kebutuhan nikah</li>
            <li>✦ Target tabungan bulanan otomatis & porsi CPP / CPW</li>
            <li>✦ Pantau DP, pelunasan & jatuh tempo vendor</li>
            <li>✦ Satu dashboard bersama pasangan & keluarga</li>
          </ul>
        </div>
        <p className="text-xs text-white/70">Data Anda tersimpan aman di Supabase dengan Row Level Security.</p>
        <div className="pointer-events-none absolute -right-24 -bottom-24 h-80 w-80 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -top-16 right-24 h-40 w-40 rounded-full bg-white/10" />
      </section>
      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 font-semibold text-primary-700 lg:hidden">
            <Heart className="h-5 w-5 fill-primary-600 text-primary-600" /> Wedding Budget Planner
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}
