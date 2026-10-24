"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  ChevronsUpDown,
  FileDown,
  Heart,
  LayoutDashboard,
  LogOut,
  PiggyBank,
  Plus,
  ReceiptText,
  Settings,
  Users,
  Check,
} from "lucide-react";
import { signOut } from "@/app/auth/actions";
import { switchWedding } from "@/app/actions/wedding";
import { cn, formatDate } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", short: "Beranda", icon: LayoutDashboard },
  { href: "/savings", label: "Tabungan", short: "Tabungan", icon: PiggyBank },
  { href: "/expenses", label: "Pengeluaran & Vendor", short: "Budget", icon: ReceiptText },
  { href: "/members", label: "Anggota & Undangan", short: "Anggota", icon: Users },
  { href: "/reports", label: "Laporan & Ekspor", short: "Laporan", icon: FileDown },
  { href: "/settings", label: "Pengaturan", short: "Atur", icon: Settings },
];

interface ShellProps {
  wedding: { id: string; title: string; wedding_date: string };
  weddings: { id: string; title: string }[];
  userName: string;
  userEmail: string;
  daysLeft: number;
}

function Countdown({ daysLeft, date }: { daysLeft: number; date: string }) {
  return (
    <div className="rounded-xl bg-gradient-to-br from-primary-600 to-gold-500 p-4 text-white">
      <p className="text-xs text-white/80">{daysLeft >= 0 ? "Menuju hari bahagia" : "Hari pernikahan"}</p>
      <p className="mt-1 font-serif text-2xl font-semibold">
        {daysLeft > 0 ? `${daysLeft} hari lagi` : daysLeft === 0 ? "Hari ini! 🎉" : `${Math.abs(daysLeft)} hari lalu`}
      </p>
      <p className="mt-0.5 text-xs text-white/80">{formatDate(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
    </div>
  );
}

function WeddingSwitcher({ wedding, weddings }: Pick<ShellProps, "wedding" | "weddings">) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-left hover:bg-stone-50",
          pending && "opacity-60",
        )}
      >
        <div className="min-w-0">
          <p className="text-[11px] font-medium tracking-wide text-stone-400 uppercase">Board aktif</p>
          <p className="truncate text-sm font-semibold text-stone-900">{wedding.title}</p>
        </div>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-stone-400" />
      </button>
      {open && (
        <div className="absolute inset-x-0 top-full z-30 mt-1 rounded-xl border border-stone-200 bg-white p-1 shadow-lg">
          {weddings.map((w) => (
            <button
              key={w.id}
              onClick={() => {
                setOpen(false);
                if (w.id === wedding.id) return;
                start(async () => {
                  await switchWedding(w.id);
                  router.refresh();
                });
              }}
              className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-stone-50"
            >
              <span className="truncate">{w.title}</span>
              {w.id === wedding.id && <Check className="h-4 w-4 text-primary-600" />}
            </button>
          ))}
          <Link
            href="/onboarding?new=1"
            className="mt-1 flex items-center gap-2 rounded-lg border-t border-stone-100 px-3 py-2 text-sm text-primary-600 hover:bg-primary-50"
          >
            <Plus className="h-4 w-4" /> Buat board baru
          </Link>
        </div>
      )}
    </div>
  );
}

export function AppSidebar(props: ShellProps) {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-stone-200 bg-white/80 backdrop-blur lg:flex">
      <div className="flex items-center gap-2 px-5 py-5 font-semibold text-primary-700">
        <Heart className="h-5 w-5 fill-primary-600 text-primary-600" />
        <span className="font-serif text-lg">Wedding Planner</span>
      </div>
      <div className="px-3">
        <WeddingSwitcher wedding={props.wedding} weddings={props.weddings} />
      </div>
      <nav className="mt-4 flex-1 space-y-0.5 px-3">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-primary-50 text-primary-700" : "text-stone-600 hover:bg-stone-100 hover:text-stone-900",
              )}
            >
              <item.icon className={cn("h-[18px] w-[18px]", active ? "text-primary-600" : "text-stone-400")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="space-y-3 p-3">
        <Countdown daysLeft={props.daysLeft} date={props.wedding.wedding_date} />
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
            {props.userName.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-stone-900">{props.userName}</p>
            <p className="truncate text-xs text-stone-500">{props.userEmail}</p>
          </div>
          <form action={signOut}>
            <button title="Keluar" className="rounded-md p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700">
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}

export function MobileTopbar(props: ShellProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <WeddingSwitcher wedding={props.wedding} weddings={props.weddings} />
        </div>
        <div className="shrink-0 rounded-xl bg-primary-50 px-3 py-2 text-center">
          <p className="text-[10px] text-primary-600">H-</p>
          <p className="text-sm leading-none font-bold text-primary-700">{Math.max(0, props.daysLeft)}</p>
        </div>
        <form action={signOut}>
          <button title="Keluar" className="rounded-md p-2 text-stone-400 hover:bg-stone-100">
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </div>
    </header>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="no-print fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <div className="grid grid-cols-6">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn("flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium", active ? "text-primary-600" : "text-stone-500")}
            >
              <item.icon className="h-5 w-5" />
              {item.short}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
