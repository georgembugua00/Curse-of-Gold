// Reads snapshot.json, written every 15 minutes on the trading PC by scripts/dashboard_snapshot.py and pushed to this repo's `data`
// branch. On Vercel it is fetched from GitHub with a read-only token on every page load (no redeploy needed). Server-only.
import { readFile } from "node:fs/promises";

export async function getSnapshot() {
  if (process.env.SNAPSHOT_FILE) {                                   // local testing
    return { snap: JSON.parse(await readFile(process.env.SNAPSHOT_FILE, "utf8")), error: null };
  }
  const repo = process.env.GITHUB_REPO, tok = process.env.GITHUB_TOKEN;
  if (!repo || !tok) return { snap: null, error: "GITHUB_REPO / GITHUB_TOKEN are not set in Vercel." };
  try {
    const r = await fetch(`https://api.github.com/repos/${repo}/contents/snapshot.json?ref=data`, {
      headers: { Authorization: `Bearer ${tok}`, Accept: "application/vnd.github.raw+json", "X-GitHub-Api-Version": "2022-11-28",
                 "User-Agent": "trading-dashboard" },
      cache: "no-store",
    });
    if (!r.ok) return { snap: null, error: `GitHub answered ${r.status}. Has the PC pushed a snapshot yet?` };
    return { snap: await r.json(), error: null };
  } catch (e) {
    return { snap: null, error: `Could not reach GitHub (${e.name}).` };
  }
}
