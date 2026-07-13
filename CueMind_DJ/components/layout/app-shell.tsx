"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  Home,
  Upload,
  Library,
  ListMusic,
  Sparkles,
  Users,
  LogOut,
  Menu,
  X,
  Globe,
} from "lucide-react";
import { AudioPlayerBar } from "@/components/audio/audio-player-bar";
import { AudioPlayerProvider, useAudioPlayer } from "@/components/audio/audio-player-provider";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Accueil", icon: Home },
  { href: "/import", label: "Importer", icon: Upload },
  { href: "/discover", label: "Découvrir", icon: Globe },
  { href: "/library", label: "Bibliothèque", icon: Library },
  { href: "/playlists", label: "Playlists", icon: ListMusic },
  { href: "/sets", label: "Générer un set", icon: Sparkles },
  { href: "/b2b", label: "B2B IA", icon: Users },
];

type AppShellProps = {
  children: React.ReactNode;
  email: string | null;
  displayName: string | null;
};

export function AppShell({ children, email, displayName }: AppShellProps) {
  return (
    <AudioPlayerProvider>
      <AppShellInner email={email} displayName={displayName}>
        {children}
      </AppShellInner>
      <AudioPlayerBar />
    </AudioPlayerProvider>
  );
}

function AppShellInner({ children, email, displayName }: AppShellProps) {
  const { currentTrack } = useAudioPlayer();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success("Déconnexion réussie");
    router.push("/login");
    router.refresh();
  }

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      {NAV_ITEMS.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="brand-gradient pointer-events-none fixed inset-0" />

      {/* Mobile header */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-card/90 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo.jpg"
            alt="CueMind DJ"
            width={36}
            height={36}
            className="rounded-lg"
          />
          <span className="font-bold">
            <span className="text-primary">CUE</span>
            <span className="text-foreground">MIND</span>
          </span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-background/95 px-4 pt-20 lg:hidden">
          <nav className="flex flex-col gap-1">
            <NavLinks onNavigate={() => setMobileOpen(false)} />
          </nav>
        </div>
      )}

      <div className="relative mx-auto flex max-w-7xl">
        {/* Desktop sidebar */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-border lg:flex lg:min-h-screen">
          <div className="border-b border-border p-5">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/logo.jpg"
                alt="CueMind DJ"
                width={48}
                height={48}
                className="rounded-xl brand-glow"
              />
              <div>
                <p className="text-lg font-bold leading-tight">
                  <span className="text-primary">CUE</span>
                  <span className="text-foreground">MIND</span>
                  <span className="ml-1 text-xs text-primary">DJ</span>
                </p>
                <p className="text-muted-foreground text-xs">
                  Set Planner &amp; AI
                </p>
              </div>
            </Link>
          </div>

          <nav className="flex flex-1 flex-col gap-1 p-4">
            <NavLinks />
          </nav>

          <div className="border-t border-border p-4">
            <p className="text-muted-foreground mb-2 truncate text-xs">
              {displayName || email}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              <LogOut className="size-4" />
              Déconnexion
            </Button>
          </div>
        </aside>

        <main
          className={cn(
            "min-h-screen flex-1 px-4 py-6 lg:px-8 lg:py-8",
            currentTrack && "pb-28 lg:pb-20"
          )}
        >
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex justify-around border-t border-border bg-card/95 px-2 py-2 backdrop-blur lg:hidden">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-lg px-2 py-1 text-[10px]",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="size-5" />
              <span className="max-w-[56px] truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className={cn("h-16 lg:hidden", currentTrack && "h-28")} />
    </div>
  );
}
