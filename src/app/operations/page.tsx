import { PageHeader } from "@/components/patterns/page-header";
import { OperationsBoard } from "@/features/operations/components/operations-board";

export default function OperationsPage() {
  return <main className="min-h-[100dvh]"><PageHeader title="Operations / Admin" /><section className="m-4 rounded-[24px] bg-white p-4"><p className="mb-4 text-[15px] text-muted">Small demo portal—not an ERP.</p><OperationsBoard /></section></main>;
}
