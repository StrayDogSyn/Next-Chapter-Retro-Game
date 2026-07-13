/**
 * Anonymous player identity for beta persistence (ADR-009). No accounts -
 * a client-generated UUID stored in localStorage is the only identity.
 * Known limitation: clearing browser storage orphans the server-side save.
 */
const STORAGE_KEY = "ncrg:playerId";

let cached: string | null | undefined;

export function getOrCreatePlayerId(): string | null {
  if (cached !== undefined) return cached;
  if (typeof localStorage === "undefined" || typeof crypto === "undefined" || !crypto.randomUUID) {
    cached = null;
    return null;
  }
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY, id);
    }
    cached = id;
    return id;
  } catch {
    cached = null;
    return null;
  }
}
