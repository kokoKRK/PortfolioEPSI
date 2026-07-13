import { Flag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  estimateCuePointsFromPeaks,
  formatCueTime,
} from "@/lib/audio/cue-points";
import type { Track } from "@/types/database";

type CuePointsBadgeProps = {
  track: Track;
};

export function CuePointsBadge({ track }: CuePointsBadgeProps) {
  const cues = estimateCuePointsFromPeaks(
    track.waveform_peaks,
    track.duration_seconds
  );

  if (!cues) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge variant="outline" className="gap-1 text-[10px] font-normal">
        <Flag className="size-3" />
        Intro {formatCueTime(cues.introEndSeconds)}
      </Badge>
      <Badge variant="outline" className="text-[10px] font-normal">
        Mix out {formatCueTime(cues.mixOutSeconds)}
      </Badge>
      <Badge variant="outline" className="text-[10px] font-normal">
        Outro {formatCueTime(cues.outroStartSeconds)}
      </Badge>
    </div>
  );
}
