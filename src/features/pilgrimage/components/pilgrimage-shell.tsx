"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getSectionImage } from "@/components/patterns/service-images";
import { ServiceSwitcher } from "@/components/patterns/service-switcher";
import { CaretLeft, MapPin } from "@phosphor-icons/react";
import { useEffect, useRef, type ReactNode } from "react";
import styles from "./pilgrimage.module.css";

export function PilgrimageShell({ children, onBack, backLabel = "Back", compact = false, title, icon = "/svgs/umrah.svg", transitionKey, direction = "forward", headerMotion }: {
  children: ReactNode; onBack?: () => void; backLabel?: string; compact?: boolean; title: string; icon?: string;
  transitionKey?: string; direction?: "forward" | "back"; headerMotion?: "expand" | "collapse";
}) {
  const hero = getSectionImage(usePathname());
  const sheet = useRef<HTMLDivElement>(null);
  const sheetContent = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!transitionKey || !sheet.current || !sheetContent.current) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    sheet.current.scrollTop = 0;
    if (preference.matches) return;
    // Keep the sheet fixed and move one content layer inside it. Animating every
    // card independently made equal-height catalogue screens appear to jitter.
    const animations = [sheetContent.current.animate([
      { transform: `translateX(${direction === "back" ? -36 : 36}px)` },
      { transform: "translateX(0)" },
    ], { duration: 260, easing: "cubic-bezier(.22, 1, .36, 1)" })];
    const stop = () => { if (preference.matches) animations.forEach(animation => animation.cancel()); };
    preference.addEventListener("change", stop);
    return () => { animations.forEach(animation => animation.cancel()); preference.removeEventListener("change", stop); };
  }, [transitionKey, direction]);
  return <div className={styles.screen}>
    <div className={compact ? styles.compactHero : styles.hero} data-header-motion={headerMotion}>
      <Image src={hero.src} alt={hero.alt} fill preload sizes="(max-width: 430px) 100vw, 430px" className={styles.heroImage} style={{ objectPosition: "center" }} />
      <div className={styles.photoShade} />
      <header className={styles.toolbar}>
        {onBack ? <button onClick={onBack} className={styles.roundButton} aria-label={backLabel}><CaretLeft size={22} /></button>
          : <Link href="/" className={styles.roundButton} aria-label="Back to home"><CaretLeft size={22} /></Link>}
        <span className={styles.toolbarTitle}>{compact ? title : (title ?? "Umrah")}</span>
        <ServiceSwitcher icon={icon} className={styles.brandIcon} />
      </header>
    </div>
    <div ref={sheet} className={styles.sheet} data-directional={transitionKey ? "true" : undefined}>
      <div ref={sheetContent} className={styles.sheetContent}>{children}</div>
    </div>
  </div>;
}

export function LocationLine() {
  return <p className={styles.location}><MapPin size={17} weight="fill" /> Makkah &amp; Madinah, Saudi Arabia</p>;
}

/** Keeps a service screen's title and short context visible during content scroll. */
export function StickyContentHeader({ children, watermark }: { children: ReactNode; watermark?: "booking" | "certificate" | "services" | "affiliate" }) {
  return <div className={`${styles.stickyContentHeader} ${watermark ? styles.illustratedHeader : ""}`} data-watermark={watermark}>{children}</div>;
}
