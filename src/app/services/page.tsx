"use client";

import Image from "next/image";
import { useState } from "react";
import { X } from "@phosphor-icons/react";
import { PilgrimageShell, StickyContentHeader } from "@/features/pilgrimage/components/pilgrimage-shell";
import styles from "./services.module.css";
import { serviceImages } from "@/components/patterns/service-images";

const services = [
  { name: "Transportation", description: "Arrange ground travel for your pilgrimage.", image: serviceImages.transportation },
  { name: "Zam-zam Water", description: "Request Zam-zam water delivery support.", image: serviceImages.zamzam },
  { name: "Wheelchair", description: "Find mobility assistance for your journey.", image: serviceImages.wheelchair },
  { name: "EQurban", description: "Access digital Qurban services when available.", image: serviceImages.equrban },
  { name: "One Tranzact", description: "Manage supported pilgrimage transactions.", image: serviceImages["one-tranzact"] },
  { name: "Moddakir", description: "Learn and improve your Quran recitation with qualified teachers.", image: { src: "/images/services/moddakir-logo.png", alt: "Moddakir Quran Learning logo" }, href: "https://p.moddakir.com/en/", logo: true },
  { name: "Mzar", description: "Explore heritage tours, Umrah packages, and transport around the Holy Mosques.", image: { src: "/images/services/mzar-logo.png", alt: "Mzar logo" }, href: "https://www.mzarapp.com/en/", logo: true },
];

const orderedServices = [...services].sort((left, right) => Number(Boolean(right.href)) - Number(Boolean(left.href)));

export default function ServicesPage() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const expandedService = services.find(service => service.name === expanded);
  return <main><PilgrimageShell title="Services" icon="/svgs/services.svg"><StickyContentHeader watermark="services"><h1 className={styles.heading}>Pilgrim services</h1><p className={styles.description}>Additional services to support your journey.</p></StickyContentHeader><div className={styles.grid}>{orderedServices.map(service => {
    return <article className={styles.card} key={service.name} tabIndex={0} role="button" aria-label={`Open ${service.name} details`} onClick={() => setExpanded(service.name)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setExpanded(service.name); } }}>
      <div className={`${styles.tileImage} ${service.logo ? styles.logoImage : ""}`}><Image src={service.image.src} alt={service.image.alt} fill sizes="(max-width: 430px) 45vw, 180px" /></div>
      <div className={styles.tileBody}><h2>{service.name}</h2><p>{service.description}</p></div>
    </article>;
  })}</div>
  {expandedService && <div className={styles.modalBackdrop} role="presentation" onClick={() => setExpanded(null)}>
    <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="service-modal-title" onClick={event => event.stopPropagation()}>
      <button className={styles.close} type="button" aria-label="Close service details" onClick={() => setExpanded(null)}><X size={20} /></button>
      <div className={`${styles.modalImage} ${expandedService.logo ? styles.logoImage : ""}`}><Image src={expandedService.image.src} alt={expandedService.image.alt} fill sizes="120px" /></div>
      <div className={styles.modalBody}><h2 id="service-modal-title">{expandedService.name}</h2><p>{expandedService.description}</p><p>{expandedService.href ? "Continue to the service provider to get started." : "This service will be available in a future release."}</p>
        {expandedService.href ? <a className={styles.proceed} href={expandedService.href} target="_blank" rel="noreferrer">Proceed</a> : <span className={`${styles.proceed} ${styles.disabled}`}>Coming soon</span>}
      </div>
    </section>
  </div>}
  </PilgrimageShell></main>;
}
