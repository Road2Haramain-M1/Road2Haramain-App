"use client";

import { useState } from "react";
import { PilgrimageShell, StickyContentHeader } from "@/features/pilgrimage/components/pilgrimage-shell";
import styles from "./affiliate-dashboard.module.css";

type Downline = { name: string; packageName: string; service: "Umrah" | "Hajj"; date: string; commission: string };

const downline: Downline[] = [
  { name: "Ahmad Faizal", packageName: "Standard Umrah Package", service: "Umrah", date: "08 Sep 2026", commission: "RM 250.00" },
  { name: "Nur Aisyah", packageName: "Hajj Economy Package", service: "Hajj", date: "02 Sep 2026", commission: "RM 300.00" },
  { name: "Mohd Hakim", packageName: "Premium Umrah Package", service: "Umrah", date: "08 Sep 2026", commission: "RM 200.00" },
];

const commission = [
  { label: "Total commission", value: "RM 750.00", emphasis: true },
  { label: "This month", value: "RM 250.00" },
  { label: "Pending", value: "RM 500.00" },
];

export function AffiliateDashboard() {
  const [activeTab, setActiveTab] = useState<"summary" | "downline">("summary");
  return <PilgrimageShell title="Affiliate" icon="/svgs/introducer.svg">
    <StickyContentHeader watermark="affiliate">
      <h1 className={styles.heading}>Your network</h1>
      <p className={styles.description}>Track the people you have introduced and the commission generated from their bookings.</p>
      <div className={styles.tabs} role="tablist" aria-label="Affiliate dashboard views">
        <button type="button" role="tab" aria-selected={activeTab === "summary"} className={activeTab === "summary" ? styles.activeTab : ""} onClick={() => setActiveTab("summary")}>Summary</button>
        <button type="button" role="tab" aria-selected={activeTab === "downline"} className={activeTab === "downline" ? styles.activeTab : ""} onClick={() => setActiveTab("downline")}>Downline</button>
      </div>
    </StickyContentHeader>
    {activeTab === "summary" ? <section className={styles.section} role="tabpanel">
      <div className={styles.sectionHeader}><h2>Commission summary</h2><span>All time</span></div>
      <article className={styles.totalCommission}><span>{commission[0].label}</span><strong>{commission[0].value}</strong><small>Earned from completed bookings</small></article>
      <div className={styles.summaryMetrics}>{commission.slice(1).map(item => <article className={styles.commission} key={item.label}><span>{item.label}</span><strong>{item.value}</strong></article>)}</div>
    </section> : <section className={styles.section} role="tabpanel">
      <div className={styles.sectionHeader}><h2>Downline</h2><span>{downline.length} people</span></div>
      <div className={styles.list}>{downline.map(person => <article className={styles.person} key={person.name}>
        <div className={styles.avatar}>{person.name.split(" ").map(part => part[0]).join("")}</div>
        <div className={styles.personInfo}><strong>{person.name}</strong><p>{person.packageName}</p><small>{person.service} · {person.date}</small></div>
        <div className={styles.personCommission}><span>Commission</span><strong>{person.commission}</strong></div>
      </article>)}</div>
    </section>}
  </PilgrimageShell>;
}
