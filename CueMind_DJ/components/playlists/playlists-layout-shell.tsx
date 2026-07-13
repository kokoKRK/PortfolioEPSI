"use client";

import { ListMusic, Music2, Sparkles } from "lucide-react";
import { SectionTabs } from "@/components/layout/section-tabs";

const PLAYLISTS_TABS = [
  { href: "/playlists/styles", label: "Par style", icon: Music2 },
  { href: "/playlists/custom", label: "Mes playlists", icon: ListMusic },
  { href: "/playlists/sets", label: "Sets générés", icon: Sparkles },
];

export function PlaylistsLayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <p className="text-primary font-mono text-[10px] uppercase tracking-widest">
          Collection
        </p>
        <h1 className="text-2xl font-bold">Playlists</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Crates par genre, playlists perso et sets générés.
        </p>
      </div>
      <SectionTabs tabs={PLAYLISTS_TABS} />
      {children}
    </div>
  );
}
