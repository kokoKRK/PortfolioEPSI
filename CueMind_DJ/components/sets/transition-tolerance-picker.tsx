"use client";

import { Gauge, SlidersHorizontal } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  BPM_DELTA_RANGE,
  TRANSITION_TOLERANCE_OPTIONS,
  TOLERANCE_CONFIGS,
  type TransitionTolerance,
} from "@/lib/dj/transition-tolerance";
import { cn } from "@/lib/utils";

type TransitionTolerancePickerProps = {
  value: TransitionTolerance;
  onChange: (value: TransitionTolerance) => void;
  maxBpmDelta: number | null;
  onMaxBpmDeltaChange: (value: number | null) => void;
};

export function TransitionTolerancePicker({
  value,
  onChange,
  maxBpmDelta,
  onMaxBpmDeltaChange,
}: TransitionTolerancePickerProps) {
  const presetDelta = TOLERANCE_CONFIGS[value].maxBpmDeltaHard;
  const effectiveDelta = maxBpmDelta ?? presetDelta;

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <SlidersHorizontal className="size-4" />
          Prise de risque des transitions
        </Label>
        <div className="grid gap-2 sm:grid-cols-3">
          {TRANSITION_TOLERANCE_OPTIONS.map((opt) => {
            const active = value === opt.value;
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
                    "text-sm font-medium",
                    active ? "text-primary" : "text-foreground"
                  )}
                >
                  {opt.label}
                </p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {opt.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">
            <Gauge className="size-4" />
            Écart BPM max entre 2 morceaux
          </Label>
          <span className="text-sm font-medium text-primary">
            ±{effectiveDelta} BPM
          </span>
        </div>
        <input
          type="range"
          min={BPM_DELTA_RANGE.min}
          max={BPM_DELTA_RANGE.max}
          step={1}
          value={effectiveDelta}
          onChange={(e) => onMaxBpmDeltaChange(Number(e.target.value))}
          className="accent-primary w-full"
        />
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-xs">
            {maxBpmDelta == null
              ? `Valeur du mode « ${TRANSITION_TOLERANCE_OPTIONS.find((o) => o.value === value)?.label} » (±${presetDelta})`
              : "Réglage personnalisé"}
          </p>
          {maxBpmDelta != null && (
            <button
              type="button"
              onClick={() => onMaxBpmDeltaChange(null)}
              className="text-primary text-xs hover:underline"
            >
              Réinitialiser
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
