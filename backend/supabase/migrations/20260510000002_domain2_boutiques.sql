-- ============================================================
-- Domain 2: Boutiques
-- boutiques, boutique_cover_photos, boutique_opening_hours,
-- boutique_services, boutique_promotions
-- ============================================================

-- ── boutiques ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.boutiques (
  id                uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_user_id     uuid        NOT NULL REFERENCES auth.users(id),
  name              text        NOT NULL,
  slug              text        NOT NULL UNIQUE,
  about             text,
  address           text,
  city              text,
  country           text        NOT NULL DEFAULT 'VN',
  latitude          numeric,
  longitude         numeric,
  phone             text,
  zalo              text        NOT NULL,
  email             text,
  website           text,
  facebook          text,
  instagram         text,
  tiktok            text,
  logo_path         text,
  specialty_tags    text[],
  credential_tags   text[],
  tier_label        text,
  is_top_rated      boolean     NOT NULL DEFAULT false,
  status            text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','suspended')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.boutiques ENABLE ROW LEVEL SECURITY;

CREATE POLICY "boutiques_select_public"
  ON public.boutiques FOR SELECT USING (true);

CREATE POLICY "boutiques_insert_owner"
  ON public.boutiques FOR INSERT WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "boutiques_update_owner"
  ON public.boutiques FOR UPDATE USING (auth.uid() = owner_user_id);

CREATE POLICY "boutiques_delete_owner"
  ON public.boutiques FOR DELETE USING (auth.uid() = owner_user_id);

-- ── boutique_cover_photos ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.boutique_cover_photos (
  id            uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  boutique_id   uuid        NOT NULL REFERENCES public.boutiques(id) ON DELETE CASCADE,
  path          text        NOT NULL,
  sort_order    int         NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.boutique_cover_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "boutique_cover_photos_select_public"
  ON public.boutique_cover_photos FOR SELECT USING (true);

CREATE POLICY "boutique_cover_photos_write_owner"
  ON public.boutique_cover_photos FOR ALL
  USING (EXISTS (SELECT 1 FROM public.boutiques b WHERE b.id = boutique_id AND b.owner_user_id = auth.uid()));

-- ── boutique_opening_hours ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.boutique_opening_hours (
  id            uuid    PRIMARY KEY DEFAULT uuid_generate_v4(),
  boutique_id   uuid    NOT NULL REFERENCES public.boutiques(id) ON DELETE CASCADE,
  day_of_week   int     NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun, 6=Sat
  open_time     time,
  close_time    time,
  is_closed     boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.boutique_opening_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "boutique_hours_select_public"
  ON public.boutique_opening_hours FOR SELECT USING (true);

CREATE POLICY "boutique_hours_write_owner"
  ON public.boutique_opening_hours FOR ALL
  USING (EXISTS (SELECT 1 FROM public.boutiques b WHERE b.id = boutique_id AND b.owner_user_id = auth.uid()));

-- ── boutique_services ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.boutique_services (
  id            uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  boutique_id   uuid        NOT NULL REFERENCES public.boutiques(id) ON DELETE CASCADE,
  name          text        NOT NULL,
  description   text,
  sort_order    int         NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.boutique_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "boutique_services_select_public"
  ON public.boutique_services FOR SELECT USING (true);

CREATE POLICY "boutique_services_write_owner"
  ON public.boutique_services FOR ALL
  USING (EXISTS (SELECT 1 FROM public.boutiques b WHERE b.id = boutique_id AND b.owner_user_id = auth.uid()));

-- ── boutique_promotions ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.boutique_promotions (
  id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  boutique_id     uuid        NOT NULL REFERENCES public.boutiques(id) ON DELETE CASCADE,
  title           text        NOT NULL,
  description     text,
  discount_type   text        CHECK (discount_type IN ('percent','fixed')),
  discount_value  numeric,
  starts_at       timestamptz,
  ends_at         timestamptz,
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.boutique_promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "boutique_promotions_select_public"
  ON public.boutique_promotions FOR SELECT USING (true);

CREATE POLICY "boutique_promotions_write_owner"
  ON public.boutique_promotions FOR ALL
  USING (EXISTS (SELECT 1 FROM public.boutiques b WHERE b.id = boutique_id AND b.owner_user_id = auth.uid()));

-- ── indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_boutiques_owner   ON public.boutiques(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_boutiques_city    ON public.boutiques(city);
CREATE INDEX IF NOT EXISTS idx_boutiques_status  ON public.boutiques(status);
