// scripts/fix-area-columns.ts
import pg from "pg";

const { Client } = pg;

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  console.log("🔧 Adjusting area table schema...");

  await client.query(`
    alter table public.areas add column if not exists county text;
  `);
  await client.query(`
    alter table public.areas add column if not exists town text;
  `);
  await client.query(`
    alter table public.areas add column if not exists village text;
  `);

  console.log("📦 Updating existing area records...");

  await client.query(`
    update public.areas
    set 
      county = regexp_replace(name, '^([^縣市]+市|[^縣市]+縣).*$', '\\1'),
      town = regexp_replace(name, '^[^縣市]+[縣市]([^鄉鎮市區]+區|[^鄉鎮市區]+鎮|[^鄉鎮市區]+鄉|[^鄉鎮市區]+市).*$', '\\1'),
      village = regexp_replace(name, '^.*?(..里)$', '\\1');
  `);

  console.log("🎉 DONE: areas table fields updated.");
  await client.end();
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
