"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FolderOpen, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  collectAudioFilesFromDataTransfer,
  collectAudioFilesFromFileList,
} from "@/lib/audio/collect-files";
import type { Track } from "@/types/database";

type TrackUploadProps = {
  onUploadComplete?: (track: Track) => void;
};

type UploadStatus = {
  current: number;
  total: number;
  fileName: string;
};

export function TrackUpload({ onUploadComplete }: TrackUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<UploadStatus | null>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) {
        toast.error("Aucun fichier MP3 ou WAV trouvé.");
        return;
      }

      setUploading(true);
      let successCount = 0;
      let skippedCount = 0;
      let errorCount = 0;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setStatus({
          current: i + 1,
          total: files.length,
          fileName: file.name,
        });

        const formData = new FormData();
        formData.append("file", file);

        try {
          const response = await fetch("/api/tracks/upload", {
            method: "POST",
            body: formData,
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error ?? "Erreur upload");
          }

          if (data.alreadyExists) {
            skippedCount++;
          } else {
            successCount++;
            onUploadComplete?.(data.track);
          }
        } catch (error) {
          errorCount++;
          toast.error(
            `${file.name} : ${
              error instanceof Error ? error.message : "Erreur upload"
            }`
          );
        }
      }

      setUploading(false);
      setStatus(null);

      if (successCount > 0) {
        toast.success(
          `${successCount} morceau${successCount > 1 ? "x" : ""} ajouté${successCount > 1 ? "s" : ""} à ta bibliothèque`
        );
      }
      if (skippedCount > 0) {
        toast.info(
          `${skippedCount} doublon${skippedCount > 1 ? "s" : ""} ignoré${skippedCount > 1 ? "s" : ""} (déjà dans ta bibliothèque)`
        );
      }
      if (errorCount > 0 && successCount === 0) {
        toast.error("Aucun morceau n'a pu être uploadé.");
      }
    },
    [onUploadComplete]
  );

  // Avertit l'utilisateur s'il tente de quitter/rafraîchir pendant un upload :
  // les fichiers non encore envoyés seraient perdus (le navigateur ne peut pas
  // les récupérer après un rechargement).
  useEffect(() => {
    if (!uploading) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [uploading]);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = await collectAudioFilesFromDataTransfer(e.dataTransfer);
      await uploadFiles(files);
    },
    [uploadFiles]
  );

  const handleFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = collectAudioFilesFromFileList(e.target.files);
    e.target.value = "";
    await uploadFiles(files);
  };

  const progressValue = status
    ? Math.round((status.current / status.total) * 100)
    : 0;

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle>Upload de morceaux</CardTitle>
        <CardDescription>
          Glisse un dossier entier, plusieurs fichiers MP3/WAV — import rapide
          (tags uniquement). Lance ensuite « Analyser l&apos;audio » dans la
          bibliothèque pour la détection BPM/clé/style par l&apos;IA.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 transition-colors ${
            isDragging
              ? "border-primary bg-primary/10"
              : "border-border hover:border-primary/50 hover:bg-muted/30"
          } ${uploading ? "pointer-events-none opacity-60" : ""}`}
        >
          <div className="flex size-14 items-center justify-center rounded-full bg-primary/20">
            <Upload className="size-6 text-primary" />
          </div>
          <div className="text-center">
            <p className="font-medium">
              {uploading
                ? `Upload ${status?.current ?? 0}/${status?.total ?? 0}...`
                : "Glisse un dossier ou des fichiers ici"}
            </p>
            <p className="text-muted-foreground text-sm">
              MP3 et WAV uniquement — max 50 Mo par fichier
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={uploading}
              onClick={() => filesInputRef.current?.click()}
            >
              Choisir des fichiers
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => folderInputRef.current?.click()}
            >
              <FolderOpen className="size-4" />
              Choisir un dossier
            </Button>
          </div>
        </div>

        <input
          ref={filesInputRef}
          type="file"
          accept=".mp3,.wav,audio/mpeg,audio/wav"
          multiple
          className="hidden"
          onChange={handleFilesChange}
          disabled={uploading}
        />
        <input
          ref={folderInputRef}
          type="file"
          accept=".mp3,.wav,audio/mpeg,audio/wav"
          multiple
          className="hidden"
          onChange={handleFilesChange}
          disabled={uploading}
          {...({ webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement>)}
        />

        {uploading && status && (
          <div className="space-y-2">
            <Progress value={progressValue} />
            <p className="text-muted-foreground truncate text-center text-xs">
              {status.fileName} ({status.current}/{status.total})
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
