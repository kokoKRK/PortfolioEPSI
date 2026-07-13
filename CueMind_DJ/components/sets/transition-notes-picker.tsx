"use client";

import { MessageSquareText, PenLine, Sparkles, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type TransitionNotesMode = "off" | "manual" | "ai";

export const TRANSITION_NOTES_OPTIONS: {
  value: TransitionNotesMode;
  label: string;
  description: string;
  icon: typeof X;
}[] = [
  {
    value: "off",
    label: "Aucune",
    description: "Pas de notes de transition",
    icon: X,
  },
  {
    value: "manual",
    label: "Manuelle",
    description: "Cases vides à remplir toi-même",
    icon: PenLine,
  },
  {
    value: "ai",
    label: "IA",
    description: "Consignes de mix générées automatiquement",
    icon: Sparkles,
  },
];

type TransitionNotesPickerProps = {
  value: TransitionNotesMode;
  onChange: (value: TransitionNotesMode) => void;
};

export function TransitionNotesPicker({
  value,
  onChange,
}: TransitionNotesPickerProps) {
  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <MessageSquareText className="size-4" />
        Notes de transition
      </Label>
      <div className="grid gap-2 sm:grid-cols-3">
        {TRANSITION_NOTES_OPTIONS.map((opt) => {
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
    </div>
  );
}
