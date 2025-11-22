-- Supabase/PostGIS schema for Community Maintenance Platform
-- Run with psql or `supabase db push` (move into migrations for production)

create extension if not exists postgis;

-- AREAS
create table if not exists public.areas (
  id uuid primary key default gen_random_uuid(),

  -- 原本 name 仍保留（完整顯示）
  name text not null,

  -- 行政代碼（里代碼、或自訂的區代碼）
  code text unique,

  -- 新增行政區層級
  level text not null check (level in ('village','district','county')),

  -- 新增拆解欄位（搜尋會爽到不行）
  county text,        -- 新北市、台中市…
  town text,          -- 板橋區、大安區、深坑鄉…
  village text,       -- 某某里（district 時為 NULL）

  -- 幾何
  geom geometry(MultiPolygon,4326) not null,
  centroid geometry(Point,4326) generated always as (st_centroid(geom)) stored,

  population_total int,
  -- 人口結構
  gender_ratio int check (gender_ratio between 0 and 100),
  weighted_avg_age int check (weighted_avg_age >= 0),
  created_at timestamptz default now()
);

-- 空間索引
create index if not exists areas_geom_idx on public.areas using gist (geom);
create index if not exists areas_county_idx on public.areas (county, town, village);

-- Find containing area for a point (used to decide which county to load)
create or replace function public.find_area_by_point(lng double precision, lat double precision)
returns setof public.areas
language sql
stable
as $$
  select *
  from public.areas a
  where st_contains(a.geom, st_setsrid(st_makepoint(lng, lat), 4326))
  limit 1;
$$;

-- FACILITIES
create table if not exists public.facilities (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('building','street_light','park','public_toilet','bridge','road','bike_station','cctv','hazardous_factory','police_station')),
  name text not null,
  geom geometry(Point,4326) not null,
  health_grade text check (health_grade in ('A','B','C')),
  last_inspection_at timestamptz
);
create index if not exists facilities_geom_idx on public.facilities using gist (geom);

-- Helper to select facilities inside a given area (pure geometry-based)
create or replace function public.facilities_in_area(target_area_id uuid)
returns setof public.facilities
language sql
stable
as $$
  select f.*
  from public.facilities f
  join public.areas a on a.id = target_area_id
  where st_within(f.geom, a.geom);
$$;

-- FACILITY TYPE META (single source of truth for labels & emoji)
create table if not exists public.facility_type_meta (
  type text primary key,
  label_zh text not null,
  emoji text,
  icon_name text,
  created_at timestamptz default now()
);
insert into public.facility_type_meta (type, label_zh, emoji, icon_name) values
  ('building','建築物',null,'Building'),
  ('street_light','路燈',null,'Lamp'),
  ('park','公園','🌳','TreePalm'),
  ('public_toilet','公共廁所','🚻','Toilet'),
  ('bridge','橋樑','🌉','Bridge'),
  ('road','道路','🛣️','Road'),
  ('bike_station','腳踏車站點','🚲','Bike'),
  ('cctv','監視器','🎥','Camera'),
  ('hazardous_factory','危險工廠','🏭','Factory'),
  ('police_station','警察局','🚓','ShieldCheck')
on conflict (type) do update set
  label_zh = excluded.label_zh,
  emoji = excluded.emoji,
  icon_name = excluded.icon_name;

-- FACILITY INSPECTIONS
create table if not exists public.facility_inspections (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid references public.facilities(id) on delete cascade,
  inspected_at timestamptz not null,
  status text not null check (status in ('ok','minor_issue','major_issue')),
  notes text,
  issues_count int,
  incident_count_last_year int,
  photo_url text,
  created_at timestamptz default now()
);
create index if not exists facility_inspections_facility_idx on public.facility_inspections (facility_id, inspected_at desc);

-- TICKETS
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid references public.facilities(id) on delete set null,
  geom geometry(Point,4326),
  source text check (source in ('citizen','inspection','system')),
  type text not null,
  severity int check (severity between 1 and 3),
  status text not null check (status in ('open','assigned','in_progress','completed','cancelled')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  sla_days int,
  sla_due_at timestamptz,
  closed_at timestamptz,
  estimated_cost numeric(12,2),
  risk_impact numeric(10,2),
  description text,
  photo_urls text[]
);
create index if not exists tickets_geom_idx on public.tickets using gist (geom);
create index if not exists tickets_facility_idx on public.tickets (facility_id);
create index if not exists tickets_status_idx on public.tickets (status);

create or replace function public.tickets_in_area(target_area_id uuid)
returns setof public.tickets
language sql
stable
as $$
  select t.*
  from public.tickets t
  join public.areas a on a.id = target_area_id
  where t.geom is not null and st_within(t.geom, a.geom);
$$;

-- TICKET EVENTS
create table if not exists public.ticket_events (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references public.tickets(id) on delete cascade,
  event_type text not null check (event_type in ('reported','assigned','work_started','completed','cancelled','comment')),
  created_at timestamptz default now(),
  data jsonb
);
create index if not exists ticket_events_ticket_idx on public.ticket_events (ticket_id, created_at);

-- AREA RISK SNAPSHOTS
create table if not exists public.area_risk_snapshots (
  id uuid primary key default gen_random_uuid(),
  area_id uuid references public.areas(id) on delete cascade,
  computed_at timestamptz not null,
  risk_score numeric(5,2) not null,
  components jsonb
);
create index if not exists area_risk_snapshots_idx on public.area_risk_snapshots (area_id, computed_at desc);

-- BUILDING AGE POINTS
create table if not exists public.building_ages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  geom geometry(Point,4326) not null,
  age_years int not null check (age_years >= 0),
  created_at timestamptz default now()
);
create index if not exists building_ages_geom_idx on public.building_ages using gist (geom);

-- NOISE MEASUREMENTS
create table if not exists public.noise_measurements (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  geom geometry(Point,4326) not null,
  noise_morning numeric(6,2) not null,
  noise_afternoon numeric(6,2) not null,
  noise_night numeric(6,2) not null,
  created_at timestamptz default now()
);
create index if not exists noise_measurements_geom_idx on public.noise_measurements using gist (geom);

insert into public.facilities (id, type, name, geom, health_grade, last_inspection_at)
values
  ('10000000-0000-0000-0000-000000000001','park','黎明公園', st_setsrid(st_makepoint(120.646,24.16),4326),'B','2024-10-05'),
  ('10000000-0000-0000-0000-000000000002','street_light','福康五街路燈 #12', st_setsrid(st_makepoint(120.655,24.172),4326),'A','2024-11-10'),
  ('10000000-0000-0000-0000-000000000003','park','文心森林公園', st_setsrid(st_makepoint(120.64,24.158),4326),'C','2024-08-20'),
  ('10000000-0000-0000-0000-000000000004','street_light','福星北路路燈 #21', st_setsrid(st_makepoint(120.649,24.177),4326),'B','2024-11-05'),
  ('10000000-0000-0000-0000-000000000005','police_station','西屯分局', st_setsrid(st_makepoint(120.648,24.164),4326),'A','2024-11-01'),
  ('10000000-0000-0000-0000-000000000006','road','逢甲商圈人行道', st_setsrid(st_makepoint(120.6455,24.174),4326),'B','2024-09-02'),
  ('10000000-0000-0000-0000-000000000007','park','崇德公園', st_setsrid(st_makepoint(120.69,24.163),4326),'B','2024-10-15'),
  ('10000000-0000-0000-0000-000000000008','building','南屯區樂齡中心', st_setsrid(st_makepoint(120.637,24.135),4326),'A','2024-10-30'),
  ('10000000-0000-0000-0000-000000000009','building','草悟道飲水機', st_setsrid(st_makepoint(120.6605,24.159),4326),'B','2024-10-28')
on conflict do nothing;

insert into public.tickets (id, facility_id, geom, source, type, severity, status, created_at, sla_days, sla_due_at, estimated_cost, risk_impact, description)
values
  ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001', st_setsrid(st_makepoint(120.645,24.165),4326),'citizen','park_damage',2,'open','2024-10-20',30,'2024-11-19',50000,12,'滑梯鬆動'),
  ('20000000-0000-0000-0000-000000000002',null, st_setsrid(st_makepoint(120.69,24.16),4326),'inspection','pothole',3,'assigned','2024-10-25',20,'2024-11-14',80000,18,'道路坑洞'),
  ('20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000003', st_setsrid(st_makepoint(120.64,24.158),4326),'citizen','park_lighting',2,'in_progress','2024-09-12',45,'2024-10-27',40000,15,'夜間照明不足'),
  ('20000000-0000-0000-0000-000000000004',null, st_setsrid(st_makepoint(120.641,24.157),4326),'citizen','road_pothole',3,'in_progress','2024-09-10',60,'2024-11-09',120000,20,'黎明路坑洞 2 處'),
  ('20000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000008', st_setsrid(st_makepoint(120.637,24.135),4326),'inspection','facility_check',1,'open','2024-10-30',30,'2024-11-29',30000,5,'樂齡中心例行檢查')
on conflict do nothing;

insert into public.area_risk_snapshots (id, area_id, computed_at, risk_score, components)
values
  ('30000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','2024-11-15',68, '{"aging":25,"overdue_ratio":30,"incident_rate":20,"vulnerable_population":25}'),
  ('30000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002','2024-11-15',35, '{"aging":15,"overdue_ratio":10,"incident_rate":5,"vulnerable_population":5}'),
  ('30000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000003','2024-11-15',52, '{"aging":18,"overdue_ratio":15,"incident_rate":12,"vulnerable_population":7}')
on conflict do nothing;

insert into public.facility_inspections (facility_id, inspected_at, status, notes, issues_count, incident_count_last_year)
values
  ('10000000-0000-0000-0000-000000000001','2024-10-05','minor_issue','滑梯螺絲鬆動；步道坑洞',2,3),
  ('10000000-0000-0000-0000-000000000003','2024-08-20','major_issue','照明不足，草坪積水',2,6),
  ('10000000-0000-0000-0000-000000000004','2024-11-05','minor_issue','燈杆輕微鏽蝕',1,1),
  ('10000000-0000-0000-0000-000000000006','2024-09-02','minor_issue','導盲磚缺損',1,4)
on conflict do nothing;

insert into public.ticket_events (ticket_id, event_type, created_at, data)
values
  ('20000000-0000-0000-0000-000000000001','reported','2024-10-01', '{"source":"citizen"}'),
  ('20000000-0000-0000-0000-000000000001','assigned','2024-10-06','{"team":"parks"}'),
  ('20000000-0000-0000-0000-000000000001','work_started','2024-10-12','{}'),
  ('20000000-0000-0000-0000-000000000003','reported','2024-09-12','{}'),
  ('20000000-0000-0000-0000-000000000003','assigned','2024-09-15','{}'),
  ('20000000-0000-0000-0000-000000000004','reported','2024-09-10','{}'),
  ('20000000-0000-0000-0000-000000000004','assigned','2024-09-18','{}'),
  ('20000000-0000-0000-0000-000000000004','work_started','2024-10-20','{}')
on conflict do nothing;
