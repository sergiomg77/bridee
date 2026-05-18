-- ============================================================
-- Domain 3: Dresses
-- dresses, dress_photos, boutique_dresses,
-- boutique_packages, boutique_package_dresses
-- ============================================================

-- ── dresses ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dresses (
  id                    uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  title                 text        NOT NULL,
  subtitle              text,
  long_description      text,
  designer              text,
  silhouette            text,
  neckline              text,
  sleeve                text,
  back_style            text,
  length                text,
  train                 text,
  color_name            text,
  color_code            text,
  fabric                text[],
  details               text[],
  style_tags            text[],
  event_types           text[],
  condition             text,
  availability          text,
  additional_services   text[],
  consent_confirmed     boolean     NOT NULL DEFAULT false,
  is_deleted            boolean     NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dresses_select_public"
  ON public.dresses FOR SELECT USING (true);

CREATE POLICY "dresses_write_authenticated"
  ON public.dresses FOR ALL USING (auth.role() = 'authenticated');

-- ── dress_photos ─────────────────────────────────────────────
-- sort_order = 0 is the cover photo
-- is_tryon_eligible = true means photo is safe for AI try-on
CREATE TABLE IF NOT EXISTS public.dress_photos (
  id                  uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  dress_id            uuid        NOT NULL REFERENCES public.dresses(id) ON DELETE CASCADE,
  path                text        NOT NULL,
  sort_order          int         NOT NULL DEFAULT 0,
  is_tryon_eligible   boolean     NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dress_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dress_photos_select_public"
  ON public.dress_photos FOR SELECT USING (true);

CREATE POLICY "dress_photos_write_authenticated"
  ON public.dress_photos FOR ALL USING (auth.role() = 'authenticated');

-- ── boutique_dresses ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.boutique_dresses (
  id                    uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  dress_id              uuid        NOT NULL REFERENCES public.dresses(id) ON DELETE CASCADE,
  boutique_id           uuid        NOT NULL REFERENCES public.boutiques(id) ON DELETE CASCADE,
  sku                   text,
  price_sale            numeric,
  price_original        numeric,
  price_rental          numeric,
  price_rental_original numeric,
  price_range_min       numeric,
  price_range_max       numeric,
  price_currency        text        NOT NULL DEFAULT 'VND',
  price_visible         boolean     NOT NULL DEFAULT true,
  deal_price            numeric,
  deal_percent          int,
  deal_active           boolean     NOT NULL DEFAULT false,
  available_sizes       text[],
  is_active             boolean     NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dress_id, boutique_id)
);

ALTER TABLE public.boutique_dresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "boutique_dresses_select_public"
  ON public.boutique_dresses FOR SELECT USING (true);

CREATE POLICY "boutique_dresses_write_owner"
  ON public.boutique_dresses FOR ALL
  USING (EXISTS (SELECT 1 FROM public.boutiques b WHERE b.id = boutique_id AND b.owner_user_id = auth.uid()));

-- ── boutique_packages ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.boutique_packages (
  id            uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  boutique_id   uuid        NOT NULL REFERENCES public.boutiques(id) ON DELETE CASCADE,
  name          text        NOT NULL,
  description   text,
  price         numeric,
  currency      text        NOT NULL DEFAULT 'VND',
  includes      text[],
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.boutique_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "boutique_packages_select_public"
  ON public.boutique_packages FOR SELECT USING (true);

CREATE POLICY "boutique_packages_write_owner"
  ON public.boutique_packages FOR ALL
  USING (EXISTS (SELECT 1 FROM public.boutiques b WHERE b.id = boutique_id AND b.owner_user_id = auth.uid()));

-- ── boutique_package_dresses ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.boutique_package_dresses (
  id                  uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  package_id          uuid        NOT NULL REFERENCES public.boutique_packages(id) ON DELETE CASCADE,
  boutique_dress_id   uuid        NOT NULL REFERENCES public.boutique_dresses(id) ON DELETE CASCADE,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (package_id, boutique_dress_id)
);

ALTER TABLE public.boutique_package_dresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "boutique_package_dresses_select_public"
  ON public.boutique_package_dresses FOR SELECT USING (true);

CREATE POLICY "boutique_package_dresses_write_owner"
  ON public.boutique_package_dresses FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.boutique_packages bp
    JOIN public.boutiques b ON b.id = bp.boutique_id
    WHERE bp.id = package_id AND b.owner_user_id = auth.uid()
  ));

-- ── indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_dress_photos_dress       ON public.dress_photos(dress_id);
CREATE INDEX IF NOT EXISTS idx_boutique_dresses_dress   ON public.boutique_dresses(dress_id);
CREATE INDEX IF NOT EXISTS idx_boutique_dresses_boutique ON public.boutique_dresses(boutique_id);
CREATE INDEX IF NOT EXISTS idx_boutique_dresses_active  ON public.boutique_dresses(is_active);
