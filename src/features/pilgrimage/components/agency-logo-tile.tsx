"use client";

import Image from "next/image";
import { useState } from "react";
import styles from "./pjh-list.module.css";

/** Shared PJH/Umrah tile. Missing or failed marks retain an accessible company name. */
export function AgencyLogoTile({ id, name, logoUrl, label, onSelect }: {
  id?: string; name: string; logoUrl?: string; label?: string; onSelect: () => void;
}) {
  const [failedSource, setFailedSource] = useState<string>();
  return <li data-agency-id={id}><button type="button" className={styles.logo} title={label ?? name}
    aria-label={`View packages by ${label ?? name}`} onClick={onSelect}>
    {!logoUrl || failedSource === logoUrl ? <span className={styles.fallback}>{name}</span> :
      <Image src={logoUrl} alt={name} fill sizes="130px" unoptimized
        referrerPolicy="no-referrer" onError={() => setFailedSource(logoUrl)} />}
  </button></li>;
}
