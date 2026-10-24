"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { FileSpreadsheet, FileText, Printer } from "lucide-react";
import { buildReport, exportExcel, exportPdf, type ExportInput } from "@/lib/export";
import { formatRupiah } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

export function ReportsClient(props: ExportInput) {
  const [busy, setBusy] = useState<"xlsx" | "pdf" | null>(null);
  const report = useMemo(() => buildReport(props), [props]);

  const run = async (kind: "xlsx" | "pdf") => {
    setBusy(kind);
    try {
      if (kind === "xlsx") await exportExcel(props);
      else await exportPdf(props);
      toast.success(kind === "xlsx" ? "File Excel berhasil diunduh" : "File PDF berhasil diunduh");
    } catch (err) {
      console.error(err);
      toast.error("Gagal membuat file ekspor");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <ExportCard
          icon={FileSpreadsheet}
          title="Excel (.xlsx)"
          desc="5 sheet: Ringkasan, Per Kategori, Rincian Pengeluaran, Jadwal Tabungan, Log Setoran."
          tone="bg-emerald-50 text-emerald-600"
          action={
            <Button className="w-full" loading={busy === "xlsx"} onClick={() => run("xlsx")}>
              Unduh Excel
            </Button>
          }
        />
        <ExportCard
          icon={FileText}
          title="PDF"
          desc="Laporan siap cetak / dibagikan ke keluarga, lengkap dengan tabel ringkasan."
          tone="bg-primary-50 text-primary-600"
          action={
            <Button className="w-full" loading={busy === "pdf"} onClick={() => run("pdf")}>
              Unduh PDF
            </Button>
          }
        />
        <ExportCard
          icon={Printer}
          title="Cetak Halaman"
          desc="Cetak pratinjau laporan di bawah langsung dari browser."
          tone="bg-gold-50 text-gold-600"
          action={
            <Button variant="secondary" className="w-full" onClick={() => window.print()}>
              Cetak
            </Button>
          }
        />
      </div>

      <Card>
        <CardHeader title="Pratinjau Ringkasan" />
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-stone-100">
              {report.summaryRows.map(([k, v]) => (
                <tr key={k}>
                  <td className="px-5 py-2.5 text-stone-500">{k}</td>
                  <td className="px-5 py-2.5 text-right font-medium text-stone-900 tabular-nums">{typeof v === "number" ? formatRupiah(v) : v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader title="Anggaran per Kategori" />
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-stone-50 text-left text-xs font-medium tracking-wide text-stone-500 uppercase">
              <tr>
                <th className="px-5 py-3">Kategori</th>
                <th className="px-5 py-3 text-right">Alokasi</th>
                <th className="px-5 py-3 text-right">Estimasi/Aktual</th>
                <th className="px-5 py-3 text-right">Terbayar</th>
                <th className="px-5 py-3 text-right">Selisih</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {report.categoryRows.map((c) => (
                <tr key={c.name}>
                  <td className="px-5 py-2.5 text-stone-800">{c.name}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{formatRupiah(c.allocated)}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{formatRupiah(c.committed)}</td>
                  <td className="px-5 py-2.5 text-right text-emerald-700 tabular-nums">{formatRupiah(c.paid)}</td>
                  <td className={`px-5 py-2.5 text-right font-medium tabular-nums ${c.diff < 0 ? "text-red-600" : "text-stone-700"}`}>
                    {formatRupiah(c.diff)}
                  </td>
                </tr>
              ))}
              <tr className="bg-stone-50 font-semibold">
                <td className="px-5 py-2.5">TOTAL</td>
                <td className="px-5 py-2.5 text-right tabular-nums">{formatRupiah(report.budget.totalAllocated)}</td>
                <td className="px-5 py-2.5 text-right tabular-nums">{formatRupiah(report.budget.totalCommitted)}</td>
                <td className="px-5 py-2.5 text-right tabular-nums">{formatRupiah(report.budget.totalPaid)}</td>
                <td className="px-5 py-2.5 text-right tabular-nums">{formatRupiah(report.budget.totalAllocated - report.budget.totalCommitted)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function ExportCard({
  icon: Icon,
  title,
  desc,
  tone,
  action,
}: {
  icon: typeof FileText;
  title: string;
  desc: string;
  tone: string;
  action: React.ReactNode;
}) {
  return (
    <Card className="no-print flex flex-col p-5">
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 font-semibold text-stone-900">{title}</p>
      <p className="mt-1 flex-1 text-sm text-stone-500">{desc}</p>
      <div className="mt-4">{action}</div>
    </Card>
  );
}
