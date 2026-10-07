// Felles hjelpere for henteskriptene.
import { readFile, writeFile, mkdir } from "node:fs/promises";

export const DATA = new URL("../public/data/", import.meta.url);
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export const safe = s => s.replace(/[^A-Za-z0-9._-]/g, "_");
export const universe = async () => JSON.parse(await readFile(new URL("./universe.json", import.meta.url), "utf8"));

export async function readJson(name, fb) {
  try { return JSON.parse(await readFile(new URL(name, DATA), "utf8")); } catch { return fb; }
}
export async function writeJson(name, data) {
  const url = new URL(name, DATA);
  await mkdir(new URL(".", url), { recursive: true });
  await writeFile(url, JSON.stringify(data));
}
// Har filen blitt oppdatert de siste `hours` timene? (bruker feltet «updated» i filen, ikke filtid,
// fordi alle filer får ny filtid når GitHub Actions sjekker ut repoet)
export async function fresh(name, hours) {
  const j = await readJson(name, null);
  return !!(j?.updated && Date.now() - new Date(j.updated).getTime() < hours * 3600e3);
}
export async function getJson(url, opts = {}, tries = 3) {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(url, { ...opts, headers: { "User-Agent": "Mozilla/5.0 (Innsideradar)", Accept: "application/json", ...(opts.headers || {}) } });
      if (!r.ok) throw new Error(`${r.status}`);
      return await r.json();
    } catch (e) {
      if (i >= tries) throw new Error(`${url.split("?")[0]}: ${e.message}`);
      await sleep(900 * i);
    }
  }
}
export const osloDate = (d = new Date()) => d.toLocaleDateString("sv-SE", { timeZone: "Europe/Oslo" });
