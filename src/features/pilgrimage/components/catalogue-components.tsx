"use client";

import Image from "next/image";
import { CaretRight, Funnel, X } from "@phosphor-icons/react";
import type { Agency, Departure, Product } from "@/lib/api/types";
import styles from "./pilgrimage.module.css";

const formatDate = (value: string) => new Date(value + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const money = (value: string | number) => "RM " + Number(value).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function AgencyFilter({ open, search, officeType, onToggle, onSearch, onOfficeType, onClear, showOfficeType = true }: { open: boolean; search: string; officeType: string; onToggle: () => void; onSearch: (value: string) => void; onOfficeType: (value: string) => void; onClear: () => void; showOfficeType?: boolean }) {
  return <div className={styles.filterBar}>
    <button className={styles.filterButton} onClick={onToggle} aria-label="Filter agencies" aria-expanded={open}><Funnel size={19} /></button>
    {open && <><div className={styles.filterBackdrop} aria-hidden="true" onClick={onToggle} /><div className={styles.filterPanel}>
      <label>Search agencies<input value={search} onChange={event => onSearch(event.target.value)} placeholder="Name or address" /></label>
      {showOfficeType && <div className={styles.filterOptions}><span>Office type</span><div>
        {[["all", "All offices"], ["Ibu Pejabat", "Ibu Pejabat"], ["Cawangan", "Cawangan"]].map(([value, label]) => <button key={value} className={officeType === value ? styles.activeFilter : ""} onClick={() => onOfficeType(value)}>{label}</button>)}
      </div></div>}
      <button className={styles.clearFilter} onClick={onClear}><X size={15} /> Clear filters</button>
    </div></>}
  </div>;
}

export function AgencyCard({ agency, logo, count, onSelect }: { agency: Agency; logo: string; count: number; onSelect: () => void }) {
  return <button className={styles.card} onClick={onSelect}><span className={styles.cardText}><strong>{agency.name}</strong><span className={styles.meta}>{count} available {count === 1 ? "package" : "packages"}</span></span><span className={styles.logo} aria-hidden="true">{logo}</span></button>;
}

function PackagePhoto() { return <div className={styles.thumbnail}><Image src="/images/hero-kaaba.png" alt="Makkah" fill sizes="100px" /></div>; }

export function PackageCard({ product, onSelect }: { product: Product; onSelect: () => void }) {
  return <button className={styles.card + " " + styles.packageCard} onClick={onSelect}><PackagePhoto /><span className={styles.cardText}><strong>{product.name_en}</strong><span className={styles.meta}>{product.description_en}</span><span className={styles.price}>{money(product.unit_price)}</span></span><CaretRight className={styles.arrow} size={18} /></button>;
}

export function TravelPlanCard({ departure, onSelect }: { departure: Departure; onSelect: () => void }) {
  return <button className={styles.card} disabled={departure.capacity_available <= 0} onClick={onSelect}><span className={styles.calendar} aria-hidden="true"><small>{new Date(departure.start_date + "T00:00:00").toLocaleDateString("en-GB", { month: "short" })}</small><b>{departure.start_date.slice(8)}</b></span><span className={styles.cardText}><strong>{formatDate(departure.start_date)} - {formatDate(departure.end_date)}</strong></span><CaretRight size={18} className={styles.arrow} /></button>;
}
