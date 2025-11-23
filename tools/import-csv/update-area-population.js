// scripts/generate-area-sql.js
import fs from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse/sync";

const CSV_PATH = path.join(process.cwd(), "population_summary.csv");
const OUTPUT_PATH = path.join(process.cwd(), "hsinchu_update.sql");

async function main() {
  const csvRaw = await fs.readFile(CSV_PATH, "utf8");

  const rows = parse(csvRaw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  let sql = "";

  for (const row of rows) {
    const name = row["name"]?.trim();
    if (!name || name === "總計") continue;

    const genderRatio = row["gender_ratio"] ? Number(row["gender_ratio"]) : null;
    const totalPop = row["total_population"] ? Number(row["total_population"]) : null;
    const avgAge = row["age_average"] ? Number(row["age_average"]) : null;

    sql += `UPDATE public.areas
SET gender_ratio = ${genderRatio},
    population_total = ${totalPop},
    weighted_avg_age = ${avgAge}
WHERE county = '新竹市'
  AND village = '${name}';
\n`;
  }

  await fs.writeFile(OUTPUT_PATH, sql, "utf8");

  console.log("🎉 Done! SQL generated at:", OUTPUT_PATH);
}

main().catch((err) => {
  console.error("❌ ERROR:", err);
  process.exit(1);
});
