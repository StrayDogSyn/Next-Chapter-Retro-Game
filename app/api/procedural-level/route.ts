import { NextResponse } from "next/server";

const DEFAULT_LEVEL = {
  seed: "fallback-seed",
  platforms: [
    { x: 32, y: 280, width: 180 },
    { x: 260, y: 250, width: 120 },
    { x: 430, y: 220, width: 160 },
  ],
};

export async function GET() {
  const pythonService = process.env.PYTHON_SERVICE_URL ?? "http://127.0.0.1:8000";

  try {
    const response = await fetch(`${pythonService}/generate-level`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Python service responded with status ${response.status}`);
    }

    const level = (await response.json()) as typeof DEFAULT_LEVEL;

    return NextResponse.json({
      ok: true,
      source: "python-service",
      level,
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      source: "fallback",
      level: DEFAULT_LEVEL,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
