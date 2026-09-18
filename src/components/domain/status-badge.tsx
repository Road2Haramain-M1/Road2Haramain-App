const tones: Record<string, string> = {
  CONFIRMED: "bg-emerald-100 text-emerald-800",
  SUCCEEDED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-slate-200 text-slate-700",
  REFUNDED: "bg-slate-200 text-slate-700",
  ACTION_REQUIRED: "bg-amber-100 text-amber-900",
  UNKNOWN: "bg-amber-100 text-amber-900",
  FAILED: "bg-red-100 text-red-800",
  REJECTED: "bg-red-100 text-red-800",
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tones[status] ?? "bg-blue-50 text-blue-800"}`}>{status.replaceAll("_", " ")}</span>;
}
