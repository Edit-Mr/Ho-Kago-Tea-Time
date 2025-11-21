// scripts/import-districts.ts
import pg from "pg";
const { Client } = pg;

async function main() {
  console.log("🏙 Generating districts from villages…");

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  // This inserts or updates all districts for all counties
  const sql = `
    with villages as (
      select
        name,
        code,
        level,
        (regexp_replace(name, '([^縣市]+)([^鄉鎮市區]+)(.+)', '\\1')) as county,
        (regexp_replace(name, '([^縣市]+)([^鄉鎮市區]+)(.+)', '\\2')) as town
      from public.areas
      where level = 'village'
    ),
    grouped as (
      select
        county,
        town,
        string_agg(code, ',') as codes
      from villages
      group by county, town
    ),
    union_geom as (
      select
        county,
        town,
        (select ST_Multi(ST_Union(a.geom))
         from public.areas a
         where a.level = 'village'
         and a.name like county || town || '%'
        ) as geom
      from grouped
    )
    insert into public.areas (name, code, geom, level)
    select
      county || town as name,
      county || '-' || town as code,
      geom,
      'district'
    from union_geom
    on conflict (code) do update
    set name = excluded.name,
        geom = excluded.geom,
        level = 'district';
  `;

  await client.query(sql);
  await client.end();
  console.log("🎉 DONE: all districts generated.");
}

main().catch(err => {
  console.error("❌ Error:", err);
  process.exit(1);
});
