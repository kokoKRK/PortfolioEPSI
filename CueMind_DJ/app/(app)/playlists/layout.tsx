import { PlaylistsLayoutShell } from "@/components/playlists/playlists-layout-shell";

export default function PlaylistsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PlaylistsLayoutShell>{children}</PlaylistsLayoutShell>;
}
