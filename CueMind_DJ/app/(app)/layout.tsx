import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  return (
    <AppShell
      email={user.email ?? null}
      displayName={profile?.display_name ?? null}
    >
      {children}
    </AppShell>
  );
}
