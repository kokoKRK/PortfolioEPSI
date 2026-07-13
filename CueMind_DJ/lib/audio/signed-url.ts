import { createClient } from "@/lib/supabase/client";

const CACHE_TTL_MS = 50 * 60 * 1000;
const urlCache = new Map<string, { url: string; expiresAt: number }>();

export async function getSignedAudioUrl(audioPath: string): Promise<string> {
  const cached = urlCache.get(audioPath);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }

  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from("audio-tracks")
    .createSignedUrl(audioPath, 3600);

  if (error || !data?.signedUrl) {
    throw new Error("Impossible de charger le fichier audio");
  }

  urlCache.set(audioPath, {
    url: data.signedUrl,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return data.signedUrl;
}
