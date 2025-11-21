// scripts/import-villages.ts
import fs from "fs/promises";
import path from "path";
import pg from "pg";

const { Client } = pg;

async function main() {
  console.log("🌏 Loading Taiwan village boundaries from local file…");

  const localPath = path.join(process.cwd(), "tw-2013-03.json");
  const rawData = await fs.readFile(localPath, "utf8");
  const geojson = JSON.parse(rawData);

  if (geojson.type !== "FeatureCollection") {
    throw new Error("Invalid GeoJSON: expected FeatureCollection");
  }

  const features = geojson.features;
  console.log("📦 Total villages:", features.length);

  // Save raw (optional)
  const rawPath = path.join(process.cwd(), "data/taiwan-villages.raw.json");
  await fs.mkdir("data", { recursive: true });
  await fs.writeFile(rawPath, JSON.stringify(features, null, 2), "utf8");

  // Connect to DB
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  console.log("🔌 Connected to DB");

  // Deduplicate by code (keep last occurrence)
  const codeMap = new Map();
  for (const f of features) {
    const code = f.properties?.VILLCODE;
    if (code) {
      codeMap.set(code, f);
    }
  }
  const uniqueFeatures = Array.from(codeMap.values());
  console.log(`📋 Unique villages after deduplication: ${uniqueFeatures.length}`);

  // Prepare all values for a single bulk insert
  const values: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  for (const f of uniqueFeatures) {
    const p = f.properties;
    const g = f.geometry;

    if (!g) continue;

    const county = p.COUNTY;
    const town = p.TOWN;
    const village = p.VILLAGE;

    const code = p.VILLCODE; // unique
    const name = `${county}${town}${village}`; // e.g. 臺中市西屯區何安里

    const geomGeoJSON = JSON.stringify(g);

    values.push(`($${paramIndex}, $${paramIndex + 1}, ST_SetSRID(ST_Multi(ST_GeomFromGeoJSON($${paramIndex + 2})), 4326), 'village')`);
    params.push(name, code, geomGeoJSON);
    paramIndex += 3;
  }

  console.log(`→ Inserting ${values.length} villages in one query...`);

  await client.query(
    `
    INSERT INTO public.areas (name, code, geom, level)
    VALUES ${values.join(',\n')}
    ON CONFLICT (code) DO UPDATE
    SET name = EXCLUDED.name,
        geom = EXCLUDED.geom,
        level = 'village'
    `,
    params
  );

  await client.end();
  console.log("🎉 DONE: All villages imported/updated.");
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
