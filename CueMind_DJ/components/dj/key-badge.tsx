import { getKeyDisplay } from "@/lib/dj/key-colors";
import { cn } from "@/lib/utils";

type KeyBadgeProps = {
  camelotKey: string | null;
  className?: string;
};

export function KeyBadge({ camelotKey, className }: KeyBadgeProps) {
  const { label, className: colorClass } = getKeyDisplay(camelotKey);

  return (
    <span
      className={cn(
        "inline-flex min-w-[2.5rem] items-center justify-center rounded px-1.5 py-0.5 font-mono text-xs font-bold shadow-sm",
        colorClass,
        className
      )}
      title={camelotKey ?? "Clé inconnue"}
    >
      {label}
    </span>
  );
}
