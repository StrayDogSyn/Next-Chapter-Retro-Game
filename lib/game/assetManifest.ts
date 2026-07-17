import { assetUrl } from "./asset-url";

// Runtime cache intentionally persists for the page lifetime to avoid
// repeat network fetches during room transitions or sprite lookups.

export type AssetManifest = {
  generatedAt: string;
  note: string;
  packs: Record<
    string,
    {
      images: string[];
      audio: string[];
      data: string[];
      other: string[];
    }
  >;
  filesByStem?: Record<string, string[]>;
};

let cachedManifest: AssetManifest | null | undefined;

/**
 * Fetches the generated asset manifest once.
 * Returns null on network/parse failure so callers can gracefully fall back
 * to hardcoded asset paths.
 */
export async function loadAssetManifest(): Promise<AssetManifest | null> {
  if (cachedManifest !== undefined) return cachedManifest;

  try {
    const response = await fetch(assetUrl("/assets/manifest.json"), { cache: "no-store" });
    if (!response.ok) {
      cachedManifest = null;
      return null;
    }
    cachedManifest = (await response.json()) as AssetManifest;
    return cachedManifest;
  } catch {
    cachedManifest = null;
    return null;
  }
}

/**
 * Resolves an asset stem to a concrete path.
 * Preferred extensions allow callers to request audio/image format priority
 * while still accepting any known match as a safe fallback.
 */
export function resolveManifestAsset(
  manifest: AssetManifest | null,
  stem: string,
  preferredExts: string[] = [],
): string | null {
  if (!manifest?.filesByStem) return null;

  const options = manifest.filesByStem[stem.toLowerCase()] ?? [];
  if (options.length === 0) return null;

  if (preferredExts.length > 0) {
    for (const ext of preferredExts) {
      const match = options.find((value) => value.toLowerCase().endsWith(ext.toLowerCase()));
      if (match) return assetUrl(`/${match}`);
    }
  }

  return assetUrl(`/${options[0]}`);
}
