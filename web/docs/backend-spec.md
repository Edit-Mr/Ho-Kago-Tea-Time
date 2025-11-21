# Community Maintenance Platform — Supabase/PostGIS Backend Contract

## 1) Architecture overview
- **Supabase Postgres + PostGIS** hosts core data (areas, facilities, tickets, missions, risk snapshots). Public-read, anonymous writes allowed for hackathon; RLS can be relaxed or use permissive policies.
- **Supabase Storage (MinIO)** bucket `uploads` for ticket/inspection/mission photos; store URLs/paths in table columns.
- **RPC (Postgres functions)** expose map/dashboards/simulation endpoints directly; no extra CRUD backend. FastAPI (later) can call the same RPCs for AI/MCP and simulations.
- Geometry: `geometry(MultiPolygon,4326)` for areas; `geometry(Point,4326)` (and optional Polygon footprints) for facilities/tickets/incidents. GIST indexes for spatial filters.

## 2) Tables

### areas
| column | type | notes |
| --- | --- | --- |
| id | uuid pk default gen_random_uuid() |
| name | text not null |
| code | text unique |
| geom | geometry(MultiPolygon,4326) not null |
| centroid | geometry(Point,4326) generated always as (st_centroid(geom)) stored |
| population_total | int |
| created_at | timestamptz default now() |

### population_stats
| column | type | notes |
| area_id | uuid fk -> areas.id |
| year | int |
| population_total | int |
| population_children_0_14 | int |
| population_elderly_65_plus | int |
| primary key | (area_id, year) |

### facilities
| column | type | notes |
| --- | --- | --- |
| id | uuid pk |
| area_id | uuid fk -> areas.id |
| type | text check in ('park','playground','street_light','tree','toilet','other') |
| name | text not null |
| geom | geometry(Point,4326) not null |
| footprint | geometry(Polygon,4326) null |
| health_grade | text check in ('A','B','C') |
| last_inspection_at | timestamptz |
| has_open_ticket | boolean default false |
| created_at | timestamptz default now() |

### facility_inspections
| column | type | notes |
| id | uuid pk |
| facility_id | uuid fk -> facilities.id |
| inspected_at | timestamptz |
| status | text check in ('ok','minor_issue','major_issue') |
| notes | text |
| issues_count | int |
| incident_count_last_year | int |
| photo_url | text |
| created_at | timestamptz default now() |

### tickets
| column | type | notes |
| id | uuid pk |
| area_id | uuid fk -> areas.id |
| facility_id | uuid fk -> facilities.id null |
| geom | geometry(Point,4326) null |
| source | text check in ('citizen','inspection','system') |
| type | text |
| severity | int check between 1 and 3 |
| status | text check in ('open','assigned','in_progress','completed','cancelled') |
| created_at | timestamptz default now() |
| updated_at | timestamptz default now() |
| sla_days | int |
| sla_due_at | timestamptz |
| closed_at | timestamptz |
| estimated_cost | numeric(12,2) |
| risk_impact | numeric(10,2) |
| description | text |
| photo_urls | text[] |

### ticket_events
| column | type | notes |
| id | uuid pk |
| ticket_id | uuid fk -> tickets.id |
| event_type | text check in ('reported','assigned','work_started','completed','cancelled','comment') |
| created_at | timestamptz default now() |
| data | jsonb |

### area_risk_snapshots
| column | type | notes |
| id | uuid pk |
| area_id | uuid fk -> areas.id |
| computed_at | timestamptz |
| risk_score | numeric(5,2) |
| components | jsonb |

### missions
| column | type | notes |
| id | uuid pk |
| area_id | uuid fk -> areas.id |
| facility_id | uuid fk -> facilities.id null |
| title | text |
| description | text |
| type | text |
| status | text check in ('open','completed','expired') |
| created_at | timestamptz |
| due_at | timestamptz |

### mission_reports
| column | type | notes |
| id | uuid pk |
| mission_id | uuid fk -> missions.id |
| facility_id | uuid fk -> facilities.id null |
| created_at | timestamptz |
| status | text check in ('ok','issue_found') |
| notes | text |
| photo_url | text |

## 3) Sample DDL
```sql
create extension if not exists postgis;

create table public.areas (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique,
  geom geometry(MultiPolygon,4326) not null,
  centroid geometry(Point,4326) generated always as (st_centroid(geom)) stored,
  population_total int,
  created_at timestamptz default now()
);
create index on public.areas using gist (geom);

create table public.facilities (
  id uuid primary key default gen_random_uuid(),
  area_id uuid references public.areas(id) on delete set null,
  type text not null check (type in ('park','playground','street_light','tree','toilet','other')),
  name text not null,
  geom geometry(Point,4326) not null,
  footprint geometry(Polygon,4326),
  health_grade text check (health_grade in ('A','B','C')),
  last_inspection_at timestamptz,
  has_open_ticket boolean default false,
  created_at timestamptz default now()
);
create index on public.facilities using gist (geom);
create index on public.facilities (area_id);

create table public.tickets (
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
create index on public.tickets using gist (geom);
create index on public.tickets (area_id);
create index on public.tickets (facility_id);
create index on public.tickets (status);

create table public.area_risk_snapshots (
  id uuid primary key default gen_random_uuid(),
  area_id uuid references public.areas(id) on delete cascade,
  computed_at timestamptz not null,
  risk_score numeric(5,2) not null,
  components jsonb
);
create index on public.area_risk_snapshots (area_id, computed_at desc);
```

## 4) Risk score & budget simulation
- **Risk (0–100)**: `score = 0.3*aging + 0.35*overdue + 0.2*incidents + 0.15*vulnerable`
  - aging: normalize days since `last_inspection_at` per facility (avg in area, capped, scaled 0–100)
  - overdue: `overdue_tickets / greatest(total_tickets,1) * 100`
  - incidents: per km² rate from inspections/incidents; scale to 0–100
  - vulnerable: `(children+elderly)/population_total * 100`
  - Store JSON components in `area_risk_snapshots.components`.

- **Budget simulation (+X%)**:
  - Inputs: `delta`, `base_budget`, open tickets with `estimated_cost`, `risk_impact`.
  - Compute `additional_budget = base_budget * delta`.
  - Sort open tickets by `risk_impact / estimated_cost` desc; pick until additional_budget spent.
  - For selected tickets, subtract `risk_impact` from their area’s current risk (floor at 0); classify red >70, orange 35–70, green <35.
  - Return per-area before/after risk and bucket counts.

## 5) RPC functions
- `get_area_overview(area_id uuid)` → latest risk_score + components, facility counts by type/grade, tickets (open/overdue), incidents last year.
- `list_areas_heatmap()` → area_id, name, centroid (lon/lat), latest risk_score, bucket.
- `list_facilities_in_bbox(min_lng float, min_lat float, max_lng float, max_lat float)` → facilities with id, name, type, grade, last_inspection_at, geom.
- `list_tickets_in_bbox(min_lng float, min_lat float, max_lng float, max_lat float)` → tickets with id, status, severity, sla_due_at, geom.
- `get_facility_timeline(facility_id uuid)` → inspections + tickets + ticket_events merged for timeline cards.
- `create_ticket(area_id uuid, facility_id uuid, source text, type text, severity int, description text, photo_urls text[])` → insert ticket; return id/status/sla_due_at.
- `get_nearby_risk(lat float, lng float, radius_m int)` → facilities/tickets within radius, plus aggregated risk summary.
- `simulate_budget(delta numeric, base_budget numeric)` → per-area {area_id, old_risk, new_risk, old_bucket, new_bucket, tickets_selected}.
- `list_missions(area_id uuid default null, status text default null)` → mission feed for mission wall.
- `create_mission_report(mission_id uuid, facility_id uuid, status text, notes text, photo_url text)` → insert report.

## 6) PostGIS usage & indexes
- Geoms: `areas.geom` MultiPolygon 4326, `facilities.geom` Point 4326, `tickets.geom` Point 4326.
- Indexes: GIST on all geometry columns; B-tree on status/type/area_id for filters.
- Queries: viewport (`geom && ST_MakeEnvelope(min_lng,min_lat,max_lng,max_lat,4326)`), proximity (`ST_DWithin(geom::geography, ST_SetSRID(ST_MakePoint(lng,lat),4326)::geography, radius_m)`), containment (`ST_Contains(area.geom, facility.geom)`), centroids for labels.
