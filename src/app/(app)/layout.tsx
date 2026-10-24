import { requireWedding } from "@/lib/wedding";
import { AppSidebar, MobileNav, MobileTopbar } from "@/components/app-shell";
import { RealtimeRefresher } from "@/components/realtime-refresher";
import { daysUntil } from "@/lib/utils";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, wedding, memberships } = await requireWedding();
  const shell = {
    wedding: { id: wedding.id, title: wedding.title, wedding_date: wedding.wedding_date },
    weddings: memberships.map((m) => ({ id: m.wedding.id, title: m.wedding.title })),
    userName: (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "",
    userEmail: user.email ?? "",
    daysLeft: daysUntil(wedding.wedding_date),
  };

  return (
    <div className="min-h-screen lg:pl-64">
      <AppSidebar {...shell} />
      <MobileTopbar {...shell} />
      <main className="mx-auto max-w-7xl px-4 pt-6 pb-28 sm:px-6 lg:px-8 lg:pb-12">{children}</main>
      <MobileNav />
      <RealtimeRefresher weddingId={wedding.id} />
    </div>
  );
}
