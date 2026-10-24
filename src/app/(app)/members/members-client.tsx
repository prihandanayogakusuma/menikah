"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Crown, LogOut, Mail, MessageCircle, Send, Trash2, UserMinus, Users, XCircle } from "lucide-react";
import { deleteInvitation, inviteMember, removeMember, revokeInvitation, updateMemberRole } from "@/app/actions/members";
import { leaveWedding } from "@/app/actions/wedding";
import type { MemberRole, WeddingInvitation, WeddingMember } from "@/lib/types";
import { formatDate, ROLE_LABEL } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { ConfirmButton } from "@/components/ui/confirm";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

const ROLE_OPTIONS: MemberRole[] = ["groom", "bride", "family", "planner", "partner"];

export function MembersClient({
  weddingTitle,
  members,
  invitations,
  currentUserId,
  isOwner,
  siteUrl,
}: {
  weddingTitle: string;
  members: WeddingMember[];
  invitations: WeddingInvitation[];
  currentUserId: string;
  isOwner: boolean;
  siteUrl: string;
}) {
  const router = useRouter();
  const [origin, setOrigin] = useState(siteUrl);
  const [lastLink, setLastLink] = useState<{ email: string; url: string } | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!siteUrl) setOrigin(window.location.origin);
  }, [siteUrl]);

  const linkFor = (token: string) => `${origin}/invite/${token}`;
  const pendingInvites = invitations.filter((i) => i.status === "pending");
  const historyInvites = invitations.filter((i) => i.status !== "pending");

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardHeader title="Undang Pasangan / Keluarga" description="Penerima login/daftar dengan email yang sama, lalu menerima undangan." />
          <CardBody>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const fd = new FormData(form);
                const email = String(fd.get("email"));
                start(async () => {
                  const res = await inviteMember(fd);
                  if (!res.ok) return void toast.error(res.error);
                  toast.success(res.message);
                  if (res.token) setLastLink({ email, url: linkFor(res.token) });
                  form.reset();
                });
              }}
            >
              <Field label="Email" htmlFor="invite_email">
                <Input id="invite_email" name="email" type="email" required placeholder="pasangan@email.com" />
              </Field>
              <Field label="Peran" htmlFor="invite_role">
                <Select id="invite_role" name="role" defaultValue="bride">
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Button type="submit" className="w-full" loading={pending}>
                <Send className="h-4 w-4" /> Buat Undangan
              </Button>
            </form>

            {lastLink && (
              <div className="mt-5 rounded-xl border border-gold-200 bg-gold-50 p-4">
                <p className="text-sm font-medium text-stone-900">Bagikan link ini ke {lastLink.email}</p>
                <div className="mt-2 flex gap-2">
                  <Input readOnly value={lastLink.url} className="h-9 bg-white text-xs" onFocus={(e) => e.currentTarget.select()} />
                </div>
                <ShareButtons url={lastLink.url} email={lastLink.email} weddingTitle={weddingTitle} />
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Undangan Menunggu" description={`${pendingInvites.length} undangan belum diterima`} />
          {pendingInvites.length === 0 ? (
            <CardBody>
              <p className="text-center text-sm text-stone-400">Tidak ada undangan tertunda.</p>
            </CardBody>
          ) : (
            <ul className="divide-y divide-stone-100">
              {pendingInvites.map((inv) => (
                <li key={inv.id} className="space-y-2 px-5 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-stone-900">{inv.email}</p>
                      <p className="text-xs text-stone-500">
                        {ROLE_LABEL[inv.role]} · dikirim {formatDate(inv.created_at)}
                      </p>
                    </div>
                    <ConfirmButton
                      size="icon"
                      variant="ghost"
                      className="text-stone-400 hover:text-red-600"
                      title="Batalkan undangan?"
                      description={`Link undangan untuk ${inv.email} tidak akan bisa digunakan lagi.`}
                      confirmLabel="Batalkan"
                      action={() => revokeInvitation(inv.id)}
                    >
                      <XCircle className="h-4 w-4" />
                    </ConfirmButton>
                  </div>
                  <ShareButtons url={linkFor(inv.token)} email={inv.email} weddingTitle={weddingTitle} compact />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="space-y-6 lg:col-span-3">
        <Card>
          <CardHeader title="Anggota Board" description={`${members.length} orang memiliki akses ke board ini`} />
          {members.length === 0 ? (
            <EmptyState icon={Users} title="Belum ada anggota" />
          ) : (
            <ul className="divide-y divide-stone-100">
              {members.map((m) => {
                const isMe = m.user_id === currentUserId;
                const canEditRole = isMe || isOwner;
                return (
                  <li key={m.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 font-semibold text-primary-700">
                      {(m.display_name || m.email || "?").slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium text-stone-900">{m.display_name || m.email}</p>
                        {isMe && <Badge>Anda</Badge>}
                        {m.is_owner && (
                          <Badge tone="gold">
                            <Crown className="h-3 w-3" /> Pemilik
                          </Badge>
                        )}
                      </div>
                      <p className="truncate text-xs text-stone-500">
                        {m.email} · bergabung {formatDate(m.created_at)}
                      </p>
                    </div>
                    <Select
                      className="h-9 w-auto text-xs"
                      defaultValue={m.role}
                      disabled={!canEditRole}
                      onChange={(e) => {
                        const role = e.target.value as MemberRole;
                        start(async () => {
                          const res = await updateMemberRole(m.id, role);
                          if (!res.ok) toast.error(res.error);
                          else toast.success(res.message);
                        });
                      }}
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABEL[r]}
                        </option>
                      ))}
                    </Select>
                    {isOwner && !isMe && !m.is_owner && (
                      <ConfirmButton
                        size="icon"
                        variant="ghost"
                        className="text-stone-400 hover:text-red-600"
                        title="Keluarkan anggota?"
                        description={`${m.display_name || m.email} tidak akan bisa mengakses board ini lagi.`}
                        confirmLabel="Keluarkan"
                        action={() => removeMember(m.id)}
                      >
                        <UserMinus className="h-4 w-4" />
                      </ConfirmButton>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {historyInvites.length > 0 && (
          <Card>
            <CardHeader title="Riwayat Undangan" />
            <ul className="divide-y divide-stone-100">
              {historyInvites.map((inv) => (
                <li key={inv.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate text-stone-800">{inv.email}</p>
                    <p className="text-xs text-stone-500">
                      {ROLE_LABEL[inv.role]} · {formatDate(inv.accepted_at ?? inv.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={inv.status === "accepted" ? "success" : "neutral"}>{inv.status === "accepted" ? "Diterima" : "Dibatalkan"}</Badge>
                    <ConfirmButton
                      size="icon"
                      variant="ghost"
                      className="text-stone-400 hover:text-red-600"
                      title="Hapus riwayat undangan?"
                      action={() => deleteInvitation(inv.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </ConfirmButton>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {!isOwner && (
          <Card>
            <CardBody className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-stone-900">Keluar dari board</p>
                <p className="text-sm text-stone-500">Anda tidak akan bisa mengakses data board ini lagi.</p>
              </div>
              <ConfirmButton
                variant="secondary"
                title="Keluar dari board?"
                description="Anda perlu diundang kembali untuk bisa mengakses board ini."
                confirmLabel="Keluar"
                action={leaveWedding}
                onDone={() => router.push("/dashboard")}
              >
                <LogOut className="h-4 w-4" /> Keluar
              </ConfirmButton>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}

function ShareButtons({ url, email, weddingTitle, compact }: { url: string; email: string; weddingTitle: string; compact?: boolean }) {
  const text = `Hai! Aku mengundangmu untuk mengelola board "${weddingTitle}" bersama di Wedding Budget Planner. Login/daftar dengan email ${email}, lalu buka link ini: ${url}`;
  return (
    <div className={compact ? "flex flex-wrap gap-1.5" : "mt-3 flex flex-wrap gap-2"}>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            toast.success("Link undangan disalin");
          } catch {
            toast.error("Gagal menyalin — salin manual dari kolom link");
          }
        }}
      >
        <Copy className="h-3.5 w-3.5" /> Salin link
      </Button>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(text)}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 text-xs font-medium text-emerald-700 shadow-sm hover:bg-emerald-50"
      >
        <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
      </a>
      <a
        href={`mailto:${email}?subject=${encodeURIComponent(`Undangan board ${weddingTitle}`)}&body=${encodeURIComponent(text)}`}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 text-xs font-medium text-stone-700 shadow-sm hover:bg-stone-50"
      >
        <Mail className="h-3.5 w-3.5" /> Email
      </a>
    </div>
  );
}
