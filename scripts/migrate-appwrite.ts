/**
 * Descarga el row `main` de Appwrite, aplica migración (clases ILCA 6/7 + descartes)
 * y escribe JSON local para probar en el navegador.
 *
 * Uso:
 *   npx tsx scripts/migrate-appwrite.ts
 *   npx tsx scripts/migrate-appwrite.ts --push   # sube cambios a Appwrite
 *
 * Local: pegá en DevTools → Application → Local Storage → cna_vela_state_v2
 * o importá public/dev-championship.json si servís con `npm run dev`.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { cloudPayload, cloudView } from "../src/domain/cloud.ts";
import { migrateChampionshipState } from "../src/domain/migrate-championship.ts";
import { storedSnapshot } from "../src/domain/mutations.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CHAMP_ID = "main";

const config = {
  appwriteEndpoint: (process.env.VITE_APPWRITE_ENDPOINT || "https://nyc.cloud.appwrite.io/v1").replace(/\/$/, ""),
  appwriteProjectId: process.env.VITE_APPWRITE_PROJECT_ID || "6ac29fc000257d92bdc4",
  appwriteDatabaseId: process.env.VITE_APPWRITE_DATABASE_ID || "6ac2a2b100201252c574",
  appwriteTableId: process.env.VITE_APPWRITE_TABLE_ID || "championship"
};

async function request(method: string, path: string, body?: unknown) {
  const response = await fetch(`${config.appwriteEndpoint}${path}`, {
    method,
    headers: {
      "X-Appwrite-Project": config.appwriteProjectId,
      "Content-Type": "application/json"
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const json = (await response.json().catch(() => ({}))) as { message?: string };
  if (!response.ok) throw new Error(json.message || response.statusText);
  return json;
}

function rowPath(id: string) {
  return `/tablesdb/${config.appwriteDatabaseId}/tables/${config.appwriteTableId}/rows/${id}`;
}

async function main() {
  const push = process.argv.includes("--push");
  console.log("Fetching Appwrite row", CHAMP_ID, "…");
  const row = await request("GET", rowPath(CHAMP_ID));

  const before = cloudView(row);
  const { state, report } = migrateChampionshipState(before);

  const outDir = join(ROOT, "scripts", "output");
  mkdirSync(outDir, { recursive: true });

  const snapshot = storedSnapshot(state);
  const localPath = join(outDir, "championship-local.json");
  const publicPath = join(ROOT, "public", "dev-championship.json");
  const reportPath = join(outDir, "migration-report.txt");

  writeFileSync(localPath, JSON.stringify(snapshot, null, 2));
  writeFileSync(publicPath, JSON.stringify(snapshot, null, 2));
  writeFileSync(reportPath, report.join("\n") + "\n");

  console.log("\n--- Migración ---");
  report.forEach((line) => console.log(" •", line));
  console.log("\nEscrito:");
  console.log(" ", localPath);
  console.log(" ", publicPath);
  console.log(" ", reportPath);

  console.log("\nProbar en local (consola del navegador en la app):");
  console.log(`  fetch('/dev-championship.json').then(r=>r.json()).then(d=>localStorage.setItem('cna_vela_state_v2', JSON.stringify(d)))`);

  if (push) {
    console.log("\nSubiendo a Appwrite…");
    const payload = cloudPayload(state);
    await request("PATCH", rowPath(CHAMP_ID), {
      sailors: payload.sailors,
      events: payload.events
    });
    console.log("Listo: cloud actualizado.");
  } else {
    console.log("\n(Omitido push; usá --push para escribir en Appwrite.)");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
