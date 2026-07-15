import { describe, it, expect } from "vitest";
import { writeFileSync } from "fs";
import { jumpApexPx, simulateJumpFlight, simulateDoubleJumpFlight } from "./jump-physics";

describe("scratch2", () => {
  it("prints candidates", () => {
    const TILE = 16;
    const lines: string[] = [];
    for (const base of [345, 350, 355, 360, 365, 370, 375, 380]) {
      const capMax = base * 1.24;
      const s0 = simulateJumpFlight(base);
      const sMax = simulateJumpFlight(capMax);
      const dbl = simulateDoubleJumpFlight(base);
      lines.push(
        `base=${base} sim0=${(s0.apexPx / TILE).toFixed(2)}t simMax=${(sMax.apexPx / TILE).toFixed(2)}t ` +
        `marginTo7t=${(7 - sMax.apexPx / TILE).toFixed(2)}t doubleJumpSim=${(dbl.apexPx / TILE).toFixed(2)}t`
      );
    }
    writeFileSync("_scratch2-out.txt", lines.join("\n"));
    expect(true).toBe(true);
  });
});
