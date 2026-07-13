import { assetUrl } from "./asset-url";

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
