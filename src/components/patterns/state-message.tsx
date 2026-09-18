export function StateMessage({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "error" }) {
  return <div role={tone === "error" ? "alert" : "status"} className={`rounded-[16px] p-4 text-[15px] ${tone === "error" ? "bg-red-50 text-red-800" : "bg-black/5 text-muted"}`}>{children}</div>;
}
