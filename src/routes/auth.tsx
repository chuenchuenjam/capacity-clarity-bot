import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Bot, BookOpen, CheckCircle2 } from "lucide-react";

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
  const navigate = useNavigate();

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
        toast.success("Signed in");
        await navigate({ to: "/", replace: true });
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
    <div className="presentation-grid grid min-h-screen place-items-center bg-background p-4 sm:p-8">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl border bg-card shadow-lift md:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden min-h-[620px] flex-col justify-between bg-sidebar p-10 text-sidebar-foreground md:flex">
          <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground"><BookOpen className="h-5 w-5" /></span><span className="font-display text-lg font-semibold">Knowledge Center</span></div>
          <div><p className="text-xs font-semibold uppercase text-sidebar-foreground/60">AI-enabled intelligence</p><h1 className="mt-3 max-w-md font-display text-4xl font-semibold leading-tight">Your team’s knowledge, ready for every decision.</h1><p className="mt-4 max-w-md text-sm leading-6 text-sidebar-foreground/70">Discover capabilities, understand project status, and build leadership-ready stories from trusted sources.</p><div className="mt-8 space-y-3 text-sm"><p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> Search across project knowledge</p><p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> Generate evidence-backed presentations</p></div></div>
          <p className="text-xs text-sidebar-foreground/50">Secure access for your AI team</p>
        </section>
        <section className="p-6 sm:p-10 md:flex md:flex-col md:justify-center">
        <div className="mb-8 flex items-center gap-3 md:hidden"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Bot className="h-5 w-5" /></span><span className="font-display font-semibold">Knowledge Center</span></div>
        <p className="text-xs font-semibold uppercase text-primary">Welcome back</p>
        <h2 className="mt-2 font-display text-2xl font-semibold">{mode === "forgot" ? "Recover access" : mode === "signup" ? "Create your account" : "Sign in to your workspace"}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{mode === "forgot" ? "We’ll send a secure reset link to your inbox." : "Continue to your team’s AI knowledge workspace."}</p>

        <form onSubmit={submit} className="mt-7 space-y-4">
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
            <Button type="submit" className="h-11 w-full rounded-xl" disabled={loading}>
            {mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
          </Button>
        </form>

        <div className="mt-4 space-y-2 text-center text-sm text-muted-foreground">
          {mode === "signin" && (
            <div>
               <Button type="button" variant="link" onClick={() => setMode("forgot")} className="h-auto p-0 text-primary">
                Forgot password?
               </Button>
            </div>
          )}
          {mode === "signin" ? (
            <div>
              Don't have an account?{" "}
               <Button type="button" variant="link" onClick={() => setMode("signup")} className="h-auto p-0 text-primary">
                Sign up
               </Button>
            </div>
          ) : (
            <div>
              Back to{" "}
               <Button type="button" variant="link" onClick={() => setMode("signin")} className="h-auto p-0 text-primary">
                Sign in
               </Button>
            </div>
          )}
        </div>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
          <div className="relative flex justify-center text-xs uppercase text-muted-foreground">
            <span className="bg-card px-2">or</span>
          </div>
        </div>

         <Button variant="outline" className="h-11 w-full rounded-xl" onClick={() => void google()}>
          Continue with Google
        </Button>
        </section>
      </div>
    </div>
  );
}
