"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "./journey-carousel.module.css";

const banners = [
  { name: "Umrah", title: "Your Blessed Journey Begins Here", description: "Explore Umrah packages and find the journey that suits you.", href: "/umrah", image: "/images/home-gold-banner.png", gold: true },
  { name: "Hajj", title: "Prepare for Your Hajj Journey", description: "Find your PJH, explore packages, and plan your pilgrimage.", href: "/hajj", image: "/images/services/hajj.webp", gold: false },
  { name: "Umrah Instalments", title: "Your Umrah, Planned Your Way", description: "Explore packages with flexible instalment payment options.", href: "/umrah-instalment", image: "/images/services/instalment.webp", gold: false },
];

/** Promotional carousel. Autoplay never runs while hidden, focused, touched, or reduced-motion. */
export function JourneyCarousel() {
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [touching, setTouching] = useState(false);
  const [available, setAvailable] = useState(false);
  const gesture = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const select = (index: number) => setActive((index + banners.length) % banners.length);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setAvailable(!document.hidden && !media.matches);
    update();
    document.addEventListener("visibilitychange", update);
    media.addEventListener("change", update);
    return () => { document.removeEventListener("visibilitychange", update); media.removeEventListener("change", update); };
  }, []);

  useEffect(() => {
    if (!available || hovered || focused || touching) return;
    const timer = window.setTimeout(() => setActive(index => (index + 1) % banners.length), 10_000);
    return () => window.clearTimeout(timer);
  }, [active, available, hovered, focused, touching]);

  return <section className={styles.carousel} aria-label="Pilgrimage highlights" aria-roledescription="carousel"
    onPointerEnter={event => { if (event.pointerType === "mouse") setHovered(true); }}
    onPointerLeave={() => { setHovered(false); setTouching(false); gesture.current = null; }}
    onFocusCapture={() => setFocused(true)}
    onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}
    onPointerDown={event => { gesture.current = { x: event.clientX, y: event.clientY }; swiped.current = false; setTouching(true); }}
    onPointerMove={event => { if (gesture.current && Math.abs(event.clientX - gesture.current.x) > 12) swiped.current = true; }}
    onPointerUp={event => {
      const start = gesture.current;
      gesture.current = null; setTouching(false);
      if (!start) return;
      const dx = event.clientX - start.x;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(event.clientY - start.y)) { swiped.current = true; select(active + (dx < 0 ? 1 : -1)); }
    }}
    onPointerCancel={() => { gesture.current = null; setTouching(false); swiped.current = true; }}
    onClickCapture={event => { if (swiped.current) { event.preventDefault(); event.stopPropagation(); swiped.current = false; } }}
    onKeyDown={event => {
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault(); select(active + (event.key === "ArrowRight" ? 1 : -1));
        // Keep keyboard focus on a visible control when the previously focused slide becomes inert.
        event.currentTarget.querySelector<HTMLButtonElement>(`button[data-dot="${(active + (event.key === "ArrowRight" ? 1 : -1) + banners.length) % banners.length}"]`)?.focus();
      }
    }}>
    <div className={styles.track} style={{ transform: `translateX(-${active * 100}%)` }}>
      {banners.map((banner, index) => <div key={banner.href} className={styles.slide} inert={index !== active} aria-hidden={index !== active} role="group" aria-roledescription="slide" aria-label={`${index + 1} of ${banners.length}: ${banner.name}`}>
        <Link href={banner.href} className={styles.link} draggable={false} aria-label={`Explore ${banner.name}`}>
          <Image src={banner.image} alt="" fill preload={index === 0} sizes="(max-width: 430px) 100vw, 430px" draggable={false} className={banner.gold ? styles.goldImage : styles.photo} />
          {!banner.gold && <span className={styles.shade} />}
          <div className={styles.copy}><h1>{banner.title}</h1><p>{banner.description}</p></div>
        </Link>
      </div>)}
    </div>
    <div className={styles.controls}>
      {banners.map((banner, index) => <button type="button" key={banner.href} data-dot={index} className={styles.dot} aria-label={`Show ${banner.name} banner`} aria-current={active === index ? "true" : undefined} onClick={() => select(index)}><span /></button>)}
    </div>
  </section>;
}
