import type { ButtonHTMLAttributes } from "react";

export function Button({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`min-h-[53px] w-full rounded-full bg-primary px-5 text-[13px] font-semibold text-white transition active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-dark focus-visible:ring-offset-2 disabled:active:translate-y-0 ${className}`}
      {...props}
    />
  );
}
