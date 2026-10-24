# 💍 Wedding Budget Planner & Savings Tracker

Aplikasi web untuk membantu calon pengantin menyusun anggaran pernikahan, memantau pembayaran vendor, dan melacak target tabungan bulanan bersama pasangan secara real-time. Implementasi dari [PRD](prd_wedding_budget_savings_tracker.md).

**Stack:** Next.js 16 (App Router, Server Actions) · TypeScript · Tailwind CSS v4 · Recharts · Supabase (PostgreSQL, Auth, RLS, Realtime) · ExcelJS · jsPDF

## Fitur

| Modul | Isi |
| --- | --- |
| **Dashboard** | Total estimasi budget vs pengeluaran aktual, dana terkumpul vs sisa target, status *On Track / Behind Schedule / Target Achieved*, **Dana Siap Pakai** (= total tabungan − DP/pelunasan terbayar), grafik perkembangan tabungan, anggaran vs realisasi per kategori, komposisi alokasi, jadwal jatuh tempo vendor, kontribusi CPP/CPW, countdown hari-H |
| **Savings Tracker** | Target bulanan otomatis dari sisa bulan menuju pernikahan, **auto-recalculate** (kekurangan/kelebihan setoran otomatis disebar ke bulan berikutnya), porsi kontribusi Pria/Wanita berdasarkan **persentase** (50:50, 60:40, …) atau **nominal**, log setoran (tanggal, nominal, kontributor, rekening/wadah, catatan), jadwal target bulanan & grafik |
| **Pengeluaran & Vendor** | Kategori dinamis (tambah/edit/hapus/urutkan), item pengeluaran (estimasi, aktual, DP), status *Belum DP / Lunas DP / Lunas Total* (bisa diubah langsung dari tabel), tanggal jatuh tempo + peringatan, nama vendor, kontak, link kontrak, catatan, indikator over-budget, pencarian & filter |
| **Template Bawaan** | 10 kategori & 39 item kebutuhan nikah sesuai PRD, alokasi budget otomatis per kategori dari total budget |
| **Kolaborasi** | Undang pasangan/keluarga via email + link undangan (salin / WhatsApp / email), peran anggota, pemilik board, keluar/keluarkan anggota, banyak board per akun, **sinkron realtime** antar anggota |
| **Laporan** | Ekspor **Excel** (5 sheet) & **PDF**, pratinjau, cetak |
| **Akun** | Daftar, login, lupa/reset password, konfirmasi email, edit profil |

## Setup

### 1. Supabase
1. Buat project di [supabase.com](https://supabase.com).
2. Buka **SQL Editor → New query**, tempel seluruh isi [`supabase/schema.sql`](supabase/schema.sql), klik **Run**.
3. **Authentication → URL Configuration**
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/auth/callback`
4. (Opsional, untuk development) **Authentication → Providers → Email** → matikan *Confirm email* agar bisa langsung login setelah daftar.

### 2. Environment
```bash
cp .env.local.example .env.local
```
Isi dari **Project Settings → API**:
```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key / publishable key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3. Jalankan
```bash
npm install
npm run dev      # http://localhost:3000
# produksi
npm run build && npm start
```

## Catatan Implementasi

### Perbedaan skema dari PRD
`supabase/schema.sql` kompatibel dengan PRD, dengan beberapa penyempurnaan:
- **RLS anti-rekursi** — policy PRD `wedding_members` yang men-query tabelnya sendiri memicu *infinite recursion* di PostgreSQL. Diganti dengan fungsi `SECURITY DEFINER` `is_wedding_member()` / `is_wedding_owner()`.
- **Pembuatan board via RPC `create_wedding()`** — wedding, keanggotaan owner, savings goal, dan seed template dibuat atomik (tanpa RPC, user tidak bisa membaca wedding yang baru di-insert karena belum menjadi member).
- Tabel baru **`wedding_invitations`** + RPC `get_invitation()` & `accept_invitation()` (email akun wajib sama dengan email undangan).
- Kolom tambahan: `weddings.groom_name/bride_name/created_by`, `wedding_members.is_owner/email/display_name`, `savings_goals.split_mode/groom_target_amount/bride_target_amount`, `expenses.vendor_contact/contract_url/sort_order`, `savings_logs.created_by`.
- Trigger validasi `expenses.category_id` harus milik wedding yang sama.
- Realtime publication untuk tabel data.

### Rumus
- **Biaya acuan item** = biaya aktual (jika diisi) atau estimasi.
- **Terbayar** = `Lunas Total` → biaya acuan · `Lunas DP` → nominal DP · `Belum DP` → 0.
- **Periode menabung** = bulan `start_date` s/d bulan sebelum bulan pernikahan.
- **Target bulan ke-i** = (target total − total setoran sebelum bulan i) ÷ sisa bulan. Bulan mendatang diproyeksikan dengan asumsi target bulan ini terpenuhi.
- **Status keuangan**: *Target Achieved* bila terkumpul ≥ target; *On Track* bila terkumpul ≥ target × (bulan berlalu ÷ total bulan); selain itu *Behind Schedule*.
- **Porsi CPP/CPW**: setoran kategori "Keluarga/Lainnya" dibagi ke kedua pihak sesuai porsi.
- Target tabungan = `total_budget_target`; jika 0, memakai total estimasi item.

### Undangan pasangan
Supabase tidak mengirim email kustom tanpa SMTP/Edge Function, sehingga undangan dibagikan sebagai **link** (salin / WhatsApp / email). Selain itu, undangan otomatis muncul di halaman onboarding/dashboard penerima ketika ia login dengan email yang diundang.

## Struktur

```
supabase/schema.sql          DDL, RLS, fungsi RPC, seed template
src/proxy.ts                 refresh sesi & proteksi route (Next 16 proxy)
src/lib/calc.ts              kalkulasi anggaran & tabungan (pure functions)
src/lib/export.ts            ekspor Excel & PDF
src/lib/wedding.ts           helper server: user, board aktif, query data
src/lib/supabase/*           klien browser / server / proxy
src/app/actions/*            Server Actions (wedding, savings, expenses, members)
src/app/(auth)/*             login, register, lupa password
src/app/(app)/*              dashboard, savings, expenses, members, reports, settings
src/app/onboarding           buat board pertama
src/app/invite/[token]       terima undangan
src/components/*             UI kit, app shell, grafik, realtime refresher
```
