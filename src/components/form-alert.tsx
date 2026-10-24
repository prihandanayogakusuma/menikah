import { CheckCircle2, AlertCircle } from "lucide-react";

export function FormAlert({ error, message }: { error?: string; message?: string }) {
  if (error)
    return (
      <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{error}</span>
      </div>
    );
  if (message)
    return (
      <div className="flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{message}</span>
      </div>
    );
  return null;
}
