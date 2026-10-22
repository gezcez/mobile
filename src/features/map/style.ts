// style.ts
// Map style URL and label font, shared by the MapLibre map and its layers.

import { useAppConfig } from "@/features/network/hooks"
import { useTheme } from "@/theme/theme"

/** Used until remote config arrives (and in mock mode): a public OSM-based style. */
export const FALLBACK_STYLE_URL = "https://tiles.openfreemap.org/styles/positron"
/** Glyphs for labels; the brand styles and the fallback both serve Noto Sans. */
export const MAP_FONT = ["Noto Sans Bold"]

export function useMapStyleUrl(): string {
	const config = useAppConfig().data
	const t = useTheme()
	return config?.tilesStyleUrl[t.scheme] ?? FALLBACK_STYLE_URL
}
