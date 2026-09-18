import Image from "next/image";
import Link from "next/link";

export function PageHeader({ title, backHref = "/" }: { title: string; backHref?: string }) {
  return (
    <header className="grid min-h-[64px] grid-cols-[52px_1fr_52px] items-center bg-primary px-4 py-2 text-white">
      <Link href={backHref} className="flex size-11 items-center justify-start rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" aria-label="Back">
        <Image src="/svgs/Arrow.svg" alt="" width={24} height={24} />
      </Link>
      <h1 className="text-center text-[17px] font-semibold">{title}</h1>
      <span />
    </header>
  );
}
