import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const seed = searchParams.get("seed") ?? "42";
  const quantity = searchParams.get("quantity") ?? "5";

  const pythonService = process.env.PYTHON_SERVICE_URL ?? "http://127.0.0.1:8000";

  try {
    const response = await fetch(
      `${pythonService}/generate-loot?seed=${seed}&quantity=${quantity}`,
      {
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error(`Python service responded with status ${response.status}`);
    }

    const loot = await response.json();

    return NextResponse.json({
      ok: true,
      source: "python-service",
      ...loot,
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
