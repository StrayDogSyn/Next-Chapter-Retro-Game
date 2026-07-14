import { describe, expect, it } from "vitest";
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
