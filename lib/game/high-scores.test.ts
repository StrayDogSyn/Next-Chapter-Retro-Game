import { beforeEach, describe, expect, it } from "vitest";
import {
  computeArcadeScore,
  finalizePendingHighScore,
  formatElapsed,
  formatScore,
  getHighScores,
  getPendingHighScore,
  queuePendingHighScore,
  recordHighScore,
} from "./high-scores";

type MemoryStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

function createMemoryStorage(): MemoryStorage {
  const store = new Map<string, string>();
  return {
    getItem: (key) => (store.has(key) ? store.get(key)! : null),
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
  };
}

describe("high scores", () => {
  beforeEach(() => {
    const memory = createMemoryStorage();
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: globalThis,
    });
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: memory,
    });
  });

  it("computes arcade score with victory bonus", () => {
    const dead = computeArcadeScore({
      coins: 50,
      enemiesDefeated: 10,
      levelUps: 3,
      materials: 20,
      timeSeconds: 300,
      outcome: "dead",
    });
    const win = computeArcadeScore({
      coins: 50,
      enemiesDefeated: 10,
      levelUps: 3,
      materials: 20,
      timeSeconds: 300,
      outcome: "victory",
    });
    expect(win).toBeGreaterThan(dead);
  });

  it("keeps top three sorted by score then time", () => {
    recordHighScore({ initials: "AAA", seed: "S1", score: 1200, timeSeconds: 95, outcome: "dead" });
    recordHighScore({ initials: "BBB", seed: "S2", score: 5000, timeSeconds: 120, outcome: "victory" });
    recordHighScore({ initials: "CCC", seed: "S3", score: 2100, timeSeconds: 89, outcome: "dead" });
    recordHighScore({ initials: "DDD", seed: "S4", score: 2100, timeSeconds: 70, outcome: "dead" });

    const table = getHighScores();
    expect(table).toHaveLength(3);
    expect(table[0].initials).toBe("BBB");
    expect(table[1].initials).toBe("DDD");
    expect(table[2].initials).toBe("CCC");
  });

  it("formats score and elapsed display like arcade readouts", () => {
    expect(formatScore(9)).toBe("0009");
    expect(formatScore(7420)).toBe("7420");
    expect(formatElapsed(754)).toBe("12:34");
  });

  it("queues only qualifying runs and finalizes with initials", () => {
    recordHighScore({ initials: "AAA", seed: "S1", score: 5000, timeSeconds: 110, outcome: "victory" });
    recordHighScore({ initials: "BBB", seed: "S2", score: 3000, timeSeconds: 125, outcome: "dead" });
    recordHighScore({ initials: "CCC", seed: "S3", score: 1000, timeSeconds: 140, outcome: "dead" });

    const low = queuePendingHighScore({ seed: "LOW", score: 900, timeSeconds: 60, outcome: "dead" });
    expect(low).toBeNull();
    expect(getPendingHighScore()).toBeNull();

    const high = queuePendingHighScore({ seed: "HIGH", score: 4200, timeSeconds: 95, outcome: "victory" });
    expect(high).not.toBeNull();
    expect(getPendingHighScore()).not.toBeNull();

    const table = finalizePendingHighScore("Z9");
    expect(getPendingHighScore()).toBeNull();
    expect(table).toHaveLength(3);
    expect(table[1].initials).toBe("Z9");
    expect(table[1].score).toBe(4200);
  });
});
