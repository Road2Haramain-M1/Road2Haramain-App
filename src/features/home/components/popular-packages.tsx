"use client";

import Image from "next/image";
import Link from "next/link";
import { StateMessage } from "@/components/patterns/state-message";
import { serviceImages } from "@/components/patterns/service-images";
import { usePopularPackages } from "../hooks/use-popular-packages";
import { useRef, useState } from "react";
import styles from "./popular-packages.module.css";

export function PopularPackages() {
  const { items, loading, error, retry } = usePopularPackages();
  const [active, setActive] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<number | null>(null);
  const dragDistance = useRef(0);
  const swiped = useRef(false);
  const finishDrag = (clientX: number) => {
    if (dragStart.current === null) return;
    const distance = clientX - dragStart.current;
    dragDistance.current = distance;
    swiped.current = Math.abs(distance) > 10;
    if (Math.abs(distance) > 45) {
      setActive(current => Math.max(0, Math.min(items.length - 1, current + (distance < 0 ? 1 : -1))));
    }
    dragStart.current = null;
    setDragOffset(0);
    setDragging(false);
  };
  return <section className={styles.section} aria-labelledby="popular-packages-heading">
    <header className={styles.header}>
      <h2 id="popular-packages-heading">Popular Packages</h2>
      <Link href="/umrah">See all</Link>
    </header>
    {loading ? <StateMessage>Loading packages...</StateMessage>
      : error ? <StateMessage tone="error">Unable to load packages. <button className={styles.retry} onClick={retry}>Try again</button></StateMessage>
      : !items.length ? <StateMessage>No packages available yet.</StateMessage>
      : <><div className={styles.viewport} role="region" aria-label="Popular Umrah packages"
        onPointerDown={event => { dragStart.current = event.clientX; dragDistance.current = 0; swiped.current = false; setDragging(true); }}
        onPointerMove={event => { if (dragStart.current !== null) { const offset = event.clientX - dragStart.current; dragDistance.current = offset; setDragOffset(offset); } }}
        onPointerUp={event => finishDrag(event.clientX)}
        onPointerCancel={() => { if (dragStart.current !== null) { swiped.current = Math.abs(dragDistance.current) > 10; dragStart.current = null; setDragOffset(0); setDragging(false); } }}
        onClickCapture={event => { if (event.detail > 0 && swiped.current) { event.preventDefault(); event.stopPropagation(); } swiped.current = false; }}>
        <div className={styles.track} style={{ transform: `translateX(calc(-${active} * (88% + 12px) + ${dragOffset}px))`, transition: dragging ? "none" : undefined }}>
        {items.map(item => <Link key={item.id} href="/umrah" className={styles.card} aria-label={`Explore ${item.name_en}`} draggable={false}>
          <div className={styles.photo}><Image src={serviceImages.umrah.src} alt="" fill sizes="280px" /></div>
          <div className={styles.body}>
            <h3>{item.name_en}</h3>
            <p className={styles.agency}>{item.agencyName}</p>
            <p className={styles.duration}>{item.description_en}</p>
            <strong className={styles.price}>{new Intl.NumberFormat("en-MY", { style: "currency", currency: item.currency }).format(Number(item.unit_price))}</strong>
          </div>
        </Link>)}
        </div>
      </div><div className={styles.dots} aria-label="Choose a package"><span className={styles.srOnly}>Package {active + 1} of {items.length}</span>{items.map((item, index) => <button type="button" key={item.id} className={styles.dot} aria-label={`Show ${item.name_en}`} aria-current={active === index ? "true" : undefined} onClick={() => setActive(index)}><span /></button>)}</div></>}
  </section>;
}
