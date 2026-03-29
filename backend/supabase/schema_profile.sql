-- Profile tables for Bridee app
-- Run in Supabase SQL Editor

-- user_profiles: one row per user, keyed by auth user ID
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT,
  first_name TEXT,
  last_name TEXT,
  country TEXT NOT NULL DEFAULT 'VN',
  preferred_communication TEXT,
  city TEXT,
  age INTEGER,
  wedding_month INTEGER,
  wedding_year INTEGER,
  height_cm NUMERIC,
  weight_kg NUMERIC,
  body_shape TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- bridal_dna_responses: one row per user (upsert on user_id)
CREATE TABLE public.bridal_dna_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  energy_anchor TEXT,
  construction_priority TEXT,
  budget_range TEXT,
  silhouette TEXT[],
  detail_draw TEXT[],
  inspiration_source TEXT[],
  non_negotiables TEXT[],
  soul_weight TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE public.bridal_dna_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own DNA"
  ON public.bridal_dna_responses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own DNA"
  ON public.bridal_dna_responses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own DNA"
  ON public.bridal_dna_responses FOR UPDATE
  USING (auth.uid() = user_id);
