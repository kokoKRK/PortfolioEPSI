"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const authError = searchParams.get("error");

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    toast.success("Connexion réussie !");
    router.push("/");
    router.refresh();
  }

  async function handleGoogleLogin() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
    }
  }

  return (
    <Card className="relative w-full max-w-md border-border bg-card/90 backdrop-blur brand-glow">
      <CardHeader className="text-center">
        <div className="mx-auto mb-3">
          <Image
            src="/logo.jpg"
            alt="CueMind DJ"
            width={72}
            height={72}
            className="mx-auto rounded-xl"
          />
        </div>
        <CardTitle className="text-2xl">
          <span className="text-primary">CUE</span>
          <span className="text-foreground">MIND</span>
          <span className="ml-1 text-sm text-primary">DJ</span>
        </CardTitle>
        <CardDescription>
          Connecte-toi pour préparer ton set parfait
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {authError && (
          <p className="text-destructive text-center text-sm">
            Erreur d&apos;authentification. Réessaie.
          </p>
        )}

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          Continuer avec Google
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">ou</span>
          </div>
        </div>

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="dj@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Connexion..." : "Se connecter"}
          </Button>
        </form>

        <p className="text-muted-foreground text-center text-sm">
          Pas encore de compte ?{" "}
          <Link href="/signup" className="text-primary hover:underline">
            S&apos;inscrire
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="brand-gradient absolute inset-0" />
      <Suspense fallback={<div className="text-muted-foreground">Chargement...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
