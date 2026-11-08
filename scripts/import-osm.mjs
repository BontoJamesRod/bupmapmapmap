// Downloads BU Polangui campus data from OpenStreetMap (Overpass API)
// into data/raw/osm-campus.json. Run: npm run data:import
// Data © OpenStreetMap contributors, ODbL.
import { writeFile, mkdir } from "node:fs/promises";

const RELATION_ID = 13027320; // Bicol University Polangui Campus
const ENDPOINT = "https://overpass-api.de/api/interpreter";
const OUT = new URL("../data/raw/osm-campus.json", import.meta.url);

const query = `
[out:json][timeout:90];
rel(${RELATION_ID});
out geom;
map_to_area->.c;
(
  way(area.c)[building];
  node(area.c)[name];
  node(area.c)[barrier];
  node(area.c)[entrance];
  way(area.c)[highway];
);
out geom;
`;

const res = await fetch(ENDPOINT, {
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
    "User-Agent": "bupc-navi-data-import/0.1",
  },
  body: "data=" + encodeURIComponent(query),
});
if (!res.ok) {
  console.error(`Overpass error ${res.status}: ${await res.text()}`);
  process.exit(1);
}
const json = await res.json();
const counts = {};
for (const e of json.elements) {
  const kind = e.tags?.building ? "building" : e.tags?.highway ? "highway" : e.type;
  counts[kind] = (counts[kind] ?? 0) + 1;
}
await mkdir(new URL("../data/raw/", import.meta.url), { recursive: true });
await writeFile(OUT, JSON.stringify({ fetched: new Date().toISOString(), relation: RELATION_ID, elements: json.elements }, null, 1));
console.log("Saved data/raw/osm-campus.json", counts);
