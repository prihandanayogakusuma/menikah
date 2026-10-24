"use client";

import { useActionState, useState } from "react";
import { CalendarHeart, ListChecks, Users, Wallet } from "lucide-react";
import { createWedding, type CreateWeddingState } from "@/app/actions/wedding";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { FormAlert } from "@/components/form-alert";
import { formatRupiah } from "@/lib/utils";

export function OnboardingForm() {
  const [state, action, pending] = useActionState<CreateWeddingState, FormData>(createWedding, {});
  const [groomShare, setGroomShare] = useState(50);
  const [budget, setBudget] = useState(0);

  return (
    <form action={action} className="space-y-6">
      <FormAlert error={state.error} />

      <Card className="p-6">
        <SectionTitle icon={Users} title="Pasangan" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nama Calon Pengantin Pria" htmlFor="groom_name">
            <Input id="groom_name" name="groom_name" placeholder="cth. Andi" />
          </Field>
          <Field label="Nama Calon Pengantin Wanita" htmlFor="bride_name">
            <Input id="bride_name" name="bride_name" placeholder="cth. Sinta" />
          </Field>
          <Field label="Saya adalah" htmlFor="role">
            <Select id="role" name="role" defaultValue="groom">
              <option value="groom">Calon Pengantin Pria</option>
              <option value="bride">Calon Pengantin Wanita</option>
              <option value="family">Keluarga</option>
              <option value="planner">Wedding Planner</option>
            </Select>
          </Field>
          <Field label="Nama board (opsional)" htmlFor="title" hint="Kosongkan untuk otomatis: Pernikahan Andi & Sinta">
            <Input id="title" name="title" placeholder="Pernikahan Kami" />
          </Field>
        </div>
      </Card>

      <Card className="p-6">
        <SectionTitle icon={CalendarHeart} title="Tanggal & Anggaran" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tanggal pernikahan" htmlFor="wedding_date">
            <Input id="wedding_date" name="wedding_date" type="date" required />
          </Field>
          <Field label="Total target budget" htmlFor="total_budget_target" hint="Bisa diubah kapan saja">
            <MoneyInput id="total_budget_target" name="total_budget_target" placeholder="cth. 150.000.000" onValueChange={setBudget} />
          </Field>
        </div>
      </Card>

      <Card className="p-6">
        <SectionTitle icon={Wallet} title="Porsi Kontribusi Tabungan" />
        <div className="flex items-center justify-between text-sm font-medium">
          <span className="text-groom">Pria {groomShare}%</span>
          <span className="text-bride">Wanita {100 - groomShare}%</span>
        </div>
        <input
          type="range"
          name="groom_share_percent"
          min={0}
          max={100}
          step={5}
          value={groomShare}
          onChange={(e) => setGroomShare(Number(e.target.value))}
          className="mt-2 w-full accent-primary-600"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {[50, 60, 40, 70, 30].map((v) => (
            <button
              type="button"
              key={v}
              onClick={() => setGroomShare(v)}
              className={`rounded-full border px-3 py-1 text-xs ${groomShare === v ? "border-primary-500 bg-primary-50 text-primary-700" : "border-stone-200 text-stone-600 hover:bg-stone-50"}`}
            >
              {v}:{100 - v}
            </button>
          ))}
        </div>
        {budget > 0 && (
          <p className="mt-3 text-sm text-stone-600">
            Pria: <b>{formatRupiah((budget * groomShare) / 100)}</b> · Wanita: <b>{formatRupiah((budget * (100 - groomShare)) / 100)}</b>
          </p>
        )}
      </Card>

      <Card className="p-6">
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" name="use_template" defaultChecked className="mt-1 h-4 w-4 accent-primary-600" />
          <div>
            <div className="flex items-center gap-2 font-medium text-stone-900">
              <ListChecks className="h-4 w-4 text-primary-600" /> Gunakan template bawaan
            </div>
            <p className="mt-1 text-sm text-stone-500">
              10 kategori & 39 item kebutuhan nikah (KUA, venue, katering, MUA, dokumentasi, mahar, undangan, hiburan, cincin, logistik). Alokasi
              budget per kategori dihitung otomatis dari total budget.
            </p>
          </div>
        </label>
      </Card>

      <Button type="submit" size="lg" className="w-full" loading={pending}>
        Buat Board Pernikahan
      </Button>
    </form>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: typeof Users; title: string }) {
  return (
    <h2 className="mb-4 flex items-center gap-2 font-semibold text-stone-900">
      <Icon className="h-5 w-5 text-primary-600" /> {title}
    </h2>
  );
}
