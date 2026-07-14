/**
 * Anonymous player identity for beta persistence (ADR-009). No accounts -
 * a client-generated UUID stored in localStorage is the only identity.
 * Known limitation: clearing browser storage orphans the server-side save.
 */
const STORAGE_KEY = "ncrg:playerId";

let cached: string | null | undefined;

/**
 * CR-013: the server (python-service/main.py) declares `client_uuid` as a
 * Pydantic `uuid.UUID` field, which rejects anything that isn't valid UUID
 * syntax. The previous fallback ("fallback-<hex>-<hex>") was never actually
 * a UUID, so a client without crypto.randomUUID (very old browsers, or an
 * insecure/non-HTTPS context where the Crypto API is restricted) would have
 * every /players/register, /save, and /load call rejected by FastAPI's
 * validation - silently and permanently stuck in client-fallback/degraded
 * mode with no indication why. This generates real RFC 4122 UUID v4 syntax
 * via Math.random(); it's not cryptographically strong, but crypto.
 * randomUUID() is already used whenever it's available (this only runs on
 * the narrow path where that API doesn't exist), and correctness of format
 * matters more here than randomness quality - an anonymous identity just
 * needs to not collide and needs to parse.
 */
export function fallbackUuidV4(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getOrCreatePlayerId(): string | null {
  if (cached !== undefined) return cached;
  if (typeof localStorage === "undefined") {
    cached = null;
    return null;
  }
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        id = crypto.randomUUID();
      } else {
        id = fallbackUuidV4();
      }
      localStorage.setItem(STORAGE_KEY, id);
    }
    cached = id;
    return id;
  } catch {
    cached = null;
    return null;
  }
}
