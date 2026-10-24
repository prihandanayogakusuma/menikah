"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const TABLES = ["savings_logs", "expenses", "categories", "savings_goals", "weddings"] as const;

/**
 * Mendengarkan perubahan data board via Supabase Realtime, lalu me-refresh
 * Server Components — sehingga input pasangan langsung muncul tanpa reload.
 */
export function RealtimeRefresher({ weddingId }: { weddingId: string }) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const refresh = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => router.refresh(), 400);
    };
    let channel = supabase.channel(`wedding-${weddingId}`);
    for (const table of TABLES) {
      const filter = table === "weddings" ? `id=eq.${weddingId}` : `wedding_id=eq.${weddingId}`;
      channel = channel.on("postgres_changes", { event: "*", schema: "public", table, filter }, refresh);
    }
    channel.subscribe();
    return () => {
      if (timer.current) clearTimeout(timer.current);
      supabase.removeChannel(channel);
    };
  }, [weddingId, router]);

  return null;
}
