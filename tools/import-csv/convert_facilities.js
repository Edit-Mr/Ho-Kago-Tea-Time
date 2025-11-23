// convert_facilities.js
// Usage: node convert_facilities.js input.csv output.sql

const fs = require("fs");

if (process.argv.length < 4) {
  console.error("Usage: node convert_facilities.js input.csv output.sql");
  process.exit(1);
}

const input = process.argv[2];
const output = process.argv[3];

const typeMap = {
  park: "park",
  toilet: "public_toilet",
  bridge: "bridge",
  bike: "bike_station",
  dangerous: "hazardous_factory",
  police: "police_station",
  camera: "cctv",
  light: "street_light",
  sidework: "road",
  wifi_hotspot:"wifi_hotspot"
};

const raw = fs.readFileSync(input, "utf8").trim();
const lines = raw.split(/\r?\n/);

const esc = (s) => s.replace(/'/g, "''");

let sql = "";

for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);

  const rawType = cols[0].trim().toLowerCase();
  const mapped = typeMap[rawType];

  if (!mapped) {
    console.warn(`⚠️ Unknown type "${rawType}", row ${i+1}`);
    continue;
  }

  const name = cols[1];
  const lat = parseFloat(cols[2]);
  const lon = parseFloat(cols[3]);
  const description = esc(cols.slice(5).join(",").trim());

  sql += `INSERT INTO public.facilities (type, name, geom, health_grade, last_inspection_at, description)\nVALUES (\n`;
  sql += `  '${mapped}',\n`;
  sql += `  '${esc(name)}',\n`;
  sql += `  ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326),\n`;
  sql += `  'A',\n`;
  sql += `  now(),\n`;
  sql += `  '${description}'\n`;
  sql += `);\n\n`;
}

fs.writeFileSync(output, sql, "utf8");
console.log("SQL generated:", output);
