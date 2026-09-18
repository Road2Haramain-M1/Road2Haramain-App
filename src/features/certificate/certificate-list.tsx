"use client";

import Image from "next/image";
import Link from "next/link";
import { PilgrimageShell, StickyContentHeader } from "@/features/pilgrimage/components/pilgrimage-shell";
import styles from "@/features/pilgrimage/components/pilgrimage.module.css";

const certificateTypes = [
  ["Umrah", "/svgs/umrah.svg"], ["Badal Umrah", "/svgs/umrah.svg"], ["Hajj", "/svgs/hajj.svg"],
  ["Badal Hajj", "/svgs/hajj.svg"],
  ["Qurban", "/svgs/certificate.svg"], ["Aqiqah", "/svgs/certificate.svg"],
] as const;

export function CertificateList() {
  return <PilgrimageShell title="Certificates" icon="/svgs/certificate.svg">
    <StickyContentHeader watermark="certificate"><h1 className={styles.heading}>Certificates</h1><p className={styles.description}>Choose a certificate type to view your eligible certificates.</p></StickyContentHeader>
    <div className={styles.certificateGrid}>
      {certificateTypes.map(([name, icon]) => { const href = name === "Umrah" ? "/certificate/umrah" : name === "Hajj" ? "/certificate/hajj" : name === "Badal Umrah" ? "/certificate/badal-umrah" : name === "Badal Hajj" ? "/certificate/badal-hajj" : null; const content = <><span className={styles.certificateIcon}><Image src={icon} alt="" width={25} height={25} /></span><span>{name}</span></>; return href ? <Link key={name} href={href} className={styles.certificateCard}>{content}</Link> : <button key={name} className={styles.certificateCard} type="button">{content}</button>; })}
    </div>
  </PilgrimageShell>;
}
