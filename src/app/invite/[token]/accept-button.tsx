"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { acceptInvitation } from "@/app/actions/members";
import { Button } from "@/components/ui/button";

export function AcceptInviteButton({ token }: { token: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      size="lg"
      className="mt-6 w-full"
      loading={pending}
      onClick={() =>
        start(async () => {
          const res = await acceptInvitation(token);
          if (!res.ok) return void toast.error(res.error);
          toast.success(res.message);
          router.push("/dashboard");
        })
      }
    >
      Terima Undangan & Bergabung
    </Button>
  );
}
