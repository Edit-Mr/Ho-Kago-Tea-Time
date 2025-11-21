alter table public.facility_type_meta add column if not exists icon_name text;

update public.facility_type_meta set icon_name = 'TreePine' where type in ('park','tree');
update public.facility_type_meta set icon_name = 'Play' where type = 'playground';
update public.facility_type_meta set icon_name = 'LampWallDown' where type in ('street_light','streetlight');
update public.facility_type_meta set icon_name = 'Toilet' where type = 'toilet';
update public.facility_type_meta set icon_name = 'AlertTriangle' where type = 'road_hazard';
update public.facility_type_meta set icon_name = 'Shield' where type = 'police_station';
update public.facility_type_meta set icon_name = 'Route' where type = 'sidewalk';
update public.facility_type_meta set icon_name = 'CupSoda' where type = 'drinking_fountain';
update public.facility_type_meta set icon_name = 'HeartHandshake' where type = 'elder_center';
update public.facility_type_meta set icon_name = 'School' where type = 'school_zone';
update public.facility_type_meta set icon_name = 'MapPin' where icon_name is null;
