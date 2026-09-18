export type QuickService = {
  name: string;
  href: string;
  icon: string;
  status: "active" | "preview" | "coming-soon";
};

/** Shared navigation order and approved assets; status does not change on navigation. */
export const quickServices: QuickService[] = [
  { name: "Hajj", href: "/hajj", icon: "/svgs/hajj.svg", status: "coming-soon" },
  { name: "Umrah", href: "/umrah", icon: "/svgs/umrah.svg", status: "active" },
  { name: "Umrah Instalment", href: "/umrah-instalment", icon: "/svgs/installment.svg", status: "coming-soon" },
  { name: "Booking Status", href: "/booking-status", icon: "/svgs/booking-status.svg", status: "preview" },
  { name: "Certificate", href: "/certificate", icon: "/svgs/certificate.svg", status: "coming-soon" },
  { name: "Services", href: "/services", icon: "/svgs/services.svg", status: "coming-soon" },
  { name: "Affiliate", href: "/introducer", icon: "/svgs/introducer.svg", status: "coming-soon" },
];
