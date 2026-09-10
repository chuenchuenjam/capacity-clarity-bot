import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/" });
  },
  head: () => ({
    meta: [
      { title: "Sign in — Knowledge Center" },
      { name: "description", content: "Sign in to the AI team Knowledge Center." },
      { property: "og:title", content: "Sign in — Knowledge Center" },
      { property: "og:description", content: "Sign in to the AI team Knowledge Center." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Check your email for a password reset link.");
        setMode("signin");
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error: any) {
      toast.error(error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm">
        <h1 className="text-center font-display text-xl font-semibold">Knowledge Center</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">Sign in to continue</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          {mode !== "forgot" && (
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
          </Button>
        </form>

        <div className="mt-4 space-y-2 text-center text-sm text-muted-foreground">
          {mode === "signin" && (
            <div>
              <button type="button" onClick={() => setMode("forgot")} className="text-primary underline">
                Forgot password?
              </button>
            </div>
          )}
          {mode === "signin" ? (
            <div>
              Don't have an account?{" "}
              <button type="button" onClick={() => setMode("signup")} className="text-primary underline">
                Sign up
              </button>
            </div>
          ) : (
            <div>
              Back to{" "}
              <button type="button" onClick={() => setMode("signin")} className="text-primary underline">
                Sign in
              </button>
            </div>
          )}
        </div>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
          <div className="relative flex justify-center text-xs uppercase text-muted-foreground">
            <span className="bg-card px-2">or</span>
          </div>
        </div>

        <Button variant="outline" className="w-full" onClick={() => void google()}>
          Continue with Google
        </Button>
      </div>
    </div>
  );
}
