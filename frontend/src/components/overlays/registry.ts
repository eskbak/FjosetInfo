
// components/overlays/registry.ts
import type { OverlayRuntimeProps } from "./types";

export type OverlayComponent = React.ComponentType<OverlayRuntimeProps>;

const overlayRegistry: Record<string, () => Promise<{ default: OverlayComponent }>> = {
  GlowBorder:   () => import("./GlowBorder"),
  EmojiFloaters:() => import("./EmojiFloaters"),
  Snowfall:    () => import("./Snowfall"),
  // Add more here: Snowfall: () => import("./Snowfall"), etc.
};

export async function loadOverlayComponent(key: string): Promise<OverlayComponent | null> {
  const loader = overlayRegistry[key];
  if (!loader) return null;
  try {
    const mod = await loader();
    return mod.default;
  } catch {
    return null;
  }
}