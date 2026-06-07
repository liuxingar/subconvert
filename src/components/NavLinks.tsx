"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleHelp, House, Library, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "首页", mobileLabel: "首页", icon: House },
  { href: "/dashboard", label: "我的订阅", mobileLabel: "订阅", icon: Settings2 },
  { href: "/templates", label: "模板库", mobileLabel: "模板", icon: Library },
  { href: "/faq", label: "FAQ", mobileLabel: "FAQ", icon: CircleHelp }
];

export function HeaderNavLinks() {
  const pathname = usePathname();
  return (
    <nav className="hidden items-center rounded-full border border-white/10 bg-white/[0.04] p-1 md:flex">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[14px] transition",
              active
                ? "bg-indigo-500/35 text-white shadow-[0_0_0_1px_rgba(129,140,248,0.28)]"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            )}
          >
            <Icon className={cn("h-4 w-4", active && "text-indigo-100")} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNavLinks() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-black/60 backdrop-blur-xl md:hidden">
      <div className="grid h-16 grid-cols-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-xs transition",
                active ? "text-indigo-200" : "text-white/60 hover:text-white"
              )}
              href={item.href}
            >
              <Icon className={cn("h-5 w-5", active && "drop-shadow-[0_0_10px_rgba(129,140,248,0.7)]")} />
              {item.mobileLabel}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
