import { notFound } from "next/navigation";
import { CertificateLookup } from "@/features/certificate/certificate-lookup";

export default async function CertificateTypePage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  if (!["umrah", "hajj", "badal-umrah", "badal-hajj"].includes(type)) notFound();
  const names: Record<string, string> = { umrah: "Umrah", hajj: "Hajj", "badal-umrah": "Badal Umrah", "badal-hajj": "Badal Hajj" };
  const provider = type.startsWith("badal-") ? "Tawkeel" : "M² Muslim Smart Watch";
  return <main><CertificateLookup type={names[type]} provider={provider} /></main>;
}
