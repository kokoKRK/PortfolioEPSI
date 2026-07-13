"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, ChevronRight, X } from "lucide-react";

type StyleOrderPickerProps = {
  availableStyles: string[];
  styleOrder: string[];
  trackCounts: Record<string, number>;
  onChange: (order: string[]) => void;
};

export function StyleOrderPicker({
  availableStyles,
  styleOrder,
  trackCounts,
  onChange,
}: StyleOrderPickerProps) {
  const unused = availableStyles.filter((s) => !styleOrder.includes(s));

  function addStyle(style: string) {
    onChange([...styleOrder, style]);
  }

  function removeStyle(style: string) {
    onChange(styleOrder.filter((s) => s !== style));
  }

  function moveStyle(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= styleOrder.length) return;
    const updated = [...styleOrder];
    [updated[index], updated[next]] = [updated[next], updated[index]];
    onChange(updated);
  }

  return (
    <div className="space-y-4">
      {styleOrder.length > 0 && (
        <div className="rounded-lg border border-border bg-background/40 p-3">
          <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
            Parcours du set
          </p>
          <ol className="space-y-2">
            {styleOrder.map((style, index) => (
              <li
                key={style}
                className="flex items-center gap-2 rounded-md border border-border/60 bg-card/60 px-2 py-1.5"
              >
                <span className="text-primary w-5 font-mono text-xs font-bold">
                  {index + 1}
                </span>
                <Badge variant="default" className="min-w-0 flex-1 justify-start">
                  {style}
                  <span className="text-primary-foreground/70 ml-1 font-normal">
                    ({trackCounts[style] ?? 0})
                  </span>
                </Badge>
                <div className="flex shrink-0 items-center gap-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    disabled={index === 0}
                    onClick={() => moveStyle(index, -1)}
                    aria-label={`Monter ${style}`}
                  >
                    <ArrowUp className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    disabled={index === styleOrder.length - 1}
                    onClick={() => moveStyle(index, 1)}
                    aria-label={`Descendre ${style}`}
                  >
                    <ArrowDown className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => removeStyle(style)}
                    aria-label={`Retirer ${style}`}
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
                {index < styleOrder.length - 1 && (
                  <ChevronRight className="text-muted-foreground hidden size-4 sm:block" />
                )}
              </li>
            ))}
          </ol>
          <p className="text-muted-foreground mt-2 text-xs">
            Le set commencera par{" "}
            <span className="text-foreground">{styleOrder[0]}</span>
            {styleOrder.length > 1 && (
              <>
                {" "}
                puis enchaînera vers{" "}
                <span className="text-foreground">
                  {styleOrder.slice(1).join(" → ")}
                </span>
              </>
            )}
          </p>
        </div>
      )}

      {unused.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {unused.map((style) => (
            <button
              key={style}
              type="button"
              onClick={() => addStyle(style)}
              className="focus-visible:outline-none"
            >
              <Badge
                variant="outline"
                className={cn(
                  "cursor-pointer px-3 py-1 transition-colors hover:border-primary hover:bg-primary/10"
                )}
              >
                + {style} ({trackCounts[style] ?? 0})
              </Badge>
            </button>
          ))}
        </div>
      )}

      {styleOrder.length > 0 && (
        <button
          type="button"
          onClick={() => onChange([])}
          className="text-muted-foreground text-xs hover:underline"
        >
          Effacer le parcours
        </button>
      )}
    </div>
  );
}
