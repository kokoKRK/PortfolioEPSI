"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MessageSquare, Sparkles, Wand2 } from "lucide-react";
import { SetBuilderResults } from "@/components/sets/set-builder-results";
import { TransitionTolerancePicker } from "@/components/sets/transition-tolerance-picker";
import {
  TransitionNotesPicker,
  type TransitionNotesMode,
} from "@/components/sets/transition-notes-picker";
import {
  SetSourcePicker,
  type SetSource,
} from "@/components/sets/set-source-picker";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { ParsedSetPrompt, SetPlan } from "@/lib/ai/parse-set-prompt";
import type { TransitionTolerance } from "@/lib/dj/transition-tolerance";
import type { GeneratedSetTrack } from "@/types/database";
import { cn } from "@/lib/utils";

type SetBuilderPromptProps = {
  trackCount: number;
};

export function SetBuilderPrompt({ trackCount }: SetBuilderPromptProps) {
  const [generating, setGenerating] = useState(false);
  const [parsingPrompt, setParsingPrompt] = useState(false);
  const [transitionTolerance, setTransitionTolerance] =
    useState<TransitionTolerance>("balanced");
  const [maxBpmDelta, setMaxBpmDelta] = useState<number | null>(null);
  const [transitionNotes, setTransitionNotes] =
    useState<TransitionNotesMode>("manual");
  const [source, setSource] = useState<SetSource>("library");
  const [generatedTracks, setGeneratedTracks] = useState<GeneratedSetTrack[]>(
    []
  );
  const [setName, setSetName] = useState<string | null>(null);
  const [setId, setSetId] = useState<string | null>(null);
  const [estimatedDuration, setEstimatedDuration] = useState<number | null>(
    null
  );
  const [prompt, setPrompt] = useState("");
  const [promptSummary, setPromptSummary] = useState<string | null>(null);
  const [setPlanPreview, setSetPlanPreview] = useState<SetPlan | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem("cuemind_suggested_prompt");
    if (saved) {
      setPrompt(saved);
      sessionStorage.removeItem("cuemind_suggested_prompt");
      toast.info("Prompt importé depuis les filtres.");
    }
  }, []);

  function applyParsedPrompt(parsed: ParsedSetPrompt) {
    if (parsed.summary) setPromptSummary(parsed.summary);
    if (parsed.plan?.phases.length) setSetPlanPreview(parsed.plan);
  }

  async function handleParsePrompt() {
    const trimmed = prompt.trim();
    if (trimmed.length < 3) {
      toast.error("Décris ton set en quelques mots (min. 3 caractères).");
      return;
    }

    setParsingPrompt(true);
    try {
      const response = await fetch("/api/sets/parse-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Erreur interprétation");
      }
      applyParsedPrompt(data.parsed);
      toast.success("Prompt interprété — tu peux lancer la génération.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erreur interprétation du prompt"
      );
    } finally {
      setParsingPrompt(false);
    }
  }

  async function handleGenerate() {
    const trimmed = prompt.trim();
    if (trimmed.length < 3) {
      toast.error("Décris ton set en quelques mots (min. 3 caractères).");
      return;
    }

    if (source === "library" && trackCount < 3) {
      toast.error("Il faut au moins 3 morceaux avec BPM dans ta bibliothèque.");
      return;
    }

    setGenerating(true);
    setGeneratedTracks([]);
    setSetName(null);
    setSetId(null);
    setEstimatedDuration(null);

    try {
      const response = await fetch("/api/sets/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: trimmed,
          transitionTolerance,
          maxBpmDelta,
          transitionNotes,
          source,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Erreur génération");
      }

      if (data.appliedFilters?.summary) {
        setPromptSummary(data.appliedFilters.summary);
        if (data.appliedFilters.plan?.phases?.length) {
          setSetPlanPreview(data.appliedFilters.plan);
        }
      }

      setGeneratedTracks(data.tracks);
      setSetName(data.set.name);
      setSetId(data.set.id ?? null);
      setEstimatedDuration(data.estimatedDurationMinutes ?? null);
      toast.success("Set généré et enregistré !");
      if (data.appliedFilters?.notesWarning) {
        toast.warning(data.appliedFilters.notesWarning);
      } else if (
        transitionNotes === "ai" &&
        (data.appliedFilters?.notesGenerated ?? 0) > 0
      ) {
        toast.success(
          `${data.appliedFilters.notesGenerated} note${data.appliedFilters.notesGenerated > 1 ? "s" : ""} de transition générée${data.appliedFilters.notesGenerated > 1 ? "s" : ""}`
        );
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erreur lors de la génération"
      );
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle>Génération par prompt IA</CardTitle>
        <CardDescription>
          Décris ton set en langage naturel — l&apos;IA planifie les phases
          puis ordonne tes morceaux (BPM + Camelot).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <SetSourcePicker value={source} onChange={setSource} />

        <TransitionTolerancePicker
          value={transitionTolerance}
          onChange={setTransitionTolerance}
          maxBpmDelta={maxBpmDelta}
          onMaxBpmDeltaChange={setMaxBpmDelta}
        />

        <TransitionNotesPicker
          value={transitionNotes}
          onChange={setTransitionNotes}
        />

        <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
          <Label className="flex items-center gap-2 text-base">
            <MessageSquare className="size-4 text-primary" />
            Décris ton set
          </Label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ex : Set de 1h30 pour un mariage, on commence en Hip-Hop puis Pop et House, ambiance festif et énergique, montée progressive..."
            rows={4}
            className={cn(
              "border-input bg-background placeholder:text-muted-foreground w-full resize-y rounded-md border px-3 py-2 text-sm",
              "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none"
            )}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void handleParsePrompt()}
              disabled={parsingPrompt || prompt.trim().length < 3}
            >
              <Wand2 className="size-4" />
              {parsingPrompt ? "Interprétation..." : "Prévisualiser le plan"}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => void handleGenerate()}
              disabled={
                generating ||
                prompt.trim().length < 3 ||
                (source === "library" && trackCount < 3)
              }
            >
              <Sparkles className="size-4" />
              {generating ? "Génération..." : "Générer le set"}
            </Button>
          </div>
          {promptSummary && (
            <p className="text-muted-foreground text-xs italic">
              IA : {promptSummary}
            </p>
          )}
          {setPlanPreview && setPlanPreview.phases.length > 0 && (
            <div className="space-y-2 rounded-md border border-border/60 bg-background/50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                Plan du set (~{setPlanPreview.totalDurationMinutes} min)
              </p>
              <ol className="space-y-1.5">
                {setPlanPreview.phases.map((phase, i) => (
                  <li
                    key={`${phase.name}-${i}`}
                    className="text-muted-foreground text-xs"
                  >
                    <span className="font-mono text-foreground">{i + 1}.</span>{" "}
                    <span className="font-medium text-foreground">
                      {phase.name}
                    </span>{" "}
                    · {phase.durationMinutes} min · {phase.energy} ·{" "}
                    {phase.primaryStyles.join("+")}
                    {phase.bridgeStyles.length > 0 && (
                      <span className="opacity-70">
                        {" "}
                        (+ ponts {phase.bridgeStyles.slice(0, 3).join(", ")})
                      </span>
                    )}
                    {phase.ambiances.length > 0 && (
                      <span> · {phase.ambiances.join(", ")}</span>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}
          <p className="text-muted-foreground text-xs">
            L&apos;IA construit un parcours en parties (durée, énergie, styles
            ponts). Le set est automatiquement sauvegardé dans{" "}
            <span className="font-medium">Playlists → Sets générés</span>.
          </p>
        </div>

        {source === "library" && trackCount < 3 && (
          <p className="text-muted-foreground text-sm">
            Importe au moins 3 morceaux avec BPM, ou choisis une source
            «&nbsp;découverte&nbsp;» pour générer sans bibliothèque.
          </p>
        )}

        <SetBuilderResults
          setId={setId}
          setName={setName}
          estimatedDuration={estimatedDuration}
          generatedTracks={generatedTracks}
          transitionTolerance={transitionTolerance}
          notesMode={transitionNotes}
        />
      </CardContent>
    </Card>
  );
}
