import { costOf, paidAmount, summarizeBudget, summarizeCategories, summarizeSavings, HEALTH_LABEL } from "./calc";
import type { Category, Expense, SavingsGoal, SavingsLog, Wedding } from "./types";
import { CONTRIBUTOR_LABEL, formatDate, formatMonth, formatRupiah, STATUS_LABEL, toISODate } from "./utils";

export interface ExportInput {
  wedding: Wedding;
  categories: Category[];
  expenses: Expense[];
  goal: SavingsGoal | null;
  logs: SavingsLog[];
}

export function buildReport({ wedding, categories, expenses, goal, logs }: ExportInput) {
  const budget = summarizeBudget(wedding, categories, expenses);
  const savings = summarizeSavings(wedding, goal, logs, budget.budgetTarget);
  const cats = summarizeCategories(categories, expenses);
  const names = { groom: wedding.groom_name || "Pria (CPP)", bride: wedding.bride_name || "Wanita (CPW)" };
  const contributorName = (c: SavingsLog["contributor_type"]) => (c === "groom" ? names.groom : c === "bride" ? names.bride : CONTRIBUTOR_LABEL.other);

  const summaryRows: [string, string | number][] = [
    ["Nama Board", wedding.title],
    ["Pasangan", [wedding.groom_name, wedding.bride_name].filter(Boolean).join(" & ") || "-"],
    ["Tanggal Pernikahan", formatDate(wedding.wedding_date, { day: "numeric", month: "long", year: "numeric" })],
    ["Total Target Budget", budget.budgetTarget],
    ["Total Alokasi Kategori", budget.totalAllocated],
    ["Total Estimasi Item", budget.totalEstimated],
    ["Total Estimasi/Aktual", budget.totalCommitted],
    ["Total Terbayar (DP + Pelunasan)", budget.totalPaid],
    ["Sisa Tagihan Vendor", budget.totalOutstanding],
    ["Dana Terkumpul", savings.collected],
    ["Sisa Target Tabungan", savings.remaining],
    ["Dana Siap Pakai", savings.collected - budget.totalPaid],
    ["Target Bulan Ini", savings.requiredThisMonth],
    ["Status Keuangan", HEALTH_LABEL[savings.health]],
    [`Porsi ${names.groom}`, `${(savings.contributors[0].share * 100).toFixed(0)}% (${formatRupiah(savings.contributors[0].target)})`],
    [`Porsi ${names.bride}`, `${(savings.contributors[1].share * 100).toFixed(0)}% (${formatRupiah(savings.contributors[1].target)})`],
  ];

  const categoryRows = cats.map((c) => ({
    name: c.category.name,
    allocated: c.allocated,
    estimated: c.estimated,
    committed: c.committed,
    paid: c.paid,
    outstanding: c.outstanding,
    diff: c.allocated - c.committed,
  }));

  const itemRows = cats.flatMap((c) =>
    c.items.map((e) => ({
      category: c.category.name,
      item: e.item_name,
      vendor: e.vendor_name ?? "",
      contact: e.vendor_contact ?? "",
      estimated: Number(e.estimated_cost) || 0,
      actual: Number(e.actual_cost) || 0,
      dp: Number(e.dp_amount) || 0,
      paid: paidAmount(e),
      outstanding: Math.max(0, costOf(e) - paidAmount(e)),
      status: STATUS_LABEL[e.status],
      due: e.due_date ? formatDate(e.due_date) : "",
      contract: e.contract_url ?? "",
      notes: e.notes ?? "",
    })),
  );

  const scheduleRows = savings.schedule.map((r) => ({
    month: formatMonth(r.month),
    baseline: Math.round(r.baseline),
    required: Math.round(r.required),
    deposited: r.phase === "future" ? null : r.deposited,
    cumulative: r.phase === "future" ? null : r.cumulative,
    status: r.phase === "future" ? "Akan datang" : r.met ? "Tercapai" : r.phase === "current" ? "Berjalan" : "Kurang",
  }));

  const logRows = [...logs]
    .sort((a, b) => a.deposit_date.localeCompare(b.deposit_date))
    .map((l) => ({
      date: formatDate(l.deposit_date),
      contributor: contributorName(l.contributor_type),
      account: l.account_name ?? "",
      amount: Number(l.amount) || 0,
      notes: l.notes ?? "",
    }));

  return { budget, savings, summaryRows, categoryRows, itemRows, scheduleRows, logRows, names };
}

function fileBase(wedding: Wedding) {
  const slug = wedding.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "wedding";
  return `${slug}-${toISODate(new Date())}`;
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const RP_FORMAT = '"Rp" #,##0;[Red]-"Rp" #,##0';

export async function exportExcel(input: ExportInput) {
  const ExcelJS = (await import("exceljs")).default;
  const r = buildReport(input);
  const wb = new ExcelJS.Workbook();
  wb.creator = "Rencana Menikah";
  wb.created = new Date();

  const headerStyle = (ws: import("exceljs").Worksheet) => {
    const row = ws.getRow(1);
    row.font = { bold: true, color: { argb: "FFFFFFFF" } };
    row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC92D5B" } };
    row.alignment = { vertical: "middle" };
    row.height = 22;
    ws.views = [{ state: "frozen", ySplit: 1 }];
  };

  // Ringkasan
  const s = wb.addWorksheet("Ringkasan");
  s.columns = [
    { header: "Keterangan", key: "k", width: 36 },
    { header: "Nilai", key: "v", width: 32 },
  ];
  r.summaryRows.forEach(([k, v]) => {
    const row = s.addRow({ k, v });
    if (typeof v === "number") row.getCell(2).numFmt = RP_FORMAT;
  });
  headerStyle(s);

  // Per kategori
  const c = wb.addWorksheet("Per Kategori");
  c.columns = [
    { header: "Kategori", key: "name", width: 38 },
    { header: "Alokasi", key: "allocated", width: 18 },
    { header: "Estimasi", key: "estimated", width: 18 },
    { header: "Estimasi/Aktual", key: "committed", width: 18 },
    { header: "Terbayar", key: "paid", width: 18 },
    { header: "Sisa Tagihan", key: "outstanding", width: 18 },
    { header: "Selisih Alokasi", key: "diff", width: 18 },
  ];
  r.categoryRows.forEach((row) => c.addRow(row));
  const totalRow = c.addRow({
    name: "TOTAL",
    allocated: r.budget.totalAllocated,
    estimated: r.budget.totalEstimated,
    committed: r.budget.totalCommitted,
    paid: r.budget.totalPaid,
    outstanding: r.budget.totalOutstanding,
    diff: r.budget.totalAllocated - r.budget.totalCommitted,
  });
  totalRow.font = { bold: true };
  ["B", "C", "D", "E", "F", "G"].forEach((col) => (c.getColumn(col).numFmt = RP_FORMAT));
  headerStyle(c);

  // Rincian item
  const i = wb.addWorksheet("Rincian Pengeluaran");
  i.columns = [
    { header: "Kategori", key: "category", width: 32 },
    { header: "Item", key: "item", width: 40 },
    { header: "Vendor", key: "vendor", width: 22 },
    { header: "Kontak", key: "contact", width: 18 },
    { header: "Estimasi", key: "estimated", width: 16 },
    { header: "Aktual", key: "actual", width: 16 },
    { header: "DP", key: "dp", width: 16 },
    { header: "Terbayar", key: "paid", width: 16 },
    { header: "Sisa", key: "outstanding", width: 16 },
    { header: "Status", key: "status", width: 14 },
    { header: "Jatuh Tempo", key: "due", width: 14 },
    { header: "Link Kontrak", key: "contract", width: 30 },
    { header: "Catatan", key: "notes", width: 36 },
  ];
  r.itemRows.forEach((row) => i.addRow(row));
  ["E", "F", "G", "H", "I"].forEach((col) => (i.getColumn(col).numFmt = RP_FORMAT));
  i.autoFilter = { from: "A1", to: "M1" };
  headerStyle(i);

  // Jadwal tabungan
  const j = wb.addWorksheet("Jadwal Tabungan");
  j.columns = [
    { header: "Bulan", key: "month", width: 14 },
    { header: "Rencana Awal", key: "baseline", width: 18 },
    { header: "Target Disesuaikan", key: "required", width: 20 },
    { header: "Setoran", key: "deposited", width: 18 },
    { header: "Kumulatif", key: "cumulative", width: 18 },
    { header: "Status", key: "status", width: 14 },
  ];
  r.scheduleRows.forEach((row) => j.addRow(row));
  ["B", "C", "D", "E"].forEach((col) => (j.getColumn(col).numFmt = RP_FORMAT));
  headerStyle(j);

  // Log setoran
  const l = wb.addWorksheet("Log Setoran");
  l.columns = [
    { header: "Tanggal", key: "date", width: 14 },
    { header: "Kontributor", key: "contributor", width: 22 },
    { header: "Rekening / Wadah", key: "account", width: 26 },
    { header: "Nominal", key: "amount", width: 18 },
    { header: "Catatan", key: "notes", width: 40 },
  ];
  r.logRows.forEach((row) => l.addRow(row));
  const logTotal = l.addRow({ date: "TOTAL", amount: r.savings.collected });
  logTotal.font = { bold: true };
  l.getColumn("D").numFmt = RP_FORMAT;
  headerStyle(l);

  const buffer = await wb.xlsx.writeBuffer();
  download(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${fileBase(input.wedding)}.xlsx`);
}

export async function exportPdf(input: ExportInput) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const r = buildReport(input);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const primary: [number, number, number] = [201, 45, 91];
  const pageWidth = doc.internal.pageSize.getWidth();
  const rp = (v: number | null) => (v == null ? "-" : formatRupiah(v));

  doc.setFillColor(...primary);
  doc.rect(0, 0, pageWidth, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text(input.wedding.title, 14, 13);
  doc.setFontSize(10);
  doc.text(`Laporan Anggaran & Tabungan · dicetak ${formatDate(toISODate(new Date()), { day: "numeric", month: "long", year: "numeric" })}`, 14, 21);
  doc.setTextColor(30, 30, 30);

  const lastY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  const section = (title: string, y: number) => {
    doc.setFontSize(12);
    doc.setTextColor(...primary);
    doc.text(title, 14, y);
    doc.setTextColor(30, 30, 30);
    return y + 3;
  };
  const common = {
    theme: "grid" as const,
    headStyles: { fillColor: primary, textColor: 255, fontStyle: "bold" as const },
    styles: { fontSize: 8, cellPadding: 1.8 },
    margin: { left: 14, right: 14 },
  };

  autoTable(doc, {
    ...common,
    startY: section("Ringkasan", 38),
    head: [["Keterangan", "Nilai"]],
    body: r.summaryRows.map(([k, v]) => [k, typeof v === "number" ? formatRupiah(v) : v]),
    columnStyles: { 0: { cellWidth: 70 } },
  });

  autoTable(doc, {
    ...common,
    startY: section("Anggaran per Kategori", lastY() + 10),
    head: [["Kategori", "Alokasi", "Estimasi/Aktual", "Terbayar", "Sisa Tagihan"]],
    body: [
      ...r.categoryRows.map((c) => [c.name, rp(c.allocated), rp(c.committed), rp(c.paid), rp(c.outstanding)]),
      ["TOTAL", rp(r.budget.totalAllocated), rp(r.budget.totalCommitted), rp(r.budget.totalPaid), rp(r.budget.totalOutstanding)],
    ],
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
    didParseCell: (data) => {
      if (data.section === "body" && data.row.index === r.categoryRows.length) data.cell.styles.fontStyle = "bold";
    },
  });

  doc.addPage();
  autoTable(doc, {
    ...common,
    startY: section("Rincian Pengeluaran & Vendor", 16),
    head: [["Kategori", "Item", "Vendor", "Estimasi", "Aktual", "Terbayar", "Status", "Jatuh Tempo"]],
    body: r.itemRows.map((it) => [it.category, it.item, it.vendor || "-", rp(it.estimated), it.actual ? rp(it.actual) : "-", rp(it.paid), it.status, it.due || "-"]),
    styles: { fontSize: 7, cellPadding: 1.5 },
    columnStyles: { 0: { cellWidth: 26 }, 1: { cellWidth: 40 }, 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" } },
  });

  doc.addPage();
  autoTable(doc, {
    ...common,
    startY: section("Jadwal Target Tabungan Bulanan", 16),
    head: [["Bulan", "Rencana Awal", "Target Disesuaikan", "Setoran", "Kumulatif", "Status"]],
    body: r.scheduleRows.map((s) => [s.month, rp(s.baseline), rp(s.required), rp(s.deposited), rp(s.cumulative), s.status]),
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
  });

  autoTable(doc, {
    ...common,
    startY: section("Riwayat Setoran", lastY() + 10),
    head: [["Tanggal", "Kontributor", "Rekening / Wadah", "Nominal", "Catatan"]],
    body: r.logRows.length ? r.logRows.map((l) => [l.date, l.contributor, l.account || "-", rp(l.amount), l.notes || "-"]) : [["-", "-", "-", "-", "Belum ada setoran"]],
    columnStyles: { 3: { halign: "right" } },
  });

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Halaman ${p} dari ${pages}`, pageWidth - 14, doc.internal.pageSize.getHeight() - 8, { align: "right" });
  }

  doc.save(`${fileBase(input.wedding)}.pdf`);
}
