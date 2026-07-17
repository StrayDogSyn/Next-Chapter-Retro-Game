// Serves the static export in /out rooted at the same subpath GitHub Pages
// uses, so a local preview actually matches production instead of 404ing on
// every _next/ asset (next.config.mjs bakes basePath into every build).
//
// Opening out/index.html directly (file://, VS Code Live Server, a plain
// `npx serve out`, etc.) does NOT work for this project: the production
// build hard-codes asset URLs under BASE_PATH below, so they only resolve
// when served from that exact subpath. This script recreates that subpath
// locally instead of trying to strip basePath out of the build.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "out");
// Keep in sync with next.config.mjs's basePath.
const BASE_PATH = "/Next-Chapter-Retro-Game";
const PORT = process.env.PREVIEW_PORT ? Number(process.env.PREVIEW_PORT) : 4173;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};

async function checkOutDir() {
  try {
    await stat(path.join(OUT_DIR, "index.html"));
  } catch {
    console.error(`No build found at ${OUT_DIR}/index.html - run "npm run build" first.`);
    process.exit(1);
  }
}
await checkOutDir();

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  let pathname = decodeURIComponent(url.pathname);

  if (pathname === "/" || !pathname.startsWith(BASE_PATH)) {
    res.writeHead(302, { Location: BASE_PATH + "/" });
    res.end();
    return;
  }

  let rel = pathname.slice(BASE_PATH.length);
  if (rel === "" || rel === "/") rel = "/index.html";

  // Prevent path traversal outside OUT_DIR.
  const filePath = path.normalize(path.join(OUT_DIR, rel));
  if (!filePath.startsWith(OUT_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const data = await readFile(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": MIME[ext] ?? "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("Not found: " + rel);
  }
});

server.listen(PORT, () => {
  console.log(`Preview server running - open http://localhost:${PORT}${BASE_PATH}/`);
});
