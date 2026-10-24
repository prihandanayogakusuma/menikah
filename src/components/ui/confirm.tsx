"use client";

import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/types";
import { Button, type ButtonProps } from "./button";
import { Modal } from "./modal";

/** Tombol dengan dialog konfirmasi yang menjalankan server action. */
export function ConfirmButton({
  action,
  title,
  description,
  confirmLabel = "Hapus",
  children,
  successMessage,
  onDone,
  ...buttonProps
}: Omit<ButtonProps, "onClick" | "action"> & {
  action: () => Promise<ActionResult>;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  successMessage?: string;
  onDone?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  return (
    <>
      <Button type="button" {...buttonProps} onClick={() => setOpen(true)}>
        {children}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={title} size="sm">
        {description && <div className="text-sm text-stone-600">{description}</div>}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
            Batal
          </Button>
          <Button
            variant="danger"
            loading={pending}
            onClick={() =>
              start(async () => {
                const res = await action();
                if (!res.ok) {
                  toast.error(res.error ?? "Gagal");
                  return;
                }
                toast.success(res.message ?? successMessage ?? "Berhasil");
                setOpen(false);
                onDone?.();
              })
            }
          >
            {confirmLabel}
          </Button>
        </div>
      </Modal>
    </>
  );
}
