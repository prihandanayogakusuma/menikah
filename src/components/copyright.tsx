import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

export function Copyright({ className }: { className?: string }) {
  return (
    <footer className={cn("no-print px-4 py-6 text-center text-xs leading-relaxed text-stone-400", className)}>
      <p className="flex flex-wrap items-center justify-center gap-x-1">
        <span>© {new Date().getFullYear()} prihandanayoga.</span>
        <span>All rights reserved.</span>
      </p>
      <p className="mt-0.5 inline-flex items-center gap-1">
        Dibuat dengan <Heart className="h-3 w-3 fill-primary-400 text-primary-400" /> untuk hari bahagia kalian
      </p>
    </footer>
  );
}
