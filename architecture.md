Architecture overview

- Supabase/Postgres + PostGIS as the single CRUD backend; all reads via SQL/RPC/views; writes via direct table inserts (anonymous allowed with
  RLS set to public-read/write-on-selected-tables).
- Storage/MinIO for uploaded photos; tables store photo_url (public bucket with signed/read-only) or storage_path.
- PostGIS geometries on areas (MultiPolygon) and facilities/tickets (Point). Mapbox pulls GeoJSON from views/RPC.
- Periodic jobs (Supabase cron or external worker) compute area_risk_snapshots and refresh materialized views for map heatmaps.
- FastAPI (separate) only for AI/simulation orchestration; it can call Supabase RPC and optionally perform heavier optimization.

Tables (concise)
areas

- id (uuid pk)
- name (text)
- code (text unique)
- geom (geometry(MultiPolygon,4326))
- population_total (int)
- population_children (int)
- population_elderly (int)
- created_at (timestamptz default now())

population_stats

- id (uuid pk)
- area_id (uuid fk → areas)
- year (int)
- population_total (int)
- population_children_0_14 (int)
- population_elderly_65_plus (int)
- created_at (timestamptz default now())

facilities

- id (uuid pk)
- area_id (uuid fk)
- type (facility_type enum)
- name (text)
- geom (geometry(Point,4326))
- health_grade (char(1) check A/B/C)
- last_inspection_at (timestamptz)
- has_open_ticket (bool default false)
- created_at (timestamptz default now())

facility_inspections

- id (uuid pk)
- facility_id (uuid fk)
- inspected_at (timestamptz)
- status (inspection_status enum)
- notes (text)
- issues_count (int)
- incident_count_last_year (int)
- photo_url (text)
- created_at (timestamptz default now())

tickets

- id (uuid pk)
- area_id (uuid fk)
- facility_id (uuid fk null)
- geom (geometry(Point,4326) null) -- allow location for area-level
- source (ticket_source enum)
- type (text)
- severity (smallint check 1–3)
- status (ticket_status enum)
- created_at (timestamptz default now())
- updated_at (timestamptz default now())
- sla_days (int)
- sla_due_at (timestamptz)
- closed_at (timestamptz)
- estimated_cost (numeric(12,2))
- risk_impact (numeric(6,2))
- description (text)
- reporter_contact (text null)
- media_urls (text[] null)

ticket_events

- id (uuid pk)
- ticket_id (uuid fk)
- event_type (ticket_event_type enum)
- created_at (timestamptz default now())
- data (jsonb)

area_risk_snapshots

- id (uuid pk)
- area_id (uuid fk)
- computed_at (timestamptz default now())
- risk_score (numeric(5,2))
- components (jsonb)

missions

- id (uuid pk)
- area_id (uuid fk)
- facility_id (uuid fk null)
- title (text)
- description (text)
- type (text)
- status (mission_status enum)
- created_at (timestamptz default now())
- due_at (timestamptz)

mission_reports

- id (uuid pk)
- mission_id (uuid fk)
- facility_id (uuid fk null)
- created_at (timestamptz default now())
- status (mission_report_status enum)
- notes (text)
- photo_url (text)

Incidents table (optional but useful)

- id (uuid pk)
- facility_id (uuid fk null)
- area_id (uuid fk)
- occurred_at (timestamptz)
- type (text)
- severity (smallint)
- geom (geometry(Point,4326) null)

Sample DDL (core)

create type facility_type as enum ('park','playground','street_light','tree','toilet','other');
create type inspection_status as enum ('ok','minor_issue','major_issue');
create type ticket_source as enum ('citizen','inspection','system');
create type ticket_status as enum ('open','assigned','in_progress','completed','cancelled');
create type ticket_event_type as enum ('reported','assigned','work_started','completed','cancelled','comment');
create type mission_status as enum ('open','completed','expired');
create type mission_report_status as enum ('ok','issue_found');

create table areas (
id uuid primary key default gen_random_uuid(),
name text not null,
code text unique,
geom geometry(MultiPolygon,4326) not null,
population_total int,
population_children int,
population_elderly int,
created_at timestamptz default now()
);
create index areas_gix on areas using gist (geom);

create table facilities (
id uuid primary key default gen_random_uuid(),
area_id uuid not null references areas(id),
type facility_type not null,
name text not null,
geom geometry(Point,4326) not null,
health_grade char(1) not null check (health_grade in ('A','B','C')),
last_inspection_at timestamptz,
has_open_ticket boolean not null default false,
created_at timestamptz default now()
);
create index facilities_area_idx on facilities(area_id);
create index facilities_gix on facilities using gist (geom);

create table tickets (
id uuid primary key default gen_random_uuid(),
area_id uuid not null references areas(id),
facility_id uuid references facilities(id),
geom geometry(Point,4326),
source ticket_source not null,
type text not null,
severity smallint check (severity between 1 and 3),
status ticket_status not null default 'open',
created_at timestamptz not null default now(),
updated_at timestamptz not null default now(),
sla_days int,
sla_due_at timestamptz,
closed_at timestamptz,
estimated_cost numeric(12,2),
risk_impact numeric(6,2),
description text,
reporter_contact text,
media_urls text[],
constraint fk_area_facility_area check (facility_id is null or area_id is not null)
);
create index tickets_area_idx on tickets(area_id);
create index tickets_status_idx on tickets(status);
create index tickets_sla_due_idx on tickets(sla_due_at);
create index tickets_gix on tickets using gist (geom);

create table area_risk_snapshots (
id uuid primary key default gen_random_uuid(),
area_id uuid not null references areas(id),
computed_at timestamptz not null default now(),
risk_score numeric(5,2) not null,
components jsonb not null
);
create index ars_area_time_idx on area_risk_snapshots(area_id, computed_at desc);

Risk score model (simple, explainable)

- risk_score = clamp(0,100, w1facility_aging + w2overdue_ratio + w3incident_density + w4vulnerable_index)
- facility_aging: 0–100 from share of facilities with grade C or last_inspection_at older than threshold. Example: aging = 100 \* ( (count_C +
  count_overdue_inspection) / total_facilities ).
- overdue_ratio: 0–100 from open tickets where sla_due_at < now(). overdue_ratio = 100 \* (overdue_open / open_total). If no open tickets, 0.
- incident_density: normalize incidents per km² or per 1k people using incidents table or incident_count_last_year aggregated; scale to 0–100
  by percentile over all areas.
- vulnerable_index: normalized (population_children + population_elderly) / population_total, scaled to 0–100 by percentile.
- Suggested weights (tune in SQL constants): w1=0.3, w2=0.35, w3=0.2, w4=0.15. Compute via SQL view using windowed percentiles or precomputed
  with a scheduled job to area_risk_snapshots.

Budget simulation model

- Data needed: open tickets with estimated_cost, risk_impact, area_id, sla_due_at, severity, area_risk (join latest snapshot).
- Algorithm (greedy): For each area, compute priority_score = risk_impact / estimated_cost, boosted by child density percentile. Global budget
  allocation picks tickets sorted by priority_score, spending until budget exhausted.
- Inputs: base_budget (numeric), delta (numeric, e.g., 0.2), optional focus_weight for child density.
- Steps:
  1. Pull latest area risk snapshot and child ratio.
  2. Compute priority_score = (risk_impact / estimated_cost) \* (1 + child_ratio) and optionally + severity factor.
  3. Sort open tickets by score; simulate funding until new_budget = base_budget \* (1+delta) is exhausted; mark funded tickets.
  4. For funded tickets, subtract their risk_impact from area risk (simple linear reduction; ensure clamp ≥0).
  5. Count areas moving from red (>70) to yellow (40–70) or green (<40).
- Implementation: SQL function or materialized view to prepare ticket priority list; FastAPI RPC simulate_budget(delta, base_budget) to run
  greedy in SQL (window with running sum) or perform in Python.

RPC functions (contract)

- get_area_overview(area_uuid) → rows: area_id, name, centroid (ST_Centroid), latest_risk_score, components, facility_counts, tickets_open,
  tickets_overdue, grade_distribution json.
- list_areas_heatmap() → rows: area_id, name, centroid, risk_score (latest), grade_C_ratio, overdue_ratio.
- get_nearby_risk(lat double precision, lng double precision, radius_m integer) → facilities in radius with id, type, health_grade; tickets
  within radius with status, sla_due_at; summary risk derived from nearest area snapshot.
- list_tickets_in_bbox(min_lng, min_lat, max_lng, max_lat) → tickets id, type, status, severity, sla_due_at, geom (as GeoJSON), area_id,
  facility_id.
- create_ticket(area_id uuid, facility_id uuid default null, geom geometry default null, source ticket_source, type text, severity smallint,
  description text, media_urls text[], sla_days int default 30) → inserts ticket, sets sla_due_at, returns ticket row.
- add_ticket_event(ticket_id uuid, event_type ticket_event_type, data jsonb) → inserts event; updates ticket status & timestamps if
  applicable.
- report_mission(mission_id uuid, facility_id uuid default null, status mission_report_status, notes text, photo_url text) → inserts mission
  report; auto-close mission if status issue_found/ok and due passed.
- simulate_budget(delta numeric, base_budget numeric) → returns per-area: area_id, prev_risk, new_risk, prev_bucket, new_bucket,
  tickets_funded_count, extra_budget_used, funded_ticket_ids[].
- get_policy_components(area_id uuid) → returns latest components breakdown for explainability.
- list_facilities_in_area(area_id uuid) → facilities with geom, type, health_grade, has_open_ticket, last_inspection_at.
- get_timeline(ticket_id uuid) → ordered ticket_events for the timeline.

PostGIS usage & indexes

- areas.geom: geometry(MultiPolygon,4326); GIST index areas_gix; used with ST_Contains, ST_Intersects, ST_Centroid.
- facilities.geom: geometry(Point,4326); GIST index facilities_gix; queries: ST_DWithin for nearby, ST_Intersects with bbox (&& +
  ST_MakeEnvelope).
- tickets.geom: geometry(Point,4326) optional; GIST index tickets_gix; viewport queries with bbox; SLA-overdue filter with sla_due_at < now()
  and status not completed/cancelled.
- Heatmap: materialized view joining areas with latest area_risk_snapshots; frontend fetch as GeoJSON via ST_AsGeoJSON(geom) and centroid
  for labels.

Next steps (optional)

- Add RLS: public select on all; insert on tickets/mission_reports with basic validation; deny delete/update except controlled RPC for status
  transitions.
- Add cron job to recompute area_risk_snapshots daily.
