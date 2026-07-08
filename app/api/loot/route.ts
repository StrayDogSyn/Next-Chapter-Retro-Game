import { NextResponse } from "next/server";

/**
 * Proxy to the Python loot service (ADR-001: loot rolling lives in Python).
 * The browser never calls the Python service directly — this route keeps the
 * service boundary clean, mirroring app/api/procedural-level/route.ts.
 *
 * On failure this returns { ok: false } and the CLIENT decides to use its
 * degraded-mode fallback roll (ADR-003) so gameplay never hard-blocks on the
 * second service being up.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const seed = url.searchParams.get("seed") ?? "0";
  const luck = url.searchParams.get("luck") ?? "0";
  const enemyLevel = url.searchParams.get("enemyLevel") ?? "1";

  const pythonService = process.env.PYTHON_SERVICE_URL ?? "http://127.0.0.1:8000";

  try {
    const response = await fetch(
      `${pythonService}/loot/roll?seed=${encodeURIComponent(seed)}&luck=${encodeURIComponent(luck)}&enemy_level=${encodeURIComponent(enemyLevel)}`,
      { cache: "no-store" },
    );

    if (!response.ok) {
      throw new Error(`Python service responded with status ${response.status}`);
    }

    const drop = await response.json();
    return NextResponse.json({ ok: true, source: "python-service", drop });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      source: "unavailable",
      drop: null,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
