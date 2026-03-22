-- =============================================================================
-- Bridee — Full Database Schema
-- Run this to drop and recreate all tables from scratch.
-- No existing data is preserved.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- DROP (reverse foreign-key order)
-- -----------------------------------------------------------------------------
drop table if exists user_likes       cascade;
drop table if exists dress_photos     cascade;
drop table if exists boutique_dresses cascade;
drop table if exists dresses          cascade;
drop table if exists profiles         cascade;
drop table if exists boutiques        cascade;


-- -----------------------------------------------------------------------------
-- 1. boutiques
--    One row per partner boutique. Referenced by profiles and boutique_dresses.
-- -----------------------------------------------------------------------------
create table boutiques (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  description text,
  address     text,
  city        text,
  country     text,
  phone       text,
  email       text,
  zalo        text,
  website     text,
  instagram   text,
  facebook    text,
  tiktok      text,
  logo_url    text,
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now()
);


-- -----------------------------------------------------------------------------
-- 2. dresses
--    Core dress catalogue. Photos and boutique availability are in child tables.
-- -----------------------------------------------------------------------------
create table dresses (
  id                   uuid        primary key default gen_random_uuid(),
  title                text        not null,
  subtitle             text,
  long_description     text,
  designer             text,
  silhouette           text,
  neckline             text,
  sleeve               text,
  back_style           text,
  length               text,
  train                text,
  color_name           text,
  color_code           text,
  condition            text,
  availability         text,
  fabric               text[],
  details              text[],
  occasions            text[],
  style_tags           text[],
  consent_confirmed    boolean     not null default false,
  created_at           timestamptz not null default now()
);


-- -----------------------------------------------------------------------------
-- 3. dress_photos
--    One row per photo. path is the Supabase Storage object path inside the
--    dress-photos bucket. sort_order controls display order.
-- -----------------------------------------------------------------------------
create table dress_photos (
  id               uuid        primary key default gen_random_uuid(),
  dress_id         uuid        not null references dresses(id) on delete cascade,
  path             text        not null,
  sort_order       int         not null default 0,
  is_tryon_eligible boolean    not null default false,
  created_at       timestamptz not null default now()
);


-- -----------------------------------------------------------------------------
-- 4. boutique_dresses
--    Junction between a dress and the boutiques that stock it.
--    A dress can be stocked by many boutiques, each with its own price/sizes.
-- -----------------------------------------------------------------------------
create table boutique_dresses (
  id               uuid        primary key default gen_random_uuid(),
  dress_id         uuid        not null references dresses(id)    on delete cascade,
  boutique_id      uuid        not null references boutiques(id)  on delete cascade,
  sku              text,
  price            numeric,
  price_visible    boolean     not null default true,
  available_sizes  text[],
  is_active        boolean     not null default true,
  created_at       timestamptz not null default now(),
  unique (dress_id, boutique_id)
);


-- -----------------------------------------------------------------------------
-- 5. profiles
--    Extends auth.users. role is either 'bride' or 'boutique'.
--    Boutique users have a non-null boutique_id.
-- -----------------------------------------------------------------------------
create table profiles (
  id          uuid        primary key references auth.users(id) on delete cascade,
  role        text        not null check (role in ('bride', 'boutique')),
  boutique_id uuid        references boutiques(id),
  full_name   text,
  created_at  timestamptz not null default now()
);


-- -----------------------------------------------------------------------------
-- 6. user_likes
--    Records which dresses a bride has swiped right on.
--    Unique constraint prevents duplicate likes.
-- -----------------------------------------------------------------------------
create table user_likes (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  dress_id   uuid        not null references dresses(id)   on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, dress_id)
);


-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on all tables
alter table boutiques        enable row level security;
alter table dresses          enable row level security;
alter table dress_photos     enable row level security;
alter table boutique_dresses enable row level security;
alter table profiles         enable row level security;
alter table user_likes       enable row level security;


-- -----------------------------------------------------------------------------
-- boutiques — public read
-- -----------------------------------------------------------------------------
create policy "boutiques: public read"
  on boutiques for select
  using (true);


-- -----------------------------------------------------------------------------
-- dresses — public read
-- -----------------------------------------------------------------------------
create policy "dresses: public read"
  on dresses for select
  using (true);

-- Boutique users can insert dresses
create policy "dresses: boutique insert"
  on dresses for insert
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid()
        and role = 'boutique'
    )
  );

-- Boutique users can update dresses linked to their boutique
create policy "dresses: boutique update"
  on dresses for update
  using (
    id in (
      select dress_id from boutique_dresses
      where boutique_id = (select boutique_id from profiles where id = auth.uid())
    )
  );

-- Boutique users can delete dresses linked to their boutique
create policy "dresses: boutique delete"
  on dresses for delete
  using (
    id in (
      select dress_id from boutique_dresses
      where boutique_id = (select boutique_id from profiles where id = auth.uid())
    )
  );


-- -----------------------------------------------------------------------------
-- dress_photos — public read; boutique users manage their own dress photos
-- -----------------------------------------------------------------------------
create policy "dress_photos: public read"
  on dress_photos for select
  using (true);

create policy "dress_photos: boutique insert"
  on dress_photos for insert
  with check (
    dress_id in (
      select dress_id from boutique_dresses
      where boutique_id = (select boutique_id from profiles where id = auth.uid())
    )
  );

create policy "dress_photos: boutique update"
  on dress_photos for update
  using (
    dress_id in (
      select dress_id from boutique_dresses
      where boutique_id = (select boutique_id from profiles where id = auth.uid())
    )
  );

create policy "dress_photos: boutique delete"
  on dress_photos for delete
  using (
    dress_id in (
      select dress_id from boutique_dresses
      where boutique_id = (select boutique_id from profiles where id = auth.uid())
    )
  );


-- -----------------------------------------------------------------------------
-- boutique_dresses — public read; boutique users manage their own rows
-- -----------------------------------------------------------------------------
create policy "boutique_dresses: public read"
  on boutique_dresses for select
  using (true);

create policy "boutique_dresses: boutique insert"
  on boutique_dresses for insert
  with check (
    boutique_id = (select boutique_id from profiles where id = auth.uid())
  );

create policy "boutique_dresses: boutique update"
  on boutique_dresses for update
  using (
    boutique_id = (select boutique_id from profiles where id = auth.uid())
  );

create policy "boutique_dresses: boutique delete"
  on boutique_dresses for delete
  using (
    boutique_id = (select boutique_id from profiles where id = auth.uid())
  );


-- -----------------------------------------------------------------------------
-- profiles — users can read and update their own row only
-- -----------------------------------------------------------------------------
create policy "profiles: own row read"
  on profiles for select
  using (auth.uid() = id);

create policy "profiles: own row update"
  on profiles for update
  using (auth.uid() = id);


-- -----------------------------------------------------------------------------
-- user_likes — users can select, insert, and delete their own likes only
-- -----------------------------------------------------------------------------
create policy "user_likes: own rows read"
  on user_likes for select
  using (auth.uid() = user_id);

create policy "user_likes: own rows insert"
  on user_likes for insert
  with check (auth.uid() = user_id);

create policy "user_likes: own rows delete"
  on user_likes for delete
  using (auth.uid() = user_id);


-- =============================================================================
-- STORAGE BUCKETS
-- These cannot be created via SQL — create them manually in the Supabase
-- dashboard under Storage > New bucket:
--
--   dress-photos   → Public bucket  (serves dress catalogue images)
--   tryon-photos   → Private bucket (stores user virtual try-on uploads)
--
-- For dress-photos, set the bucket to public so image URLs work without a
-- signed URL. For tryon-photos, keep it private and use signed URLs.
-- =============================================================================
