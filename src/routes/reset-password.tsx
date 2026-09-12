import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — Knowledge Center" },
      { name: "description", content: "Set a new password for your Knowledge Center account." },
      { property: "og:title", content: "Reset password — Knowledge Center" },
      { property: "og:description", content: "Set a new password for your Knowledge Center account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [valid, setValid] = useState(false);

  useEffect(() => {
    // The recovery link arrives with type=recovery in the URL hash.
    if (window.location.hash.includes("type=recovery")) {
      setValid(true);
      return;
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setValid(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated. You are now signed in.");
      navigate({ to: "/" });
    } catch (error: any) {
      toast.error(error.message || "Could not update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="presentation-grid flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-7 shadow-lift sm:p-9">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><KeyRound className="h-5 w-5" /></span>
        <h1 className="mt-5 text-center font-display text-2xl font-semibold">Reset password</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">Choose a secure password for your Knowledge Center account.</p>
        {valid ? (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="new-password">New password</Label>
              <Input id="new-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            <div>
              <Label htmlFor="confirm-password">Confirm password</Label>
              <Input id="confirm-password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={6} />
            </div>
            <Button type="submit" className="h-11 w-full rounded-xl" disabled={loading}>
              Update password
            </Button>
          </form>
        ) : (
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Invalid or expired reset link. Request a new one from the{" "}
            <a href="/auth" className="text-primary underline">sign-in page</a>.
          </p>
        )}
      </div>
    </div>
  );
}
