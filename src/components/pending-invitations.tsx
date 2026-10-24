"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MailOpen } from "lucide-react";
import { acceptInvitation } from "@/app/actions/members";
import { Button } from "@/components/ui/button";
import { ROLE_LABEL } from "@/lib/utils";
import type { MemberRole } from "@/lib/types";

export interface PendingInvitationItem {
  token: string;
  title: string;
  inviter: string | null;
  role: MemberRole;
}

export function PendingInvitations({ invitations }: { invitations: PendingInvitationItem[] }) {
  return (
    <div className="space-y-3">
      {invitations.map((inv) => (
        <InvitationRow key={inv.token} inv={inv} />
      ))}
    </div>
  );
}

function InvitationRow({ inv }: { inv: PendingInvitationItem }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-gold-200 bg-gold-50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-gold-600">
          <MailOpen className="h-5 w-5" />
        </div>
        <div>
          <p className="font-medium text-stone-900">Undangan bergabung ke “{inv.title}”</p>
          <p className="text-sm text-stone-600">
            {inv.inviter ? `Dari ${inv.inviter} · ` : ""}sebagai {ROLE_LABEL[inv.role] ?? inv.role}
          </p>
        </div>
      </div>
      <Button
        variant="gold"
        loading={pending}
        onClick={() =>
          start(async () => {
            const res = await acceptInvitation(inv.token);
            if (!res.ok) return void toast.error(res.error);
            toast.success(res.message);
            router.push("/dashboard");
          })
        }
      >
        Terima & Bergabung
      </Button>
    </div>
  );
}
