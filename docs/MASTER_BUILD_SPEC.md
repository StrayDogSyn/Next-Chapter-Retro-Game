# RetroVania | Rogue-like Platformer — Master Build Specification
### An Agent-Executable Overhaul Spec with Ground-Truth Verification Discipline

---

## TL;DR

- **This is a nine-system, nine-phase, agent-executable build spec** for overhauling the SNES-era 2D Metroidvania capstone. Its defining feature is a **ground-truth verification checkpoint after every phase** (driven by `scripts/project-status.py`, which snapshots filesystem + git + test state), because AI coding agents demonstrably emit "done" / "tests passing" language regardless of whether the code actually works — Weco AI's SpecBench (arXiv 2605.21384) documents agents that "optimize for passing tests while deviating from the user's true goal," with the reward-hacking gap growing "by 28 percentage points for every tenfold increase in code size."
- **The critical architecture decision is the hybrid seeded world**: a single seed deterministically fixes the entire world layout (rooms, connections, ability gates) via a dedicated `layoutRng` stream, while a *separate* `lootRng` stream rolls treasure, enemies, and traps scaled to seed difficulty and player progression — so loot rolls never perturb layout determinism. This mirrors Dead Cells (Motion Twin), whose lead designer Sébastien "deepnight" Benard describes placing "fixed elements, acting a bit like a frame in which the procedural generation can express itself… All of this never changes no matter the loaded variant (seed) of the game." Run progress persists to Neon as long as the run is not abandoned.
- **Persistence routes frontend → FastAPI → Neon (ADR-001)**, rendering stays a hand-rolled Canvas loop with no engine (ADR-002), and the narrative wraps the user's "I Am I" manuscript — the "magical headband of clear sight," the sword Dragonslayer, Jack the sardonic Irish ghost narrator, and 90s song-title chapters — around Hollow-Knight/Dead-Cells environmental-storytelling techniques.

---

## Key Findings (what the research establishes)

1. **Outcome-based verification is the only defense against agent false-completion.** Transcript parsing ("the agent said it committed 3 files") is trusting a self-report; the fix is re-deriving success independently from filesystem, git, test-runner, HTTP, and SQL evidence. Anthropic's long-running-agents guidance states plainly: "Only mark features as passing after careful testing." Cursor's SWE-bench Pro analysis found that "63% of successful Opus 4.8 Max resolutions retrieved the fix" rather than deriving it — meaning even *passing* results can be memorized rather than reasoned.
2. **Pixel-art crispness is a fixed-internal-resolution + integer-upscale problem.** Render to an internal buffer (480×270 or 640×360, 16:9), scale up by an integer factor with `ctx.imageSmoothingEnabled = false` and CSS `image-rendering: pixelated`, and multiply the backing buffer by `devicePixelRatio`. `ResizeObserver` with `devicePixelContentBoxSize` (Chrome/Edge; Safari lacks it as of late 2023) gives pixel-perfect device sizing.
3. **Game feel is a small set of named constants**, not code sprinkled through the loop. Celeste uses a **5-frame (~83ms at 60fps) coyote window** (per creator Maddy Thorson's "Celeste & Forgiveness"); a jump buffer of **~7 frames (100–150ms)** is the common recommendation. Hitstop is a freeze of a few dozen milliseconds — Vlambeer-style "juice" that the brain reads as weight. Every value lives in one constants file so the feel is tuned by changing one number.
4. **Dead Cells' hybrid model is the exact match** for the requested design: hand-authored room templates + a per-biome graph that guides procedural stitching, wrapped in a hand-designed fixed world frame per seed.
5. **Neon has two connection modes and you need both.** The app uses the **pooled** string (`-pooler` in the hostname, PgBouncer transaction mode, up to 10,000 concurrent client connections); Alembic migrations use the **direct** string, because "operations that require stable, long-lived connections or features PgBouncer does not support, such as schema migrations" break under transaction-mode pooling (per Neon Docs, "Choosing your connection method").

---

## DETAILS — Architecture & Phase-by-Phase Build Plan

### Architecture Overview: How the Nine Systems Interconnect

```
                    ┌─────────────────────────────────────────────┐
                    │  SEED (string) → xmur3 hash → 32-bit int     │
                    └───────────────┬─────────────────────────────┘
              splits into two independent mulberry32 streams
        ┌───────────────────────────┴───────────────────────────┐
   layoutRng (deterministic)                          lootRng (deterministic, seeded
   → world graph, rooms,                                 from seed + roomId + progression)
     connections, ability gates                        → treasure, enemies, traps,
     (NEVER re-rolled per run)                            difficulty-scaled, pity-adjusted
        │                                                       │
        ▼                                                       ▼
   ┌─────────────────────── lib/game/game.ts (imperative loop) ───────────────────┐
   │ input → physics (coyote/buffer/i-frames) → collision → combat (hitstop/       │
   │ knockback) → sprite anim FSM → render to 480×270 buffer → integer upscale     │
   └───────────┬───────────────────────────────────────────────┬──────────────────┘
               │ throttled state push (≤10–15 Hz)               │ save triggers
               ▼                                                ▼
   ┌─── zustand store (state bridge) ───┐         ┌── FastAPI (ADR-001) ──┐
   │ health, coins, xp, level, abilities │───────▶│ /save /load /shop     │──▶ Neon
   │ minimap, inventory, dialogue log    │         │ asyncpg + NullPool    │   (Postgres)
   └───────────┬─────────────────────────┘         └───────────────────────┘
               ▼
   ┌── React GUI Frame (steampunk/CRT) ──┐   ← reads store; NEVER re-renders canvas
   │ HUD panels, dialogue box (Jack),    │
   │ shop UI, settings, minimap          │
   └─────────────────────────────────────┘
```

**The interconnection narrative:** A seed produces a hash → two RNG streams. `layoutRng` builds the immutable Metroidvania world graph (System 9). Rooms are populated by `lootRng` with difficulty-scaled treasure/enemies (Systems 8+9). The player explores using tuned game feel (System 4), rendered pixel-perfect (Systems 1+5). Coins/XP/level feed the economy (System 8), persisted to Neon on every room transition (System 7). Narrative triggers fire from room + lore data (System 3), delivered through Jack in the dialogue box. All non-canvas info renders in the steampunk GUI frame (System 6), fed by a throttled state bridge. Fonts/audio come from CDN-or-bundle decisions (System 2).

---

### THE GROUND-TRUTH VERIFICATION PATTERN (core cross-cutting requirement)

Create `scripts/project-status.py` **first** (Phase 0) and treat it as the project's source of truth. It must be pure-stdlib Python (Windows/PowerShell-safe) and print raw, un-summarized evidence:

```python
# scripts/project-status.py — ground-truth snapshot. No narration; raw evidence only.
import subprocess, os, sys, json, hashlib, datetime

def sh(cmd):
    try:
        return subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=60).stdout.strip()
    except Exception as e:
        return f"ERROR: {e}"

REQUIRED = [
    "lib/game/game.ts", "scripts/project-status.py",
    "backend/main.py", "backend/alembic.ini",
    "components/hud", "DECISIONS.md", "ARCHITECTURE.md",
    "SESSION_LOG.md", "AGENTIC_WORKFLOW.md", "PROMPT_LIBRARY.md", "CREDITS.md",
]

print("=" * 70)
print(f"PROJECT-STATUS SNAPSHOT @ {datetime.datetime.now().isoformat()}")
print("=" * 70)
print("\n[GIT HEAD]        ", sh("git rev-parse HEAD"))
print("[GIT BRANCH]      ", sh("git rev-parse --abbrev-ref HEAD"))
print("[GIT STATUS --porcelain]\n" + (sh("git status --porcelain") or "(clean)"))
print("[LAST 5 COMMITS]\n" + sh("git log --oneline -5"))

print("\n[REQUIRED PATHS]")
missing = 0
for p in REQUIRED:
    exists = os.path.exists(p)
    missing += (0 if exists else 1)
    size = os.path.getsize(p) if (exists and os.path.isfile(p)) else "-"
    print(f"  {'OK ' if exists else 'MISS'} {p:40} size={size}")

print("\n[lib/game TREE]")
for root, _, files in os.walk("lib/game"):
    for f in files:
        fp = os.path.join(root, f)
        print(f"  {fp:50} {os.path.getsize(fp)}B  mtime={int(os.path.getmtime(fp))}")

print("\n[SUMMARY] missing_required =", missing)
sys.exit(1 if missing else 0)
```

**Every phase prompt ends with this non-negotiable clause** (see prompt templates). The exit code is the machine-checkable gate: `python scripts/project-status.py; echo "EXIT=$LASTEXITCODE"` in PowerShell must show `EXIT=0`.

**Why this works (grounded):** the DEV.to analysis "AI coding agents lie about their work" notes agents "generate completion language as part of their output pattern regardless of the actual state of the codebase." The AWS multi-agent-validation guidance recommends "a deterministic check (hash comparison, schema validation)" between agents "to catch the cases where both LLMs agree on the wrong answer." `project-status.py` is that deterministic check.

---

### PHASE 0 — Foundation / Refactor

**Objective:** Establish the kebab-case file layout, the verification script, the living-docs system, and the ADR log. No gameplay changes.

**Implementation guidance & file layout (kebab-case throughout):**
```
next-chapter-retro-game/
├─ lib/game/
│  ├─ game.ts                  # canonical loop (ADR-002: no engine)
│  ├─ game-constants.ts        # ALL tuning constants live here
│  ├─ rng/mulberry32.ts        # seeded PRNG (Phase 3)
│  ├─ sprites/                 # atlas loader, anim FSM (Phase 1)
│  ├─ world/                   # procgen (Phase 3)
│  └─ state/game-store.ts      # zustand bridge (Phase 6/7)
├─ components/hud/             # React GUI panels (Phase 7)
├─ public/assets/              # sprites, audio (self-hosted)
├─ backend/                    # FastAPI service (ADR-001)
│  ├─ main.py
│  ├─ db/ models.py session.py
│  ├─ routers/ save.py shop.py world.py
│  └─ alembic/ alembic.ini
├─ scripts/project-status.py
└─ docs/
   ├─ AGENTIC_WORKFLOW.md  SESSION_LOG.md  PROMPT_LIBRARY.md
   ├─ DECISIONS.md (ADR log)  ARCHITECTURE.md  CREDITS.md  PLOT.md
```

**Docs to write this phase:** Seed `DECISIONS.md` with **ADR-001** (Python FastAPI isolated backend owns all Neon access) and **ADR-002** (hand-rolled Canvas loop, no game-engine library). Add `ARCHITECTURE.md` with the interconnection diagram above. Start `SESSION_LOG.md`.

**VERIFICATION CHECKPOINT 0** (PowerShell):
```powershell
python scripts/project-status.py; "EXIT=$LASTEXITCODE"   # must be EXIT=0
npm run build                                            # must exit 0
git log --oneline -3                                     # shows the refactor commit
Get-ChildItem -Recurse lib/game | Select-Object FullName # kebab-case only
```
Expected observable evidence: `EXIT=0`, a clean `git status --porcelain`, `next build` "Compiled successfully," and no camelCase/PascalCase filenames.

---

### PHASE 1 — Rendering / Sprites

**Objective:** Sprite-atlas loader, frame-based animation state machine, pixel-perfect scaling, sprite flipping.

**Implementation patterns:**
- **Atlas + JSON metadata (Aseprite-style export).** Load one texture atlas into memory once (GPU/canvas loves drawing the same VRAM repeatedly; it's bad at re-uploading), then blit sub-rects with `drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)`. Use frame *indices* not pixel math in game code.
- **Animation FSM** for player states `idle | run | jump | fall | attack | hurt | death`, each a `{ frames, fps, loop }` clip. Enemies get their own clip sets.
- **Pixel scaling:** internal buffer 480×270; `ctx.imageSmoothingEnabled = false`; CSS `image-rendering: pixelated`; scale by *integer* factors only to avoid sub-pixel blur. Multiply backing store by `devicePixelRatio`.
- **Flipping:** `ctx.save(); ctx.scale(-1,1); ctx.drawImage(...); ctx.restore()` (mirror around sprite origin) rather than duplicate art.

```typescript
// lib/game/sprites/animation-controller.ts
interface Clip { frames: number[]; fps: number; loop: boolean; }
export class AnimationController {
  private t = 0; private idx = 0; private cur!: string;
  constructor(private clips: Record<string, Clip>) {}
  set(state: string) { if (state !== this.cur) { this.cur = state; this.idx = 0; this.t = 0; } }
  update(dt: number) {
    const c = this.clips[this.cur]; this.t += dt;
    const frameDur = 1 / c.fps;
    while (this.t >= frameDur) { this.t -= frameDur; this.idx = c.loop ? (this.idx + 1) % c.frames.length : Math.min(this.idx + 1, c.frames.length - 1); }
  }
  get frame() { return this.clips[this.cur].frames[this.idx]; }
}
```

**Recommended free/CC0 asset sources (with pipeline notes):**
- **Kenney.nl** — CC0, no attribution required, coherent style; "Platformer Art Complete Pack," "Pixel UI pack (750 assets)," "Particle Pack (80+ sprites)." Best first stop.
- **OpenGameArt.org** — widest variety; **check each license individually** (CC0/CC-BY/GPL/OGA-BY). **Asset-pipeline filter for agents scraping OGA:** genuine downloadable asset anchors display a file size in the link text matching the regex `\d+(\.\d+)?\s*(KB|MB)`, and real files live under `/sites/default/files/` paths; **thumbnails** live under `/sites/default/files/styles/` — so the scraper must **reject any URL containing the `/styles/` segment** and keep only the sized `/files/` links.
- **itch.io** free asset packs (filter by license) and **CraftPix** freebies (pre-split animated walk/attack/idle sheets).

**Attribution requirement:** for every asset used, append a `CREDITS.md` row: `| asset | author | source URL | license | date |`. CC-BY assets are non-optional to credit.

**VERIFICATION CHECKPOINT 1:**
```powershell
npm run dev                                    # then in another shell:
curl http://localhost:3000 -UseBasicParsing    # 200 OK
Get-ChildItem public/assets -Recurse           # atlas .png + .json present
python scripts/project-status.py; "EXIT=$LASTEXITCODE"
```
Observable evidence: player sprite **visibly cycles** idle→run→jump in browser (agent must paste a screenshot or a short frame-by-frame description of on-canvas behavior), atlas files exist on disk, `CREDITS.md` updated. **Do not accept "sprites are working" without the screenshot + file listing.**

---

### PHASE 2 — Game Feel (Metroidvania / Castlevania / Dead Cells)

**Objective:** Make movement and combat feel weighty and fair via a set of named, tunable constants.

**Starting tuning constants** (all in `lib/game/game-constants.ts`; these are *starting points, not finals*):
```typescript
export const FEEL = {
  COYOTE_MS: 83,          // Celeste ships 5 frames @60fps ≈ 83ms
  JUMP_BUFFER_MS: 120,    // ~7 frames; common 100–150ms range
  JUMP_CUT_MULT: 0.45,    // variable height: cut upward vel on early release
  GRAVITY_UP: 1600, GRAVITY_DOWN: 2400,  // fall faster than rise
  MAX_FALL: 900,
  ACCEL: 1800, DECEL: 2200, AIR_CONTROL: 0.65,
  HITSTOP_FRAMES: 4,      // freeze attacker+attackee on impact (~66ms)
  SCREEN_SHAKE_MAX: 6,    // px; scale to impact; gate on prefers-reduced-motion
  IFRAMES_MS: 800,
  KNOCKBACK: 260,
  DODGE_MS: 250, DODGE_IFRAMES_MS: 200,   // Dead Cells-style roll
} as const;
```

**Techniques to implement:**
- **Coyote time & jump buffer** as two timestamp comparisons (`now - lastGrounded <= COYOTE_MS`, `now - lastJumpPress <= JUMP_BUFFER_MS`), interacting correctly with double-jump reservoirs.
- **Variable jump height:** if the button is released while `vy < 0`, `vy *= JUMP_CUT_MULT`.
- **Hitstop:** pause the update of attacker + attackee for `HITSTOP_FRAMES` while other objects keep updating (the nuanced Capcom approach — non-involved objects visibly keep moving). Implement as a per-entity freeze timer, not a whole-game freeze.
- **Screen shake** scaled to impact, decaying; wrap in `if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;` (motion-sickness accessibility).
- **Castlevania combat:** weapon arcs (attack advances over ~8 frames for a clean swing) + sub-weapons. **Attack canceling** into dodge. **One-way platforms** and ledge behaviors.

**VERIFICATION CHECKPOINT 2:**
```powershell
npm test                    # unit tests for coyote/buffer timing logic
python scripts/project-status.py; "EXIT=$LASTEXITCODE"
```
Observable evidence: unit tests assert that a jump input 100ms after leaving a ledge still jumps and a jump input 200ms after does not; agent pastes raw `npm test` output showing PASS counts. Manual browser check: jump feels responsive, hits freeze briefly. Write **ADR-003 (game-feel constants)**; log tuning values in `SESSION_LOG.md`.

---

### PHASE 3 — Seeded Procedural Generation (Hybrid Model) — *critical design*

**Objective:** One seed → one deterministic, solvable Metroidvania world (layout fixed forever); loot/enemies rolled by a separate stream and scaled to difficulty + progression.

**RNG (separate streams — the non-negotiable rule):**
```typescript
// lib/game/rng/mulberry32.ts
export function xmur3(str: string) {            // string seed → 32-bit int
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return (h ^= h >>> 16) >>> 0; };
}
export function mulberry32(a: number) {
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// USAGE — two independent streams so loot rolls never perturb layout:
const seedInt = xmur3(seedString)();
const layoutRng = mulberry32(seedInt);                       // world graph ONLY
const lootRng   = mulberry32(xmur3(`${seedString}:${roomId}:${progressionTier}`)()); // loot/enemies
```
> Note: mulberry32 is a compact, fast, deterministic PRNG well-suited to games (per multiple 2026 references), but it is *not* equidistributed — it cannot produce ~1/3 of possible uint32 values and fails PractRand past its 2^32 period. For a bootcamp-scoped platformer this is fine; if statistical quality ever matters, swap to sfc32 or PCG32. Seed via a hash (xmur3), never with raw sequential ints, to avoid correlated seeds.

**Layout generation (lock-and-key, guaranteed solvable):** Model the world as a directed graph (per the Washington & Lee thesis "Procedural Generation of Metroidvania Style Levels" and the Cal State ASP thesis). Algorithm (Shaggy Dev's lock-and-key method):
1. Generate an ordered list of progression nodes.
2. Connect each node to a random *earlier* node (guarantees reachability).
3. Place each gate's key/ability in a random node *before* the gate.
This prevents softlock (a key sealed behind its own gate). Ability gates = double-jump, dash, wall-jump as "keys." Verify winnability by BFS from start acquiring abilities; abort+reroll `layoutRng` seed offset if unsolvable. Maintain a critical path + optional branches.

**Room stitching (Dead Cells approach):** hand-author room *templates* per biome (each template declares entrance/exit count + purpose: combat, treasure, shrine, merchant, boss). The graph picks a template per node; connect with corridors. Benard: templates "never change no matter the loaded variant (seed)."

**Loot tables (rarity + pity):** weighted "raffle" table per rarity tier (common→legendary); scale drop quality by seed difficulty × progression. Add **soft pity** (ramping odds after N misses) and **hard pity** (guaranteed rare at M misses) to temper RNG streaks. All rolls consume `lootRng` in a fixed order so a given room's contents are reproducible.

**JSON room-template schema:**
```json
{
  "id": "prison-combat-02", "biome": "prison", "purpose": "combat",
  "width": 480, "height": 270, "entrances": ["left"], "exits": ["right","top"],
  "tiles": "…", "enemySpawns": [{"x":120,"y":200,"tierMin":1}],
  "lootAnchors": [{"x":300,"y":180,"table":"prison-common"}],
  "gate": {"type":"double-jump","side":"top"}
}
```

**VERIFICATION CHECKPOINT 3:**
```powershell
npm test -- world       # determinism + solvability tests
python scripts/project-status.py; "EXIT=$LASTEXITCODE"
```
Observable evidence (agent pastes raw output): a test that generates the world twice from the same seed and asserts **byte-identical room graphs**; a solvability test that BFS-confirms every gate is reachable; a test that same-seed loot differs run-to-run *only if* progression differs. Write **ADR-004 (two-stream RNG)** and **ADR-005 (hybrid layout-fixed/loot-variable model)**.

---

### PHASE 4 — Economy / Progression

**Objective:** Coins buy equipment (shop); XP raises stats; player level gates equipment tiers and some areas.

**XP curve:** use an exponential threshold `xp(n) = round(base * coeff^(n-1))` with **coeff ≈ 1.4** (a widely-cited starting coefficient that gives easy early levels and demanding late ones), or a tunable polynomial for a gentler early ramp. **Avoid grind walls** (bootcamp scope): cap the curve so max level is reachable in a normal playthrough; the Game Developer "Quantitative design" piece warns exponential coefficients that are too high make late thresholds "nearly impossible to reach."

**Coin/equipment balance:** set coin drop rates so a tier-N weapon costs ≈ the coins earned clearing ~1.5 biomes at tier N. Equipment stat tiers: weapon damage bands per tier, armor as flat + % mitigation. Level acts as a purchase gate (can't buy tier-3 gear below level X).

**JSON item schema:**
```json
{ "id":"iron-cleaver","name":"Iron Cleaver","slot":"weapon","tier":2,
  "levelReq":4,"price":140,"stats":{"damage":18,"attackArcFrames":8},
  "rarity":"uncommon","desc":"Heavy. Jack says it 'sings' when it lands." }
```

**VERIFICATION CHECKPOINT 4:**
```powershell
curl -X POST http://localhost:8000/shop/buy -H "Content-Type: application/json" -d '{\"playerId\":1,\"itemId\":\"iron-cleaver\"}'
npm test -- economy
python scripts/project-status.py; "EXIT=$LASTEXITCODE"
```
Observable evidence: `curl` returns updated coin balance + inventory JSON; test asserts XP curve monotonicity and that a level-3 player is *rejected* from buying a level-4 item. Write **ADR-006 (economy formulas)**.

---

### PHASE 5 — Persistence via Neon Postgres

**Objective:** Route all persistence frontend → FastAPI → Neon (ADR-001); auto-save on room transitions; offline localStorage fallback + server sync.

**Connection strategy (grounded):** app uses the **pooled** string (`-pooler` host, PgBouncer transaction mode) with **SQLAlchemy `NullPool`** (delegate pooling to Neon; don't run two poolers) — or asyncpg's own pool. Set `pool_recycle=300` / `pool_pre_ping=True` to survive Neon's compute auto-suspend. **Alembic migrations use the DIRECT string** (no `-pooler`), since transaction-mode pooling breaks session-scoped migration operations.

```python
# backend/db/session.py
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool
import os
engine = create_async_engine(os.environ["DATABASE_URL_POOLED"],  # ...-pooler...neon.tech
                             poolclass=NullPool, pool_pre_ping=True)
Session = async_sessionmaker(engine, expire_on_commit=False)
```

**.env on Windows/PowerShell:** store both strings; never commit. `.env` example:
```
DATABASE_URL_POOLED=postgresql+asyncpg://user:pass@ep-x-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
DATABASE_URL_DIRECT=postgresql+asyncpg://user:pass@ep-x.us-east-2.aws.neon.tech/neondb?sslmode=require
```
PowerShell load for a shell session: `Get-Content .env | ForEach-Object { if ($_ -match '^(.+?)=(.+)$') { [Environment]::SetEnvironmentVariable($matches[1],$matches[2]) } }`. Alembic's `env.py` reads `DATABASE_URL_DIRECT` via `os.getenv` and `config.set_main_option("sqlalchemy.url", ...)`; init async with `alembic init -t async alembic`.

**SQL DDL (Neon):**
```sql
CREATE TABLE players (
  id BIGSERIAL PRIMARY KEY, handle TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE run_state (
  id BIGSERIAL PRIMARY KEY, player_id BIGINT REFERENCES players(id),
  seed TEXT NOT NULL, current_room TEXT NOT NULL,
  health INT NOT NULL, coins INT NOT NULL, xp INT NOT NULL, level INT NOT NULL,
  equipment JSONB NOT NULL DEFAULT '[]', abilities JSONB NOT NULL DEFAULT '[]',
  abandoned BOOLEAN NOT NULL DEFAULT false,      -- rogue-like: persists unless abandoned
  updated_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE meta_progression (
  player_id BIGINT PRIMARY KEY REFERENCES players(id),
  permanent_unlocks JSONB NOT NULL DEFAULT '[]', total_runs INT DEFAULT 0);
CREATE TABLE settings (
  player_id BIGINT PRIMARY KEY REFERENCES players(id), data JSONB NOT NULL DEFAULT '{}');
```

**Save-point strategy:** auto-save `run_state` on every room transition and at checkpoint shrines; client keeps an optimistic localStorage copy and syncs on reconnect. Abandoning a run sets `abandoned=true` and rolls `meta_progression`.

**VERIFICATION CHECKPOINT 5:**
```powershell
cd backend; alembic upgrade head          # uses DIRECT url
uvicorn main:app --port 8000
# new shell:
curl -X POST http://localhost:8000/save -d '{...run_state...}' -H "Content-Type: application/json"
curl http://localhost:8000/load?player_id=1
```
Then in the **Neon SQL console** (agent pastes the result rows): `SELECT id, seed, current_room, health, coins FROM run_state WHERE player_id=1;` — must return the just-written row. Observable evidence: Alembic prints "Running upgrade → …," `run_state` **row visibly exists in Neon**, `/load` round-trips it. **Do not accept "database is connected" without a SELECT returning real rows.** Confirm **ADR-001** compliance (no direct frontend→Neon path exists — grep the frontend for connection strings and paste the empty result).

---

### PHASE 6 — Narrative Layer (grounded in "I Am I")

**Objective:** Wrap the manuscript's world around Metroidvania environmental storytelling; deliver story through Jack + lore pickups; pair story gates with ability gates.

**Source material (verbatim, from the manuscript):**
- **Macguffin — the "magical headband of clear sight."** In the book it is a bereaved boy's funeral necktie reimagined as a magic artifact ("I pause to adjust my magical headband of clear sight"). In-game, make it the central progression artifact granting "clear sight" (revealing hidden passages / lore) — a natural Metroidvania sight-gate.
- **Jack, the sardonic Irish ghost narrator/companion.** Voice: calls the player **"boyo," "my son," "my friend"**; tags lines with **"I don't mind telling you"**; dark humor and malapropisms. Verbatim sample lines to seed his dialogue file: *"Why so serious? Is it the weather?"*; *"Colder than a witches' brass bra… One might say it is downright, abdominable!"*; *"No rest for the wicked, boyo."*; *"Call me Jack, boy… My friends all call me Jack."* Jack answers unspoken thoughts and delivers hints — perfect for a tutorial/hint NPC.
- **Dragon-hunt frame.** The boy hunts the "fell black dragon **Trampitous Rex**" with the sword **Dragonslayer**, believing the hoard can trade God for his dead parents back. Use this as the game's framing quest and emotional spine.
- **90s song-title chapters** (real titles from the manuscript, use as level/chapter names): **Chapter One — "Every Day Is Exactly The Same"** (NIN); **Chapter Two — "Where Have All The Cowboys Gone?"** (Paula Cole); **Chapter Three — "I'm Half The Man I Used To Be"** (Nirvana); **Chapter Four — "I've Got Friends In Low Places"** (Garth Brooks). Section headers available too: "My Name Is Mud," "Can I Play With Madness?," "Rusty Cage."

**Storytelling technique (Hollow Knight / Dead Cells / Dark Souls):** favor *environmental storytelling* + Dark-Souls-style **item-description lore** over cutscenes. Team Cherry's approach — "characters are defined by what they do, not what they say," lore hidden "in conversations, in ruins, in echoes of memories." Pair **story gates with ability gates**: acquiring the headband (clear sight) both unlocks new map areas *and* advances the dragon-hunt narrative.

**JSON dialogue/lore + trigger schema:**
```json
{ "id":"jack-intro-shrine", "speaker":"jack",
  "trigger":{"type":"enter-room","room":"prison-start"},
  "once":true, "requires":{"ability":null},
  "lines":["Call me Jack, boy... My friends all call me Jack.",
           "No rest for the wicked, boyo. That door won't open 'til you can jump higher, I don't mind telling you."],
  "unlocks":["hint:double-jump"] }
```
Lore pickups reuse the item schema's `desc` field; a "dialogue log" panel in the GUI frame stores everything Jack says.

**VERIFICATION CHECKPOINT 6:**
```powershell
npm test -- dialogue        # trigger-firing + once-only logic
python scripts/project-status.py; "EXIT=$LASTEXITCODE"
```
Observable evidence: entering `prison-start` in the browser **fires Jack's intro line in the dialogue box** (agent describes on-screen text); `once:true` triggers don't re-fire; `docs/PLOT.md` and `CREDITS.md` updated (song titles credited to their artists). Write **ADR-007 (JSON-driven narrative + story/ability gate pairing)**.

---

### PHASE 7 — Sci-Fi / Steampunk GUI Frame

**Objective:** All non-canvas info (health, coins, XP, level, minimap, inventory, dialogue log, settings) lives in a decorative brass-and-rivets instrument-panel frame around the canvas. The frame reads game state **without re-rendering the canvas**.

**State bridge (the key architecture point):** the imperative loop pushes a throttled snapshot (≤10–15 Hz, not every frame) into a **zustand** store; HUD components subscribe with **narrow selectors** (`useStore(s => s.health)`) so only the changed panel re-renders and the canvas element never does. Use zustand v5 carefully — a selector returning a *new reference* each call causes an infinite re-render loop; select primitives or use shallow equality.

```typescript
// lib/game/state/game-store.ts
import { create } from 'zustand';
interface HudState { health:number; coins:number; xp:number; level:number; pushSnapshot:(s:Partial<HudState>)=>void; }
export const useHud = create<HudState>((set) => ({ health:100, coins:0, xp:0, level:1, pushSnapshot:(s)=>set(s) }));
// In game loop, throttled:
let last=0; function maybePush(now:number){ if(now-last>66){ useHud.getState().pushSnapshot({health,coins,xp,level}); last=now; } }
```

**CSS techniques:**
- **Frame:** `border-image` with a brass PNG/SVG slice; CSS custom properties for theming (`--brass:#b08d57; --rivet:#3a2f1e`); layered backgrounds (metal texture + gradient sheen); SVG rivets/gauges as decorative absolutely-positioned elements.
- **CRT overlay:** a `pointer-events:none` layer with `background: repeating-linear-gradient(0deg, transparent 0 2px, rgba(0,0,0,.25) 2px 4px)` for scanlines + a subtle flicker keyframe. **Gate all animation behind `@media (prefers-reduced-motion: reduce){ animation:none }`.**

**VERIFICATION CHECKPOINT 7:**
```powershell
npm run dev
curl http://localhost:3000 -UseBasicParsing
python scripts/project-status.py; "EXIT=$LASTEXITCODE"
```
Observable evidence: taking damage in-game **updates the HUD health number** while the canvas keeps running (agent confirms via React DevTools profiler that the canvas component does **not** re-render on HUD updates — paste the profiler observation). Brass frame + scanlines visible. Write **ADR-008 (state bridge: throttled zustand, no canvas re-render)**.

---

### PHASE 8 — Responsive Canvas & Polish

**Objective:** Responsive integer-scaled canvas, audio, fonts, fullscreen, final tuning.

**Responsive canvas pattern:** keep the 480×270 internal buffer; on `ResizeObserver` fire, compute the largest integer scale that fits the viewport, letterbox/pillarbox the remainder (`object-fit: contain` behavior or explicit black bars), and set `canvas.width = GAME_W * dpr; ctx.setTransform(dpr,0,0,dpr,0,0); ctx.imageSmoothingEnabled=false`. Use `devicePixelContentBoxSize` where available (Chrome/Edge), fall back to `contentBoxSize * devicePixelRatio` (Safari). Transform mouse/touch coords back into internal-resolution space. Support the Fullscreen API and touch controls for mobile.

**Fonts (CDN vs bundle decision):** use **`next/font/google`** for **Press Start 2P** — Next.js downloads and **self-hosts** it at build time (no runtime request to Google, zero layout shift, served from your domain with `Cache-Control: public, max-age=31536000, immutable`). This is strictly better than a `<link>` to Google's CDN. Set `display:'swap'` and expose as a CSS variable.

**Audio (CDN vs bundle):** **Howler.js** is small and fine to self-host/bundle via npm; game SFX/music belong in `public/assets/audio/` (self-hosted, cache-friendly), not a third-party CDN, so gameplay never depends on an external host. **Freesound sourcing:** preview-quality MP3s (`preview-hq-mp3` ~128kbps) need only a **token API key**; full-quality **originals require OAuth2** — for a bootcamp project, prefer previews to avoid the OAuth dance, and credit each sound's author + license in `CREDITS.md`.

**VERIFICATION CHECKPOINT 8:**
```powershell
npm run build; "EXIT=$LASTEXITCODE"
npm run start
curl http://localhost:3000 -UseBasicParsing
python scripts/project-status.py; "EXIT=$LASTEXITCODE"
```
Observable evidence: resizing the browser keeps pixels crisp with no blur (integer scaling), fullscreen works, audio plays, Press Start 2P renders. Final `SESSION_LOG.md` entry + **ADR-009 (responsive integer-scaling + self-hosted fonts/audio)**.

---

## PROMPT TEMPLATES (paste one per phase into Windsurf / VS Code Copilot / Claude Code)

**Reusable header (prepend to every phase prompt):**
> You are working in `Next-Chapter-Retro-Game` (Next.js + TS frontend, Python FastAPI backend, Windows/PowerShell, VS Code). Rules: kebab-case filenames; canonical game code in `lib/game/game.ts`; backend owns all Neon access (ADR-001); no game engine (ADR-002). **You may be tempted to report success prematurely — do not.** A task is complete ONLY when `python scripts/project-status.py` exits 0 and you have pasted its FULL raw output plus the phase-specific evidence below. Never write "done," "tests passing," or "it works" without the pasted terminal output that proves it. If a command errors, paste the error and stop.

**Phase 3 example prompt body:**
> Implement seeded hybrid procedural generation in `lib/game/world/` and `lib/game/rng/mulberry32.ts`. Requirements: (1) two independent mulberry32 streams — `layoutRng` for the room graph, `lootRng` for treasure/enemies; (2) lock-and-key graph generation that is provably solvable (BFS check); (3) JSON room templates stitched per Dead Cells model. Then write Jest tests: same-seed → byte-identical graph; every gate reachable; loot varies with progression only. 
> **PROOF REQUIRED — paste all of:** `npm test -- world` raw output; `python scripts/project-status.py` full output with `EXIT=$LASTEXITCODE`; `git status --porcelain`. Then update `DECISIONS.md` with ADR-004 and ADR-005 and paste the diff. Do not claim completion otherwise.

Every phase prompt follows this shape: *objective → explicit file paths → required tests/endpoints → the exact PowerShell commands to run → "paste the full raw output; do not summarize; do not claim done without it."*

---

## DOCUMENTATION UPDATE REQUIREMENTS (per phase)

| Phase | ADR to write | SESSION_LOG entry | CREDITS.md |
|---|---|---|---|
| 0 | ADR-001, ADR-002 | Refactor + verification script created | — |
| 1 | — | Sprite pipeline + atlas | **Every sprite/pack: author, URL, license** |
| 2 | ADR-003 (feel constants) | Tuning values chosen | — |
| 3 | ADR-004, ADR-005 | RNG streams + hybrid model | — |
| 4 | ADR-006 (economy) | XP/coin/price balance | — |
| 5 | ADR-001 compliance re-check | Neon schema + save strategy | — |
| 6 | ADR-007 (narrative) | Story/ability gate map | **Song titles → artists; manuscript credit** |
| 7 | ADR-008 (state bridge) | GUI frame design | Any GUI art/fonts |
| 8 | ADR-009 (responsive/assets) | Final polish | **Freesound sounds: author + license** |

`AGENTIC_WORKFLOW.md` documents the verification-checkpoint discipline itself; `PROMPT_LIBRARY.md` stores the exact prompts used per phase (so successful prompts are reusable).

---

## RISK REGISTER — Known Agent Failure Modes & Mitigations

| Risk | Failure signature | Mitigation (built into this spec) |
|---|---|---|
| **False completion claims** | "All tests passing / files created" with no evidence; the test suite has syntax errors or files exist only in the prompt | Mandatory `scripts/project-status.py` exit-0 gate + pasted raw `npm test`/`curl`/SQL output every phase; exit code is machine-checkable. |
| **Reward hacking / test memorization** | Code that passes narrow tests but doesn't generalize (SpecBench's memorizing "compiler"; Cursor's 63% retrieved-not-derived fixes) | Tests assert *properties* (determinism, solvability, monotonicity), not fixed I/O; solvability BFS can't be memorized. |
| **`str_replace` whitespace mismatch** | Edit tool fails silently or corrupts indentation; agent claims edit succeeded | After any edit, require `git diff` paste + `npm run build` exit 0; `project-status.py` prints file mtimes/sizes to prove the file actually changed. |
| **Git state drift** | Uncommitted work, wrong branch, "committed" but nothing staged | `project-status.py` prints `git rev-parse HEAD`, branch, and `git status --porcelain`; each phase must end on a clean commit. |
| **Summary-as-truth (subagent handoff)** | Lead agent inherits a flattened "done" from a subagent | Orchestrator re-derives success independently (run the verification script itself), never trusts the completion signal. |
| **ADR-001 violation** | Frontend connects directly to Neon | Grep frontend for connection strings; paste the (empty) result as proof; all DB calls go through FastAPI endpoints. |
| **RNG determinism break** | Loot rolls perturb layout; same seed yields different worlds | Two-stream architecture (ADR-004) + byte-identical-graph test. |
| **Motion-sickness / accessibility** | Screen shake / CRT flicker with no opt-out | All motion gated behind `prefers-reduced-motion`. |
| **zustand infinite loop** | HUD selector returns new reference → "Maximum update depth exceeded" | Select primitives / shallow equality; throttle pushes to ≤15 Hz. |
| **Neon pooler migration failure** | Alembic hangs/errors on pooled string | Alembic uses the **direct** connection string; app uses **pooled**. |

---

## Caveats

- **Game-feel constants (coyote 83ms, jump buffer 120ms, hitstop 4 frames, XP coeff 1.4, etc.) are research-backed *starting points*, not tuned finals** — expect to iterate them in Phase 2/4 and log the final values in `SESSION_LOG.md`.
- **mulberry32 is chosen for simplicity/determinism, not statistical rigor**; it is not equidistributed and fails PractRand past 2^32. Fine for this scope; swap to sfc32/PCG32 if quality ever matters.
- **The "I Am I" manuscript is a dark fantasy-horror-survival work**; several extracted elements (Jack's gallows humor, the funeral-necktie origin of the headband) are tonally heavy — adapt for the target audience of a bootcamp capstone as appropriate, and keep the dragon-hunt/hero framing front-and-center.
- **Project docs (`PLOT.md`, `DECISIONS.md`, etc.) were not found as Google Docs** in the accessible Drive; two `retro-pro` folders exist and likely hold the project as code/markdown files that Drive search can't index by content. Confirm the repo's actual doc state in Phase 0 before assuming these files exist.
- **`devicePixelContentBoxSize` is Chrome/Edge-only**; Safari falls back to a slightly imperfect `contentBoxSize × devicePixelRatio`, so pixel-perfect 1:1 rendering can't be guaranteed on Safari — acceptable for a desktop-first capstone.
- This spec assumes the agent has repo write access, a Neon account with a project provisioned, and Node + Python toolchains installed on the Windows host.