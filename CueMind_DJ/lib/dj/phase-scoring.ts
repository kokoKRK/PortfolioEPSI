import { getStoredAmbiances } from "@/lib/ai/classify-ambiance";
import {
  inferStylesFromTitle,
  trackEffectiveStyles,
} from "@/lib/dj/style-affinity";
import {
  getTrackDiscogsGenre,
  getTrackEffectiveBpm,
  getTrackEnergyLevel,
  getTrackPrimaryStyle,
} from "@/lib/dj/track-profile";
import type { SetPhase } from "@/lib/dj/set-plan";
import type { Track } from "@/types/database";

function isHardExcluded(track: Track, phase: SetPhase): boolean {
  const trackStyle = getTrackPrimaryStyle(track);
  const discogsGenre = getTrackDiscogsGenre(track)?.toLowerCase() ?? "";
  const bpm = getTrackEffectiveBpm(track) ?? 0;
  const energyLevel = getTrackEnergyLevel(track);

  const phaseWantsTechno = phase.primaryStyles.some(
    (s) => s.toLowerCase() === "techno"
  );
  const technoTagged = trackStyle.toLowerCase() === "techno";
  const discogsIsTechno =
    discogsGenre.includes("techno") &&
    !discogsGenre.includes("deep house") &&
    !discogsGenre.includes("trip hop");
  const discogsIsChill =
    discogsGenre.includes("deep house") ||
    discogsGenre.includes("downtempo") ||
    discogsGenre.includes("ambient") ||
    discogsGenre.includes("chill");
  const titleHintsTechno = inferStylesFromTitle(track.title).some(
    (s) => s === "Techno"
  );

  if (!phaseWantsTechno) {
    if ((technoTagged || discogsIsTechno) && !phase.bridgeStyles.includes("Techno")) {
      if (!discogsIsChill) return true;
    }
    if (titleHintsTechno && phase.energy === "low") {
      return true;
    }
    if (phase.energy === "low" && energyLevel === "high") {
      return true;
    }
    if (phase.energy === "low" && bpm >= 128 && technoTagged) {
      return true;
    }
  }

  if (phase.energy === "low" && energyLevel === "high") {
    return true;
  }

  if (phase.energy === "low" && bpm >= 130) {
    return true;
  }

  if (phase.energy === "high" && energyLevel === "low" && !phaseWantsTechno) {
    return true;
  }

  return false;
}

export function scoreTrackForPhase(track: Track, phase: SetPhase): number {
  if (getTrackEffectiveBpm(track) == null) return -1;
  if (isHardExcluded(track, phase)) return -1;

  let score = 0;
  const primaryStyle = getTrackPrimaryStyle(track);
  const effectiveStyles = trackEffectiveStyles(
    track.style,
    track.title,
    track.detected_style,
    getTrackDiscogsGenre(track)
  );
  const trackStyle = track.style ?? "Other";
  const titleHints = inferStylesFromTitle(track.title);
  const energyLevel = getTrackEnergyLevel(track);

  const primaryMatch = phase.primaryStyles.some((s) =>
    effectiveStyles.some((es) => es.toLowerCase() === s.toLowerCase())
  );
  if (primaryMatch) score += 14;

  const bridgeMatch = phase.bridgeStyles.some((s) =>
    effectiveStyles.some((es) => es.toLowerCase() === s.toLowerCase())
  );
  if (bridgeMatch) score += 8;

  if (!primaryMatch && !bridgeMatch) {
    if (trackStyle === "Other" || titleHints.length > 0 || track.detected_style) {
      if (titleHints.some((h) => phase.primaryStyles.includes(h))) score += 10;
      else if (titleHints.some((h) => phase.bridgeStyles.includes(h))) score += 6;
      else if (
        phase.primaryStyles.some(
          (s) => s.toLowerCase() === primaryStyle.toLowerCase()
        )
      ) {
        score += 12;
      } else if (phase.bridgeStyles.includes("Other")) score += 3;
      else return -1;
    } else {
      return -1;
    }
  }

  const trackAmbiances = getStoredAmbiances(track);
  let ambianceHits = 0;
  for (const ambiance of phase.ambiances) {
    if (trackAmbiances.some((a) => a.toLowerCase() === ambiance.toLowerCase())) {
      ambianceHits++;
      score += 6;
    }
  }

  if (phase.ambiances.length > 0 && ambianceHits === 0) {
    score -= 4;
  }

  const bpm = getTrackEffectiveBpm(track)!;
  if (phase.energy === "low") {
    if (energyLevel === "low") score += 6;
    else if (energyLevel === "high") score -= 10;
    if (bpm <= 118) score += 5;
    else if (bpm <= 122) score += 2;
    else if (bpm >= 126) score -= 8;
  } else if (phase.energy === "medium") {
    if (energyLevel === "medium") score += 4;
    if (bpm >= 118 && bpm <= 126) score += 4;
    else if (bpm >= 115 && bpm <= 128) score += 2;
  } else if (phase.energy === "high") {
    if (energyLevel === "high") score += 6;
    else if (energyLevel === "low") score -= 6;
    if (bpm >= 124) score += 5;
    else if (bpm >= 120) score += 2;
    else if (bpm < 115) score -= 4;
  }

  return score;
}
export function isTrackEligibleForPhase(
  track: Track,
  phase: SetPhase
): boolean {
  return scoreTrackForPhase(track, phase) >= 6;
}
