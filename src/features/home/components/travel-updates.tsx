"use client";

import Image from "next/image";
import { CalendarBlank } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import styles from "./travel-updates.module.css";

const updates = [
  { id: "mzar-launch", category: "New service", date: "17 Sep 2026", dateTime: "2026-09-17", title: "Mzar is now available in Pilgrim Services", summary: "Explore heritage tours, Umrah packages, and transport around the Holy Mosques.", image: "/images/services/mzar-logo.png", imageAlt: "Mzar logo", href: "https://www.mzarapp.com/en/", action: "Open →" },
  { id: "moddakir-launch", category: "New service", date: "16 Sep 2026", dateTime: "2026-09-16", title: "Moddakir Quran Learning has joined the app", summary: "Access Quran learning with qualified teachers through Pilgrim Services.", image: "/images/services/moddakir-logo.png", imageAlt: "Moddakir Quran Learning logo", href: "https://p.moddakir.com/en/", action: "Open →" },
];

/** Compact home feed for timely pilgrimage and service information. */
export function TravelUpdates() {
  const [active, setActive] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<number | null>(null);
  const swiped = useRef(false);
  const finishDrag = (clientX: number) => {
    if (dragStart.current === null) return;
    const distance = clientX - dragStart.current;
    swiped.current = Math.abs(distance) > 10;
    if (Math.abs(distance) > 45) {
      setActive(current => Math.max(0, Math.min(updates.length - 1, current + (distance < 0 ? 1 : -1))));
    }
    dragStart.current = null;
    setDragOffset(0);
    setDragging(false);
  };
  return <section className={styles.section} aria-labelledby="travel-updates-title">
    <div className={styles.header}>
      <h2 id="travel-updates-title">Highlights</h2>
    </div>
    <div className={styles.viewport} role="region" aria-label="Latest updates"
      onPointerDown={event => { dragStart.current = event.clientX; swiped.current = false; setDragging(true); }}
      onPointerMove={event => { if (dragStart.current !== null) setDragOffset(event.clientX - dragStart.current); }}
      onPointerUp={event => finishDrag(event.clientX)}
      onPointerCancel={() => { dragStart.current = null; swiped.current = false; setDragOffset(0); setDragging(false); }}
      onClickCapture={event => { if (swiped.current) { event.preventDefault(); event.stopPropagation(); } swiped.current = false; }}>
      <div className={styles.track} style={{ transform: `translateX(calc(-${active} * (88% + 12px) + ${dragOffset}px))`, transition: dragging ? "none" : undefined }}>
        {updates.map(update => <article className={styles.card} key={update.id}>
          <div className={styles.brandVisual}><Image src={update.image} alt={update.imageAlt} fill sizes="260px" /></div>
          <div className={styles.cardBody}><div className={styles.cardTop}><span>{update.category}</span><time dateTime={update.dateTime}><CalendarBlank size={14} />{update.date}</time></div>
            <h3>{update.title}</h3>
            <p>{update.summary}</p>
            <a className={styles.action} href={update.href} target="_blank" rel="noreferrer">{update.action}</a>
          </div>
        </article>)}
      </div>
    </div><div className={styles.dots} aria-label="Choose an update"><span className={styles.srOnly}>Update {active + 1} of {updates.length}</span>{updates.map((update, index) => <button type="button" key={update.id} className={styles.dot} aria-label={`Show ${update.title}`} aria-current={active === index ? "true" : undefined} onClick={() => setActive(index)}><span /></button>)}</div>
  </section>;
}
