/**
 * Browser -> Python service persistence calls (ADR-009). Same direct-call
 * pattern as loot-client.ts (ADR-008): no Next.js proxy route, since static
 * export has no server at runtime. Every call is best-effort with a short
 * timeout - the caller always has localStorage as the source of truth to
 * fall back to (see Game.saveGame()/loadSavedGame() in game.ts).
 */
function pythonServiceBase(): string {
  return process.env.NEXT_PUBLIC_PYTHON_SERVICE_URL ?? "http://127.0.0.1:8000";
}

function withTimeout(ms: number): { signal: AbortSignal; clear: () => void } {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), ms);
  return { signal: abort.signal, clear: () => clearTimeout(timer) };
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function registerPlayer(clientUuid: string): Promise<boolean> {
  const { signal, clear } = withTimeout(3000);
  try {
    const resp = await fetch(`${pythonServiceBase()}/players/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_uuid: clientUuid }),
      signal,
    });
    return resp.ok;
  } catch {
    return false;
  } finally {
    clear();
  }
}

export async function saveToServer(clientUuid: string, saveData: unknown): Promise<boolean> {
  const { signal, clear } = withTimeout(3000);
  try {
    const resp = await fetch(`${pythonServiceBase()}/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_uuid: clientUuid, save_data: saveData }),
      signal,
    });
    return resp.ok;
  } catch {
    return false;
  } finally {
    clear();
  }
}

export async function loadFromServer(clientUuid: string): Promise<unknown | null> {
  const { signal, clear } = withTimeout(3000);
  try {
    const params = new URLSearchParams({ client_uuid: clientUuid });
    const resp = await fetch(`${pythonServiceBase()}/load?${params.toString()}`, { signal });
    if (!resp.ok) return null;
    const payload = await resp.json();
    if (!isObjectRecord(payload) || typeof payload.ok !== "boolean") return null;
    if (!payload.ok) return null;
    return "saveData" in payload ? payload.saveData : null;
  } catch {
    return null;
  } finally {
    clear();
  }
}
