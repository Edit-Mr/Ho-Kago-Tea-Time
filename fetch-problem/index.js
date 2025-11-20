import fs from "fs";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

const BASE_URL = "https://114hsinchuhackathon.com/wish-content/?proposal_id=";

const START_ID = 7;
const END_ID = 142;

const results = [];

async function scrapeProposal(id) {
    const url = `${BASE_URL}${id}`;
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();

        const $ = cheerio.load(html);

        const title = $("h1").first().text().trim();

        const getTextAfter = label => $(`h3:contains(${label})`).next(".content-text").text().trim();

        const problem = getTextAfter("問題描述");
        const idea = getTextAfter("解決想法");
        const impact = getTextAfter("願望目標及對社會的影響");

        const agree = $(".stats-item")
            .filter((_, el) => $(el).find(".stats-icon").text().includes("👍"))
            .find(".stats-number")
            .text()
            .trim();

        const disagree = $(".stats-item")
            .filter((_, el) => $(el).find(".stats-icon").text().includes("✋"))
            .find(".stats-number")
            .text()
            .trim();

        if (title) {
            results.push({ id, title, problem, idea, impact, agree, disagree });
            console.log(`✅ Got proposal ${id}: ${title}`);
        } else {
            console.log(`⚠️ Skipped proposal ${id} (no title)`);
        }
    } catch (err) {
        console.log(`❌ Error fetching ${url}: ${err.message}`);
    }
}

async function main() {
    for (let id = START_ID; id <= END_ID; id++) {
        await scrapeProposal(id);
    }

    // CSV header
    const header = "id,title,problem,idea,impact,agree,disagree\n";
    // sanitize function: remove newlines, collapse whitespace, and escape quotes for CSV
    const sanitize = s => (s || "")
        .replace(/\r\n|\n|\r/g, ' ') // replace any newline with a space
        .replace(/"/g, '""') // escape double quotes for CSV
        .replace(/\s+/g, ' ') // collapse multiple whitespace into single space
        .trim();

    const rows = results.map(r =>
        [r.id,
         `"${sanitize(r.title)}"`,
         `"${sanitize(r.problem)}"`,
         `"${sanitize(r.idea)}"`,
         `"${sanitize(r.impact)}"`,
         (r.agree || '0'),
         (r.disagree || '0')
        ].join(",")
    );

    fs.writeFileSync("output.csv", header + rows.join("\n"), "utf8");
    console.log(`\n📁 Done. Saved ${results.length} entries to output.csv`);
}

main();
