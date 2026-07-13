"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StylePlaylists } from "@/components/playlists/style-playlists";

export default function PlaylistsStylesPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setRefreshKey((k) => k + 1)}
          className="font-mono text-xs"
        >
          <RefreshCw className="size-3.5" />
          Sync
        </Button>
      </div>
      <StylePlaylists refreshKey={refreshKey} fullPage />
    </div>
  );
}
