import Image from "next/image";

export function HomeHeroCard() {
  return (
    <div className="mt-6 w-full px-4">
      <div className="relative w-full overflow-hidden rounded-[22px]">
        <Image priority src="/png/HeroCard.png" alt="Road2Haramain journey" width={1000} height={1000} sizes="100vw" className="block h-auto w-full" />
        <div className="absolute inset-0 flex items-start px-4 py-6">
          <div className="flex h-full max-w-[270px] flex-col justify-center">
            <h1 className="text-[17px] font-semibold text-white">Your Blessed Journey Begins Here</h1>
            <p className="mt-2 text-[13px] font-medium leading-[18px] text-white/75">Plan your Hajj or Umrah with ease. Transparent pricing, flexible instalment plans, and complete booking tracking in one place.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
