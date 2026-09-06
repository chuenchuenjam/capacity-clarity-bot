# Make Winnie an admin

## What happens

Grant the account `winnie.chuen1@axaxl.com` (already signed up, currently a `viewer`) the `admin` role in addition to the existing viewer role.

Admin already includes everything asked for:
- Edit the navigation tree (create, rename, reorder, delete folders)
- Create, edit, and delete documents in any folder
- Manage attachments and document statuses
- Access the Admin page to manage other users' roles

## Technical details

- Run a small database migration inserting `('dff51213-f8fc-4738-8da4-dde5f8847263', 'admin')` into `public.user_roles` (with `ON CONFLICT DO NOTHING` so it's safe to re-run). The existing viewer row is left untouched.
- No code changes needed — the `can_edit` helper and all RLS policies already treat `admin` as full edit rights, and the Admin page gate checks `has_role(..., 'admin')`.
