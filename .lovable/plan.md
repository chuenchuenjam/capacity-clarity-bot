# Editable labels, role management, and a standard page structure

## 1. Editable labels

Sections (folders) and pages both carry two labels today: an access level (Public / Internal / Restricted) and a free-text badge such as "New". Neither can be changed after creation.

- On a page: an "Edit labels" control in the page header lets editors and admins set the badge text (or clear it) and change the status chip as today.
- On a section: a settings option on each section row in the navigation tree lets editors and admins rename the section, change its access level, and set or clear its badge.
- Access level and badge are also offered when creating a new section, instead of always defaulting to Internal.
- Restricted still means admin-only visibility, as it does now — changing a section to Restricted immediately hides it and everything beneath it from non-admins.

## 2. Granting roles

The Admin page already lists every user and lets an admin add or remove admin / editor / viewer. Winnie already holds the admin role, so she can use it today. Improvements:

- Add a clear link to Admin from the main navigation for admins (already present) and a short explainer of what each role can do.
- Changing a role now replaces the person's existing role instead of stacking a second one, so a user shows a single, unambiguous role.
- Guard rails: an admin cannot remove their own admin role, and the last remaining admin cannot be demoted.

## 3. Golden structure for pages

Every page gets the same standard skeleton:

```text
Overview
Objectives
Status
Resources & Capacity
Key Links
Owners
Next Steps
```

- New pages are created pre-filled with this structure, so authors just fill the blanks.
- Existing pages are updated once so the structure is embedded in them: their current content is kept under Overview and the missing headings are appended beneath, untouched otherwise.
- An "Insert template" action in the editor re-adds any missing sections to a page on demand.

## Technical details

- New server functions in `src/lib/knowledge.functions.ts`: `updateFolder` (name, access_level, badge) and extend `updateDocument` with `badge`. Both keep the existing `requireSupabaseAuth` middleware; RLS `can_edit` / `can_access_folder` policies already cover these writes, so no migration is needed for labels.
- `setUserRole` becomes a replace operation (delete the user's other roles, insert the chosen one) with a check that at least one admin remains; `deleteUserRole` gains the same last-admin guard.
- Template lives in a new `src/lib/page-template.ts` exporting the heading list, `defaultPageContent()`, and `mergeTemplate(content)` that appends only missing headings. `AddNodeDialog` uses `defaultPageContent()`; the document editor exposes `mergeTemplate` via an "Insert template" button.
- Backfill of existing documents is a one-time data update over `public.documents` applying the same merge rule, run with a data statement (not a schema migration).
- New `FolderSettingsDialog` component under `src/components/knowledge/`, opened from the section row menu in `KnowledgeTree.tsx`; label chips in the tree read from `folders.badge` / `access_level` as they do now.
