"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "毎日の記録" },
  { href: "/roadmap", label: "今後の機能(F2〜F12)" },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav className="tabs">
      {TABS.map((tab) => (
        <Link key={tab.href} href={tab.href} data-active={pathname === tab.href}>
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
