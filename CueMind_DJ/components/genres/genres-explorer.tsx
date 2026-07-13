"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DiscogsGenreGroup } from "@/lib/audio/discogs-labels";

type GenresExplorerProps = {
  groups: DiscogsGenreGroup[];
  totalSubgenres: number;
};

export function GenresExplorer({ groups, totalSubgenres }: GenresExplorerProps) {
  const [search, setSearch] = useState("");

  const normalized = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!normalized) return groups;
    return groups
      .map((group) => {
        const parentMatch = group.parent.toLowerCase().includes(normalized);
        const subgenres = parentMatch
          ? group.subgenres
          : group.subgenres.filter((s) =>
              s.toLowerCase().includes(normalized)
            );
        return { ...group, subgenres };
      })
      .filter(
        (group) =>
          group.subgenres.length > 0 ||
          group.parent.toLowerCase().includes(normalized)
      );
  }, [groups, normalized]);

  const matchCount = filtered.reduce(
    (sum, group) => sum + group.subgenres.length,
    0
  );

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un genre ou sous-genre (ex: Techno, Deep House, Jazz…)"
          className="pl-9"
        />
      </div>

      <p className="text-muted-foreground text-sm">
        {normalized
          ? `${matchCount} sous-genre${matchCount !== 1 ? "s" : ""} trouvé${matchCount !== 1 ? "s" : ""}`
          : `${groups.length} familles · ${totalSubgenres} sous-genres détectables`}
      </p>

      {filtered.length === 0 ? (
        <div className="text-muted-foreground py-12 text-center">
          <p className="text-lg font-medium">Aucun résultat</p>
          <p className="text-sm">
            Aucun genre ne correspond à «&nbsp;{search}&nbsp;»
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((group) => (
            <Card key={group.parent} className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{group.parent}</span>
                  <span className="text-muted-foreground text-xs font-normal">
                    {group.subgenres.length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {group.subgenres.map((sub) => (
                    <Badge
                      key={sub}
                      variant="secondary"
                      className="text-xs font-normal"
                    >
                      {sub}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
