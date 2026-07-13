"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Globe, Library, ListMusic, Sparkles, Upload, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTracks } from "@/hooks/use-tracks";

export default function HomePage() {
  const { tracks, loading } = useTracks();
  const [playlistCount, setPlaylistCount] = useState(0);

  useEffect(() => {
    fetch("/api/playlists")
      .then((r) => r.json())
      .then((d) => setPlaylistCount(d.playlists?.length ?? 0))
      .catch(() => {});
  }, []);

  const stylesCount = new Set(
    tracks.map((t) => t.style).filter(Boolean)
  ).size;

  const quickLinks = [
    {
      href: "/import",
      label: "Importer des morceaux",
      desc: "Drop un dossier ou des fichiers MP3/WAV",
      icon: Upload,
    },
    {
      href: "/discover",
      label: "Découvrir en ligne",
      desc: "Catalogue Deezer — analyse sur extrait 30s",
      icon: Globe,
    },
    {
      href: "/library",
      label: "Ma bibliothèque",
      desc: `${tracks.length} morceau${tracks.length !== 1 ? "x" : ""} au total`,
      icon: Library,
    },
    {
      href: "/playlists/styles",
      label: "Playlists par style",
      desc: "Classées automatiquement par l'IA",
      icon: ListMusic,
    },
    {
      href: "/sets/ai",
      label: "Générer un set",
      desc: "Prompt IA, filtres et storyboard",
      icon: Sparkles,
    },
    {
      href: "/b2b",
      label: "B2B avec l'IA",
      desc: "Suggestions de morceaux en temps réel",
      icon: Users,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Bienvenue sur <span className="text-primary">CueMind DJ</span>
        </h1>
        <p className="text-muted-foreground mt-1">
          Prépare tes sets intelligemment — upload, classification IA, génération
          harmonique.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border bg-card/80">
          <CardHeader className="pb-2">
            <CardDescription>Morceaux</CardDescription>
            <CardTitle className="text-3xl text-primary">
              {loading ? "—" : tracks.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border bg-card/80">
          <CardHeader className="pb-2">
            <CardDescription>Styles détectés</CardDescription>
            <CardTitle className="text-3xl text-primary">
              {loading ? "—" : stylesCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border bg-card/80">
          <CardHeader className="pb-2">
            <CardDescription>Playlists</CardDescription>
            <CardTitle className="text-3xl text-primary">
              {playlistCount}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Card
              key={link.href}
              className="border-border bg-card/80 transition-colors hover:border-primary/40"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/15">
                    <Icon className="size-5 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-lg">{link.label}</CardTitle>
                <CardDescription>{link.desc}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="hover:bg-brand-hover">
                  <Link href={link.href}>Accéder</Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
