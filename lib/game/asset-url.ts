/**
 * Prefixes a root-absolute public/ path with the deployed base path (ADR-011).
 *
 * next.config.mjs already sets basePath/assetPrefix for anything Next.js
 * routes itself (pages, next/image, etc.), but plain runtime fetch()/Image()
 * calls to paths like "/sprites/hero.png" bypass that entirely - under
 * GitHub Pages (served at /Next-Chapter-Retro-Game/) those 404 in
 * production. Every such call must go through this helper instead of a
 * literal string.
 */
export function assetUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return `${base}${path}`;
}
