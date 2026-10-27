import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarHeart, Heart, MailX } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/wedding";
import { signOut } from "@/app/auth/actions";
import { formatDate, ROLE_LABEL } from "@/lib/utils";
import type { MemberRole } from "@/lib/types";
import { AcceptInviteButton } from "./accept-button";
import { Copyright } from "@/components/copyright";

export const metadata = { title: "Undangan" };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);

  const supabase = await createClient();
  const isUuid = /^[0-9a-f-]{36}$/i.test(token);
  const { data } = isUuid ? await supabase.rpc("get_invitation", { p_token: token }) : { data: null };
  const inv = Array.isArray(data) ? data[0] : null;

  const emailMatches = inv && user.email?.toLowerCase() === String(inv.email).toLowerCase();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-primary-50 to-[#fbf9f7] px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm">
        {!inv ? (
          <>
            <MailX className="mx-auto h-12 w-12 text-stone-400" />
            <h1 className="mt-4 font-serif text-2xl font-semibold">Undangan tidak ditemukan</h1>
            <p className="mt-2 text-sm text-stone-500">Link undangan tidak valid. Minta pasangan Anda mengirim ulang undangan.</p>
            <Link href="/dashboard" className="mt-6 inline-block text-sm font-medium text-primary-600 hover:underline">
              Ke dashboard
            </Link>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-50">
              <Heart className="h-7 w-7 fill-primary-500 text-primary-500" />
            </div>
            <p className="mt-4 text-sm text-stone-500">{inv.inviter_name ? `${inv.inviter_name} mengundang Anda ke` : "Anda diundang ke"}</p>
            <h1 className="mt-1 font-serif text-2xl font-semibold text-stone-900">{inv.wedding_title}</h1>
            <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-stone-600">
              <CalendarHeart className="h-4 w-4" /> {formatDate(inv.wedding_date, { day: "numeric", month: "long", year: "numeric" })}
            </p>
            <p className="mt-1 text-sm text-stone-600">Peran: {ROLE_LABEL[inv.role as MemberRole] ?? inv.role}</p>

            {inv.status === "revoked" ? (
              <p className="mt-6 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">Undangan ini sudah dibatalkan.</p>
            ) : inv.status === "accepted" && emailMatches ? (
              <Link href="/dashboard" className="mt-6 inline-block rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white">
                Undangan sudah diterima — buka dashboard
              </Link>
            ) : emailMatches ? (
              <AcceptInviteButton token={token} />
            ) : (
              <div className="mt-6 space-y-3">
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Undangan ini untuk <b>{inv.email}</b>, sedangkan Anda login sebagai <b>{user.email}</b>.
                </p>
                <form action={signOut}>
                  <button className="text-sm font-medium text-primary-600 hover:underline">Keluar & login dengan email undangan</button>
                </form>
              </div>
            )}
          </>
        )}
      </div>
      <Copyright className="mt-6" />
    </main>
  );
}
