# Credits & Attribution

Full sourcing record for every third-party sprite and audio asset in this project. Nothing here is extracted or derived from Altered Beast, Warhammer Space Marine, Ghouls'n Ghosts, or any other copyrighted property — these are original open-source works chosen to match that aesthetic direction.

**Status legend:** 🔴 candidate (not yet downloaded) · 🟡 downloaded, not yet integrated · 🟢 in use

---

## How to Use This Doc

<details>
<summary><strong>Click to expand: workflow for adding an asset</strong></summary>

1. Download the asset from the link below (Claude's sandbox can't reach these domains directly — this is a manual step on your end).
2. Save it into `assets/img/` or `assets/sounds/` using the naming convention in the table.
3. Flip the Status column from 🔴 to 🟡 once downloaded, then 🟢 once wired into the game.
4. If the license requires attribution, copy the exact credit line into the **In-Game Credits Screen** section at the bottom — don't paraphrase it, use the wording the license/author specifies.
5. Commit the raw asset file alongside this doc update so the two never drift out of sync.

</details>

---

## Sprites

### Beast / Transformation (Altered Beast direction)

| Asset | License | Attribution Required | Source | Suggested filename | Status |
|---|---|---|---|---|---|
| WereWolf sprite (idle/walk) | CC-BY 4.0 | Yes | [opengameart.org/content/werewolf](https://opengameart.org/content/werewolf) | `assets/img/werewolf_base.png` | 🟡 |
| Dark Saber Werewolf (idle, walk, run, 6-hit attack combo, hit, death) | CC-BY 3.0 | Yes — "werewolf sprite by MindChamber" | [opengameart.org/content/dark-saber-werewolf](https://opengameart.org/content/dark-saber-werewolf) | `assets/img/beast_boss_darksaber.gif` | 🟡 |
| LPC Wolfman (6 color variants, full LPC animation set) | CC-BY-SA 3.0 / OGA-BY 3.0 | Yes | [opengameart.org/content/lpc-wolfman](https://opengameart.org/content/lpc-wolfman) | `wolfman_lpc.png` | 🔴 |

**Recommendation:** Dark Saber Werewolf as your primary beast-transformation boss — it's the only one with a full combat animation set (attack combo, hit, death) rather than just movement.

### Armored Sci-Fi Soldier (Space Marine direction)

| Asset | License | Attribution Required | Source | Suggested filename | Status |
|---|---|---|---|---|---|
| Sideview Sci-Fi soldier pack | Check pack page (free tier) | Check pack page | [ansimuz.itch.io/sideview-sci-fi](https://ansimuz.itch.io/sideview-sci-fi) | `soldier_sideview.png` | 🔴 |
| CC0 sci-fi sprite browse (rotating collection) | CC0 (verify per-item) | No (CC0 items only) | [itch.io CC0 + Sci-fi tag](https://itch.io/game-assets/assets-cc0/tag-science-fiction) | varies | 🔴 |

**Note:** the ansimuz pack's exact license terms should be double-checked on the pack page itself before use — "free" doesn't always mean CC0, and some of ansimuz's packs are paid tiers with a separate free sampler.

### Environment / Tilesets (Metroidvania direction)

| Asset | License | Attribution Required | Source | Suggested filename | Status |
|---|---|---|---|---|---|
| Metroidvania Dark Platformer Tileset | Verify per listing | Verify per listing | Search OpenGameArt's [platformer tileset collections](https://opengameart.org/content/tilesets-and-backgrounds-pixelart) | `tileset_dark_metroidvania.png` | 🔴 |
| Curated Metroidvania art collection | Mixed — verify per item | Mixed | [opengameart.org/content/metroidvania-art](https://opengameart.org/content/metroidvania-art) | varies | 🔴 |

---

## Sound Effects & Music

### Monster Roars/Growls (CC0 — no attribution needed)

| Asset | License | Source | Suggested filename | Status |
|---|---|---|---|---|
| Dragon roars/growls/snarls pack | CC0 | [freesound.org/people/Breviceps/sounds/479380](https://freesound.org/people/Breviceps/sounds/479380/) | `assets/sounds/beast_roar_dragon.mp3` | 🟡 |
| Kraken/sea-creature layered roar | CC0 | [freesound.org/people/Bikkit99/sounds/837799](https://freesound.org/people/Bikkit99/sounds/837799/) | `assets/sounds/beast_roar_deep_kraken.mp3` | 🟡 |
| Generic large-creature growl | CC0 | [freesound.org/people/cylon8472/sounds/366671](https://freesound.org/people/cylon8472/sounds/366671/) | `assets/sounds/beast_growl_generic.mp3` | 🟡 |

### Retro/Chiptune SFX (CC0)

| Asset | License | Source | Suggested filename | Status |
|---|---|---|---|---|
| 8-Bit Sound Effect Pack Vol. 001 (46 files — coins, explosions, jumps, powerups, shoot, hit) | CC0 | [opengameart.org/content/8-bit-sound-effect-pack-vol-001](https://opengameart.org/content/8-bit-sound-effect-pack-vol-001) | `assets/sounds/sfx_pack_8bit_vol1.png` (page cover; download actual audio pack manually) | 🟡 |
| 512 Sound Effects (8-bit style) | CC0 | [opengameart.org/content/512-sound-effects-8-bit-style](https://opengameart.org/content/512-sound-effects-8-bit-style) | `assets/sounds/sfx_512_retro.zip` (extract before use) | 🟡 |
| CC0 - 8Bit - Chiptune (music collection) | CC0 | [opengameart.org/content/audio-cc0-8bit-chiptune](https://opengameart.org/content/audio-cc0-8bit-chiptune) | `music_[track].ogg` | 🔴 |

### Sci-Fi Ambience/Lasers (Space Marine layer)

| Asset | License | Source | Suggested filename | Status |
|---|---|---|---|---|
| Sci-fi sound pack (lasers, alien ambience, menu SFX) | CC0/CC-BY — verify per pack | [freesound.org/people/LittleRobotSoundFactory/packs](https://freesound.org/people/LittleRobotSoundFactory/packs/) | `sfx_laser_[n].wav` | 🔴 |

---

## In-Game Credits Screen

_Populate this once assets move to 🟢 status — copy exact attribution wording as specified by each license, don't paraphrase._

```
[placeholder — fill in as assets are integrated]
```

---

## License Quick Reference

| License | What it means for this project |
|---|---|
| CC0 | Public domain equivalent. No attribution required, but crediting anyway is good practice and costs nothing. |
| CC-BY | Attribution required — must credit the author, typically in exactly the wording they request. |
| CC-BY-SA | Attribution required, AND any derivative work you distribute must carry the same license — relevant if you modify and redistribute the sprite itself, not just use it in the game. |
| OGA-BY | OpenGameArt's own attribution license — functionally similar to CC-BY. |

**Given the mix here:** the beast/transformation sprites lean CC-BY/CC-BY-SA (attribution required), while the SFX layer is entirely CC0. Plan for a visible in-game or README credits section regardless — it's standard practice and reinforces the "software diversity" narrative of the submission.