// TransitMap.tsx
// The map screens render. In dev-client and store builds it is the MapLibre map (MapLibreMap.tsx);
// in Expo Go, which has no MapLibre native module, it is a placeholder and MapLibre is never loaded.

import type { ComponentProps, ReactNode } from "react"
import { IS_EXPO_GO } from "@/lib/expoGo"
import type { MapLibreMap as MapLibreMapType } from "./MapLibreMap"
import { MapPlaceholder } from "./MapPlaceholder"

export type TransitMapProps = ComponentProps<typeof MapLibreMapType>

export const TransitMap: (props: TransitMapProps) => ReactNode = IS_EXPO_GO
	? MapPlaceholder
	: // eslint-disable-next-line @typescript-eslint/no-require-imports
		(require("./MapLibreMap") as typeof import("./MapLibreMap")).MapLibreMap
