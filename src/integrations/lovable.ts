import { supabase } from "./supabase/client";

export const lovable = {
  auth: {
    async signInWithOAuth(provider: "google", { redirect_uri }: { redirect_uri: string }) {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: redirect_uri },
      });
      if (error) throw error;
      if (data.url) window.location.href = data.url;
      return data;
    },
  },
};
