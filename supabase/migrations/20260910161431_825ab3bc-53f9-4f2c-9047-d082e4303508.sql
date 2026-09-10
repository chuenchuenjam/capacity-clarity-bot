CREATE TABLE public.demos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  video_path text,
  video_url text,
  product_url text,
  thumbnail_url text,
  tag text,
  position integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.demos TO authenticated;
GRANT ALL ON public.demos TO service_role;
ALTER TABLE public.demos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "demos readable" ON public.demos FOR SELECT TO authenticated USING (true);
CREATE POLICY "demos insert" ON public.demos FOR INSERT TO authenticated WITH CHECK (public.can_edit(auth.uid()));
CREATE POLICY "demos update" ON public.demos FOR UPDATE TO authenticated USING (public.can_edit(auth.uid())) WITH CHECK (public.can_edit(auth.uid()));
CREATE POLICY "demos delete" ON public.demos FOR DELETE TO authenticated USING (public.can_edit(auth.uid()));

CREATE TRIGGER demos_touch BEFORE UPDATE ON public.demos FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.embeds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'link',
  url text NOT NULL,
  title text,
  position integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.embeds TO authenticated;
GRANT ALL ON public.embeds TO service_role;
ALTER TABLE public.embeds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "embeds readable" ON public.embeds FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.documents d WHERE d.id = embeds.document_id AND public.can_access_folder(d.folder_id, auth.uid()))
);
CREATE POLICY "embeds insert" ON public.embeds FOR INSERT TO authenticated WITH CHECK (public.can_edit(auth.uid()));
CREATE POLICY "embeds update" ON public.embeds FOR UPDATE TO authenticated USING (public.can_edit(auth.uid())) WITH CHECK (public.can_edit(auth.uid()));
CREATE POLICY "embeds delete" ON public.embeds FOR DELETE TO authenticated USING (public.can_edit(auth.uid()));

CREATE TRIGGER embeds_touch BEFORE UPDATE ON public.embeds FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.decks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  source_question text NOT NULL DEFAULT '',
  slides jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.decks TO authenticated;
GRANT ALL ON public.decks TO service_role;
ALTER TABLE public.decks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "decks own" ON public.decks FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER decks_touch BEFORE UPDATE ON public.decks FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();