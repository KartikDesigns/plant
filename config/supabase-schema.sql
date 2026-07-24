-- ====================================================================
-- SUPABASE SQL SCHEMA — Ankuram Plant Nursery
-- ====================================================================
-- Run this entire file in the Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql/new)
-- or paste sections as needed. The schema is designed for the Ankuram
-- (formerly Leaf & Living) plant nursery e-commerce platform.
--
-- ⚠️ IMPORTANT:
-- 1. Make sure you have enabled the "reviews" table first if it already exists
-- 2. Auth is handled by Supabase Auth (built-in) — this schema creates
--    a public.profiles table that syncs with auth.users automatically
-- ====================================================================

-- ====================================================================
-- EXTENSIONS (enable if not already enabled)
-- ====================================================================
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ====================================================================
-- 1. PROFILES — extends Supabase Auth users
-- ====================================================================
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  name          text not null default '',
  given_name    text not null default '',
  email         text not null default '',
  avatar_url    text,
  location      text default '',
  phone         text default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, given_name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', new.email),
    coalesce(new.raw_user_meta_data ->> 'given_name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

-- Trigger: when a new auth user is created, auto-create profile
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Auto-update profile on email change
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles
  set email = new.email, updated_at = now()
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_change on auth.users;
create trigger on_auth_user_email_change
  after update of email on auth.users
  for each row execute function public.handle_user_email_change();

-- ====================================================================
-- 2. PRODUCTS — full plant catalog
-- ====================================================================
create table if not exists public.products (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  slug            text not null unique,
  price           numeric(10,2) not null,
  category        text not null,        -- 'Indoor Plant', 'Outdoor Plant', 'Succulent', 'Sacred Plant'
  scientific_name text default '',
  image           text default '',
  tags            text[] default '{}',  -- e.g. {'air-purifying','low-light'}
  badge           text default '',      -- 'Bestseller', 'Premium', 'Popular', 'Trending', 'New'
  stock_status    text not null default 'in-stock',  -- 'in-stock', 'low-stock', 'out-of-stock'
  stock_quantity  integer default 0,
  water_needs     text default '',
  light_needs     text default '',
  temp_range      text default '',
  pet_safe        text default '',
  fertilizer      text default '',
  description     text default '',
  is_featured     boolean default false,
  is_active       boolean default true,
  sort_order      integer default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Indexes for fast filtering
create index if not exists idx_products_category on public.products(category);
create index if not exists idx_products_tags on public.products using gin(tags);
create index if not exists idx_products_stock on public.products(stock_status);
create index if not exists idx_products_active on public.products(is_active) where is_active = true;

-- ====================================================================
-- 3. REVIEWS — product reviews & ratings
-- ====================================================================
create table if not exists public.reviews (
  id          text primary key,                    -- e.g. 'rev_1712345678_abcd'
  product_id  uuid references public.products(id) on delete cascade,
  product     text not null,                       -- product name (denormalized for legacy compatibility)
  user_id     uuid references auth.users(id) on delete set null,
  rating      integer not null check (rating >= 1 and rating <= 5),
  comment     text default '',
  author      text not null default 'Anonymous',
  email       text default '',
  date        timestamptz not null default now(),
  edited      timestamptz,
  is_verified boolean default false
);

-- Indexes for review queries
create index if not exists idx_reviews_product on public.reviews(product);
create index if not exists idx_reviews_product_id on public.reviews(product_id);
create index if not exists idx_reviews_user on public.reviews(user_id);
create index if not exists idx_reviews_date on public.reviews(date desc);

-- ====================================================================
-- 4. ORDERS — checkout order history
-- ====================================================================
create table if not exists public.orders (
  id            uuid primary key default uuid_generate_v4(),
  order_number  text not null unique,             -- human-readable: 'ORD-20260712-XXXX'
  user_id       uuid references auth.users(id) on delete set null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text default '',
  address       text not null,
  city          text not null,
  state         text not null default '',
  pincode       text not null,
  status        text not null default 'Confirmed',  -- 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'
  subtotal      numeric(10,2) not null default 0,
  discount      numeric(10,2) not null default 0,
  shipping      numeric(10,2) not null default 0,
  total         numeric(10,2) not null default 0,
  coupon_code   text default '',
  notes         text default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_orders_user on public.orders(user_id);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_date on public.orders(created_at desc);

-- ====================================================================
-- 5. ORDER ITEMS — individual line items within orders
-- ====================================================================
create table if not exists public.order_items (
  id          uuid primary key default uuid_generate_v4(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  product_id  uuid references public.products(id) on delete set null,
  product_name text not null,
  product_image text default '',
  price       numeric(10,2) not null,
  quantity    integer not null default 1,
  subtotal    numeric(10,2) not null
);

create index if not exists idx_order_items_order on public.order_items(order_id);

-- ====================================================================
-- 6. WISHLIST ITEMS — saved plants per user
-- ====================================================================
create table if not exists public.wishlist_items (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete cascade,
  product_name text not null,
  product_price numeric(10,2) not null,
  product_category text default '',
  product_image text default '',
  created_at  timestamptz not null default now(),
  unique(user_id, product_id)
);

create index if not exists idx_wishlist_user on public.wishlist_items(user_id);

-- ====================================================================
-- 7. CART ITEMS — active shopping carts per user (persistent across devices)
-- ====================================================================
create table if not exists public.cart_items (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete cascade,
  product_name text not null,
  product_price numeric(10,2) not null,
  product_category text default '',
  product_image text default '',
  quantity    integer not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique(user_id, product_id)
);

create index if not exists idx_cart_user on public.cart_items(user_id);

-- ====================================================================
-- 8. CARE STREAKS — gamified plant care habit tracker
-- ====================================================================
create table if not exists public.care_streaks (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  streak_count integer not null default 0,
  last_water_date date,
  longest_streak integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique(user_id)
);

create index if not exists idx_care_streaks_user on public.care_streaks(user_id);

-- ====================================================================
-- 9. BROWSING HISTORY — track user browsing for personalization
-- ====================================================================
create table if not exists public.browsing_history (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references auth.users(id) on delete cascade,
  session_id  text,                                -- anonymous users identified by session
  page_url    text not null,
  page_name   text not null,
  page_icon   text default 'eco',
  visited_at  timestamptz not null default now()
);

create index if not exists idx_browsing_user on public.browsing_history(user_id);
create index if not exists idx_browsing_session on public.browsing_history(session_id);
create index if not exists idx_browsing_time on public.browsing_history(visited_at desc);

-- ====================================================================
-- 10. CONTACT INQUIRIES — form submissions from contact page
-- ====================================================================
create table if not exists public.contact_inquiries (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  email       text not null,
  subject     text default '',
  message     text not null,
  is_read     boolean default false,
  created_at  timestamptz not null default now()
);

create index if not exists idx_contact_read on public.contact_inquiries(is_read);

-- ====================================================================
-- 11. NEWSLETTER SUBSCRIPTIONS
-- ====================================================================
create table if not exists public.newsletter_subscriptions (
  id          uuid primary key default uuid_generate_v4(),
  email       text not null unique,
  is_active   boolean default true,
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz
);

create index if not exists idx_newsletter_email on public.newsletter_subscriptions(email);

-- ====================================================================
-- 12. COUPONS — discount codes
-- ====================================================================
create table if not exists public.coupons (
  id              uuid primary key default uuid_generate_v4(),
  code            text not null unique,
  discount_percent numeric(5,2) default 0,
  discount_label  text default '',
  is_free_shipping boolean default false,
  max_uses        integer default 0,              -- 0 = unlimited
  current_uses    integer default 0,
  min_order_value numeric(10,2) default 0,
  is_active       boolean default true,
  expires_at      timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists idx_coupons_code on public.coupons(code);
create index if not exists idx_coupons_active on public.coupons(is_active) where is_active = true;

-- ====================================================================
-- HELPER FUNCTION: Generate order number
-- ====================================================================
create or replace function public.generate_order_number()
returns text
language sql
as $$
  select 'ORD-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(md5(random()::text), 1, 6));
$$;

-- ====================================================================
-- HELPER FUNCTION: Get average rating for a product
-- ====================================================================
create or replace function public.get_product_rating(product_name text)
returns table (average numeric, review_count bigint)
language sql
stable
as $$
  select round(avg(rating)::numeric, 1) as average, count(*)::bigint as review_count
  from public.reviews
  where product = product_name;
$$;

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.reviews enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.cart_items enable row level security;
alter table public.care_streaks enable row level security;
alter table public.browsing_history enable row level security;
alter table public.contact_inquiries enable row level security;
alter table public.newsletter_subscriptions enable row level security;
alter table public.coupons enable row level security;

-- ---- PROFILES ----
-- Users can read any profile (public)
create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

-- Users can update only their own profile
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---- PRODUCTS ----
-- Anyone can view active products
create policy "Anyone can view active products"
  on public.products for select
  using (is_active = true);

-- Only admins can insert/update/delete products (handled manually or via dashboard)

-- ---- REVIEWS ----
-- Anyone can read reviews
create policy "Reviews are viewable by everyone"
  on public.reviews for select
  using (true);

-- Anyone can insert reviews (existing JS uses anon key, not auth token)
-- When user_id is null, we still allow insert for backward compatibility
create policy "Anyone can create reviews"
  on public.reviews for insert
  with check (true);

-- Anyone can update/delete reviews (app uses its own Firebase Auth layer;
-- Supabase client uses anon key, so auth.uid() is null and can't match user_id)
-- Frontend already gates edit/delete to review owners via localStorage auth
create policy "Anyone can update reviews"
  on public.reviews for update
  using (true)
  with check (true);

create policy "Anyone can delete reviews"
  on public.reviews for delete
  using (true);

-- ---- ORDERS ----
-- Users can view only their own orders
create policy "Users can view their own orders"
  on public.orders for select
  using (auth.uid() = user_id);

-- Users can create orders
create policy "Users can create orders"
  on public.orders for insert
  with check (auth.role() = 'authenticated');

-- ---- ORDER ITEMS ----
-- Users can view items in their own orders (via order_id join)
create policy "Users can view their own order items"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders
      where orders.id = order_items.order_id
      and orders.user_id = auth.uid()
    )
  );

-- Users can create items for their own orders
create policy "Users can create order items"
  on public.order_items for insert
  with check (
    exists (
      select 1 from public.orders
      where orders.id = order_items.order_id
      and orders.user_id = auth.uid()
    )
  );

-- ---- WISHLIST ITEMS ----
-- Users can view only their own wishlist
create policy "Users can view their own wishlist"
  on public.wishlist_items for select
  using (auth.uid() = user_id);

-- Users can manage their own wishlist
create policy "Users can manage their own wishlist"
  on public.wishlist_items for insert
  with check (auth.uid() = user_id);

create policy "Users can delete from their own wishlist"
  on public.wishlist_items for delete
  using (auth.uid() = user_id);

-- ---- CART ITEMS ----
-- Users can view only their own cart
create policy "Users can view their own cart"
  on public.cart_items for select
  using (auth.uid() = user_id);

-- Users can manage their own cart
create policy "Users can manage their own cart"
  on public.cart_items for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own cart"
  on public.cart_items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete from their own cart"
  on public.cart_items for delete
  using (auth.uid() = user_id);

-- ---- CARE STREAKS ----
-- Users can view only their own streak
create policy "Users can view their own care streak"
  on public.care_streaks for select
  using (auth.uid() = user_id);

-- Users can upsert their own streak
create policy "Users can manage their own care streak"
  on public.care_streaks for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own care streak"
  on public.care_streaks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---- BROWSING HISTORY ----
-- Users can view their own browsing history
create policy "Users can view their own browsing history"
  on public.browsing_history for select
  using (auth.uid() = user_id);

-- Authenticated users can insert browsing history
create policy "Authenticated users can insert browsing history"
  on public.browsing_history for insert
  with check (auth.role() = 'authenticated');

-- ---- CONTACT INQUIRIES ----
-- Anyone can submit a contact inquiry (no auth required)
create policy "Anyone can submit a contact inquiry"
  on public.contact_inquiries for insert
  with check (true);

-- Only admins can view inquiries (manage via dashboard)

-- ---- NEWSLETTER SUBSCRIPTIONS ----
-- Anyone can subscribe
create policy "Anyone can subscribe to newsletter"
  on public.newsletter_subscriptions for insert
  with check (true);

-- ---- COUPONS ----
-- Authenticated users can read active coupons
create policy "Users can view active coupons"
  on public.coupons for select
  using (is_active = true and (expires_at is null or expires_at > now()));

-- ====================================================================
-- SEED DATA: Default coupons
-- ====================================================================
insert into public.coupons (code, discount_percent, discount_label, is_free_shipping, max_uses, min_order_value) values
  ('WELCOME10', 10.00, '10% Off Welcome', false, 100, 0),
  ('LEAF20', 20.00, '20% Off', false, 50, 100),
  ('FREESHIP', 0, 'Free Shipping', true, 200, 0)
on conflict (code) do nothing;

-- ====================================================================
-- SEED DATA: Sample products (from the ALL_PRODUCTS array in product-page.js)
-- ====================================================================
insert into public.products (name, slug, price, category, scientific_name, image, tags, badge, stock_status, water_needs, light_needs, temp_range, pet_safe, fertilizer, description, is_featured, sort_order) values
  ('Snake Plant', 'snake-plant', 22.00, 'Indoor Plant', 'Sansevieria trifasciata', '../../images/plant-placeholder.svg', '{air-purifying,low-light}', 'Bestseller', 'in-stock', 'Every 2-3 weeks — drought tolerant', 'Low to bright indirect', '15–30°C', 'Toxic if ingested', 'Every 3 months', 'The Snake Plant features tall, upright sword-shaped leaves with striking green and yellow variegated patterns that add architectural drama to any room. Famous for converting CO2 into oxygen at night, it is an ideal bedroom companion. This drought-tolerant beauty thrives on neglect and can survive low-light corners where most other plants struggle.', true, 1),
  ('Jade Plant', 'jade-plant', 25.00, 'Succulent', 'Crassula ovata', '../../images/plant-placeholder.svg', '{succulent}', 'Popular', 'in-stock', 'Every 2-3 weeks', 'Bright indirect to direct', '18–30°C', 'Toxic to pets', 'Every 3 months', 'The Jade Plant is a beloved succulent symbolizing good luck and prosperity, often called the Money Tree. Its thick, fleshy oval leaves grow on sturdy woody stems, developing a beautiful bonsai-like tree structure over time.', true, 2),
  ('Haworthia', 'haworthia', 20.00, 'Succulent', 'Haworthia fasciata', '../../images/plant-placeholder.svg', '{succulent,small}', 'Trending', 'in-stock', 'Every 3 weeks', 'Bright indirect', '18–27°C', 'Non-toxic', 'Yearly', 'Haworthia is a charming miniature succulent perfect for desks, shelves, and tiny spaces. Its distinctive rosette of pointed, fleshy leaves is covered in white pearly bumps and translucent stripes.', false, 3),
  ('Spider Plant', 'spider-plant', 20.00, 'Indoor Plant', 'Chlorophytum comosum', '../../images/plant-placeholder.svg', '{air-purifying,low-light}', 'Popular', 'in-stock', 'Moderate — keep soil slightly moist', 'Bright indirect', '18–32°C', 'Non-toxic, pet-friendly!', 'Monthly in summer', 'The Spider Plant is a classic favorite with cascading arching leaves and adorable baby spiderettes that dangle from long stems. Completely non-toxic to cats and dogs, it is one of the most pet-friendly houseplants available.', true, 4),
  ('Syngonium', 'syngonium', 18.00, 'Indoor Plant', 'Syngonium podophyllum', '../../images/plant-placeholder.svg', '{trailing,low-light}', 'Trending', 'in-stock', 'When soil feels dry', 'Low to bright indirect', '17–30°C', 'Toxic if ingested', 'Monthly', 'Syngonium, also known as the Arrowhead Vine, is a fast-growing tropical beauty admired for its uniquely shaped leaves that transform as the plant matures — from arrow-shaped juvenile leaves to multi-lobed adult foliage.', false, 5),
  ('ZZ Plant', 'zz-plant', 35.00, 'Indoor Plant', 'Zamioculcas zamiifolia', '../../images/plant-placeholder.svg', '{low-light}', 'Bestseller', 'in-stock', 'Every 2-3 weeks — drought tolerant', 'Low to bright indirect', '18–30°C', 'Toxic if ingested', 'Every 3 months', 'The ZZ Plant is virtually indestructible, earning its reputation as the houseplant that refuses to die. Its glossy, dark green waxy leaves emerge from thick potato-like rhizomes that store water.', true, 6),
  ('Peace Lily', 'peace-lily', 28.00, 'Indoor Plant', 'Spathiphyllum wallisii', '../../images/plant-placeholder.svg', '{air-purifying,flowering}', 'Premium', 'in-stock', 'Weekly — keep moist', 'Low to medium indirect', '18–27°C', 'Toxic to pets', 'Every 6 weeks', 'The Peace Lily is an elegant flowering houseplant renowned for its graceful white spathes that bloom repeatedly throughout the year. Its lush, dark green foliage creates a tropical feel.', true, 7),
  ('Kalanchoe', 'kalanchoe', 22.00, 'Succulent', 'Kalanchoe blossfeldiana', '../../images/plant-placeholder.svg', '{succulent,flowering}', 'Popular', 'in-stock', 'Every 2 weeks', 'Bright direct to indirect', '18–32°C', 'Toxic to pets', 'Monthly', 'Kalanchoe is a cheerful flowering succulent that rewards owners with months of vibrant blooms in shades of red, pink, orange, yellow, or white.', false, 8),
  ('Adenium', 'adenium', 35.00, 'Succulent', 'Adenium obesum', '../../images/plant-placeholder.svg', '{succulent,flowering}', 'Premium', 'in-stock', 'Weekly in summer', 'Full sun', '20–35°C', 'Toxic if ingested', 'Monthly', 'The Desert Rose is a stunning succulent shrub with dramatic architectural impact. Its thick, swollen caudex base resembles an ancient bonsai trunk.', false, 9),
  ('Portulaca', 'portulaca', 15.00, 'Succulent', 'Portulaca grandiflora', '../../images/plant-placeholder.svg', '{succulent,flowering}', 'Bestseller', 'in-stock', 'Every 2-3 days', 'Full sun', '20–35°C', 'Non-toxic', 'Monthly', 'Portulaca, also known as Moss Rose, is a vibrant flowering succulent that brings a carpet of color to sunny spaces. Its succulent needle-like leaves store water efficiently.', false, 10)
on conflict (slug) do nothing;

-- ====================================================================
-- SEED DATA: Tulsi varieties (Sacred Plants)
-- ====================================================================
insert into public.products (name, slug, price, category, image, badge, stock_status, water_needs, light_needs, temp_range, pet_safe, fertilizer, description, is_featured, sort_order) values
  ('Tulsi (Holy Basil)', 'tulsi-holy-basil', 25.00, 'Sacred Plant', '../../images/plant-placeholder.svg', 'Bestseller', 'in-stock', 'Water when soil feels dry', 'Full sun to partial shade', '20–35°C', 'Non-toxic', 'Monthly', 'India''s most revered herb — Holy Basil (Ocimum sanctum). Grown organically with ancient Indian farming traditions. Known for its adaptogenic properties, it helps the body cope with stress and supports the immune system. A staple in every Indian home.', true, 1),
  ('Rama Tulsi', 'rama-tulsi', 29.00, 'Sacred Plant', '../../images/plant-placeholder.svg', '', 'in-stock', 'Water when soil feels dry', 'Full sun to partial shade', '20–35°C', 'Non-toxic', 'Monthly', 'Rama Tulsi (Green Leaf Tulsi) is the most common variety with bright green leaves and a clove-like aroma. It has a cooling, mellow flavor and is traditionally used in teas and for daily worship.', true, 2),
  ('Krishna Tulsi', 'krishna-tulsi', 32.00, 'Sacred Plant', '../../images/plant-placeholder.svg', 'New', 'in-stock', 'Water when soil feels dry', 'Full sun to partial shade', '20–35°C', 'Non-toxic', 'Monthly', 'Krishna Tulsi (Purple Leaf Tulsi) has striking dark purple-green leaves with a peppery, pungent flavor. It contains the highest concentration of essential oils among all Tulsi varieties and is known for its powerful medicinal properties.', true, 3),
  ('Vana Tulsi', 'vana-tulsi', 28.00, 'Sacred Plant', '../../images/plant-placeholder.svg', '', 'in-stock', 'Water when soil feels dry', 'Full sun to partial shade', '20–35°C', 'Non-toxic', 'Monthly', 'Vana Tulsi (Wild Himalayan Tulsi) is native to the Himalayan region and has light green, slightly hairy leaves. It has a fresh, lemony aroma and is the most cold-tolerant of all Tulsi varieties.', false, 4)
on conflict (slug) do nothing;

-- ====================================================================
-- VIEW: Product ratings (summarized)
-- ====================================================================
create or replace view public.product_ratings as
select
  p.id as product_id,
  p.name as product_name,
  coalesce(round(avg(r.rating), 1), 0) as average_rating,
  count(r.id) as review_count
from public.products p
left join public.reviews r on r.product_id = p.id
group by p.id, p.name;

-- ====================================================================
-- VIEW: User stats (for history page)
-- ====================================================================
create or replace view public.user_stats as
select
  p.id as user_id,
  (select count(*) from public.orders where user_id = p.id) as order_count,
  (select coalesce(streak_count, 0) from public.care_streaks where user_id = p.id) as care_streak,
  (select count(*) from public.reviews where user_id = p.id) as review_count,
  (select count(*) from public.wishlist_items where user_id = p.id) as wishlist_count
from public.profiles p;

-- ====================================================================
-- API FUNCTION: Log daily plant care
-- ====================================================================
create or replace function public.water_plant(p_user_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_streak integer;
  v_last_date date;
  v_today date := current_date;
  v_yesterday date := current_date - 1;
  v_result jsonb;
begin
  select streak_count, last_water_date into v_streak, v_last_date
  from public.care_streaks
  where user_id = p_user_id;

  if not found then
    -- No streak exists yet — create one
    insert into public.care_streaks (user_id, streak_count, last_water_date, longest_streak)
    values (p_user_id, 1, v_today, 1);
    v_result := jsonb_build_object('streak', 1, 'already_done', false);
  elsif v_last_date = v_today then
    -- Already watered today
    v_result := jsonb_build_object('streak', v_streak, 'already_done', true);
  elsif v_last_date = v_yesterday then
    -- Consecutive day — increment streak
    update public.care_streaks
    set streak_count = streak_count + 1,
        last_water_date = v_today,
        longest_streak = greatest(longest_streak, streak_count + 1),
        updated_at = now()
    where user_id = p_user_id
    returning streak_count into v_streak;
    v_result := jsonb_build_object('streak', v_streak, 'already_done', false);
  else
    -- Streak broken — reset to 1
    update public.care_streaks
    set streak_count = 1,
        last_water_date = v_today,
        updated_at = now()
    where user_id = p_user_id
    returning streak_count into v_streak;
    v_result := jsonb_build_object('streak', v_streak, 'already_done', false);
  end if;

  return v_result;
end;
$$;

-- ====================================================================
-- API FUNCTION: Place order (create order + order_items in a transaction)
-- ====================================================================
create or replace function public.place_order(
  p_user_id         uuid,
  p_customer_name   text,
  p_customer_email  text,
  p_customer_phone  text,
  p_address         text,
  p_city            text,
  p_state           text,
  p_pincode         text,
  p_coupon_code     text default '',
  p_notes           text default ''
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_order_id      uuid;
  v_order_number  text;
  v_subtotal      numeric(10,2) := 0;
  v_discount      numeric(10,2) := 0;
  v_shipping      numeric(10,2) := 10;
  v_total         numeric(10,2);
  v_coupon        record;
  v_item          record;
  v_cart_items    jsonb;
begin
  -- Get cart items for this user
  v_cart_items := (
    select jsonb_agg(to_jsonb(ci.*))
    from cart_items ci
    where ci.user_id = p_user_id
  );

  if v_cart_items is null or v_cart_items = '[]'::jsonb then
    return jsonb_build_object('error', 'Cart is empty');
  end if;

  -- Calculate subtotal
  select coalesce(sum(quantity * product_price), 0) into v_subtotal
  from cart_items
  where user_id = p_user_id;

  -- Apply coupon if provided
  if p_coupon_code != '' then
    select * into v_coupon from coupons
    where code = upper(p_coupon_code)
    and is_active = true
    and (expires_at is null or expires_at > now())
    and (max_uses = 0 or current_uses < max_uses)
    and (min_order_value = 0 or v_subtotal >= min_order_value);

    if found then
      v_discount := v_subtotal * (v_coupon.discount_percent / 100);
      if v_coupon.is_free_shipping then
        v_shipping := 0;
      end if;
      -- Increment coupon usage
      update coupons set current_uses = current_uses + 1 where id = v_coupon.id;
    end if;
  end if;

  -- Free shipping threshold (₹150)
  if v_subtotal >= 150 then
    v_shipping := 0;
  end if;

  v_total := v_subtotal - v_discount + v_shipping;

  -- Generate order number
  v_order_number := public.generate_order_number();

  -- Create order
  insert into public.orders (
    order_number, user_id, customer_name, customer_email, customer_phone,
    address, city, state, pincode, status,
    subtotal, discount, shipping, total, coupon_code, notes
  ) values (
    v_order_number, p_user_id, p_customer_name, p_customer_email, p_customer_phone,
    p_address, p_city, p_state, p_pincode, 'Confirmed',
    v_subtotal, v_discount, v_shipping, v_total, upper(p_coupon_code), p_notes
  )
  returning id into v_order_id;

  -- Create order items from cart
  insert into public.order_items (order_id, product_id, product_name, product_image, price, quantity, subtotal)
  select v_order_id, ci.product_id, ci.product_name, ci.product_image, ci.product_price, ci.quantity, (ci.quantity * ci.product_price)
  from cart_items ci
  where ci.user_id = p_user_id;

  -- Clear user's cart
  delete from cart_items where user_id = p_user_id;

  return jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'total', v_total,
    'status', 'Confirmed'
  );
end;
$$;

-- ====================================================================
-- API FUNCTION: Sync localStorage data to Supabase
-- ====================================================================
create or replace function public.sync_user_data(
  p_user_id     uuid,
  p_wishlist    jsonb default '[]',
  p_cart        jsonb default '[]',
  p_browsing    jsonb default '[]'
)
returns jsonb
language plpgsql
security definer
as $$
begin
  -- Sync wishlist: clear existing and insert
  if p_wishlist != '[]'::jsonb then
    delete from wishlist_items where user_id = p_user_id;
    insert into wishlist_items (user_id, product_id, product_name, product_price, product_category, product_image)
    select p_user_id,
           p.id,
           item->>'name',
           coalesce((item->>'price')::numeric, 0),
           coalesce(item->>'category', ''),
           coalesce(item->>'image', '')
    from jsonb_array_elements(p_wishlist) as item
    left join products p on p.name = item->>'name';
  end if;

  -- Sync cart: clear existing and insert
  if p_cart != '[]'::jsonb then
    delete from cart_items where user_id = p_user_id;
    insert into cart_items (user_id, product_id, product_name, product_price, product_category, product_image, quantity)
    select p_user_id,
           p.id,
           item->>'name',
           coalesce((item->>'price')::numeric, 0),
           coalesce(item->>'category', ''),
           coalesce(item->>'image', ''),
           coalesce((item->>'qty')::integer, 1)
    from jsonb_array_elements(p_cart) as item
    left join products p on p.name = item->>'name';
  end if;

  return jsonb_build_object('success', true);
end;
$$;

-- ====================================================================
-- GRANT PERMISSIONS
-- ====================================================================
-- These grant the anon and authenticated roles access to the tables/functions

-- Anon (public) can select products and reviews, insert contact/subscriptions
grant usage on schema public to anon, authenticated;
grant select on public.products to anon, authenticated;
grant select on public.reviews to anon, authenticated;
grant select on public.coupons to anon, authenticated;
grant select on public.product_ratings to anon, authenticated;
grant insert on public.contact_inquiries to anon, authenticated;
grant insert on public.newsletter_subscriptions to anon, authenticated;

-- Authenticated users have full access to their own data
grant select, insert, update, delete on public.wishlist_items to authenticated;
grant select, insert, update, delete on public.cart_items to authenticated;
grant select, insert, update on public.care_streaks to authenticated;
grant select on public.orders to authenticated;
grant select on public.order_items to authenticated;
grant select, update on public.profiles to authenticated;
grant insert, update, delete on public.reviews to anon, authenticated;
grant insert on public.browsing_history to anon, authenticated;

-- Execute functions
grant execute on function public.water_plant to authenticated;
grant execute on function public.place_order to authenticated;
grant execute on function public.sync_user_data to authenticated;
grant execute on function public.get_product_rating to anon, authenticated;

-- ====================================================================
-- TRIGGER: Auto-update updated_at columns
-- ====================================================================
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Apply to all tables with updated_at column
drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

drop trigger if exists set_updated_at on public.products;
create trigger set_updated_at
  before update on public.products
  for each row execute function public.handle_updated_at();

drop trigger if exists set_updated_at on public.orders;
create trigger set_updated_at
  before update on public.orders
  for each row execute function public.handle_updated_at();

drop trigger if exists set_updated_at on public.cart_items;
create trigger set_updated_at
  before update on public.cart_items
  for each row execute function public.handle_updated_at();

drop trigger if exists set_updated_at on public.care_streaks;
create trigger set_updated_at
  before update on public.care_streaks
  for each row execute function public.handle_updated_at();

-- ====================================================================
-- DONE!
-- ====================================================================
-- ✅ All tables created with RLS policies
-- ✅ Triggers for auth user profile sync
-- ✅ Helper functions for plant watering & order placement
-- ✅ Seed data for products and coupons
-- ✅ Views for aggregated ratings and user stats
-- ✅ Granular permissions for anon and authenticated roles
--
-- Next steps:
-- 1. Run this SQL in your Supabase SQL Editor
-- 2. If you already have a 'reviews' table, it will be preserved (uses IF NOT EXISTS)
-- 3. Update config/supabase.js with your Supabase URL and anon key (already done)
-- 4. Enable the "Allow public registration" setting in Auth settings if needed
-- ====================================================================
