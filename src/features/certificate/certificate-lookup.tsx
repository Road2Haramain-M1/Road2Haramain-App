"use client";

import { useRouter } from "next/navigation";

import { PilgrimageShell, StickyContentHeader } from "@/features/pilgrimage/components/pilgrimage-shell";
import styles from "@/features/pilgrimage/components/pilgrimage.module.css";

export function CertificateLookup({ type, provider }: { type: string; provider: "M² Muslim Smart Watch" | "Tawkeel" }) {
  const tawkeel = provider === "Tawkeel";
  const router = useRouter();
  return <PilgrimageShell title={`${type} Certificate`} icon="/svgs/certificate.svg" onBack={() => router.push("/certificate")} backLabel="Back to certificates">
    <StickyContentHeader watermark="certificate"><h1 className={styles.heading}>{type} Certificate</h1><p className={styles.description}>This feature is linked to {tawkeel ? "Tawkeel" : <>M<sup>2</sup></>}. Please enter your reference number for certificate issuing.</p></StickyContentHeader>
    <label className={styles.certificateField}>Referral Number<input placeholder="Enter referral number" /></label>
    <p className={styles.certificateNote}>For further detail <a href={tawkeel ? "https://tawkeel.com/en" : "https://m2msw.com/"} target="_blank" rel="noreferrer">{tawkeel ? "Tawkeel" : <>M<sup>2</sup> Muslim Smart Watch</>}</a></p>
    <div className={styles.action}><button className={styles.primary} type="button">Update</button></div>
  </PilgrimageShell>;
}
