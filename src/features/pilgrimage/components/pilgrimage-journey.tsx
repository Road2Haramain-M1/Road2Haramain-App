"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarBlank, Check, CreditCard } from "@phosphor-icons/react";
import { api } from "@/lib/api/client";
import type { PilgrimageCatalogueService } from "../catalogue-service";
import type { Agency, Booking, Departure, Product } from "@/lib/api/types";
import { PilgrimageShell, StickyContentHeader } from "./pilgrimage-shell";
import styles from "./pilgrimage.module.css";
import { AgencyCard, AgencyFilter, PackageCard, TravelPlanCard } from "./catalogue-components";
import { downloadPreviewReceipt } from "../preview-receipt";
import { TermsDialog } from "@/components/patterns/terms-dialog";
import { PackageAgencyLogo } from "./package-agency-logo";
import agencyHeaderStyles from "./package-agency-logo.module.css";
import { getPilgrimageHistory, pushPilgrimageHistory } from "../flow-history";

type Step = "agency" | "package" | "departure" | "installment" | "overview" | "receipt";
const serviceCopy = { umrah: { agencies: "Umrah Agencies", packages: "Umrah Packages", choose: "Choose Your Umrah Agency", intro: "Select a reliable Umrah agency to guide you every step of the way." }, hajj: { agencies: "PJHs", packages: "Hajj Packages", choose: "Choose Your PJH", intro: "Select a reliable PJH to guide you every step of the way." }, "umrah-instalment": { agencies: "Umrah Agencies", packages: "Umrah Instalment Packages", choose: "Choose Your Umrah Agency", intro: "Select a reliable Umrah agency offering instalment plans." } } as const;
const formatDate = (value: string) => new Date(value + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const money = (value: string | number) => "RM " + Number(value).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const bookingFee = 500;

function PackagePhoto({ large = false }: { large?: boolean }) {
  return <div className={large ? styles.summaryPhoto : styles.thumbnail}>
    <Image src="/images/hero-kaaba.png" alt="Makkah" fill sizes={large ? "380px" : "100px"} />
  </div>;
}

function PlanDetails({ departure }: { departure: Departure }) {
  return <div className={styles.detail}>
    <CalendarBlank size={21} />
    <div><dt>Month &amp; Year</dt><dd>{formatDate(departure.start_date)} - {formatDate(departure.end_date)}</dd></div>
  </div>;
}

export function PilgrimageJourney({ onBack, service = "umrah", catalogue = api, initialAgencyId, agencyLogoUrl }: {
  onBack?: () => void;
  service?: "umrah" | "hajj" | "umrah-instalment";
  catalogue?: PilgrimageCatalogueService;
  initialAgencyId?: string;
  agencyLogoUrl?: string;
}) {
  const router = useRouter();
  const [downloadError, setDownloadError] = useState("");
  const copy = serviceCopy[service];
  const [step, updateStep] = useState<Step>(initialAgencyId ? "package" : "agency");
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  function setStep(next: Step) {
    if (next === step) return;
    setDirection("forward");
    updateStep(next);
    pushPilgrimageHistory({ layer: "journey", service, step: next, installmentStage: next === "installment" ? installmentStage : undefined });
  }
  const [products, setProducts] = useState<Product[]>([]);
  const [agencyRecords, setAgencyRecords] = useState<Agency[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [agencySearch, setAgencySearch] = useState("");
  const [officeType, setOfficeType] = useState("all");
  const [agencyId, setAgencyId] = useState<string | null>(initialAgencyId ?? null);
  const [product, setProduct] = useState<Product | null>(null);
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [departure, setDeparture] = useState<Departure | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("KOF (Koperasi One Fintech)");
  const [deposit, setDeposit] = useState(500);
  const [months, setMonths] = useState(12);
  const [installmentStage, updateInstallmentStage] = useState(1);
  function setInstallmentStage(next: number) {
    if (next === installmentStage) return;
    setDirection("forward");
    updateInstallmentStage(next);
    pushPilgrimageHistory({ layer: "journey", service, step: "installment", installmentStage: next });
  }
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [transactionBusy, setTransactionBusy] = useState(false);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [traveller, setTraveller] = useState({ full_name: "", nationality: "MY", date_of_birth: "", contact: "" });
  const requestVersion = useRef(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const firstStep = useRef(true);

  useEffect(() => {
    let active = true;
    Promise.all([catalogue.agencies(), catalogue.products()]).then(([agencies, items]) => { if (active) { setAgencyRecords(agencies); setProducts(items.filter(item => item.category === service)); } })
      .catch(() => { if (active) setError("We couldn't load the agencies. Please try again."); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; requestVersion.current++; };
  }, [catalogue, service]);

  useEffect(() => {
    if (firstStep.current) { firstStep.current = false; return; }
    window.scrollTo({ top: 0, behavior: "instant" });
    heading.current?.focus({ preventScroll: true });
  }, [step]);

  useEffect(() => {
    const restoreJourneyStep = (event: PopStateEvent) => {
      const entry = getPilgrimageHistory(event.state);
      if (entry?.service !== service) return;
      if (entry.layer === "directory") {
        onBack?.();
        return;
      }
      if (entry.layer !== "journey" || !entry.step || !["agency", "package", "departure", "installment", "overview", "receipt"].includes(entry.step)) return;
      setDirection("back");
      updateStep(entry.step as Step);
      updateInstallmentStage(entry.installmentStage ?? 1);
    };
    window.addEventListener("popstate", restoreJourneyStep);
    return () => window.removeEventListener("popstate", restoreJourneyStep);
  }, [onBack, service]);

  const agencies = agencyRecords.filter(record => products.some(item => item.provider_id === record.id)).map((record, index) => ({ ...record, logo: index === 0 ? "A&M" : String(index + 1), count: products.filter(item => item.provider_id === record.id).length }));
  const filteredAgencies = agencies.filter(item => {
    const term = agencySearch.trim().toLowerCase();
    const matchesSearch = !term || `${item.name} ${item.address}`.toLowerCase().includes(term);
    return matchesSearch && (officeType === "all" || item.office_type === officeType);
  });
  const agency = agencyRecords.find(item => item.id === agencyId);
  const agencyProducts = products.filter(item => item.provider_id === agencyId);

  function goBack() {
    requestVersion.current++;
    setBusy(false); setError("");
    const entry = getPilgrimageHistory(window.history.state);
    if (entry?.service === service && entry.layer === "journey") {
      window.history.back();
      return;
    }
    if (step === "agency") { onBack?.(); return; }
    if (step === "package") {
      if (initialAgencyId) { onBack?.(); return; }
      setDirection("back"); updateStep("agency");
    }
    if (step === "departure") { setDirection("back"); updateStep("package"); }
    if (step === "installment") { if (installmentStage === 2) { setDirection("back"); updateInstallmentStage(1); } else { setDirection("back"); updateStep("overview"); } }
    if (step === "overview") { setTermsAccepted(false); setDirection("back"); updateStep("departure"); }
    if (step === "receipt") { router.replace("/"); return; }
    setDirection("back");
  }

  async function loadCatalogue() {
    const version = ++requestVersion.current;
    setBusy(true); setError("");
    try { const [agencies, items] = await Promise.all([catalogue.agencies(), catalogue.products()]); if (version === requestVersion.current) { setAgencyRecords(agencies); setProducts(items.filter(item => item.category === service)); } }
    catch { if (version === requestVersion.current) setError("We couldn't load the agencies. Please try again."); }
    finally { if (version === requestVersion.current) setBusy(false); }
  }

  async function chooseProduct(item: Product) {
    const version = ++requestVersion.current;
    setProduct(item); setDeparture(null); setTermsAccepted(false); setDepartures([]);
    setStep("departure"); setBusy(true); setError("");
    try { const items = await catalogue.departures(item.id); if (version === requestVersion.current) setDepartures(items); }
    catch { if (version === requestVersion.current) setError("We couldn't load the travel plans. Please try again."); }
    finally { if (version === requestVersion.current) setBusy(false); }
  }

  /** Creates the server quote, booking hold, and simulated payment in order. */
  async function confirmUmrahPayment() {
    if (!termsAccepted || !product || !departure || transactionBusy) return;
    setTransactionBusy(true); setError("");
    try {
      const quote = await api.quote(product.id, departure.id, 1);
      const created = await api.booking(quote.id, [traveller], "success", `r2h-${quote.id}`);
      const payment = await api.payment(created.id, "success", `r2h-payment-${created.id}`);
      setBooking({ ...created, payment });
      setStep("receipt");
    } catch {
      setError("We couldn't complete the booking. Please try again.");
    } finally {
      setTransactionBusy(false);
    }
  }

  const title = {
    agency: copy.choose,
    package: copy.packages + " by " + (agency?.name ?? ""),
    departure: "Available Travel Plans",
    installment: installmentStage === 1 ? "Payment service" : "Instalment details",
    overview: "Overview",
    receipt: "Receipt",
  }[step];
  const backLabel = { agency: "Back to process overview", package: "Back to agencies", departure: "Back to packages", installment: "Back to overview", overview: "Back to travel plans", receipt: "Back to home" }[step];

  return <PilgrimageShell compact headerMotion={initialAgencyId ? undefined : "collapse"} transitionKey={`${step}-${step === "installment" ? installmentStage : ""}`} direction={direction} title={step === "receipt" ? "Receipt" : service === "hajj" ? "Hajj" : service === "umrah-instalment" ? "Umrah Instalment" : "Umrah"} icon={service === "hajj" ? "/svgs/hajj.svg" : service === "umrah-instalment" ? "/svgs/installment.svg" : "/svgs/umrah.svg"} onBack={goBack} backLabel={backLabel}>
    <StickyContentHeader>
    {step === "package" ? <>
      <p className={styles.eyebrow}>{copy.packages}</p>
      <div className={agencyLogoUrl ? agencyHeaderStyles.header : undefined}>
        {agencyLogoUrl && <PackageAgencyLogo key={agencyLogoUrl} src={agencyLogoUrl} />}
        <div className={agencyHeaderStyles.text}>
          <h1 ref={heading} tabIndex={-1} className={styles.flowHeading}>{agency?.name}</h1>
        </div>
      </div>
    </> : step === "departure" ? <>
      <p className={styles.eyebrow}>Available Travel Plans</p>
      <h1 ref={heading} tabIndex={-1} className={styles.flowHeading}>{product?.name_en}</h1>
      <p className={styles.selectedAgency}>{agency?.name}</p>
    </> : step === "agency" ? <>
      <p className={styles.eyebrow}>{copy.agencies}</p>
      <h1 ref={heading} tabIndex={-1} className={`${styles.flowHeading} ${styles.agencyHeading}`}>{title}</h1>
    </> : <h1 ref={heading} tabIndex={-1} className={styles.flowHeading}>{title}</h1>}
    {step === "agency" && <p className={styles.description}>{copy.intro}</p>}
    {step === "package" && <p className={styles.description}>Explore available packages, compare services, and choose the one that suits your journey.</p>}
    </StickyContentHeader>
    {step === "agency" && !busy && !error && <AgencyFilter open={filterOpen} search={agencySearch} officeType={officeType} onToggle={() => setFilterOpen(open => !open)} onSearch={setAgencySearch} onOfficeType={setOfficeType} onClear={() => { setAgencySearch(""); setOfficeType("all"); setFilterOpen(false); }} />}
    {busy && <div className={styles.list} role="status" aria-label="Loading"><div className={styles.skeleton} /><div className={styles.skeleton} /></div>}
    {error && <div className={styles.state + " " + styles.error} role="alert">{error}<button className={styles.change} onClick={() => step === "departure" && product ? chooseProduct(product) : loadCatalogue()}>Try again</button></div>}

    {!busy && !error && step === "agency" && <div className={`${styles.list} ${styles.agencyList}`}>
      {filteredAgencies.length ? filteredAgencies.map(item => <AgencyCard key={item.id} agency={item} logo={item.logo} count={item.count} onSelect={() => {
        setAgencyId(item.id); setProduct(null); setDeparture(null); setTermsAccepted(false); setStep("package");
      }} />) : <p className={styles.state}>No agencies match your filters.</p>}
    </div>}

    {!busy && !error && step === "package" && <div className={`${styles.list} ${styles.scrollList}`}>
      {agencyProducts.length ? agencyProducts.map(item => <PackageCard key={item.id} product={item} onSelect={() => chooseProduct(item)} />) : <p className={styles.state}>No packages available for this agency.</p>}
    </div>}

    {step === "departure" && product && <div className={styles.selectedPackage}><PackagePhoto /><div><strong>{product.name_en}</strong><span className={styles.meta}>{product.description_en}</span></div></div>}
    {!busy && !error && step === "departure" && <div className={`${styles.list} ${styles.scrollList}`}>
      {departures.length ? departures.map(item => <TravelPlanCard key={item.id} departure={item} onSelect={() => { setDeparture(item); setTermsAccepted(false); updateInstallmentStage(1); setStep(service === "umrah-instalment" ? "installment" : "overview"); }} />) : <p className={styles.state}>No travel plans available for this package yet.</p>}
    </div>}

    {step === "installment" && product && departure && <>
      {installmentStage === 1 ? <><p className={styles.description}>Choose how you would like to pay for this instalment package.</p><div className={styles.installmentOptions}><p>Payment service</p>{["KOF (Koperasi One Fintech)", "Credit Card", "Selected Bank"].map(method => <button key={method} className={paymentMethod === method ? styles.selectedOption : ""} onClick={() => setPaymentMethod(method)}>{method}</button>)}</div><div className={styles.action}><button className={styles.primary} onClick={() => setInstallmentStage(2)}>Continue</button></div></> : <><p className={styles.description}>Choose your instalment period and deposit amount.</p><div className={styles.installmentOptions}><p>Instalment period</p>{[6, 12, 18].map(value => <button key={value} className={months === value ? styles.selectedOption : ""} onClick={() => setMonths(value)}>{value} months</button>)}</div><div className={styles.installmentOptions}><p>Deposit amount</p>{[500, 1000, 2000].map(amount => <button key={amount} className={deposit === amount ? styles.selectedOption : ""} disabled={amount >= Number(product.unit_price)} onClick={() => setDeposit(amount)}>{money(amount)}</button>)}</div><div className={styles.installmentCalculation}><span>Payment statement</span><span>Package total: {money(product.unit_price)}</span><span>Deposit today: {money(deposit)}</span><span>Remaining balance: {money(Number(product.unit_price) - deposit)}</span><strong>{money((Number(product.unit_price) - deposit) / months)} per month × {months}</strong></div><div className={styles.action}><button className={styles.primary} onClick={() => setStep("overview")}>Review Summary</button></div></>}
    </>}

    {step === "overview" && product && departure && <div className={styles.overviewPage}>
      <article className={styles.summary}><PackagePhoto large /><div className={styles.summaryBody}>
        <p className={styles.agencyName}>{agency?.name}</p><h2 className={styles.packageName}>{product.name_en}</h2><p className={styles.meta}>{product.description_en}</p><p className={styles.summaryPrice}>{money(product.unit_price)}</p>
      </div></article><dl className={styles.details}><PlanDetails departure={departure} /><div className={styles.detail}><CreditCard size={21} /><div><dt>Booking Fee</dt><dd>{money(bookingFee)}</dd></div></div></dl>
      {service === "umrah" && <section className={styles.certificateField} aria-label="Traveller details">
        <label htmlFor="traveller-name">Traveller name</label><input id="traveller-name" value={traveller.full_name} onChange={event => setTraveller(current => ({ ...current, full_name: event.target.value }))} autoComplete="name" />
        <label htmlFor="traveller-nationality">Nationality</label><input id="traveller-nationality" value={traveller.nationality} onChange={event => setTraveller(current => ({ ...current, nationality: event.target.value }))} autoComplete="country-name" />
        <label htmlFor="traveller-dob">Date of birth</label><input id="traveller-dob" type="date" value={traveller.date_of_birth} onChange={event => setTraveller(current => ({ ...current, date_of_birth: event.target.value }))} />
        <label htmlFor="traveller-contact">Contact number</label><input id="traveller-contact" value={traveller.contact} onChange={event => setTraveller(current => ({ ...current, contact: event.target.value }))} autoComplete="tel" />
      </section>}
      {service === "umrah-instalment" && <section className={styles.installmentPlan}><p>{paymentMethod}</p><strong>{money((Number(product.unit_price) - deposit) / months)} <span>per month</span></strong><small>{money(deposit)} deposit · {months} monthly payments</small></section>}
      <div className={styles.terms}><input id="terms-agreement" type="checkbox" checked={termsAccepted} onChange={event => setTermsAccepted(event.target.checked)} /><label htmlFor="terms-agreement">Agree with</label><button type="button" onClick={() => setTermsOpen(true)}>Terms &amp; Conditions</button></div>
      <TermsDialog open={termsOpen} onClose={() => setTermsOpen(false)} onAgree={() => setTermsAccepted(true)} />
      <div className={styles.action}><button className={styles.primary} disabled={!termsAccepted || transactionBusy || (service === "umrah" && (!traveller.full_name.trim() || !traveller.date_of_birth || !traveller.contact.trim()))} onClick={() => service === "umrah" ? confirmUmrahPayment() : setStep("receipt")}>
        {transactionBusy ? "Processing…" : "Confirm Payment"} {!transactionBusy && <ArrowRight size={18} />}
      </button>{error && <p role="alert" className={styles.receiptNotice}>{error}</p>}</div>
    </div>}

    {step === "receipt" && product && departure && <>
      <div className={styles.receiptHead}><span className={styles.success}><Check size={29} weight="bold" /></span><h2>{booking?.state === "CONFIRMED" ? "Payment Confirmed" : "Booking Submitted"}</h2><p>{booking?.reference ? `Booking reference: ${booking.reference}` : "Your booking fee has been recorded."}</p></div>
      <article className={styles.ticket}>
        <div className={styles.receiptIssuer}><Image src="/images/my-mega-holidays-logo.jpeg" alt="My Mega Holidays" width={64} height={64} /><p><span>Issued by</span><strong>My Mega Holidays Sdn. Bhd.</strong><small>Company No. 199801015952 (472081-D)</small></p></div>
        <p className={styles.agencyName}>{agency?.name}</p><h3 className={styles.packageName}>{product.name_en}</h3><p className={styles.meta}>{product.description_en}</p>
        <dl className={styles.details}><PlanDetails departure={departure} /><div className={styles.detail}><div><dt>Package price</dt><dd>{money(product.unit_price)}</dd></div></div></dl>
        <div className={styles.ticketTotal}><span>Booking fee paid</span><strong>{money(bookingFee)}</strong></div>
      </article>
      <div className={`${styles.action} ${styles.receiptActions}`}>
        <button type="button" className={styles.receiptDownload} onClick={async () => {
          setDownloadError("");
          try { await downloadPreviewReceipt({ agency: agency?.name ?? "Not available", packageName: product.name_en, travelDates: `${formatDate(departure.start_date)} - ${formatDate(departure.end_date)}`, packagePrice: money(product.unit_price), bookingFee: money(bookingFee) }); }
          catch { setDownloadError("We couldn't download the receipt. Please try again."); }
        }}>Download Receipt</button>
        {downloadError && <p role="alert" className={styles.receiptNotice}>{downloadError}</p>}
        <Link href="/" replace className={styles.primary}>Back to Home</Link>
      </div>
    </>}
  </PilgrimageShell>;
}
