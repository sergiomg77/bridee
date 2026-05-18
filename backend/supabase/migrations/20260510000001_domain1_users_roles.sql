-- ============================================================
-- Domain 1: Users & Roles
-- profiles, user_roles, promo_codes, user_promo_redemptions
-- bridal_dna_responses
-- Designed for a fresh Supabase project (v3 schema)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── profiles ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id                  uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name           text,
  avatar_path         text,
  phone               text,
  language            text        NOT NULL DEFAULT 'vi',
  currency            text        NOT NULL DEFAULT 'VND',
  city                text,
  budget_min          numeric,
  budget_max          numeric,
  style_preferences   text[],
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own"  ON public.profiles FOR SELECT  USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own"  ON public.profiles FOR INSERT  WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own"  ON public.profiles FOR UPDATE  USING (auth.uid() = id);

-- ── user_roles ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_roles (
  id          uuid  PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     uuid  NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        text  NOT NULL CHECK (role IN ('bride','boutique','vendor','admin')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_roles_select_own"
  ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_roles_admin_all"
  ON public.user_roles FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

-- ── promo_codes ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  code            text        NOT NULL UNIQUE,
  discount_type   text        NOT NULL CHECK (discount_type IN ('percent','fixed')),
  discount_value  numeric     NOT NULL,
  max_uses        int,
  used_count      int         NOT NULL DEFAULT 0,
  expires_at      timestamptz,
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "promo_codes_select_authenticated"
  ON public.promo_codes FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "promo_codes_admin_all"
  ON public.promo_codes FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

-- ── user_promo_redemptions ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_promo_redemptions (
  id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  promo_code_id   uuid        NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  redeemed_at     timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, promo_code_id)
);

ALTER TABLE public.user_promo_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_promo_redemptions_own"
  ON public.user_promo_redemptions FOR ALL USING (auth.uid() = user_id);

-- ── bridal_dna_responses ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bridal_dna_responses (
  id                      uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                 uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  energy_anchor           text,
  construction_priority   text,
  budget_range            text,
  silhouette              text[],
  detail_draw             text[],
  inspiration_source      text[],
  non_negotiables         text[],
  soul_weight             text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.bridal_dna_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bridal_dna_select_own"  ON public.bridal_dna_responses FOR SELECT  USING (auth.uid() = user_id);
CREATE POLICY "bridal_dna_insert_own"  ON public.bridal_dna_responses FOR INSERT  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bridal_dna_update_own"  ON public.bridal_dna_responses FOR UPDATE  USING (auth.uid() = user_id);

-- ── indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_promo_redemptions_user ON public.user_promo_redemptions(user_id);
