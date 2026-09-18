"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  AirplaneTiltIcon,
  ArrowRight,
  Buildings,
  CalendarBlank,
  CreditCard,
  CreditCardIcon,
  FirstAidKitIcon,
  IdentificationCardIcon,
  Package,
  PackageIcon,
  Phone,
  ReceiptIcon,
  TicketIcon,
  WalletIcon,
} from "@phosphor-icons/react";
import { PilgrimageJourney } from "./pilgrimage-journey";
import { PjhList } from "./pjh-list";
import { PilgrimageShell, LocationLine } from "./pilgrimage-shell";
import { getPilgrimageHistory, pushPilgrimageHistory } from "../flow-history";
import styles from "./pilgrimage.module.css";

// Keep the large MOTAC snapshot out of the initial Hajj/instalment bundles.
const UmrahList = dynamic(() => import("./umrah-list").then(module => module.UmrahList), {
  loading: () => <PilgrimageShell compact title="Umrah" icon="/svgs/umrah.svg">
    <p className={styles.state} role="status">Loading agencies…</p>
  </PilgrimageShell>,
});

const umrahProcessSteps = [
  { label: "Choose agency", icon: Buildings },
  { label: "Choose package", icon: Package },
  { label: "Choose month & year for Umrah", icon: CalendarBlank },
  { label: "Pay booking fees", icon: CreditCard },
  { label: "The travel agency will contact you.", icon: Phone },
];
const hajjProcessSteps = [
  { label: "Confirm TH eligibility & savings", icon: WalletIcon },
  { label: "Prepare documents (ID, passport, photos, certificates)", icon: IdentificationCardIcon },
  { label: "Select package and register when open", icon: PackageIcon },
  { label: "Pay deposit or full payment", icon: CreditCardIcon },
  { label: "Complete medical checks, vaccinations and visa", icon: FirstAidKitIcon },
  { label: "Receive seat allocation and travel documents", icon: TicketIcon },
  { label: "Travel and follow PJH/TH on-ground arrangements", icon: AirplaneTiltIcon },
  { label: "Post-Hajj admin: final statements & follow-ups", icon: ReceiptIcon },
];
const instalmentProcessSteps = [
  { label: "Choose agency", icon: Buildings }, { label: "Choose an Umrah package", icon: Package },
  { label: "Choose your travel plan", icon: CalendarBlank }, { label: "Pay booking fee", icon: CreditCard },
  { label: "Pay the remaining balance by instalment", icon: CreditCard },
];

export function PilgrimageIntroduction({ service = "umrah" }: { service?: "umrah" | "hajj" | "umrah-instalment" }) {
  const [started, setStarted] = useState(false);
  const [returning, setReturning] = useState(false);
  useEffect(() => {
    const restoreIntroduction = (event: PopStateEvent) => {
      const entry = getPilgrimageHistory(event.state);
      if (!entry) {
        setReturning(true);
        setStarted(false);
      }
    };
    window.addEventListener("popstate", restoreIntroduction);
    return () => window.removeEventListener("popstate", restoreIntroduction);
  }, [service]);

  const openDirectory = () => {
    pushPilgrimageHistory({ layer: "directory", service });
    setReturning(false);
    setStarted(true);
  };

  const closeDirectory = () => {
    const entry = getPilgrimageHistory(window.history.state);
    if (entry?.service === service && entry.layer === "directory") {
      window.history.back();
      return;
    }
    setReturning(true);
    setStarted(false);
  };
  if (started) {
    const onBack = closeDirectory;
    return service === "hajj" ? <PjhList onBack={onBack} /> : service === "umrah" || service === "umrah-instalment"
      ? <UmrahList onBack={onBack} service={service} /> : <PilgrimageJourney service={service} onBack={onBack} />;
  }

  const steps = service === "hajj" ? hajjProcessSteps : service === "umrah-instalment" ? instalmentProcessSteps : umrahProcessSteps;
  const title = service === "hajj" ? "Hajj" : service === "umrah-instalment" ? "Umrah Instalment" : "Umrah";
  return <PilgrimageShell title={title} headerMotion={returning ? "expand" : undefined} transitionKey={returning ? "introduction" : undefined} direction="back" icon={service === "hajj" ? "/svgs/hajj.svg" : service === "umrah-instalment" ? "/svgs/installment.svg" : "/svgs/umrah.svg"}>
    <div className={styles.stickyIntro} data-service={service}>
      <h1 className={styles.heading}>{title}</h1>
      <LocationLine />
      <p className={styles.description}>{service === "hajj" ? "Complete the key steps for your Hajj journey through Tabung Haji and your selected PJH." : service === "umrah-instalment" ? "Plan your Umrah journey with a flexible instalment payment option." : "Begin your journey to the holy cities. Find your agency, explore Umrah packages, and choose the travel plan that suits you."}</p>
    </div>
    <h2 className={styles.sectionTitle}>Process method:</h2>
    <ol className={styles.process}>
      {steps.map(({ label, icon: Icon }) => <li key={label}>
        <span className={styles.processIcon}><Icon size={19} /></span>
        <span>{label}</span>
      </li>)}
    </ol>
    <div className={styles.action}>
      <button className={styles.primary} onClick={openDirectory}>{service === "hajj" ? "PJH List" : "Join The Platform"} <ArrowRight size={19} /></button>
    </div>
  </PilgrimageShell>;
}
