import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const seed = Number(searchParams.get("seed") ?? "42");
  const quantityRaw = Number(searchParams.get("quantity") ?? "5");
  const luck = Number(searchParams.get("luck") ?? "0");
  const enemyLevel = Number(searchParams.get("enemyLevel") ?? "1");

  const baseSeed = Number.isFinite(seed) ? Math.trunc(seed) : 42;
  const quantity =
    Number.isFinite(quantityRaw) && quantityRaw > 0
      ? Math.min(100, Math.trunc(quantityRaw))
      : 5;
  const safeLuck = Number.isFinite(luck) ? luck : 0;
  const safeEnemyLevel =
    Number.isFinite(enemyLevel) && enemyLevel > 0 ? Math.trunc(enemyLevel) : 1;

  const pythonService = process.env.PYTHON_SERVICE_URL ?? "http://127.0.0.1:8000";

  try {
    const lootTable = [];

    for (let i = 0; i < quantity; i += 1) {
      const rollSeed = baseSeed + i * 7919;
      const params = new URLSearchParams({
        seed: String(rollSeed),
        luck: String(safeLuck),
        enemy_level: String(safeEnemyLevel),
      });
      const response = await fetch(`${pythonService}/loot/roll?${params.toString()}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Python service responded with status ${response.status}`);
      }

      const drop = await response.json();
      lootTable.push(drop);
    }

    return NextResponse.json({
      ok: true,
      source: "python-service",
      quantity,
      loot_table: lootTable,
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      source: "error",
      error: error instanceof Error ? error.message : "Unknown error",
      loot_table: [],
    });
  }
}
