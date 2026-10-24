"use client";

import { useState } from "react";
import { cn, formatNumber, parseMoney } from "@/lib/utils";

/** Input nominal Rupiah dengan pemisah ribuan. Nilai mentah dikirim lewat input hidden `name`. */
export function MoneyInput({
  name,
  id,
  defaultValue,
  placeholder = "0",
  required,
  className,
  onValueChange,
}: {
  name: string;
  id?: string;
  defaultValue?: number | null;
  placeholder?: string;
  required?: boolean;
  className?: string;
  onValueChange?: (value: number) => void;
}) {
  const [value, setValue] = useState<number>(Number(defaultValue) || 0);
  const [text, setText] = useState(defaultValue ? formatNumber(defaultValue) : "");

  return (
    <div className={cn("relative", className)}>
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-stone-400">Rp</span>
      <input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        required={required}
        placeholder={placeholder}
        value={text}
        onChange={(e) => {
          const n = Math.max(0, parseMoney(e.target.value));
          setValue(n);
          setText(e.target.value.trim() === "" ? "" : formatNumber(n));
          onValueChange?.(n);
        }}
        className="h-10 w-full rounded-lg border border-stone-200 bg-white pl-9 pr-3 text-sm text-stone-900 tabular-nums placeholder:text-stone-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
      />
      <input type="hidden" name={name} value={value} />
    </div>
  );
}
