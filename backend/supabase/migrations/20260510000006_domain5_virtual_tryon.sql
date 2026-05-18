-- ============================================================
-- Domain 5: Virtual Try-On
-- user_reference_photos, tryon_queue
-- ============================================================

-- ── user_reference_photos ────────────────────────────────────
-- Private bucket — paths only, no public URLs
-- max one photo per type per user enforced by unique constraint
CREATE TABLE IF NOT EXISTS public.user_reference_photos (
  id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_type  text        NOT NULL, -- e.g. 'full_body', 'face'
  path        text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, photo_type)
);

ALTER TABLE public.user_reference_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_reference_photos_own"
  ON public.user_reference_photos FOR ALL USING (auth.uid() = user_id);

-- ── tryon_queue ──────────────────────────────────────────────
-- Backend worker uses service role — no RLS write policy needed for it
CREATE TABLE IF NOT EXISTS public.tryon_queue (
  id                  uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  boutique_dress_id   uuid        NOT NULL REFERENCES public.boutique_dresses(id),
  reference_photo_id  uuid        NOT NULL REFERENCES public.user_reference_photos(id),
  dress_photo_id      uuid        NOT NULL REFERENCES public.dress_photos(id),
  status              text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  result_path         text,
  error_message       text,
  seen_at             timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tryon_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tryon_queue_select_own"
  ON public.tryon_queue FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "tryon_queue_insert_own"
  ON public.tryon_queue FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tryon_queue_update_own"
  ON public.tryon_queue FOR UPDATE USING (auth.uid() = user_id);

-- ── indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tryon_queue_user    ON public.tryon_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_tryon_queue_status  ON public.tryon_queue(status);
CREATE INDEX IF NOT EXISTS idx_tryon_queue_pending ON public.tryon_queue(created_at) WHERE status = 'pending';
