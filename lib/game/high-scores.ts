export type HighScoreOutcome = "dead" | "victory";

export type HighScoreEntry = {
  initials: string;
  score: number;
  timeSeconds: number;
  seed: string;
  outcome: HighScoreOutcome;
  achievedAt: number;
};

type HighScorePayload = {
  version: 1;
  entries: HighScoreEntry[];
};

export type PendingHighScore = {
  seed: string;
  score: number;
  timeSeconds: number;
  outcome: HighScoreOutcome;
};

// Versioned keys allow format migration without corrupting older clients.
const STORAGE_KEY = "ncrg:highScores:v1";
const PENDING_STORAGE_KEY = "ncrg:highScores:pending:v1";
const MAX_ENTRIES = 3;

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function sanitizeInitials(initials: string): string {
  const cleaned = initials.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3);
  return cleaned || "YOU";
}

function isEntry(value: unknown): value is HighScoreEntry {
  if (!value || typeof value !== "object") return false;
  const x = value as Partial<HighScoreEntry>;
  return (
    typeof x.initials === "string" &&
    typeof x.score === "number" &&
    Number.isFinite(x.score) &&
    typeof x.timeSeconds === "number" &&
    Number.isFinite(x.timeSeconds) &&
    typeof x.seed === "string" &&
    (x.outcome === "dead" || x.outcome === "victory") &&
    typeof x.achievedAt === "number" &&
    Number.isFinite(x.achievedAt)
  );
}

function loadPayload(): HighScorePayload {
  if (!isBrowser()) return { version: 1, entries: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { version: 1, entries: [] };
    const parsed = JSON.parse(raw) as Partial<HighScorePayload>;
    if (parsed.version !== 1 || !Array.isArray(parsed.entries)) {
      return { version: 1, entries: [] };
    }
    const entries = parsed.entries
      .filter(isEntry)
      .map((entry) => ({
        initials: sanitizeInitials(entry.initials),
        score: Math.max(0, Math.round(entry.score)),
        timeSeconds: Math.max(0, Math.floor(entry.timeSeconds)),
        seed: entry.seed,
        outcome: entry.outcome,
        achievedAt: Math.max(0, Math.floor(entry.achievedAt)),
      }));
    return { version: 1, entries };
  } catch {
    return { version: 1, entries: [] };
  }
}

function savePayload(payload: HighScorePayload) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage failures (private mode / quota / policy).
  }
}

function isPending(value: unknown): value is PendingHighScore {
  if (!value || typeof value !== "object") return false;
  const x = value as Partial<PendingHighScore>;
  return (
    typeof x.seed === "string" &&
    typeof x.score === "number" &&
    Number.isFinite(x.score) &&
    typeof x.timeSeconds === "number" &&
    Number.isFinite(x.timeSeconds) &&
    (x.outcome === "dead" || x.outcome === "victory")
  );
}

function loadPending(): PendingHighScore | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(PENDING_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isPending(parsed)) return null;
    return {
      seed: parsed.seed,
      score: Math.max(0, Math.round(parsed.score)),
      timeSeconds: Math.max(0, Math.floor(parsed.timeSeconds)),
      outcome: parsed.outcome,
    };
  } catch {
    return null;
  }
}

function savePending(entry: PendingHighScore | null) {
  if (!isBrowser()) return;
  try {
    if (!entry) {
      localStorage.removeItem(PENDING_STORAGE_KEY);
      return;
    }
    localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // Ignore storage failures (private mode / quota / policy).
  }
}

function compareEntries(a: HighScoreEntry, b: HighScoreEntry): number {
  // Sort by score desc, then faster time, then most recent for deterministic
  // tie-breaking in localStorage snapshots.
  if (b.score !== a.score) return b.score - a.score;
  if (a.timeSeconds !== b.timeSeconds) return a.timeSeconds - b.timeSeconds;
  return b.achievedAt - a.achievedAt;
}

function sortEntries(entries: HighScoreEntry[]): HighScoreEntry[] {
  return [...entries].sort(compareEntries);
}

export function computeArcadeScore(input: {
  coins: number;
  enemiesDefeated: number;
  levelUps: number;
  materials: number;
  timeSeconds: number;
  outcome: HighScoreOutcome;
}): number {
  const coins = Math.max(0, Math.floor(input.coins));
  const enemies = Math.max(0, Math.floor(input.enemiesDefeated));
  const levels = Math.max(0, Math.floor(input.levelUps));
  const materials = Math.max(0, Math.floor(input.materials));
  const time = Math.max(0, Math.floor(input.timeSeconds));

  const base = coins * 10 + enemies * 125 + levels * 400 + materials * 20;
  const survivalBonus = Math.max(0, 2000 - time * 4);
  const victoryBonus = input.outcome === "victory" ? 5000 : 0;
  return Math.max(0, Math.round(base + survivalBonus + victoryBonus));
}

export function getHighScores(): HighScoreEntry[] {
  return sortEntries(loadPayload().entries).slice(0, MAX_ENTRIES);
}

export function recordHighScore(input: {
  initials?: string;
  seed: string;
  score: number;
  timeSeconds: number;
  outcome: HighScoreOutcome;
}): HighScoreEntry[] {
  const payload = loadPayload();
  const entry: HighScoreEntry = {
    initials: sanitizeInitials(input.initials ?? "YOU"),
    seed: input.seed,
    score: Math.max(0, Math.round(input.score)),
    timeSeconds: Math.max(0, Math.floor(input.timeSeconds)),
    outcome: input.outcome,
    achievedAt: Date.now(),
  };
  const next = sortEntries([...payload.entries, entry]).slice(0, MAX_ENTRIES);
  savePayload({ version: 1, entries: next });
  return next;
}

export function getPendingHighScore(): PendingHighScore | null {
  return loadPending();
}

export function clearPendingHighScore() {
  savePending(null);
}

export function queuePendingHighScore(input: {
  seed: string;
  score: number;
  timeSeconds: number;
  outcome: HighScoreOutcome;
}): PendingHighScore | null {
  const payload = loadPayload();
  const candidate: HighScoreEntry = {
    initials: "YOU",
    seed: input.seed,
    score: Math.max(0, Math.round(input.score)),
    timeSeconds: Math.max(0, Math.floor(input.timeSeconds)),
    outcome: input.outcome,
    achievedAt: Date.now(),
  };

  const sorted = sortEntries(payload.entries);
  // Candidate qualifies if board has room OR beats the current cutoff entry.
  const qualifies =
    sorted.length < MAX_ENTRIES || compareEntries(candidate, sorted[Math.min(sorted.length, MAX_ENTRIES) - 1]) < 0;

  if (!qualifies) return null;

  const pending: PendingHighScore = {
    seed: candidate.seed,
    score: candidate.score,
    timeSeconds: candidate.timeSeconds,
    outcome: candidate.outcome,
  };
  savePending(pending);
  return pending;
}

export function finalizePendingHighScore(initials?: string): HighScoreEntry[] {
  const pending = loadPending();
  if (!pending) return getHighScores();
  const next = recordHighScore({
    initials,
    seed: pending.seed,
    score: pending.score,
    timeSeconds: pending.timeSeconds,
    outcome: pending.outcome,
  });
  savePending(null);
  return next;
}

export function formatScore(value: number): string {
  return Math.max(0, Math.round(value)).toString().padStart(4, "0");
}

export function formatElapsed(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}
