# Knowledge Center for AI Teams

A team documentation hub with a nested project/doc sidebar, file attachments, role-based access, and an AI assistant leaders can ask about project status and content across the knowledge base.

## What gets built

### 1. Sign-in and roles
- Email/password sign-in with Lovable Cloud (accounts, sessions, sign-out).
- Roles: `admin`, `editor`, `viewer`, stored in a dedicated roles table (never on the profile).
- Access levels per folder: `public` (all signed-in users), `internal`, `restricted` (admins only) — matching the Internal/Restricted/Product badges in the reference screenshot.

### 2. Knowledge tree (left sidebar)
- Nested folders → sub-folders → documents, collapsible, with the active document highlighted.
- Badges on folders/docs (Internal, Restricted, Product, New).
- Search box that filters the tree and matches document titles and body text.
- Admins/editors can create, rename, move, and delete folders and documents.

### 3. Document pages
- Breadcrumb (e.g. Capability Knowledge / Data Intake) above the content.
- Rich text editing for pages written in-app, with autosave and last-updated/author info.
- File attachments (PPT, PDF, Word, images) uploaded to cloud storage, listed on the doc with download links.
- Status field per document (Draft / In Review / Published) so leaders can see progress at a glance.

### 4. AI assistant (chatbot)
- Floating/side chat panel available everywhere, plus a scoped "Ask about this project" mode from any folder.
- Answers from the knowledge base: retrieves relevant documents (and text extracted from attachments), then answers with citations linking back to the source docs.
- Handles leader questions like "what's the status of Data Intake?", "which docs are still drafts?", "find the PPT template for competitive intro".
- Respects the signed-in user's permissions — restricted content is never used in answers for users who can't see it.
- Single conversation per user, persisted in the database, streamed responses with markdown rendering.

### 5. Design direction
Dark navy sidebar with subtle gradient and accent-highlighted active row (as in the reference), light neutral content canvas, compact typography — defined as semantic design tokens, not hardcoded colors.

## Technical notes

- Backend: Lovable Cloud (Postgres + auth + storage). Tables: `profiles`, `user_roles`, `folders` (self-referencing parent), `documents`, `attachments`, `doc_chunks` (embeddings for search), `chat_messages`. RLS on every table with explicit grants; a `has_role()` security-definer function drives admin policies.
- Search: Postgres full-text for the sidebar filter; vector embeddings (Lovable AI embeddings) over document chunks for the chatbot retrieval.
- Attachment text extraction on upload so PPT/PDF content is answerable by the chatbot.
- Chat: TanStack Start server route streaming through the Lovable AI Gateway with AI SDK, retrieval done server-side under the caller's permissions.
- Routes: `/` (knowledge home), `/auth`, `/d/$docId` document page, `/admin` for user/role management.
- Seed data: a starter tree mirroring the reference (Capability Knowledge → Agentic Bot / Data Intake / Triage, Product Library, Common Resources) so the app is usable immediately.

## Not in this version
- Resource capacity tracking (agreed to skip).
- External integrations (Confluence/Notion/Drive sync).
