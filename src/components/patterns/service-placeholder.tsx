import Image from "next/image";
import { PageHeader } from "./page-header";

type ServicePlaceholderProps = {
  title: string;
  icon: string;
  description: string;
};

export function ServicePlaceholder({ title, icon, description }: ServicePlaceholderProps) {
  return (
    <main className="min-h-[100dvh]">
      <PageHeader title={title} />
      <section className="p-4">
        <div className="min-h-[430px] rounded-[24px] bg-white px-4 py-8 text-center">
          <div className="mx-auto flex size-[76px] items-center justify-center rounded-full bg-[#11111108]">
            <Image src={icon} alt="" width={30} height={30} />
          </div>
          <h2 className="mt-6 text-[22px] font-semibold text-primary-dark">{title}</h2>
          <p className="mx-auto mt-3 max-w-[280px] text-[15px] leading-6 text-sub-text">{description}</p>
          <div className="mx-auto mt-8 max-w-[280px] rounded-[16px] bg-[#11111108] px-4 py-5 text-left">
            <p className="text-[13px] font-semibold text-primary-dark">Coming soon</p>
            <p className="mt-1 text-[13px] leading-5 text-sub-text">This screen keeps the approved R2H route and visual treatment while its functional requirements are being finalized.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
