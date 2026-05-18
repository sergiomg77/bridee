-- ============================================================
-- Domain 7: Marketplace
-- marketplace_categories, vendors, vendor_listings,
-- vendor_listing_photos, vendor_packages, vendor_reviews,
-- user_saved_listings
-- NOTE: runs before Domain 6 because conversations references vendors
-- ============================================================

-- ── marketplace_categories ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.marketplace_categories (
  id            uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          text        NOT NULL,
  slug          text        NOT NULL UNIQUE,
  icon_name     text,
  sort_order    int         NOT NULL DEFAULT 0,
  is_active     boolean     NOT NULL DEFAULT true,
  filter_config jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.marketplace_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "marketplace_categories_select_public"
  ON public.marketplace_categories FOR SELECT USING (true);

CREATE POLICY "marketplace_categories_admin_all"
  ON public.marketplace_categories FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

-- ── Seed: marketplace categories ─────────────────────────────
INSERT INTO public.marketplace_categories (name, slug, sort_order) VALUES
  ('Dresses',                 'dresses',               1),
  ('Photography',             'photography',            2),
  ('Make up',                 'make-up',                3),
  ('Venue',                   'venue',                  4),
  ('Wedding Planner',         'wedding-planner',        5),
  ('Jewelry',                 'jewelry',                6),
  ('Invitation & Stationary', 'invitation-stationary',  7),
  ('Cakes & Catering',        'cakes-catering',         8),
  ('Florist',                 'florist',                9),
  ('Gifts',                   'gifts',                 10),
  ('Home & Living',           'home-living',           11),
  ('Honeymoon',               'honeymoon',             12),
  ('Others',                  'others',                13)
ON CONFLICT (slug) DO NOTHING;

-- ── vendors ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vendors (
  id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_user_id   uuid        NOT NULL REFERENCES auth.users(id),
  name            text        NOT NULL,
  slug            text        NOT NULL UNIQUE,
  description     text,
  city            text,
  country         text        NOT NULL DEFAULT 'VN',
  phone           text,
  zalo            text,
  email           text,
  website         text,
  instagram       text,
  facebook        text,
  tiktok          text,
  logo_path       text,
  specialty_tags  text[],
  status          text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','suspended')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendors_select_public"
  ON public.vendors FOR SELECT USING (true);

CREATE POLICY "vendors_insert_owner"
  ON public.vendors FOR INSERT WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "vendors_update_owner"
  ON public.vendors FOR UPDATE USING (auth.uid() = owner_user_id);

CREATE POLICY "vendors_delete_owner"
  ON public.vendors FOR DELETE USING (auth.uid() = owner_user_id);

-- ── vendor_listings ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vendor_listings (
  id            uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id     uuid        NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  category_id   uuid        NOT NULL REFERENCES public.marketplace_categories(id),
  title         text        NOT NULL,
  description   text,
  city          text,
  attributes    jsonb,
  is_active     boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vendor_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendor_listings_select_public"
  ON public.vendor_listings FOR SELECT USING (true);

CREATE POLICY "vendor_listings_write_owner"
  ON public.vendor_listings FOR ALL
  USING (EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.owner_user_id = auth.uid()));

-- ── vendor_listing_photos ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vendor_listing_photos (
  id            uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id    uuid        NOT NULL REFERENCES public.vendor_listings(id) ON DELETE CASCADE,
  path          text        NOT NULL,
  sort_order    int         NOT NULL DEFAULT 0,
  is_cover      boolean     NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vendor_listing_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendor_listing_photos_select_public"
  ON public.vendor_listing_photos FOR SELECT USING (true);

CREATE POLICY "vendor_listing_photos_write_owner"
  ON public.vendor_listing_photos FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.vendor_listings vl
    JOIN public.vendors v ON v.id = vl.vendor_id
    WHERE vl.id = listing_id AND v.owner_user_id = auth.uid()
  ));

-- ── vendor_packages ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vendor_packages (
  id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id      uuid        NOT NULL REFERENCES public.vendor_listings(id) ON DELETE CASCADE,
  name            text        NOT NULL,
  description     text,
  pricing_model   text        NOT NULL CHECK (pricing_model IN ('fixed','per_hour','quote')),
  price           numeric,
  price_currency  text        NOT NULL DEFAULT 'VND',
  sort_order      int         NOT NULL DEFAULT 0,
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vendor_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendor_packages_select_public"
  ON public.vendor_packages FOR SELECT USING (true);

CREATE POLICY "vendor_packages_write_owner"
  ON public.vendor_packages FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.vendor_listings vl
    JOIN public.vendors v ON v.id = vl.vendor_id
    WHERE vl.id = listing_id AND v.owner_user_id = auth.uid()
  ));

-- ── vendor_reviews ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vendor_reviews (
  id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vendor_id   uuid        NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  listing_id  uuid        REFERENCES public.vendor_listings(id) ON DELETE SET NULL,
  rating      int         NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body        text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vendor_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendor_reviews_select_public"
  ON public.vendor_reviews FOR SELECT USING (true);

CREATE POLICY "vendor_reviews_insert_authenticated"
  ON public.vendor_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "vendor_reviews_update_own"
  ON public.vendor_reviews FOR UPDATE USING (auth.uid() = user_id);

-- ── user_saved_listings ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_saved_listings (
  id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id  uuid        NOT NULL REFERENCES public.vendor_listings(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, listing_id)
);

ALTER TABLE public.user_saved_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_saved_listings_own"
  ON public.user_saved_listings FOR ALL USING (auth.uid() = user_id);

-- ── indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_vendors_owner          ON public.vendors(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_vendor_listings_vendor ON public.vendor_listings(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_listings_cat    ON public.vendor_listings(category_id);
CREATE INDEX IF NOT EXISTS idx_vendor_reviews_vendor  ON public.vendor_reviews(vendor_id);
CREATE INDEX IF NOT EXISTS idx_user_saved_listings_user ON public.user_saved_listings(user_id);
