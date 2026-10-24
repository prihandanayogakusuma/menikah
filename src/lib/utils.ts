import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ContributorType, ExpenseStatus, MemberRole } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export function formatRupiah(value: number | null | undefined) {
  return rupiah.format(Math.round(Number(value) || 0));
}

/** Format ringkas untuk sumbu grafik: 1,5 jt / 120 rb / 2,3 M */
export function formatRupiahShort(value: number) {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
  if (abs >= 1_000) return `${(value / 1_000).toLocaleString("id-ID", { maximumFractionDigits: 0 })} rb`;
  return value.toLocaleString("id-ID");
}

export function formatNumber(value: number | null | undefined) {
  return (Number(value) || 0).toLocaleString("id-ID", { maximumFractionDigits: 0 });
}

/** Parse "Rp 1.500.000" / "1500000" menjadi angka. */
export function parseMoney(input: FormDataEntryValue | string | null | undefined): number {
  if (input == null) return 0;
  const digits = String(input).replace(/[^\d-]/g, "");
  const n = Number(digits);
  return Number.isFinite(n) ? n : 0;
}

/** Parse tanggal "YYYY-MM-DD" sebagai tanggal lokal (tanpa geser zona waktu). */
export function parseDate(value: string) {
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function toISODate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatDate(value: string | null | undefined, opts?: Intl.DateTimeFormatOptions) {
  if (!value) return "-";
  return parseDate(value).toLocaleDateString("id-ID", opts ?? { day: "numeric", month: "short", year: "numeric" });
}

export function formatMonth(date: Date) {
  return date.toLocaleDateString("id-ID", { month: "short", year: "numeric" });
}

export function daysUntil(value: string, from = new Date()) {
  const target = parseDate(value);
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  return Math.round((target.getTime() - start.getTime()) / 86_400_000);
}

export const STATUS_LABEL: Record<ExpenseStatus, string> = {
  unpaid: "Belum DP",
  dp_paid: "Lunas DP",
  fully_paid: "Lunas Total",
};

export const CONTRIBUTOR_LABEL: Record<ContributorType, string> = {
  groom: "Pria (CPP)",
  bride: "Wanita (CPW)",
  other: "Lainnya / Keluarga",
};

export const ROLE_LABEL: Record<MemberRole, string> = {
  groom: "Calon Pengantin Pria",
  bride: "Calon Pengantin Wanita",
  family: "Keluarga",
  planner: "Wedding Planner",
  partner: "Partner",
};

export function errorMessage(err: unknown) {
  if (!err) return "Terjadi kesalahan";
  if (typeof err === "string") return err;
  if (typeof err === "object" && err && "message" in err) return String((err as { message: unknown }).message);
  return "Terjadi kesalahan";
}
