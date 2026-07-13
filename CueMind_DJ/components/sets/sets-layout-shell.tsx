"use client";

import { Filter, MessageSquare } from "lucide-react";
import { SectionTabs } from "@/components/layout/section-tabs";

const SETS_TABS = [
  { href: "/sets/ai", label: "Par prompt IA", icon: MessageSquare },
  { href: "/sets/filters", label: "Par filtres", icon: Filter },
];

export function SetsLayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Générer un set</h1>
        <p className="text-muted-foreground mt-1">
          Choisis ta méthode — prompt IA ou filtres manuels.
        </p>
      </div>
      <SectionTabs tabs={SETS_TABS} />
      {children}
    </div>
  );
}
