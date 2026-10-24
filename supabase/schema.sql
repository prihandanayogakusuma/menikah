-- =====================================================================
-- Wedding Budget Planner & Savings Tracker — Skema Database Supabase
-- =====================================================================
-- Cara pakai: buka Supabase Dashboard → SQL Editor → New query,
-- tempel seluruh isi file ini, lalu klik "Run".
--
-- Skema ini mengikuti PRD (Bagian 3) dengan beberapa penyempurnaan:
--   * Kolom tambahan (nama pengantin, kontak vendor, link kontrak, dsb).
--   * Tabel `wedding_invitations` untuk fitur undang pasangan.
--   * RLS memakai fungsi SECURITY DEFINER `is_wedding_member()` agar
--     tidak terjadi "infinite recursion" pada policy `wedding_members`.
--   * Fungsi RPC `create_wedding`, `seed_default_template`,
--     `accept_invitation`, `get_invitation` untuk operasi yang perlu
--     melewati RLS secara aman & atomik.
-- Script ini aman dijalankan ulang (idempotent).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. Tabel Pasangan / Wedding Project
-- ---------------------------------------------------------------------
create table if not exists public.weddings (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz default now(),
    title varchar(255) not null,
    wedding_date date not null,
    total_budget_target decimal(15,2) default 0.00,
    groom_name varchar(100),
    bride_name varchar(100),
    created_by uuid references auth.users(id) on delete set null default auth.uid()
);

-- ---------------------------------------------------------------------
-- 2. Tabel Relasi Pasangan & User (Collaboration)
-- ---------------------------------------------------------------------
create table if not exists public.wedding_members (
    id uuid primary key default gen_random_uuid(),
    wedding_id uuid references public.weddings(id) on delete cascade,
    user_id uuid references auth.users(id) on delete cascade,
    role varchar(50) default 'partner', -- 'groom' | 'bride' | 'family' | 'planner' | 'partner'
    is_owner boolean not null default false,
    email varchar(255),
    display_name varchar(100),
    created_at timestamptz default now(),
    unique (wedding_id, user_id)
);

-- ---------------------------------------------------------------------
-- 2b. Tabel Undangan Kolaborasi
-- ---------------------------------------------------------------------
create table if not exists public.wedding_invitations (
    id uuid primary key default gen_random_uuid(),
    wedding_id uuid not null references public.weddings(id) on delete cascade,
    email varchar(255) not null,
    role varchar(50) not null default 'partner',
    token uuid not null unique default gen_random_uuid(),
    status varchar(20) not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
    invited_by uuid references auth.users(id) on delete set null default auth.uid(),
    created_at timestamptz default now(),
    accepted_at timestamptz
);

-- ---------------------------------------------------------------------
-- 3. Tabel Target Tabungan (Savings Goals)
-- ---------------------------------------------------------------------
create table if not exists public.savings_goals (
    id uuid primary key default gen_random_uuid(),
    wedding_id uuid references public.weddings(id) on delete cascade unique,
    groom_share_percent int default 50,
    bride_share_percent int default 50,
    split_mode varchar(10) not null default 'percent' check (split_mode in ('percent', 'nominal')),
    groom_target_amount decimal(15,2) default 0.00,
    bride_target_amount decimal(15,2) default 0.00,
    start_date date default current_date,
    created_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- 4. Tabel Log Setoran Tabungan
-- ---------------------------------------------------------------------
create table if not exists public.savings_logs (
    id uuid primary key default gen_random_uuid(),
    wedding_id uuid references public.weddings(id) on delete cascade,
    contributor_type varchar(20) check (contributor_type in ('groom', 'bride', 'other')),
    amount decimal(15,2) not null,
    deposit_date date not null default current_date,
    account_name varchar(100),
    notes text,
    created_by uuid references auth.users(id) on delete set null default auth.uid(),
    created_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- 5. Tabel Kategori Pengeluaran
-- ---------------------------------------------------------------------
create table if not exists public.categories (
    id uuid primary key default gen_random_uuid(),
    wedding_id uuid references public.weddings(id) on delete cascade,
    name varchar(100) not null,
    allocated_budget decimal(15,2) default 0.00,
    sort_order int default 0,
    created_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- 6. Tabel Pos Pengeluaran / Expense Items
-- ---------------------------------------------------------------------
create table if not exists public.expenses (
    id uuid primary key default gen_random_uuid(),
    category_id uuid references public.categories(id) on delete cascade,
    wedding_id uuid references public.weddings(id) on delete cascade,
    item_name varchar(255) not null,
    estimated_cost decimal(15,2) default 0.00,
    actual_cost decimal(15,2) default 0.00,
    dp_amount decimal(15,2) default 0.00,
    status varchar(50) default 'unpaid' check (status in ('unpaid', 'dp_paid', 'fully_paid')),
    due_date date,
    vendor_name varchar(255),
    vendor_contact varchar(255),
    contract_url text,
    notes text,
    sort_order int default 0,
    created_at timestamptz default now()
);

-- Index untuk query yang sering dipakai
create index if not exists idx_members_user on public.wedding_members(user_id);
create index if not exists idx_members_wedding on public.wedding_members(wedding_id);
create index if not exists idx_invites_wedding on public.wedding_invitations(wedding_id);
create index if not exists idx_invites_email on public.wedding_invitations(lower(email));
create index if not exists idx_logs_wedding on public.savings_logs(wedding_id, deposit_date);
create index if not exists idx_categories_wedding on public.categories(wedding_id, sort_order);
create index if not exists idx_expenses_wedding on public.expenses(wedding_id);
create index if not exists idx_expenses_category on public.expenses(category_id, sort_order);

-- =====================================================================
-- FUNGSI HELPER (SECURITY DEFINER → tidak terkena RLS, mencegah rekursi)
-- =====================================================================

create or replace function public.is_wedding_member(wid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
    select exists (
        select 1 from public.wedding_members
        where wedding_id = wid and user_id = auth.uid()
    );
$$;

create or replace function public.is_wedding_owner(wid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
    select exists (
        select 1 from public.wedding_members
        where wedding_id = wid and user_id = auth.uid() and is_owner
    );
$$;

-- =====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================

alter table public.weddings enable row level security;
alter table public.wedding_members enable row level security;
alter table public.wedding_invitations enable row level security;
alter table public.savings_goals enable row level security;
alter table public.savings_logs enable row level security;
alter table public.categories enable row level security;
alter table public.expenses enable row level security;

-- Bersihkan policy lama (termasuk versi asli dari PRD) bila ada
drop policy if exists "Akses Wedding Member" on public.weddings;
drop policy if exists "Akses Member Table" on public.wedding_members;
drop policy if exists "Akses Savings Goals" on public.savings_goals;
drop policy if exists "Akses Savings Logs" on public.savings_logs;
drop policy if exists "Akses Categories" on public.categories;
drop policy if exists "Akses Expenses" on public.expenses;
drop policy if exists "weddings_select" on public.weddings;
drop policy if exists "weddings_update" on public.weddings;
drop policy if exists "weddings_delete" on public.weddings;
drop policy if exists "members_select" on public.wedding_members;
drop policy if exists "members_update" on public.wedding_members;
drop policy if exists "members_delete" on public.wedding_members;
drop policy if exists "invites_select" on public.wedding_invitations;
drop policy if exists "invites_insert" on public.wedding_invitations;
drop policy if exists "invites_update" on public.wedding_invitations;
drop policy if exists "invites_delete" on public.wedding_invitations;

-- weddings: insert hanya lewat RPC create_wedding()
create policy "weddings_select" on public.weddings
    for select using (public.is_wedding_member(id));
create policy "weddings_update" on public.weddings
    for update using (public.is_wedding_member(id)) with check (public.is_wedding_member(id));
create policy "weddings_delete" on public.weddings
    for delete using (public.is_wedding_owner(id));

-- wedding_members: insert hanya lewat RPC (create_wedding / accept_invitation)
create policy "members_select" on public.wedding_members
    for select using (public.is_wedding_member(wedding_id));
create policy "members_update" on public.wedding_members
    for update using (user_id = auth.uid() or public.is_wedding_owner(wedding_id))
    with check (user_id = auth.uid() or public.is_wedding_owner(wedding_id));
create policy "members_delete" on public.wedding_members
    for delete using (
        (user_id = auth.uid() and not is_owner)       -- keluar dari board
        or (public.is_wedding_owner(wedding_id) and not is_owner) -- owner mengeluarkan anggota
    );

-- wedding_invitations
create policy "invites_select" on public.wedding_invitations
    for select using (
        public.is_wedding_member(wedding_id)
        or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    );
create policy "invites_insert" on public.wedding_invitations
    for insert with check (public.is_wedding_member(wedding_id));
create policy "invites_update" on public.wedding_invitations
    for update using (public.is_wedding_member(wedding_id)) with check (public.is_wedding_member(wedding_id));
create policy "invites_delete" on public.wedding_invitations
    for delete using (public.is_wedding_member(wedding_id));

-- Tabel data: semua anggota board punya akses penuh
do $$
declare t text;
begin
    foreach t in array array['savings_goals', 'savings_logs', 'categories', 'expenses'] loop
        execute format('drop policy if exists "%s_member_all" on public.%I', t, t);
        execute format(
            'create policy "%s_member_all" on public.%I for all
                using (public.is_wedding_member(wedding_id))
                with check (public.is_wedding_member(wedding_id))', t, t);
    end loop;
end $$;

-- Pastikan category_id pada expenses berasal dari wedding yang sama
create or replace function public.check_expense_category()
returns trigger
language plpgsql
set search_path = public
as $$
begin
    if new.category_id is not null and not exists (
        select 1 from public.categories c
        where c.id = new.category_id and c.wedding_id = new.wedding_id
    ) then
        raise exception 'Kategori tidak valid untuk wedding ini';
    end if;
    return new;
end;
$$;

drop trigger if exists trg_check_expense_category on public.expenses;
create trigger trg_check_expense_category
    before insert or update of category_id, wedding_id on public.expenses
    for each row execute function public.check_expense_category();

-- =====================================================================
-- TEMPLAT BAWAAN (PRD Bagian 4)
-- Alokasi budget per kategori dihitung otomatis dari persentase
-- total budget (bisa diubah pengguna setelahnya).
-- =====================================================================

create or replace function public.seed_default_template(p_wedding_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_budget numeric;
    v_cat_id uuid;
    v_cat record;
    v_item text;
    v_i int;
begin
    if not public.is_wedding_member(p_wedding_id) then
        raise exception 'Akses ditolak';
    end if;

    select coalesce(total_budget_target, 0) into v_budget
    from public.weddings where id = p_wedding_id;

    for v_cat in
        select * from (values
            (1, 'Administrasi & Keagamaan / Legal', 2, array[
                'Biaya KUA / Rumah Ibadah / Catatan Sipil',
                'Kursus Calon Pengantin (Suscatin)',
                'Legalitas, Fotokopi, & Materai',
                'Infaq & Transport Penghulu / Petugas']),
            (2, 'Tempat & Dekorasi (Venue & Decor)', 22, array[
                'Sewa Gedung / Venue / Tenda & Flooring',
                'Dekorasi Pelaminan & Area Resepsi',
                'Dekorasi Akad Nikah / Pemberkatan',
                'Lighting, Sound System, & Genset']),
            (3, 'Katering (Catering)', 30, array[
                'Makanan Utama (Buffet Utama)',
                'Makanan Gubukan / Food Stalls',
                'Coffee Break & Makanan Akad',
                'Konsumsi Panitia & Keluarga (H-1 & Hari-H)',
                'Air Mineral & Soft Drinks']),
            (4, 'Busana & Rias (Attire & MUA)', 10, array[
                'Rias & Busana Pengantin (Akad & Resepsi)',
                'Rias & Busana Orang Tua / Mertua',
                'Seragam & Rias Panitia / Bridesmaid / Groomsmen',
                'Perhiasan & Aksesori Pengantin']),
            (5, 'Dokumentasi', 7, array[
                'Pre-wedding Photoshoot (Studio / Outdoor, MUA, Busana)',
                'Foto & Video Liputan Hari-H',
                'Album Foto Fisik & Cinematic Video Highlight',
                'Live Streaming (Opsional)']),
            (6, 'Mahar & Seserahan', 8, array[
                'Mas Kawin / Mahar (Emas, Uang, Alat Shalat)',
                'Kotak & Hias Mahar',
                'Boks & Hias Seserahan / Hantaran',
                'Angpao / Amplop Adat']),
            (7, 'Undangan & Souvenir', 5, array[
                'Undangan Digital (Website / Video)',
                'Cetak Undangan Fisik',
                'Souvenir Tamu',
                'Buku Tamu (Guest Book) / QR Code Scanner',
                'Biaya Kirim Undangan & Souvenir']),
            (8, 'Hiburan & Event Organizer', 6, array[
                'Master of Ceremony (MC Akad & Resepsi)',
                'Music Entertainment (Band / Akustik / Sound System)',
                'Wedding Organizer (WO) / Event Organizer Hari-H']),
            (9, 'Cincin Nikah & Perhiasan', 4, array[
                'Cincin Nikah Pria & Wanita',
                'Grafir Nama & Kotak Cincin']),
            (10, 'Logistik, Operasional & Lain-lain', 6, array[
                'Transportasi Pengantin & Keluarga',
                'Akomodasi / Kamar Hotel Keluarga & Vendor',
                'Biaya Kebersihan & Keamanan Venue',
                'Biaya Tak Terduga / Buffer Fund (10-15%)'])
        ) as t(sort_order, name, pct, items)
    loop
        insert into public.categories (wedding_id, name, allocated_budget, sort_order)
        values (p_wedding_id, v_cat.name, round(v_budget * v_cat.pct / 100.0, -3), v_cat.sort_order)
        returning id into v_cat_id;

        v_i := 0;
        foreach v_item in array v_cat.items loop
            v_i := v_i + 1;
            insert into public.expenses (category_id, wedding_id, item_name, sort_order)
            values (v_cat_id, p_wedding_id, v_item, v_i);
        end loop;
    end loop;
end;
$$;

-- =====================================================================
-- RPC: Buat wedding baru + jadikan pembuat sebagai owner
-- =====================================================================

create or replace function public.create_wedding(
    p_title text,
    p_wedding_date date,
    p_total_budget numeric default 0,
    p_groom_name text default null,
    p_bride_name text default null,
    p_role text default 'partner',
    p_use_template boolean default true,
    p_groom_share int default 50
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    v_uid uuid := auth.uid();
    v_wedding_id uuid;
begin
    if v_uid is null then
        raise exception 'Harus login terlebih dahulu';
    end if;
    if p_groom_share < 0 or p_groom_share > 100 then
        raise exception 'Porsi kontribusi harus 0-100';
    end if;

    insert into public.weddings (title, wedding_date, total_budget_target, groom_name, bride_name, created_by)
    values (p_title, p_wedding_date, coalesce(p_total_budget, 0), p_groom_name, p_bride_name, v_uid)
    returning id into v_wedding_id;

    insert into public.wedding_members (wedding_id, user_id, role, is_owner, email, display_name)
    values (
        v_wedding_id, v_uid, coalesce(p_role, 'partner'), true,
        auth.jwt() ->> 'email',
        coalesce(auth.jwt() -> 'user_metadata' ->> 'full_name', split_part(auth.jwt() ->> 'email', '@', 1))
    );

    insert into public.savings_goals (wedding_id, groom_share_percent, bride_share_percent, start_date)
    values (v_wedding_id, p_groom_share, 100 - p_groom_share, current_date);

    if p_use_template then
        perform public.seed_default_template(v_wedding_id);
    end if;

    return v_wedding_id;
end;
$$;

-- =====================================================================
-- RPC: Info undangan (untuk halaman /invite/[token])
-- =====================================================================

create or replace function public.get_invitation(p_token uuid)
returns table (
    id uuid,
    wedding_id uuid,
    wedding_title text,
    wedding_date date,
    email text,
    role text,
    status text,
    inviter_name text
)
language sql
security definer
stable
set search_path = public
as $$
    select i.id, i.wedding_id, w.title::text, w.wedding_date, i.email::text, i.role::text, i.status::text,
           (select coalesce(m.display_name, m.email)::text from public.wedding_members m
             where m.wedding_id = i.wedding_id and m.user_id = i.invited_by limit 1)
    from public.wedding_invitations i
    join public.weddings w on w.id = i.wedding_id
    where i.token = p_token
      and auth.uid() is not null;
$$;

-- =====================================================================
-- RPC: Terima undangan (email akun harus sama dengan email undangan)
-- =====================================================================

create or replace function public.accept_invitation(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    v_uid uuid := auth.uid();
    v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
    v_inv public.wedding_invitations%rowtype;
begin
    if v_uid is null then
        raise exception 'Harus login terlebih dahulu';
    end if;

    select * into v_inv from public.wedding_invitations where token = p_token for update;

    if not found then
        raise exception 'Undangan tidak ditemukan';
    end if;
    if v_inv.status = 'revoked' then
        raise exception 'Undangan sudah dibatalkan';
    end if;
    if lower(v_inv.email) <> v_email then
        raise exception 'Undangan ini ditujukan untuk email %, silakan login dengan email tersebut', v_inv.email;
    end if;

    insert into public.wedding_members (wedding_id, user_id, role, is_owner, email, display_name)
    values (
        v_inv.wedding_id, v_uid, v_inv.role, false, auth.jwt() ->> 'email',
        coalesce(auth.jwt() -> 'user_metadata' ->> 'full_name', split_part(auth.jwt() ->> 'email', '@', 1))
    )
    on conflict (wedding_id, user_id) do nothing;

    update public.wedding_invitations
    set status = 'accepted', accepted_at = now()
    where id = v_inv.id;

    return v_inv.wedding_id;
end;
$$;

-- Hak eksekusi RPC hanya untuk user yang login
revoke all on function public.create_wedding(text, date, numeric, text, text, text, boolean, int) from public, anon;
revoke all on function public.seed_default_template(uuid) from public, anon;
revoke all on function public.accept_invitation(uuid) from public, anon;
revoke all on function public.get_invitation(uuid) from public, anon;
grant execute on function public.create_wedding(text, date, numeric, text, text, text, boolean, int) to authenticated;
grant execute on function public.seed_default_template(uuid) to authenticated;
grant execute on function public.accept_invitation(uuid) to authenticated;
grant execute on function public.get_invitation(uuid) to authenticated;
grant execute on function public.is_wedding_member(uuid) to authenticated;
grant execute on function public.is_wedding_owner(uuid) to authenticated;

-- =====================================================================
-- (Opsional) Realtime: aktifkan agar perubahan pasangan langsung terlihat
-- =====================================================================
do $$
declare t text;
begin
    foreach t in array array['savings_logs', 'expenses', 'categories', 'savings_goals', 'weddings'] loop
        begin
            execute format('alter publication supabase_realtime add table public.%I', t);
        exception when duplicate_object or undefined_object then
            null;
        end;
    end loop;
end $$;
