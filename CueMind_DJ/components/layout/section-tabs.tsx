"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type SectionTab = {
  href: string;
  label: string;
  icon?: LucideIcon;
};

type SectionTabsProps = {
  tabs: SectionTab[];
};

export function SectionTabs({ tabs }: SectionTabsProps) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-1 rounded-lg border border-border bg-muted/40 p-1">
      {tabs.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
            )}
          >
            {Icon && <Icon className="size-4 shrink-0" />}
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
