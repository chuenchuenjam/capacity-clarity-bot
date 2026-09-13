import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const UpdateInput = z.object({
  id: z.string(),
  title: z.string().min(1),
  content: z.string(),
  status: z.enum(["draft", "in_review", "published"]),
  badge: z.string().nullable().optional(),
});

export const updateDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => UpdateInput.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("documents")
      .update({
        title: data.title,
        content: data.content,
        status: data.status,
        ...(data.badge !== undefined ? { badge: data.badge } : {}),
        updated_by: context.userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

const UpdateFolderInput = z.object({
  id: z.string(),
  name: z.string().min(1),
  access_level: z.enum(["public", "internal", "restricted"]),
  badge: z.string().nullable(),
});

export const updateFolder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => UpdateFolderInput.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("folders")
      .update({
        name: data.name,
        access_level: data.access_level,
        badge: data.badge,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });


const CreateDocInput = z.object({
  folder_id: z.string(),
  title: z.string().min(1),
  content: z.string().default(""),
  status: z.enum(["draft", "in_review", "published"]).default("draft"),
});

export const createDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => CreateDocInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: inserted, error } = await context.supabase
      .from("documents")
      .insert({
        folder_id: data.folder_id,
        title: data.title,
        content: data.content,
        status: data.status,
        created_by: context.userId,
        updated_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw error;
    return inserted;
  });

const IdInput = z.object({ id: z.string() });

export const deleteDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => IdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("documents").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

const CreateFolderInput = z.object({
  parent_id: z.string().nullable(),
  name: z.string().min(1),
  access_level: z.enum(["public", "internal", "restricted"]).default("internal"),
});

export const createFolder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => CreateFolderInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: inserted, error } = await context.supabase
      .from("folders")
      .insert({
        parent_id: data.parent_id,
        name: data.name,
        access_level: data.access_level,
      })
      .select("id")
      .single();
    if (error) throw error;
    return inserted;
  });

export const deleteFolder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => IdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("folders").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { data: profiles, error: pError } = await context.supabase.from("profiles").select("id, email, full_name");
    if (pError) throw pError;

    const { data: roles, error: rError } = await context.supabase.from("user_roles").select("user_id, role");
    if (rError) throw rError;

    const rolesByUser = new Map<string, string[]>();
    for (const r of roles ?? []) {
      if (!rolesByUser.has(r.user_id)) rolesByUser.set(r.user_id, []);
      rolesByUser.get(r.user_id)!.push(r.role);
    }

    return (profiles ?? []).map((p) => ({
      id: p.id,
      email: p.email,
      full_name: p.full_name,
      roles: rolesByUser.get(p.id) ?? [],
    }));
  });

const RoleInput = z.object({
  user_id: z.string(),
  role: z.enum(["admin", "editor", "viewer"]),
});

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => RoleInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { error } = await context.supabase.from("user_roles").insert({ user_id: data.user_id, role: data.role });
    if (error) throw error;
    return { ok: true };
  });

export const deleteUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => RoleInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { error } = await context.supabase
      .from("user_roles")
      .delete()
      .eq("user_id", data.user_id)
      .eq("role", data.role);
    if (error) throw error;
    return { ok: true };
  });
