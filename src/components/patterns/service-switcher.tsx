"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { quickServices } from "./service-registry";
import styles from "./service-switcher.module.css";

/** Local navigation disclosure. Never submits or changes booking/payment state. */
export function ServiceSwitcher({ icon, className }: { icon: string; className?: string }) {
  const pathname = usePathname();
  return <ServiceFlower key={pathname} pathname={pathname} icon={icon} className={className} />;
}

function ServiceFlower({ pathname, icon, className }: { pathname: string; icon: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const current = quickServices.find(service => pathname === service.href || pathname.startsWith(`${service.href}/`));
  const others = quickServices.filter(service => service !== current);

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);

  return <div ref={root} className={styles.root} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }} onKeyDown={event => {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      trigger.current?.focus();
    }
  }}>
    {open && <div className={styles.backdrop} aria-hidden="true" onPointerDown={() => setOpen(false)} />}
    <button ref={trigger} type="button" className={`${className ?? ""} ${styles.trigger}`} aria-label={`${open ? "Close" : "Open"} service switcher`} aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}>
      <Image src={icon} alt="" width={23} height={23} />
    </button>
    <nav id={id} aria-label="Switch service" className={styles.petals} hidden={!open}>
      {others.map((service, index) => {
        const style = { "--x": "0px", "--y": `${56 + index * 54}px`, "--delay": `${index * 25}ms` } as CSSProperties;
        return <Link key={service.href} href={service.href} className={styles.petal} style={style} onClick={() => setOpen(false)}>
          <span className={styles.label}>{service.name}</span>
          <span className={styles.icon}><Image src={service.icon} alt="" width={24} height={24} /></span>
        </Link>;
      })}
    </nav>
  </div>;
}
