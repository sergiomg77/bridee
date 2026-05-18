-- ============================================================
-- Domain 4: Discovery & Swipe
-- user_swipes, user_saved_boutiques, boutique_reviews
-- ============================================================

-- ── user_swipes ──────────────────────────────────────────────
-- Replaces user_likes + user_skips with a unified direction field
CREATE TABLE IF NOT EXISTS public.user_swipes (
  id                  uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  boutique_dress_id   uuid        NOT NULL REFERENCES public.boutique_dresses(id) ON DELETE CASCADE,
  direction           text        NOT NULL CHECK (direction IN ('like','skip')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, boutique_dress_id)
);

ALTER TABLE public.user_swipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_swipes_own"
  ON public.user_swipes FOR ALL USING (auth.uid() = user_id);

-- ── user_saved_boutiques ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_saved_boutiques (
  id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  boutique_id uuid        NOT NULL REFERENCES public.boutiques(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, boutique_id)
);

ALTER TABLE public.user_saved_boutiques ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_saved_boutiques_own"
  ON public.user_saved_boutiques FOR ALL USING (auth.uid() = user_id);

-- ── boutique_reviews ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.boutique_reviews (
  id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  boutique_id uuid        NOT NULL REFERENCES public.boutiques(id) ON DELETE CASCADE,
  rating      int         NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body        text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.boutique_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "boutique_reviews_select_public"
  ON public.boutique_reviews FOR SELECT USING (true);

CREATE POLICY "boutique_reviews_insert_authenticated"
  ON public.boutique_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "boutique_reviews_update_own"
  ON public.boutique_reviews FOR UPDATE USING (auth.uid() = user_id);

-- ── indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_swipes_user        ON public.user_swipes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_swipes_direction   ON public.user_swipes(direction);
CREATE INDEX IF NOT EXISTS idx_user_saved_boutiques_user ON public.user_saved_boutiques(user_id);
CREATE INDEX IF NOT EXISTS idx_boutique_reviews_boutique ON public.boutique_reviews(boutique_id);
