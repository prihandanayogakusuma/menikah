# 📋 Product Requirement Document (PRD)
## Wedding Budget Planner & Savings Tracker (Web Application)

**Versi:** 1.0  
**Stack Teknologi Rekomendasi:**
- **Frontend:** Next.js (App Router), Tailwind CSS, Shadcn UI / Tremor, Recharts
- **Backend & Database:** Supabase (PostgreSQL, Supabase Auth, Row Level Security / RLS)

---

## 1. Ringkasan Produk & Tujuan
Aplikasi web ini dirancang untuk membantu pasangan calon pengantin menyusun, memantau, dan mengontrol alokasi anggaran pernikahan serta melacak target tabungan bulanan secara *real-time*.

Aplikasi dilengkapi dengan:
1. **Template bawaan (*preset*)** rincian kebutuhan nikah lengkap.
2. **Savings Tracker & Target Tabungan** (kalkulasi target bulanan, pembagian porsi Pria/Wanita, dan riwayat setoran).
3. **Expense & Vendor Payment Manager** (DP, Pelunasan, Tanggal Jatuh Tempo).
4. **Multi-User Collaboration / Family Access** (Calon pengantin pria dan wanita dapat mengakses 1 *dashboard* bersama).

---

## 2. Fitur Utama & Kebutuhan Pengguna (User Stories)

### A. Dashboard & Analytics
- **Ringkasan Anggaran:** Total Estimasi Budget vs Total Pengeluaran Aktual.
- **Ringkasan Tabungan:** Total Dana Terkumpul vs Sisa Target Tabungan.
- **Kesehatan Keuangan (*Financial Health*):** Status *On Track*, *Behind Schedule*, atau *Target Achieved*.
- **Cash Flow Siap Pakai:** `Dana Siap Pakai = Total Tabungan - Total DP/Pelunasan Terbayar`.

### B. Savings Tracker & Target Tabungan
- **Target Bulanan Otomatis:** Sistem menghitung nominal tabungan bulanan berdasarkan sisa bulan menuju tanggal pernikahan.
- **Porsi Kontribusi:** Pembagian target antara Calon Pengantin Pria (CPP) & Calon Pengantin Wanita (CPW) berdasarkan persentase (misal 50:50, 60:40) atau nominal.
- **Log Setoran Tabungan:** Pencatatan riwayat setoran (Tanggal, Nominal, Kontributor: Pria/Wanita, Nama Rekening/Wadah).
- **Auto-Recalculate:** Jika setoran bulan tertentu kurang/lebih, target bulan-bulan berikutnya otomatis disesuaikan.

### C. Dynamic Expense Manager
- **Kategori & Sub-Kategori Dinamis:** Pengguna bisa menambah/mengedit/menghapus pos pengeluaran.
- **Tracking Pembayaran Vendor:** Status *Belum DP*, *Lunas DP*, *Lunas Total*, serta Tanggal Jatuh Tempo.
- **Catatan & Vendor:** Menyimpan nama vendor, kontak, dan link kontrak/catatan khusus.

### D. Multi-User Collaboration (Shared Board)
- Pengguna dapat mengundang pasangan (*partner*) via email untuk mengelola *wedding board* yang sama secara interaktif.

---

## 3. Skema Database Supabase (PostgreSQL DDL & RLS)

Jalankan perintah SQL berikut di **SQL Editor Supabase**:

```sql
-- 1. Tabel Pasangan / Wedding Project
CREATE TABLE weddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    title VARCHAR(255) NOT NULL,
    wedding_date DATE NOT NULL,
    total_budget_target DECIMAL(15,2) DEFAULT 0.00
);

-- 2. Tabel Relasi Pasangan & User (Collaboration)
CREATE TABLE wedding_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'partner', -- 'groom', 'bride', 'admin'
    UNIQUE(wedding_id, user_id)
);

-- 3. Tabel Target Tabungan (Savings Goals)
CREATE TABLE savings_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE UNIQUE,
    groom_share_percent INT DEFAULT 50,
    bride_share_percent INT DEFAULT 50,
    start_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabel Log Setoran Tabungan
CREATE TABLE savings_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE,
    contributor_type VARCHAR(20) CHECK (contributor_type IN ('groom', 'bride', 'other')),
    amount DECIMAL(15,2) NOT NULL,
    deposit_date DATE NOT NULL DEFAULT CURRENT_DATE,
    account_name VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabel Kategori Pengeluaran
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    allocated_budget DECIMAL(15,2) DEFAULT 0.00,
    sort_order INT DEFAULT 0
);

-- 6. Tabel Pos Pengeluaran / Expense Items
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    estimated_cost DECIMAL(15,2) DEFAULT 0.00,
    actual_cost DECIMAL(15,2) DEFAULT 0.00,
    dp_amount DECIMAL(15,2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'dp_paid', 'fully_paid')),
    due_date DATE,
    vendor_name VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================

ALTER TABLE weddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE wedding_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Helper Policy: Akses berdasarkan keanggotaan di wedding_members
CREATE POLICY "Akses Wedding Member" ON weddings
    FOR ALL USING (
        id IN (SELECT wedding_id FROM wedding_members WHERE user_id = auth.uid())
    );

CREATE POLICY "Akses Member Table" ON wedding_members
    FOR ALL USING (
        wedding_id IN (SELECT wedding_id FROM wedding_members WHERE user_id = auth.uid())
    );

CREATE POLICY "Akses Savings Goals" ON savings_goals
    FOR ALL USING (
        wedding_id IN (SELECT wedding_id FROM wedding_members WHERE user_id = auth.uid())
    );

CREATE POLICY "Akses Savings Logs" ON savings_logs
    FOR ALL USING (
        wedding_id IN (SELECT wedding_id FROM wedding_members WHERE user_id = auth.uid())
    );

CREATE POLICY "Akses Categories" ON categories
    FOR ALL USING (
        wedding_id IN (SELECT wedding_id FROM wedding_members WHERE user_id = auth.uid())
    );

CREATE POLICY "Akses Expenses" ON expenses
    FOR ALL USING (
        wedding_id IN (SELECT wedding_id FROM wedding_members WHERE user_id = auth.uid())
    );
```

---

## 4. Templat Bawaan (*Default Checklist & Budget Template*)

Saat pengguna membuat akun/project baru, sistem secara otomatis menambahkan kategori & item *default* berikut:

### 1. Administrasi & Keagamaan / Legal
- Biaya KUA / Rumah Ibadah / Catatan Sipil
- Kursus Calon Pengantin (Suscatin)
- Legalitas, Fotokopi, & Materai
- Infaq & Transport Penghulu / Petugas

### 2. Tempat & Dekorasi (Venue & Decor)
- Sewa Gedung / Venue / Tenda & Flooring
- Dekorasi Pelaminan & Area Resepsi
- Dekorasi Akad Nikah / Pemberkatan
- Lighting, Sound System, & Genset

### 3. Katering (Catering)
- Makanan Utama (Buffet Utama)
- Makanan Gubokan / Food Stalls
- Coffee Break & Makanan Akad
- Konsumsi Panitia & Keluarga (H-1 & Hari-H)
- Air Mineral & Soft Drinks

### 4. Busana & Rias (Attire & MUA)
- Rias & Busana Pengantin (Akad & Resepsi)
- Rias & Busana Orang Tua / Mertua
- Seragam & Rias Panitia / Bridesmaid / Groomsmen
- Perhiasan & Aksesori Pengantin

### 5. Dokumentasi
- Pre-wedding Photoshoot (Studio / Outdoor, MUA, Busana)
- Foto & Video Liputan Hari-H
- Album Foto Fisik & Cinematic Video Highlight
- Live Streaming (Opsional)

### 6. Mahar & Seserahan
- Mas Pencaharian / Mahar (Emas, Uang, Alat Shalat)
- Kotak & Hias Mahar
- Boks & Hias Seserahan / Hantaran
- Angpao / Amplop Adat

### 7. Undangan & Souvenir
- Undangan Digital (Website / Video)
- Cetak Undangan Fisik
- Souvenir Tamu
- Buku Tamu (Guest Book) / QR Code Scanner
- Biaya Kirim Undangan & Souvenir

### 8. Hiburan & Event Organizer
- Master of Ceremony (MC Akad & Resepsi)
- Music Entertainment (Band / Akustik / Sound System)
- Wedding Organizer (WO) / Event Organizer Hari-H

### 9. Cincin Nikah & Perhiasan
- Cincin Nikah Pria & Wanita
- Grafir Nama & Kotak Cincin

### 10. Logistik, Operasional & Lain-lain
- Transportasi Pengantin & Keluarga
- Akomodasi / Kamar Hotel Keluarga & Vendor
- Biaya Kebersihan & Keamanan Venue
- Biaya Tak Terduga / Buffer Fund (10-15%)

---

## 5. Tahapan Pengembangan (Roadmap)

1. **Fase 1:** Setup Supabase (Auth, Table Creation, RLS Policy) & Next.js Project Starter.
2. **Fase 2:** Implementasi UI Dashboard, Target Tabungan (Savings Tracker), & Form Log Setoran.
3. **Fase 3:** Implementasi Pos Pengeluaran (Expense Management), Dynamic Category, & Seed Template Bawaan.
4. **Fase 4:** Fitur Undangi Pasangan (Multi-User Shared Board) & Pengujian Ekspor Data (PDF/Excel).