"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { KeyRound, ListChecks, Trash2, UserRound, CalendarHeart } from "lucide-react";
import { applyDefaultTemplate, deleteWedding, updatePassword, updateProfile, updateWedding } from "@/app/actions/wedding";
import type { ActionResult, MemberRole, Wedding } from "@/lib/types";
import { ROLE_LABEL } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { ConfirmButton } from "@/components/ui/confirm";

function useFormAction(action: (fd: FormData) => Promise<ActionResult>, resetOnSuccess = false) {
  const [pending, start] = useTransition();
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    start(async () => {
      const res = await action(fd);
      if (!res.ok) return void toast.error(res.error);
      toast.success(res.message ?? "Tersimpan");
      if (resetOnSuccess) form.reset();
    });
  };
  return { pending, onSubmit };
}

export function SettingsClient({
  wedding,
  isOwner,
  myRole,
  fullName,
  email,
}: {
  wedding: Wedding;
  isOwner: boolean;
  myRole: MemberRole;
  fullName: string;
  email: string;
}) {
  const router = useRouter();
  const weddingForm = useFormAction(updateWedding);
  const profileForm = useFormAction(updateProfile);
  const passwordForm = useFormAction(updatePassword, true);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="lg:col-span-2">
        <CardHeader title={<Title icon={CalendarHeart}>Data Pernikahan</Title>} />
        <CardBody>
          <form onSubmit={weddingForm.onSubmit} className="grid gap-4 sm:grid-cols-2">
            <Field label="Nama board" htmlFor="title" className="sm:col-span-2">
              <Input id="title" name="title" required defaultValue={wedding.title} />
            </Field>
            <Field label="Nama Calon Pengantin Pria" htmlFor="groom_name">
              <Input id="groom_name" name="groom_name" defaultValue={wedding.groom_name ?? ""} />
            </Field>
            <Field label="Nama Calon Pengantin Wanita" htmlFor="bride_name">
              <Input id="bride_name" name="bride_name" defaultValue={wedding.bride_name ?? ""} />
            </Field>
            <Field label="Tanggal pernikahan" htmlFor="wedding_date">
              <Input id="wedding_date" name="wedding_date" type="date" required defaultValue={wedding.wedding_date} />
            </Field>
            <Field label="Total target budget" htmlFor="total_budget_target">
              <MoneyInput id="total_budget_target" name="total_budget_target" defaultValue={wedding.total_budget_target} />
            </Field>
            <div className="flex justify-end sm:col-span-2">
              <Button type="submit" loading={weddingForm.pending}>
                Simpan
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={<Title icon={UserRound}>Profil Saya</Title>} description={email} />
        <CardBody>
          <form onSubmit={profileForm.onSubmit} className="space-y-4">
            <Field label="Nama lengkap" htmlFor="full_name">
              <Input id="full_name" name="full_name" required defaultValue={fullName} />
            </Field>
            <Field label="Peran saya di board ini" htmlFor="role">
              <Select id="role" name="role" defaultValue={myRole}>
                {(Object.keys(ROLE_LABEL) as MemberRole[]).map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="flex justify-end">
              <Button type="submit" loading={profileForm.pending}>
                Simpan Profil
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card id="password">
        <CardHeader title={<Title icon={KeyRound}>Ganti Password</Title>} />
        <CardBody>
          <form onSubmit={passwordForm.onSubmit} className="space-y-4">
            <Field label="Password baru" htmlFor="password">
              <Input id="password" name="password" type="password" minLength={6} required autoComplete="new-password" />
            </Field>
            <Field label="Konfirmasi password baru" htmlFor="password_confirm">
              <Input id="password_confirm" name="password_confirm" type="password" minLength={6} required autoComplete="new-password" />
            </Field>
            <div className="flex justify-end">
              <Button type="submit" loading={passwordForm.pending}>
                Ubah Password
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={<Title icon={ListChecks}>Template Bawaan</Title>} />
        <CardBody className="space-y-3">
          <p className="text-sm text-stone-600">
            Tambahkan kembali 10 kategori & 39 item default (Administrasi, Venue & Dekorasi, Katering, Busana & Rias, Dokumentasi, Mahar & Seserahan,
            Undangan & Souvenir, Hiburan & EO, Cincin, Logistik). Kategori yang sudah ada tidak dihapus.
          </p>
          <ConfirmButton
            variant="secondary"
            title="Tambahkan template bawaan?"
            description="Kategori & item default akan ditambahkan ke board ini. Jika sudah ada kategori dengan nama yang sama, akan muncul duplikat."
            confirmLabel="Tambahkan"
            action={applyDefaultTemplate}
          >
            <ListChecks className="h-4 w-4" /> Tambahkan Template
          </ConfirmButton>
        </CardBody>
      </Card>

      {isOwner && (
        <Card className="border-red-200">
          <CardHeader title={<Title icon={Trash2}>Zona Bahaya</Title>} />
          <CardBody className="space-y-3">
            <p className="text-sm text-stone-600">
              Menghapus board akan menghapus <b>seluruh</b> data tabungan, pengeluaran, kategori, dan anggota secara permanen.
            </p>
            <ConfirmButton
              variant="danger"
              title="Hapus board ini?"
              description={
                <>
                  Board <b>{wedding.title}</b> beserta seluruh datanya akan dihapus permanen dan tidak bisa dikembalikan.
                </>
              }
              confirmLabel="Ya, hapus permanen"
              action={deleteWedding}
              onDone={() => router.push("/dashboard")}
            >
              <Trash2 className="h-4 w-4" /> Hapus Board
            </ConfirmButton>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function Title({ icon: Icon, children }: { icon: typeof KeyRound; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-primary-600" /> {children}
    </span>
  );
}
