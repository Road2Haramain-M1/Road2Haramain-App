"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { X } from "@phosphor-icons/react";
import { quickServices } from "@/components/patterns/service-registry";
import styles from "./home-experience.module.css";
import { JourneyCarousel } from "./journey-carousel";
import { PopularPackages } from "./popular-packages";
import { TravelUpdates } from "./travel-updates";

function HomeHeader({ notify }: { notify: (message: string) => void }) {
  return <header className={styles.header}>
    <div className={styles.greeting}>
      <Image src="/svgs/avatar.svg" alt="" width={36} height={36} />
      <span>Hi, Welcome back</span>
    </div>
    <button className={styles.iconButton} aria-label="Notifications" onClick={() => notify("Notifications are not connected yet.")}>
      <Image src="/svgs/bell.svg" alt="" width={23} height={23} />
    </button>
    <button className={styles.iconButton} aria-label="Account" onClick={() => notify("No account is signed in.")}>
      <Image src="/svgs/logout.svg" alt="" width={23} height={23} />
    </button>
  </header>;
}

function QuickServicesCard() {
  return <section className={styles.services}>
    <h2>Quick Services</h2>
    <div className={styles.serviceGrid}>
      {quickServices.map(service => <Link href={service.href} key={service.href} className={styles.service}>
        <span className={styles.serviceIcon}><Image src={service.icon} alt="" width={29} height={29} /></span>
        <span>{service.name === "Booking Status" ? <>Booking<br />Status</> : service.name === "Umrah Instalment" ? <>Umrah<br />Instalment</> : service.name}</span>
      </Link>)}
    </div>
  </section>;
}

export function HomeExperience() {
  const [message, setMessage] = useState("");
  return <main className={styles.screen}>
    <div className={styles.ambient} aria-hidden="true">{Array.from({ length: 20 }, (_, index) => <i key={index} />)}</div>
    <div className={styles.makkahLine} aria-hidden="true">
      <Image src="/images/home/makkah-skyline.png" alt="" fill sizes="(max-width: 620px) 100vw, 620px" />
    </div>
    <HomeHeader notify={setMessage} />
    <JourneyCarousel />
    <QuickServicesCard />
    <TravelUpdates />
    <PopularPackages />
    {message && <div className={styles.notice} role="status"><span>{message}</span><button onClick={() => setMessage("")} aria-label="Dismiss"><X size={20} /></button></div>}
  </main>;
}
