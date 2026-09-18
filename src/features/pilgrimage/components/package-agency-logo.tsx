"use client";

import Image from "next/image";
import { useState } from "react";
import styles from "./package-agency-logo.module.css";

/** Decorative agency mark; the adjacent heading provides its accessible name. */
export function PackageAgencyLogo({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return <span className={styles.logo}>
    <Image src={src} alt="" fill sizes="52px" unoptimized
      referrerPolicy="no-referrer" onError={() => setFailed(true)} />
  </span>;
}
