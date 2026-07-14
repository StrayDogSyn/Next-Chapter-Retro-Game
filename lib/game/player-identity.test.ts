import { beforeEach, describe, expect, it, vi } from "vitest";
import { fallbackUuidV4 } from "./player-identity";

// CR-013: python-service/main.py declares client_uuid as a Pydantic
// uuid.UUID field, which rejects anything that isn't valid UUID syntax.
// This is the exact shape FastAPI/pydantic validates against.
const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("fallbackUuidV4", () => {
  it("produces syntactically valid RFC 4122 UUID v4 strings", () => {
    for (let i = 0; i < 50; i++) {
      const id = fallbackUuidV4();
      expect(id, `"${id}" is not valid UUID v4 syntax`).toMatch(UUID_V4_RE);
    }
  });

  it("sets the version nibble to 4", () => {
    const id = fallbackUuidV4();
    expect(id.charAt(14)).toBe("4");
  });

  it("sets the variant nibble to one of 8/9/a/b (RFC 4122 variant)", () => {
    const id = fallbackUuidV4();
    expect(["8", "9", "a", "b"]).toContain(id.charAt(19).toLowerCase());
  });

  it("does not use the old non-UUID 'fallback-<hex>-<hex>' format", () => {
    const id = fallbackUuidV4();
    expect(id.startsWith("fallback-")).toBe(false);
  });

  it("produces distinct values across calls (not a constant/degenerate generator)", () => {
    const ids = new Set(Array.from({ length: 20 }, () => fallbackUuidV4()));
    expect(ids.size).toBe(20);
  });
});

type StorageStub = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

function makeStorage(initial: Record<string, string> = {}): StorageStub {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
  };
}

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllGlobals();
});

describe("getOrCreatePlayerId", () => {
  it("heals legacy fallback-prefixed IDs in localStorage", async () => {
    const storage = makeStorage({ "ncrg:playerId": "fallback-9d95d316-4f63" });
    const newId = "21f85411-b4aa-4be8-b4f7-8234d847a2d1";

    vi.stubGlobal("localStorage", storage as unknown as Storage);
    vi.stubGlobal("crypto", { randomUUID: vi.fn(() => newId) });

    const mod = await import("./player-identity");
    const id = mod.getOrCreatePlayerId();

    expect(id).toBe(newId);
    expect(id).toMatch(UUID_V4_RE);
    expect(storage.getItem("ncrg:playerId")).toBe(newId);
  });

  it("returns the cached ID even if storage changes until module reset", async () => {
    const storage = makeStorage();
    const firstId = "d90bc6ca-a813-4d5f-8090-3fbd6f1903bb";
    const secondId = "86ef4063-e577-4ed3-b28f-83b5ce22e3b5";
    const randomUUID = vi.fn(() => firstId);

    vi.stubGlobal("localStorage", storage as unknown as Storage);
    vi.stubGlobal("crypto", { randomUUID });

    const mod = await import("./player-identity");
    const idA = mod.getOrCreatePlayerId();
    storage.setItem("ncrg:playerId", secondId);
    const idB = mod.getOrCreatePlayerId();

    expect(idA).toBe(firstId);
    expect(idB).toBe(firstId);
    expect(randomUUID).toHaveBeenCalledTimes(1);
  });

  it("uses storage value after module reset", async () => {
    const storage = makeStorage({ "ncrg:playerId": "d90bc6ca-a813-4d5f-8090-3fbd6f1903bb" });

    vi.stubGlobal("localStorage", storage as unknown as Storage);
    vi.stubGlobal("crypto", { randomUUID: vi.fn(() => "86ef4063-e577-4ed3-b28f-83b5ce22e3b5") });

    const mod1 = await import("./player-identity");
    const id1 = mod1.getOrCreatePlayerId();
    expect(id1).toBe("d90bc6ca-a813-4d5f-8090-3fbd6f1903bb");

    vi.resetModules();
    const mod2 = await import("./player-identity");
    const id2 = mod2.getOrCreatePlayerId();
    expect(id2).toBe("d90bc6ca-a813-4d5f-8090-3fbd6f1903bb");
  });

  it("falls back to fallbackUuidV4 when crypto.randomUUID is unavailable", async () => {
    const storage = makeStorage();

    vi.stubGlobal("localStorage", storage as unknown as Storage);
    vi.stubGlobal("crypto", {} as unknown as Crypto);

    const mod = await import("./player-identity");
    const id = mod.getOrCreatePlayerId();

    expect(id).toMatch(UUID_V4_RE);
    expect(storage.getItem("ncrg:playerId")).toBe(id);
  });
});
