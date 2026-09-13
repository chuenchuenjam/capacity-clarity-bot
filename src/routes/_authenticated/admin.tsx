import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Shield, Trash2, User } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { KnowledgeShell } from "@/components/knowledge/KnowledgeShell";
import { listUsers, setUserRole, deleteUserRole } from "@/lib/knowledge.functions";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: data.user.id,
      _role: "admin",
    });
    if (!isAdmin) throw redirect({ to: "/" });
  },
  head: () => ({
    meta: [
      { title: "Admin — Knowledge Center" },
      { name: "description", content: "Manage users and roles for the Knowledge Center." },
      { property: "og:title", content: "Admin — Knowledge Center" },
      { property: "og:description", content: "Manage users and roles for the Knowledge Center." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
});

type UserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  roles: string[];
};

function AdminPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const listUsersFn = useServerFn(listUsers);
  const setRoleFn = useServerFn(setUserRole);
  const deleteRoleFn = useServerFn(deleteUserRole);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => listUsersFn({ data: undefined }),
  });

  const changeRole = async (targetId: string, role: "admin" | "editor" | "viewer") => {
    try {
      await setRoleFn({ data: { user_id: targetId, role } });
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(`Role set to ${role}`);
    } catch (error: any) {
      toast.error(error?.message?.includes("admin") ? error.message : "Failed to update role");
    }
  };

  const removeRole = async (targetId: string, role: "admin" | "editor" | "viewer") => {
    try {
      await deleteRoleFn({ data: { user_id: targetId, role } });
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Role removed");
    } catch (error: any) {
      toast.error(error?.message?.includes("admin") ? error.message : "Failed to remove role");
    }
  };


  return (
    <KnowledgeShell>
      <div className="p-8">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h1 className="font-display text-2xl font-semibold">Admin</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Manage users and their roles.</p>

        <div className="mt-6 rounded-lg border">
          <div className="grid grid-cols-[1fr,1fr,1fr,auto] gap-4 border-b bg-muted/50 px-4 py-2 text-xs font-semibold uppercase text-muted-foreground">
            <span>User</span>
            <span>Email</span>
            <span>Roles</span>
            <span>Add role</span>
          </div>
          {isLoading ? (
            <div className="px-4 py-6 text-sm text-muted-foreground">Loading users...</div>
          ) : (
            (users as UserRow[]).map((u) => (
              <div
                key={u.id}
                className="grid grid-cols-[1fr,1fr,1fr,auto] items-center gap-4 border-b px-4 py-3 last:border-b-0"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <span className="text-sm font-medium">{u.full_name || "—"}</span>
                </div>
                <span className="text-sm text-muted-foreground">{u.email || "—"}</span>
                <div className="flex flex-wrap gap-1">
                  {u.roles.length === 0 && <span className="text-sm text-muted-foreground">—</span>}
                  {u.roles.map((role) => (
                    <span
                      key={role}
                      className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs"
                    >
                      {role}
                      <button
                        type="button"
                        onClick={() => void removeRole(u.id, role as any)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <Select onValueChange={(role) => void changeRole(u.id, role as any)}>
                  <SelectTrigger className="h-8 w-28 text-xs">
                    <SelectValue placeholder="Add..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))
          )}
        </div>
      </div>
    </KnowledgeShell>
  );
}
