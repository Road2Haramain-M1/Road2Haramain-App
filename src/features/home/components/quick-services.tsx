import Image from "next/image";
import Link from "next/link";
import { quickServices } from "@/components/patterns/service-registry";

export function QuickServices() {
  return (
    <section className="mx-4 mt-4 flex min-h-0 flex-1 flex-col rounded-[24px] bg-white px-4 py-6">
      <h2 className="text-[17px] font-semibold text-text">Quick Services</h2>
      <div className="mt-4 grid grid-cols-3 gap-x-5 gap-y-5 overflow-y-auto pb-2">
        {quickServices.map((service) => (
          <Link key={service.href} href={service.href} className="group flex flex-col items-center rounded-2xl px-1 text-center outline-none transition-transform active:scale-[.98] focus-visible:ring-2 focus-visible:ring-primary">
            <span className="flex size-[63px] items-center justify-center rounded-full bg-[#11111108] transition-colors group-hover:bg-light-bg">
              <Image src={service.icon} alt="" width={24} height={24} />
            </span>
            <span className="mt-1.5 max-w-[88px] text-[13px] font-semibold leading-[16px] text-sub-text">{service.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
