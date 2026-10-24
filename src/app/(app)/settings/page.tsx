import { requireWedding } from "@/lib/wedding";
import { PageHeader } from "@/components/page-header";
import { SettingsClient } from "./settings-client";

export const metadata = { title: "Pengaturan" };

export default async function SettingsPage() {
  const { wedding, membership, user } = await requireWedding();
  return (
    <>
      <PageHeader title="Pengaturan" description="Kelola data pernikahan, akun, dan template." />
      <SettingsClient
        wedding={wedding}
        isOwner={membership.is_owner}
        myRole={membership.role}
        fullName={(user.user_metadata?.full_name as string | undefined) ?? ""}
        email={user.email ?? ""}
      />
    </>
  );
}
