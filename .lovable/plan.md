# Demos homepage, rich media, page moving, and a deck-building assistant

Four additions to the Knowledge Center.

## 1. Demo homepage (replaces the current welcome page)

The landing page becomes a tile gallery of product demo videos.

- Each tile: thumbnail/video preview, product name, short description, optional product link, optional tag.
- Admins/editors get an "Add demo" button; each tile has edit and delete.
- A demo can be either an uploaded video file or a pasted link (YouTube, Vimeo, SharePoint, Loom). Uploaded files go to a new public `demos` storage bucket; links are embedded.
- Tile order is drag-and-drop for editors and saved, so the arrangement sticks for everyone.
- Clicking a tile opens the video full-size with its description and a "Open product" button when a link is set.
- Viewers see the gallery read-only.

## 2. Multimedia display inside pages

Pages render media instead of only listing files to download.

- Uploaded attachments preview inline based on type: video and audio players, images, PDF viewer, Excel/CSV shown as a scrollable table, plain text/markdown rendered. Anything else keeps the download row.
- A new "Add embed" action on a page accepts a link and renders it inline: Miro, Figma, YouTube/Vimeo, Google Docs/Sheets/Slides, Loom, Power BI. Unknown links render as a titled link card.
- Embeds are listed alongside attachments, reorderable and removable by editors.

## 3. Move pages between sections

- Each page gets a "Move" action (editors/admins) that opens a section picker and relocates it.
- Sections can also be moved under another section or to the top level, with a guard against moving a section into itself or its own child.
- Drag-and-drop in the sidebar tree as the quick path, with the Move dialog as the reliable fallback.
- The tree refreshes immediately after a move.

## 4. A more visible assistant that can build decks

- The assistant moves from a hidden side sheet to a persistent, clearly labelled panel: a prominent "Ask Assistant" bar on the homepage and a docked, resizable panel that can be opened from anywhere and stays open while browsing.
- Clearer chat UI: suggested prompts, visible source citations under each answer, copy button, and a "Build a deck from this" button on every answer.
- Deck building: the assistant turns the question plus the cited documents into a structured deck (title slide, agenda, one slide per key point with bullets, closing slide).
- The deck opens in an in-app slide viewer with next/previous and a grid overview, and can be downloaded as a PowerPoint file.
- A generated deck can be saved back into the knowledge tree as a page so the team can find it later.

## Technical notes

- New tables: `demos` (title, description, video_path or video_url, product_url, thumbnail, position, tags), `embeds` (document_id, provider, url, title, position), `decks` (title, source_question, slides JSONB, created_by). All with grants + RLS: read for authenticated, write for admin/editor via the existing `can_edit`/`has_role` helpers. `documents.position` and `folders.parent_id` already exist and back the move feature.
- New public storage bucket `demos` for uploaded videos (size cap, video mime types only), read policy public, write policy editors.
- Preview components are type-routed by mime: `xlsx`/`csv` parsed client-side with SheetJS, PDF via an object/iframe viewer, video/audio native players.
- Embed URLs are normalised to their provider embed form and rendered in a sandboxed iframe; provider allowlist to avoid arbitrary iframes.
- Move/reorder use new admin-gated server functions in `knowledge.functions.ts` (`moveDocument`, `moveFolder`, `reorderDocuments`, `reorderDemos`); drag-and-drop with dnd-kit.
- Deck generation: a streaming server route calls the AI gateway with the same document context the chat route builds, returning a strict JSON slide structure; the in-app viewer renders it at a fixed 1920x1080 scaled canvas, and PowerPoint export runs client-side with pptxgenjs.
- The assistant keeps the existing document-permission scoping, so a deck only ever contains content the asker can see.

## Scope

Built in the order above. Capacity tracking stays out, as before.
