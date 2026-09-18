"use client";

import { useEffect, useRef, useState } from "react";
import { pjhDirectory } from "../pjh-directory";
import { AgencyLogoTile } from "./agency-logo-tile";
import { PilgrimageShell } from "./pilgrimage-shell";
import styles from "./pilgrimage.module.css";
import directoryStyles from "./pjh-list.module.css";
import { PilgrimageJourney } from "./pilgrimage-journey";
import { pjhCatalogueService } from "../pjh-catalogue-service";
import { getPilgrimageHistory, pushPilgrimageHistory } from "../flow-history";

/** Opens the shared package journey for the chosen PJH through its configured catalogue. */
export function PjhList({ onBack }: { onBack: () => void }) {
  const [selectedAgencyId, setSelectedAgencyId] = useState<string | null>(null);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const lastSelectedAgency = useRef<string | null>(null);
  const grid = useRef<HTMLUListElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (selectedAgencyId) return;
    const index = pjhDirectory.agencies.findIndex(agency => agency.id === lastSelectedAgency.current);
    const button = grid.current?.children[index]?.querySelector("button");
    if (button) button.focus();
    else heading.current?.focus({ preventScroll: true });
  }, [selectedAgencyId]);
  useEffect(() => {
    const restoreDirectory = (event: PopStateEvent) => {
      const entry = getPilgrimageHistory(event.state);
      if (selectedAgencyId && entry?.service === "hajj" && entry.layer === "directory") {
        setDirection("back");
        setSelectedAgencyId(null);
      }
    };
    window.addEventListener("popstate", restoreDirectory);
    return () => window.removeEventListener("popstate", restoreDirectory);
  }, [selectedAgencyId]);

  if (selectedAgencyId) return <PilgrimageJourney service="hajj" initialAgencyId={selectedAgencyId}
    agencyLogoUrl={pjhDirectory.agencies.find(agency => agency.id === selectedAgencyId)?.logoUrl}
    catalogue={pjhCatalogueService} onBack={() => { setDirection("back"); setSelectedAgencyId(null); }} />;

  return <PilgrimageShell compact title="Hajj" icon="/svgs/hajj.svg"
    headerMotion={direction === "forward" ? "collapse" : undefined} transitionKey="pjh-directory" direction={direction} onBack={onBack}
    backLabel="Back to process overview">
    <div className={styles.directoryHeader}>
      <p className={styles.eyebrow}>{pjhDirectory.season}</p>
      <h1 ref={heading} tabIndex={-1} className={styles.flowHeading}>PJH List</h1>
      <p className={styles.description}>{pjhDirectory.agencies.length} Pengelola Jemaah Haji (PJH)</p>
    </div>
    {pjhDirectory.agencies.length ? <ul ref={grid} className={directoryStyles.grid} aria-label="PJH agencies">
      {pjhDirectory.agencies.map(agency => <AgencyLogoTile key={agency.id} name={agency.name} logoUrl={agency.logoUrl} onSelect={() => {
        lastSelectedAgency.current = agency.id;
        setDirection("forward");
        pushPilgrimageHistory({ layer: "journey", service: "hajj", step: "package" });
        setSelectedAgencyId(agency.id);
      }} />)}
    </ul> : <p className={styles.state}>No PJHs are listed for this season yet.</p>}
  </PilgrimageShell>;
}
