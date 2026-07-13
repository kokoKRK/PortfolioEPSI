"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Pencil, Plus, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type TransitionNoteProps = {
  setId: string;
  position: number;
  note: string | null | undefined;
  onSaved?: (position: number, note: string | null) => void;
};

export function TransitionNote({
  setId,
  position,
  note,
  onSaved,
}: TransitionNoteProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(note ?? "");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    setValue(note ?? "");
  }, [note]);

  const hasNote = Boolean(note && note.trim().length > 0);

  async function handleGenerateAi() {
    setGenerating(true);
    try {
      const response = await fetch(`/api/sets/${setId}/suggest-notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position, overwrite: true }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Erreur génération IA");
      }
      const generated: string | undefined = data.notes?.[0]?.note;
      if (generated) {
        setValue(generated);
        onSaved?.(position, generated);
        if (data.saveErrors?.[0]) {
          toast.warning(data.saveErrors[0]);
        } else {
          toast.success("Transition suggérée par l'IA");
        }
      } else {
        toast.warning(data.message ?? data.error ?? "Aucune suggestion générée.");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erreur génération IA"
      );
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const response = await fetch(`/api/sets/${setId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position, note: value }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Erreur enregistrement");
      }
      onSaved?.(position, data.transitionNote ?? null);
      setEditing(false);
      toast.success("Note de transition enregistrée");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erreur enregistrement"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative flex justify-center py-1">
      {/* Ligne verticale décorative reliant les deux morceaux */}
      <div className="bg-border absolute left-5 top-0 h-full w-px" />

      <div className="ml-10 w-full">
        {editing ? (
          <div className="border-primary/30 bg-primary/5 space-y-2 rounded-lg border border-dashed p-3">
            <Textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Ex: caler sur le kick à l'intro, baisser les basses du morceau A sur 16 temps, jouer avec le filtre passe-haut…"
              rows={2}
              autoFocus
              className="text-sm"
            />
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <Check className="mr-1 size-3.5" />
                {saving ? "Enregistrement…" : "Enregistrer"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setValue(note ?? "");
                  setEditing(false);
                }}
                disabled={saving}
              >
                <X className="mr-1 size-3.5" />
                Annuler
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleGenerateAi}
                disabled={saving || generating}
                title="Générer la consigne de mix avec l'IA"
                className="ml-auto"
              >
                <Sparkles
                  className={
                    generating ? "mr-1 size-3.5 animate-spin" : "mr-1 size-3.5"
                  }
                />
                {generating ? "Génération…" : "Suggérer (IA)"}
              </Button>
            </div>
          </div>
        ) : hasNote ? (
          <button
            type="button"
            onClick={() => {
              setValue(note ?? "");
              setEditing(true);
            }}
            className="group border-border/60 bg-muted/30 hover:border-primary/40 flex w-full items-start gap-2 rounded-lg border border-dashed p-2.5 text-left transition-colors"
          >
            <Sparkles className="text-primary mt-0.5 size-3.5 shrink-0" />
            <span className="text-muted-foreground flex-1 text-xs leading-relaxed">
              {note}
            </span>
            <Pencil className="text-muted-foreground size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setValue("");
                setEditing(true);
              }}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs transition-colors"
            >
              <Plus className="size-3.5" />
              Ajouter une note
            </button>
            <button
              type="button"
              onClick={handleGenerateAi}
              disabled={generating}
              className="text-primary/80 hover:text-primary flex items-center gap-1.5 text-xs transition-colors disabled:opacity-60"
            >
              <Sparkles
                className={generating ? "size-3.5 animate-spin" : "size-3.5"}
              />
              {generating ? "Génération…" : "Suggérer (IA)"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
