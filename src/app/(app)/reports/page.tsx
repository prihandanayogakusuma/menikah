import { getBoardData, requireWedding } from "@/lib/wedding";
import { PageHeader } from "@/components/page-header";
import { ReportsClient } from "./reports-client";

export const metadata = { title: "Laporan & Ekspor" };

export default async function ReportsPage() {
  const { wedding } = await requireWedding();
  const data = await getBoardData(wedding.id);

  return (
    <>
      <PageHeader title="Laporan & Ekspor" description="Unduh laporan lengkap anggaran, pembayaran vendor, dan tabungan dalam format Excel atau PDF." />
      <ReportsClient wedding={wedding} {...data} />
    </>
  );
}
