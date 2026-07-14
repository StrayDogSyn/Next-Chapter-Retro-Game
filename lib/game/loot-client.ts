/**
 * Browser -> Python loot service, called directly (ADR-008).
 *
 * Previously this went through a Next.js API route (app/api/loot/route.ts)
 * that proxied the request server-side. That route used `request.url`, which
 * is incompatible with `output: "export"` (static hosting has no server to
 * run route handlers against) and broke the production build. Since the
 * route added no logic beyond forwarding the query string and JSON body, the
 * browser now calls python-service directly — see ADR-008 in DECISIONS.md.
 *
 * python-service must have CORS enabled for the site's origin (see
 * python-service/main.py) since this is now a cross-origin request in
 * production.
 */
import { isLootDrop, type LootDrop } from "./items";

export type LootRollResult =
  | { ok: true; drop: LootDrop }
  | { ok: false; drop: null; error: string };

function withTimeout(ms: number): { signal: AbortSignal; clear: () => void } {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), ms);
  return { signal: abort.signal, clear: () => clearTimeout(timer) };
}

function mergeSignals(signals: AbortSignal[]): AbortSignal {
  const active = signals.filter(Boolean);
  if (active.length === 0) return new AbortController().signal;
  if (active.length === 1) return active[0];
  const controller = new AbortController();
  for (const signal of active) {
    if (signal.aborted) {
      controller.abort();
      break;
    }
    signal.addEventListener("abort", () => controller.abort(), { once: true });
  }
  return controller.signal;
}

function pythonServiceBase(): string {
  return process.env.NEXT_PUBLIC_PYTHON_SERVICE_URL ?? "http://127.0.0.1:8000";
}

export async function fetchLootRoll(
  seed: number,
  luck: number,
  enemyLevel: number,
  signal?: AbortSignal,
): Promise<LootRollResult> {
  const params = new URLSearchParams({
    seed: String(seed),
    luck: String(luck),
    enemy_level: String(enemyLevel),
  });

  const timeout = withTimeout(3000);
  try {
    const resp = await fetch(`${pythonServiceBase()}/loot/roll?${params.toString()}`, {
      cache: "no-store",
      signal: signal ? mergeSignals([signal, timeout.signal]) : timeout.signal,
    });
    if (!resp.ok) {
      return { ok: false, drop: null, error: `HTTP ${resp.status}` };
    }
    const payload = await resp.json();
    if (!isLootDrop(payload)) {
      return { ok: false, drop: null, error: "Invalid loot payload" };
    }
    const drop = payload;
    return { ok: true, drop };
  } catch (error) {
    return {
      ok: false,
      drop: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  } finally {
    timeout.clear();
  }
}
