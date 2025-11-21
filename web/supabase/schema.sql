-- Supabase/PostGIS schema for Community Maintenance Platform
-- Run with psql or `supabase db push` (move into migrations for production)

create extension if not exists postgis;

-- AREAS
create table if not exists public.areas (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique,
  geom geometry(MultiPolygon,4326) not null,
  centroid geometry(Point,4326) generated always as (st_centroid(geom)) stored,
  population_total int,
  created_at timestamptz default now()
);
create index if not exists areas_geom_idx on public.areas using gist (geom);

-- POPULATION
create table if not exists public.population_stats (
  area_id uuid references public.areas(id) on delete cascade,
  year int not null,
  population_total int,
  population_children_0_14 int,
  population_elderly_65_plus int,
  primary key (area_id, year)
);

-- FACILITIES
create table if not exists public.facilities (
  id uuid primary key default gen_random_uuid(),
  area_id uuid references public.areas(id) on delete set null,
  type text not null check (type in ('park','playground','street_light','tree','toilet','other','road_hazard','police_station','sidewalk','drinking_fountain','elder_center','school_zone')),
  name text not null,
  icon text,
  geom geometry(Point,4326) not null,
  footprint geometry(Polygon,4326),
  health_grade text check (health_grade in ('A','B','C')),
  last_inspection_at timestamptz,
  has_open_ticket boolean default false,
  created_at timestamptz default now()
);
create index if not exists facilities_geom_idx on public.facilities using gist (geom);
create index if not exists facilities_area_idx on public.facilities (area_id);

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
  area_id uuid references public.areas(id) on delete set null,
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
create index if not exists tickets_area_idx on public.tickets (area_id);
create index if not exists tickets_facility_idx on public.tickets (facility_id);
create index if not exists tickets_status_idx on public.tickets (status);

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

-- MISSIONS
create table if not exists public.missions (
  id uuid primary key default gen_random_uuid(),
  area_id uuid references public.areas(id) on delete set null,
  facility_id uuid references public.facilities(id) on delete set null,
  title text not null,
  description text,
  type text,
  status text not null check (status in ('open','completed','expired')),
  created_at timestamptz default now(),
  due_at timestamptz
);
create index if not exists missions_area_idx on public.missions (area_id);
create index if not exists missions_facility_idx on public.missions (facility_id);

-- MISSION REPORTS
create table if not exists public.mission_reports (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid references public.missions(id) on delete cascade,
  facility_id uuid references public.facilities(id) on delete set null,
  created_at timestamptz default now(),
  status text not null check (status in ('ok','issue_found')),
  notes text,
  photo_url text
);
create index if not exists mission_reports_mission_idx on public.mission_reports (mission_id, created_at);

-- SEED EXAMPLE DATA (optional; remove in prod)
insert into public.areas (id, name, code, geom, population_total)
values
  ('00000000-0000-0000-0000-000000000001','西屯區','xitun', st_geomfromtext('MULTIPOLYGON(((120.624 24.192,120.664 24.192,120.664 24.143,120.624 24.143,120.624 24.192)))',4326), 220000),
  ('00000000-0000-0000-0000-000000000002','北區','north', st_geomfromtext('MULTIPOLYGON(((120.683 24.173,120.715 24.173,120.715 24.15,120.683 24.15,120.683 24.173)))',4326), 140000),
  ('00000000-0000-0000-0000-000000000003','南屯區','nantun', st_geomfromtext('MULTIPOLYGON(((120.62 24.155,120.665 24.155,120.665 24.115,120.62 24.115,120.62 24.155)))',4326), 168000)
on conflict do nothing;

insert into public.facilities (id, area_id, type, name, icon, geom, health_grade, last_inspection_at)
values
  ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','park','黎明公園', 'TreeDeciduous', st_setsrid(st_makepoint(120.646,24.16),4326),'B','2024-10-05'),
  ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','street_light','福康五街路燈 #12', 'Lightbulb', st_setsrid(st_makepoint(120.655,24.172),4326),'A','2024-11-10'),
  ('10000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','park','文心森林公園', 'TreeDeciduous', st_setsrid(st_makepoint(120.64,24.158),4326),'C','2024-08-20'),
  ('10000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001','street_light','福星北路路燈 #21', 'Lightbulb', st_setsrid(st_makepoint(120.649,24.177),4326),'B','2024-11-05'),
  ('10000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000001','police_station','西屯分局', 'ShieldCheck', st_setsrid(st_makepoint(120.648,24.164),4326),'A','2024-11-01'),
  ('10000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000001','sidewalk','逢甲商圈人行道', 'Footprints', st_setsrid(st_makepoint(120.6455,24.174),4326),'B','2024-09-02'),
  ('10000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000002','park','崇德公園', 'TreeDeciduous', st_setsrid(st_makepoint(120.69,24.163),4326),'B','2024-10-15'),
  ('10000000-0000-0000-0000-000000000008','00000000-0000-0000-0000-000000000003','elder_center','南屯區樂齡中心', 'HeartHandshake', st_setsrid(st_makepoint(120.637,24.135),4326),'A','2024-10-30'),
  ('10000000-0000-0000-0000-000000000009','00000000-0000-0000-0000-000000000001','drinking_fountain','草悟道飲水機', 'Droplets', st_setsrid(st_makepoint(120.6605,24.159),4326),'B','2024-10-28')
on conflict do nothing;

insert into public.tickets (id, area_id, facility_id, geom, source, type, severity, status, created_at, sla_days, sla_due_at, estimated_cost, risk_impact, description)
values
  ('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001', st_setsrid(st_makepoint(120.645,24.165),4326),'citizen','park_damage',2,'open','2024-10-20',30,'2024-11-19',50000,12,'滑梯鬆動'),
  ('20000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002',null, st_setsrid(st_makepoint(120.69,24.16),4326),'inspection','pothole',3,'assigned','2024-10-25',20,'2024-11-14',80000,18,'道路坑洞'),
  ('20000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000003', st_setsrid(st_makepoint(120.64,24.158),4326),'citizen','park_lighting',2,'in_progress','2024-09-12',45,'2024-10-27',40000,15,'夜間照明不足'),
  ('20000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001',null, st_setsrid(st_makepoint(120.641,24.157),4326),'citizen','road_pothole',3,'in_progress','2024-09-10',60,'2024-11-09',120000,20,'黎明路坑洞 2 處'),
  ('20000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000008', st_setsrid(st_makepoint(120.637,24.135),4326),'inspection','facility_check',1,'open','2024-10-30',30,'2024-11-29',30000,5,'樂齡中心例行檢查')
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

insert into public.missions (id, area_id, facility_id, title, description, type, status, due_at)
values
  ('40000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','黎明公園遊具安全巡檢','拍照滑梯、盪鞦韆、地墊狀況','park','open','2024-12-05'),
  ('40000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000004','巷弄路燈巡檢','夜間檢查熄燈，記錄桿號與位置','street_light','open','2024-11-30'),
  ('40000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000002',null,'學校周邊人行道平整度調查','標記坑洞或破損','sidewalk','open','2024-12-15')
on conflict do nothing;
