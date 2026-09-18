export type ServiceImage = { src: string; alt: string };

/** Generated editorial imagery, not provider branding or verified travel photographs. */
export const serviceImages = {
  umrah: { src: "/images/services/umrah.webp", alt: "The Kaaba framed by marble arches" },
  hajj: { src: "/images/services/hajj.webp", alt: "White tents across Mina" },
  instalment: { src: "/images/services/instalment.webp", alt: "Preparing a pilgrimage savings plan" },
  certificates: { src: "/images/services/certificates.webp", alt: "A decorative certificate and ribbon" },
  bookings: { src: "/images/services/bookings.webp", alt: "Travel essentials ready for a journey" },
  affiliate: { src: "/images/services/affiliate.webp", alt: "Travellers greeting one another" },
  services: { src: "/images/services/services.webp", alt: "A welcoming travel concierge desk" },
  transportation: { src: "/images/services/transportation.webp", alt: "A passenger coach beside desert hills" },
  zamzam: { src: "/images/services/zamzam.webp", alt: "Drinking water on a marble surface" },
  wheelchair: { src: "/images/services/wheelchair.webp", alt: "A wheelchair in an accessible courtyard" },
  equrban: { src: "/images/services/equrban.webp", alt: "Sheep in a peaceful enclosure" },
  "one-tranzact": { src: "/images/services/one-tranzact.webp", alt: "A smartphone ready for digital transactions" },
} satisfies Record<string, ServiceImage>;

const sectionImages: Record<string, keyof typeof serviceImages> = {
  umrah: "umrah", hajj: "hajj", "umrah-instalment": "instalment",
  certificate: "certificates", "booking-status": "bookings", bookings: "bookings",
  introducer: "affiliate", services: "services",
};

/** Keeps the section image consistent throughout nested detail and receipt routes. */
export function getSectionImage(pathname: string): ServiceImage {
  return serviceImages[sectionImages[pathname.split("/")[1]] ?? "umrah"];
}
