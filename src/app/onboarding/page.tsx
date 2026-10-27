import Link from "next/link";
import { redirect } from "next/navigation";
import { Heart, LogOut } from "lucide-react";
import { signOut } from "@/app/auth/actions";
import { getMemberships, getMyPendingInvitations, getUser } from "@/lib/wedding";
import { OnboardingForm } from "./onboarding-form";
import { Copyright } from "@/components/copyright";
import { PendingInvitations } from "@/components/pending-invitations";

export const metadata = { title: "Mulai" };

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const user = await getUser();
  if (!user) redirect("/login");
  const { new: isNew } = await searchParams;
  const memberships = await getMemberships();
  if (memberships.length > 0 && !isNew) redirect("/dashboard");

  const invitationDetails = await getMyPendingInvitations();

  const name = (user.user_metadata?.full_name as string | undefined) ?? user.email;

  return (
    <main className="min-h-screen bg-gradient-to-b from-primary-50 via-[#fbf9f7] to-[#fbf9f7]">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2 font-semibold text-primary-700">
          <Heart className="h-5 w-5 fill-primary-600 text-primary-600" /> Rencana Menikah
        </div>
        <div className="flex items-center gap-3">
          {memberships.length > 0 && (
            <Link href="/dashboard" className="text-sm text-stone-600 hover:text-stone-900">
              Kembali ke dashboard
            </Link>
          )}
          <form action={signOut}>
            <button className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-900">
              <LogOut className="h-4 w-4" /> Keluar
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 pb-16">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-3xl font-semibold text-stone-900 sm:text-4xl">Halo, {name}! 💍</h1>
          <p className="mt-2 text-stone-600">
            {memberships.length > 0 ? "Buat board pernikahan baru." : "Yuk siapkan board perencanaan pernikahan Anda dalam 1 menit."}
          </p>
        </div>

        {invitationDetails.length > 0 && (
          <div className="mb-8">
            <PendingInvitations invitations={invitationDetails} />
            <p className="mt-4 text-center text-sm text-stone-500">— atau buat board baru sendiri —</p>
          </div>
        )}

        <OnboardingForm />
      </div>
      <Copyright />
    </main>
  );
}
