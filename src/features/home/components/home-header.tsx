import Image from "next/image";

export function HomeHeader() {
  return (
    <header className="flex items-center justify-between px-4 pt-5">
      <div className="flex min-w-0 max-w-[208px] flex-1 items-center gap-2 rounded-full bg-white p-1.5 shadow-sm">
        <Image src="/svgs/avatar.svg" alt="Demo pilgrim avatar" width={40} height={40} />
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold text-sub-text">Hi, Welcome back</p>
          <p className="truncate text-[17px] font-semibold leading-none text-text">Demo Pilgrim</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" className="flex size-[52px] items-center justify-center rounded-full bg-white shadow-sm transition-transform active:scale-[.98]" aria-label="Notifications">
          <Image src="/svgs/bell.svg" alt="" width={22} height={22} />
        </button>
        <button type="button" className="flex size-[52px] items-center justify-center rounded-full bg-white shadow-sm transition-transform active:scale-[.98]" aria-label="Log out">
          <Image src="/svgs/logout.svg" alt="" width={22} height={22} />
        </button>
      </div>
    </header>
  );
}
