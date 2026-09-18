"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api/client";
import { featuredUmrahAgencyBrands } from "../umrah-directory";
import { createUmrahDirectoryCatalogue } from "../umrah-directory-catalogue";
import { getPilgrimageHistory, pushPilgrimageHistory } from "../flow-history";
import { AgencyLogoTile } from "./agency-logo-tile";
import { AgencyFilter } from "./catalogue-components";
import { PilgrimageJourney } from "./pilgrimage-journey";
import { PilgrimageShell } from "./pilgrimage-shell";
import styles from "./pilgrimage.module.css";
import directoryStyles from "./pjh-list.module.css";

/** MOTAC office directory using the same tile measurements and interaction as PJH. */
export function UmrahList({ onBack, service = "umrah" }: { onBack: () => void; service?: "umrah" | "umrah-instalment" }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const grid = useRef<HTMLUListElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const lastSelectedId = useRef<string | null>(null);
  const selected = featuredUmrahAgencyBrands.find(agency => agency.id === selectedId);
  const catalogue = useMemo(() => selected ? createUmrahDirectoryCatalogue(selected, api) : undefined, [selected]);
  const filtered = featuredUmrahAgencyBrands.filter(agency => {
    const matches = agency.branches.some(office => `${office.name} ${office.address} ${office.license_no}`.toLowerCase().includes(search.trim().toLowerCase()));
    return matches;
  });

  useEffect(() => {
    if (selectedId) return;
    const tile = Array.from(grid.current?.children ?? []).find(element => element.getAttribute("data-agency-id") === lastSelectedId.current);
    if (tile) tile.querySelector("button")?.focus();
    else heading.current?.focus({ preventScroll: true });
  }, [selectedId]);

  useEffect(() => {
    const restoreDirectory = (event: PopStateEvent) => {
      const entry = getPilgrimageHistory(event.state);
      if (selectedId && entry?.service === service && entry.layer === "directory") {
        setDirection("back");
        setSelectedId(null);
      }
    };
    window.addEventListener("popstate", restoreDirectory);
    return () => window.removeEventListener("popstate", restoreDirectory);
  }, [selectedId, service]);

  if (selected && catalogue) return <PilgrimageJourney service={service} initialAgencyId={selected.id}
    agencyLogoUrl={selected.logoUrl} catalogue={catalogue} onBack={() => { setDirection("back"); setSelectedId(null); }} />;

  return <PilgrimageShell compact title={service === "umrah-instalment" ? "Umrah Instalment" : "Umrah"} icon={service === "umrah-instalment" ? "/svgs/installment.svg" : "/svgs/umrah.svg"} headerMotion={direction === "forward" ? "collapse" : undefined}
    transitionKey="umrah-directory" direction={direction} onBack={onBack} backLabel="Back to process overview">
    <div className={styles.directoryHeader}>
      <p className={styles.eyebrow}>{service === "umrah-instalment" ? "Featured Umrah Instalment Agencies" : "Featured Umrah Agencies"}</p>
      <h1 ref={heading} tabIndex={-1} className={`${styles.flowHeading} ${styles.agencyHeading}`}>Umrah Agency List</h1>
      <p className={styles.description}>{filtered.length} featured agency brands</p>
      <AgencyFilter open={filterOpen} search={search} officeType="all" showOfficeType={false} onToggle={() => setFilterOpen(open => !open)}
        onSearch={setSearch} onOfficeType={() => undefined} onClear={() => { setSearch(""); }} />
    </div>
    {filtered.length ? <ul ref={grid} className={directoryStyles.grid} aria-label="Umrah agencies">
      {filtered.map(agency => <AgencyLogoTile key={agency.id} id={agency.id} name={agency.name} logoUrl={agency.logoUrl}
        label={`${agency.name}, ${agency.branches.length} registered offices`} onSelect={() => {
          lastSelectedId.current = agency.id;
          setDirection("forward");
          pushPilgrimageHistory({ layer: "journey", service, step: "package" });
          setSelectedId(agency.id);
        }} />)}
    </ul> : <p className={styles.state} role="status">No agencies match your filters.</p>}
  </PilgrimageShell>;
}
