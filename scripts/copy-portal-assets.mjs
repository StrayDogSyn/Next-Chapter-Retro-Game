// The deploy workflow (.github/workflows/deploy.yml) uploads only the
// Next.js static-export output (`out/`) as the Pages artifact - the
// repo-root index.html/styles/ submission portal was never part of that
// build, so it has never actually been reachable on the live site (verified
// 2026-07-17: styles/tokens.css 404s at the deployed domain). Next's `public/`
// folder *is* copied into `out/` verbatim, so this script mirrors the portal
// into public/portal/ before every build, making it ride along for free
// without touching the deploy workflow itself. Source of truth stays the
// repo-root files; this copy is regenerated every build and gitignored.
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DEST = join(ROOT, "public", "portal");

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

ensureDir(DEST);
ensureDir(join(DEST, "styles"));
ensureDir(join(DEST, "assets", "sprites"));

// index.html, with the one asset path that now needs to point at the
// already-public, pipeline-managed branding copy instead of a duplicate.
let html = readFileSync(join(ROOT, "index.html"), "utf8");
html = html.replace(
  'src="assets/img/branding/straydog-syndications-llc-tag-us.png"',
  'src="../assets/branding/straydog-syndications-llc-tag-us.png"'
);
writeFileSync(join(DEST, "index.html"), html);

// Portal-exclusive stylesheets (no url() references, safe to copy verbatim).
for (const file of ["tokens.css", "base.css", "layout.css", "components.css", "animations.css", "responsive.css"]) {
  copyFileSync(join(ROOT, "styles", file), join(DEST, "styles", file));
}

// Portal-exclusive images not otherwise wired into public/ by prepare-assets.py.
copyFileSync(join(ROOT, "assets", "loading-page.gif"), join(DEST, "assets", "loading-page.gif"));
copyFileSync(
  join(ROOT, "assets", "sprites", "oga-swm-mainchar-animtest-80x5.gif"),
  join(DEST, "assets", "sprites", "oga-swm-mainchar-animtest-80x5.gif")
);

console.log("Copied submission portal into public/portal/ for static export.");
