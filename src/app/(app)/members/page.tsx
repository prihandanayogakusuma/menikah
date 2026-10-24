import { getMembersData, requireWedding } from "@/lib/wedding";
import { PageHeader } from "@/components/page-header";
import { MembersClient } from "./members-client";

export const metadata = { title: "Anggota & Undangan" };

export default async function MembersPage() {
  const { wedding, membership, user } = await requireWedding();
  const { members, invitations } = await getMembersData(wedding.id);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";

  return (
    <>
      <PageHeader
        title="Anggota & Undangan"
        description="Undang pasangan atau keluarga untuk mengelola board pernikahan yang sama secara bersamaan."
      />
      <MembersClient
        weddingTitle={wedding.title}
        members={members}
        invitations={invitations}
        currentUserId={user.id}
        isOwner={membership.is_owner}
        siteUrl={siteUrl}
      />
    </>
  );
}
