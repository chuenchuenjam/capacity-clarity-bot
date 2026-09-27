CREATE TABLE public.roadmap_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  color text NOT NULL DEFAULT 'blue',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.roadmap_statuses TO authenticated;
GRANT ALL ON public.roadmap_statuses TO service_role;

ALTER TABLE public.roadmap_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "roadmap statuses readable" ON public.roadmap_statuses
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "roadmap statuses insert" ON public.roadmap_statuses
  FOR INSERT TO authenticated WITH CHECK (public.can_edit(auth.uid()));
CREATE POLICY "roadmap statuses update" ON public.roadmap_statuses
  FOR UPDATE TO authenticated USING (public.can_edit(auth.uid())) WITH CHECK (public.can_edit(auth.uid()));
CREATE POLICY "roadmap statuses delete" ON public.roadmap_statuses
  FOR DELETE TO authenticated USING (public.can_edit(auth.uid()));

CREATE TRIGGER roadmap_statuses_touch BEFORE UPDATE ON public.roadmap_statuses
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.roadmap_initiatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  stream text NOT NULL DEFAULT 'Data Intake',
  documents_data text NOT NULL DEFAULT '',
  region_product text NOT NULL DEFAULT '',
  downstream_use text NOT NULL DEFAULT '',
  stage_note text NOT NULL DEFAULT '',
  status_id uuid REFERENCES public.roadmap_statuses(id) ON DELETE SET NULL,
  start_period text NOT NULL DEFAULT '',
  end_period text NOT NULL DEFAULT '',
  folder_id uuid REFERENCES public.folders(id) ON DELETE SET NULL,
  document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  position integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.roadmap_initiatives TO authenticated;
GRANT ALL ON public.roadmap_initiatives TO service_role;

ALTER TABLE public.roadmap_initiatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "roadmap initiatives readable" ON public.roadmap_initiatives
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "roadmap initiatives insert" ON public.roadmap_initiatives
  FOR INSERT TO authenticated WITH CHECK (public.can_edit(auth.uid()));
CREATE POLICY "roadmap initiatives update" ON public.roadmap_initiatives
  FOR UPDATE TO authenticated USING (public.can_edit(auth.uid())) WITH CHECK (public.can_edit(auth.uid()));
CREATE POLICY "roadmap initiatives delete" ON public.roadmap_initiatives
  FOR DELETE TO authenticated USING (public.can_edit(auth.uid()));

CREATE TRIGGER roadmap_initiatives_touch BEFORE UPDATE ON public.roadmap_initiatives
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.roadmap_statuses (id, label, color, position) VALUES
  ('22222222-2222-4222-8222-000000000001', 'Operational / Scaling', 'emerald', 0),
  ('22222222-2222-4222-8222-000000000002', 'WIP', 'cyan', 1),
  ('22222222-2222-4222-8222-000000000003', 'Starting', 'blue', 2);

INSERT INTO public.roadmap_initiatives
  (title, stream, documents_data, region_product, downstream_use, stage_note, status_id, start_period, end_period, folder_id, position)
VALUES
  ('Submission Triage', 'Underwriting',
   'Submission emails & docs; Business appetites; Risk assessments',
   'Cyber — global; Americas Wholesale: Casualty / Property / Energy',
   'Submission data ingestion, classification, extraction, cleansing; prioritise and triage for UW',
   'Professional 360 to be delivered in Nov',
   '22222222-2222-4222-8222-000000000001', '2026-Q1', '2026-Q4',
   '11111111-1111-4111-8111-000000000003', 0),
  ('Enterprise Data Intake — FNOL / SOV', 'Claims',
   'Synthetic SOV files; Real FNOL cases',
   'Claims & CAT Modeling',
   'POC on vendor solution to evaluate extraction accuracy and cycle time',
   'FNOL data approved by DPO',
   '22222222-2222-4222-8222-000000000002', '2026-Q3', '2027-Q1',
   '11111111-1111-4111-8111-000000000003', 1),
  ('Oxygen — BDX Intake', 'Delegated Authorities',
   'Delegated Authorities BDX; MNS Claims Network BDX',
   'EU BDX',
   'BDX ingestion, standardisation and AI & HITL validation; auditable and reconcilable outputs',
   'Scope to be finalised',
   '22222222-2222-4222-8222-000000000003', '2026-Q4', '2027-Q2',
   '11111111-1111-4111-8111-000000000003', 2),
  ('NextGen UW — EU & UK&L', 'Underwriting',
   'Submission documents; PQP & CAT Modeling',
   'APAC & EU; UK & Lloyd''s',
   'Shared data intake capability for NextGen UW workflows',
   'Scope to be finalised',
   '22222222-2222-4222-8222-000000000003', '2026-Q4', '2027-Q2',
   '11111111-1111-4111-8111-000000000003', 3),
  ('Loss Runs Intake', 'Claims',
   'Carrier loss runs; AXA XL product mapping',
   'Americas',
   'Loss Runs data extraction & standardisation; integrated with Guidewire',
   'Expansion in AA backlog',
   '22222222-2222-4222-8222-000000000001', '2026-Q1', '2027-Q1',
   '11111111-1111-4111-8111-000000000003', 4),
  ('Subrogation', 'Claims',
   'Claims email & docs',
   'Claims; Auto',
   'Claims doc ingestion, classification and standardisation for subrogation opportunity identification',
   'WIP with vendor partner to define data elements needed',
   '22222222-2222-4222-8222-000000000003', '2027-Q1', '2027-Q3',
   '11111111-1111-4111-8111-000000000003', 5);