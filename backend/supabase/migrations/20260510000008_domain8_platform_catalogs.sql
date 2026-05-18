-- ============================================================
-- Domain 8: Platform Catalogs
-- style_tags, search_suggested_keywords
-- ============================================================

-- ── style_tags ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.style_tags (
  id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        text        NOT NULL,
  slug        text        NOT NULL UNIQUE,
  category    text,
  sort_order  int         NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.style_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "style_tags_select_public"
  ON public.style_tags FOR SELECT USING (true);

CREATE POLICY "style_tags_admin_all"
  ON public.style_tags FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

-- ── search_suggested_keywords ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.search_suggested_keywords (
  id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  keyword     text        NOT NULL,
  sort_order  int         NOT NULL DEFAULT 0,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.search_suggested_keywords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "search_keywords_select_public"
  ON public.search_suggested_keywords FOR SELECT USING (true);

CREATE POLICY "search_keywords_admin_all"
  ON public.search_suggested_keywords FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));
