-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.boutique_dresses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  dress_id uuid NOT NULL,
  boutique_id uuid NOT NULL,
  sku text,
  price numeric,
  price_visible boolean NOT NULL DEFAULT true,
  available_sizes ARRAY,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT boutique_dresses_pkey PRIMARY KEY (id),
  CONSTRAINT boutique_dresses_dress_id_fkey FOREIGN KEY (dress_id) REFERENCES public.dresses(id),
  CONSTRAINT boutique_dresses_boutique_id_fkey FOREIGN KEY (boutique_id) REFERENCES public.boutiques(id)
);
CREATE TABLE public.boutiques (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  address text,
  city text,
  country text,
  phone text,
  email text,
  zalo text,
  website text,
  instagram text,
  facebook text,
  tiktok text,
  logo_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT boutiques_pkey PRIMARY KEY (id)
);
CREATE TABLE public.dress_photos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  dress_id uuid NOT NULL,
  path text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_tryon_eligible boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT dress_photos_pkey PRIMARY KEY (id),
  CONSTRAINT dress_photos_dress_id_fkey FOREIGN KEY (dress_id) REFERENCES public.dresses(id)
);
CREATE TABLE public.dresses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  long_description text,
  designer text,
  silhouette text,
  neckline text,
  sleeve text,
  back_style text,
  length text,
  train text,
  color_name text,
  color_code text,
  condition text,
  availability text,
  fabric ARRAY,
  details ARRAY,
  occasions ARRAY,
  style_tags ARRAY,
  consent_confirmed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT dresses_pkey PRIMARY KEY (id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['bride'::text, 'boutique'::text])),
  boutique_id uuid,
  full_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT profiles_boutique_id_fkey FOREIGN KEY (boutique_id) REFERENCES public.boutiques(id)
);
CREATE TABLE public.tryon_queue (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  dress_id uuid,
  dress_photo_path text NOT NULL,
  user_photo_path text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  result_path text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tryon_queue_pkey PRIMARY KEY (id),
  CONSTRAINT tryon_queue_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT tryon_queue_dress_id_fkey FOREIGN KEY (dress_id) REFERENCES public.dresses(id)
);
CREATE TABLE public.user_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  dress_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_likes_pkey PRIMARY KEY (id),
  CONSTRAINT user_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT user_likes_dress_id_fkey FOREIGN KEY (dress_id) REFERENCES public.dresses(id)
);