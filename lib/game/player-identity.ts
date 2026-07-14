/**
 * Anonymous player identity for beta persistence (ADR-009). No accounts -
 * a client-generated UUID stored in localStorage is the only identity.
 * Known limitation: clearing browser storage orphans the server-side save.
 */
const STORAGE_KEY = "ncrg:playerId";

let cached: string | null | undefined;

function fallbackUuidLike(): string {
  const time = Date.now().toString(16);
  const rand = Math.floor(Math.random() * 0xffffffff)
    .toString(16)
    .padStart(8, "0");
  return `fallback-${time}-${rand}`;
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
        id = fallbackUuidLike();
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
