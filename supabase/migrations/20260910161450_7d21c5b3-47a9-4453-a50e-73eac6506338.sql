CREATE POLICY "demos read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'demos');
CREATE POLICY "demos write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'demos' AND public.can_edit(auth.uid()));
CREATE POLICY "demos modify" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'demos' AND public.can_edit(auth.uid())) WITH CHECK (bucket_id = 'demos' AND public.can_edit(auth.uid()));
CREATE POLICY "demos remove" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'demos' AND public.can_edit(auth.uid()));