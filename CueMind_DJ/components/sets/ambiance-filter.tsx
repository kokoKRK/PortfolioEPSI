"use client";

import { MUSIC_AMBIANCES } from "@/lib/ai/classify-ambiance";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type AmbianceFilterProps = {
  availableAmbiances: string[];
  selectedAmbiances: string[];
  trackCounts: Record<string, number>;
  onChange: (ambiances: string[]) => void;
};

export function AmbianceFilter({
  availableAmbiances,
  selectedAmbiances,
  trackCounts,
  onChange,
}: AmbianceFilterProps) {
  function toggle(ambiance: string) {
    onChange(
      selectedAmbiances.includes(ambiance)
        ? selectedAmbiances.filter((a) => a !== ambiance)
        : [...selectedAmbiances, ambiance]
    );
  }

  const list =
    availableAmbiances.length > 0
      ? availableAmbiances
      : [...MUSIC_AMBIANCES];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {list.map((ambiance) => {
          const active = selectedAmbiances.includes(ambiance);
          const count = trackCounts[ambiance] ?? 0;
          return (
            <button
              key={ambiance}
              type="button"
              onClick={() => toggle(ambiance)}
              className="focus-visible:outline-none"
            >
              <Badge
                variant={active ? "default" : "outline"}
                className={cn(
                  "cursor-pointer px-3 py-1",
                  !active && count === 0 && "opacity-50"
                )}
              >
                {ambiance}
                {count > 0 && ` (${count})`}
              </Badge>
            </button>
          );
        })}
      </div>
      {selectedAmbiances.length > 0 && (
        <>
          <p className="text-muted-foreground text-xs">
            Morceaux avec au moins une ambiance sélectionnée :{" "}
            {selectedAmbiances.join(" · ")}
          </p>
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-muted-foreground text-xs hover:underline"
          >
            Tout effacer
          </button>
        </>
      )}
    </div>
  );
}
