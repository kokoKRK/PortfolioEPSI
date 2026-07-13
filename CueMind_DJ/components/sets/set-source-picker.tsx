"use client";

import { Globe, Layers, Library, Music2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type SetSource = "library" | "mixed" | "discover";

export const SET_SOURCE_OPTIONS: {
  value: SetSource;
  label: string;
  description: string;
  icon: typeof Library;
}[] = [
  {
    value: "library",
    label: "Ma bibliothèque",
    description: "Uniquement mes morceaux",
    icon: Library,
  },
  {
    value: "mixed",
    label: "Les deux",
    description: "Bibliothèque + découvertes en ligne",
    icon: Layers,
  },
  {
    value: "discover",
    label: "100% découverte",
    description: "Que des extraits Deezer en ligne",
    icon: Globe,
  },
];

type SetSourcePickerProps = {
  value: SetSource;
  onChange: (value: SetSource) => void;
};

export function SetSourcePicker({ value, onChange }: SetSourcePickerProps) {
  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <Music2 className="size-4" />
        Source des morceaux
      </Label>
      <div className="grid gap-2 sm:grid-cols-3">
        {SET_SOURCE_OPTIONS.map((opt) => {
          const active = value === opt.value;
          const Icon = opt.icon;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                "rounded-lg border px-3 py-2.5 text-left transition-colors",
                active
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/40 hover:bg-muted/50"
              )}
            >
              <p
                className={cn(
                  "flex items-center gap-1.5 text-sm font-medium",
                  active ? "text-primary" : "text-foreground"
                )}
              >
                <Icon className="size-3.5" />
                {opt.label}
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {opt.description}
              </p>
            </button>
          );
        })}
      </div>
      {value !== "library" && (
        <p className="text-muted-foreground text-xs">
          L&apos;IA cherche des morceaux sur Deezer, analyse leurs extraits 30s
          (BPM, clé, énergie) et les mélange à ton set. Les découvertes retenues
          sont ajoutées à ta bibliothèque.{" "}
          <span className="text-amber-500">
            La génération est plus longue (analyse en ligne).
          </span>
        </p>
      )}
    </div>
  );
}
