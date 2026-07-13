"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Clock, MessageSquare, Sparkles, Wand2 } from "lucide-react";
import { MUSIC_STYLES } from "@/lib/ai/classify-style";
import { trackNeedsAmbianceClassification } from "@/lib/ai/classify-ambiance";
import {
  estimateSetDurationMinutes,
  filterTracksForSet,
} from "@/lib/dj/set-generator";
import { AmbianceFilter } from "@/components/sets/ambiance-filter";
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
import {
  countAmbiances,
  countByField,
  DURATION_OPTIONS,
} from "@/components/sets/set-builder-shared";
import { StyleOrderPicker } from "@/components/sets/style-order-picker";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { TransitionTolerance } from "@/lib/dj/transition-tolerance";
import type { GeneratedSetTrack, Track } from "@/types/database";

type SetBuilderFiltersProps = {
  tracks: Track[];
  onTracksUpdated?: () => void;
};

export function SetBuilderFilters({
  tracks,
  onTracksUpdated,
}: SetBuilderFiltersProps) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [suggestingPrompt, setSuggestingPrompt] = useState(false);
  const [classifyingAmbiances, setClassifyingAmbiances] = useState(false);
  const [transitionTolerance, setTransitionTolerance] =
    useState<TransitionTolerance>("balanced");
  const [maxBpmDelta, setMaxBpmDelta] = useState<number | null>(null);
  const [generatedTracks, setGeneratedTracks] = useState<GeneratedSetTrack[]>(
    []
  );
  const [setName, setSetName] = useState<string | null>(null);
  const [setId, setSetId] = useState<string | null>(null);
  const [transitionNotes, setTransitionNotes] =
    useState<TransitionNotesMode>("manual");
  const [source, setSource] = useState<SetSource>("library");
  const [estimatedDuration, setEstimatedDuration] = useState<number | null>(
    null
  );
  const [styleOrder, setStyleOrder] = useState<string[]>([]);
  const [selectedAmbiances, setSelectedAmbiances] = useState<string[]>([]);
  const [targetDuration, setTargetDuration] = useState<number | null>(60);

  const tracksWithBpm = useMemo(
    () => tracks.filter((t) => t.bpm != null),
    [tracks]
  );

  const styleCounts = useMemo(
    () => countByField(tracksWithBpm, (t) => t.style),
    [tracksWithBpm]
  );

  const ambianceCounts = useMemo(
    () => countAmbiances(tracksWithBpm),
    [tracksWithBpm]
  );

  const availableStyles = useMemo(() => {
    const fromLibrary = new Set(
      tracksWithBpm.map((t) => t.style).filter((s): s is string => Boolean(s))
    );
    return MUSIC_STYLES.filter((s) => fromLibrary.has(s));
  }, [tracksWithBpm]);

  const availableAmbiances = useMemo(() => {
    return Object.keys(ambianceCounts).sort((a, b) =>
      a.localeCompare(b, "fr")
    );
  }, [ambianceCounts]);

  const eligibleTracks = useMemo(
    () =>
      filterTracksForSet(tracks, {
        styleOrder: styleOrder.length > 0 ? styleOrder : undefined,
        ambiances:
          selectedAmbiances.length > 0 ? selectedAmbiances : undefined,
      }),
    [tracks, styleOrder, selectedAmbiances]
  );

  const tracksNeedingAmbiances = useMemo(
    () => tracks.filter(trackNeedsAmbianceClassification),
    [tracks]
  );

  async function handleClassifyAmbiances() {
    if (tracksNeedingAmbiances.length === 0) {
      toast.info("Tous tes morceaux ont déjà des ambiances.");
      return;
    }

    setClassifyingAmbiances(true);
    try {
      const response = await fetch("/api/tracks/classify-ambiances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ambiancesOnly: true,
          trackIds: tracksNeedingAmbiances.map((t) => t.id),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Erreur analyse IA");
      }

      if (data.updated > 0) {
        await onTracksUpdated?.();
      }

      if (data.updated === 0) {
        throw new Error(
          data.error ??
            data.errors?.[0]?.message ??
            (data.migrationRequired
              ? "Colonne ambiances manquante — exécute la migration SQL dans Supabase."
              : "Aucun morceau mis à jour. Vérifie ta clé GROQ_API_KEY dans .env.local.")
        );
      }

      if (data.remaining > 0) {
        toast.success(
          `${data.updated} morceau(x) analysés — relance pour les ${data.remaining} restants`
        );
      } else {
        toast.success(
          `Ambiances IA enregistrées sur ${data.updated} morceau(x)`
        );
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erreur analyse des ambiances"
      );
    } finally {
      setClassifyingAmbiances(false);
    }
  }

  async function handleSuggestPrompt() {
    setSuggestingPrompt(true);
    try {
      const response = await fetch("/api/sets/suggest-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          styleOrder: styleOrder.length > 0 ? styleOrder : undefined,
          ambiances:
            selectedAmbiances.length > 0 ? selectedAmbiances : undefined,
          targetDurationMinutes: targetDuration,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Erreur génération prompt");
      }
      sessionStorage.setItem("cuemind_suggested_prompt", data.prompt);
      toast.success("Prompt généré — redirection vers la page IA.");
      router.push("/sets/ai");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erreur génération du prompt"
      );
    } finally {
      setSuggestingPrompt(false);
    }
  }

  async function handleGenerate() {
    if (source === "library" && eligibleTracks.length < 3) {
      toast.error(
        "Il faut au moins 3 morceaux avec BPM correspondant à tes filtres."
      );
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
          styleOrder: styleOrder.length > 0 ? styleOrder : undefined,
          ambiances:
            selectedAmbiances.length > 0 ? selectedAmbiances : undefined,
          targetDurationMinutes: targetDuration ?? undefined,
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

  const previewDuration =
    targetDuration != null
      ? targetDuration
      : estimateSetDurationMinutes(eligibleTracks);

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle>Génération par filtres</CardTitle>
        <CardDescription>
          Parcours de styles, ambiances et durée — {eligibleTracks.length}{" "}
          morceau{eligibleTracks.length !== 1 ? "x" : ""} éligible
          {eligibleTracks.length !== 1 ? "s" : ""}
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

        {availableStyles.length > 0 && (
          <div className="space-y-3">
            <Label>Parcours de styles (ordre du set)</Label>
            <p className="text-muted-foreground text-xs">
              Ajoute les styles dans l&apos;ordre souhaité — ex. Hip-Hop → Pop →
              House. Utilise les flèches pour réorganiser.
            </p>
            <StyleOrderPicker
              availableStyles={availableStyles}
              styleOrder={styleOrder}
              trackCounts={styleCounts}
              onChange={setStyleOrder}
            />
          </div>
        )}

        <div className="space-y-3">
          <Label>Ambiances (combinables)</Label>
          <p className="text-muted-foreground text-xs">
            Les ambiances sont détectées par l&apos;IA à l&apos;import. Sélectionne-en
            une ou plusieurs pour filtrer.
          </p>

          {tracksNeedingAmbiances.length > 0 && (
            <div className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm">
                <span className="font-medium text-primary">
                  {tracksNeedingAmbiances.length} morceau
                  {tracksNeedingAmbiances.length !== 1 ? "x" : ""}
                </span>{" "}
                sans ambiance IA — lance l&apos;analyse pour activer les filtres.
              </p>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => void handleClassifyAmbiances()}
                disabled={classifyingAmbiances}
                className="shrink-0"
              >
                <Wand2 className="size-4" />
                {classifyingAmbiances
                  ? "Analyse IA en cours..."
                  : "Analyser avec l'IA"}
              </Button>
            </div>
          )}

          <AmbianceFilter
            availableAmbiances={availableAmbiances}
            selectedAmbiances={selectedAmbiances}
            trackCounts={ambianceCounts}
            onChange={setSelectedAmbiances}
          />
        </div>

        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Clock className="size-4" />
            Durée cible du set
          </Label>
          <div className="flex flex-wrap gap-2">
            {DURATION_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                type="button"
                size="sm"
                variant={targetDuration === opt.value ? "default" : "outline"}
                onClick={() => setTargetDuration(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
            <Button
              type="button"
              size="sm"
              variant={targetDuration === null ? "default" : "outline"}
              onClick={() => setTargetDuration(null)}
            >
              Sans limite
            </Button>
          </div>
          <p className="text-muted-foreground text-xs">
            Durée estimée avec les filtres actuels : ~{previewDuration} min
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleSuggestPrompt()}
            disabled={suggestingPrompt}
          >
            <MessageSquare className="size-4" />
            {suggestingPrompt ? "Génération..." : "Décrire en prompt IA"}
          </Button>
          <Button
            onClick={() => void handleGenerate()}
            disabled={
              generating || (source === "library" && eligibleTracks.length < 3)
            }
            size="lg"
          >
            <Sparkles className="size-4" />
            {generating ? "Génération en cours..." : "Générer le set"}
          </Button>
        </div>

        {eligibleTracks.length < 3 && tracks.length > 0 && (
          <p className="text-muted-foreground text-sm">
            Ajoute des morceaux tagués (BPM), élargis tes filtres ou réduis les
            ambiances sélectionnées.
          </p>
        )}

        <SetBuilderResults
          setId={setId}
          setName={setName}
          estimatedDuration={estimatedDuration}
          generatedTracks={generatedTracks}
          notesMode={transitionNotes}
          transitionTolerance={transitionTolerance}
        />
      </CardContent>
    </Card>
  );
}
