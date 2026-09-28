"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "毎日の記録" },
  { href: "/trends", label: "トレンド" },
  { href: "/medications", label: "服薬管理" },
  { href: "/backup", label: "バックアップ" },
  { href: "/roadmap", label: "今後の機能" },
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
