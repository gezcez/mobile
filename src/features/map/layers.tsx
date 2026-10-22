// layers.tsx
// Sources and layers drawn on TransitMap (MapLibreLayers.tsx). In Expo Go they render nothing and
// MapLibre is never loaded; the GeoJSON builders are pure and work everywhere.

import { IS_EXPO_GO } from "@/lib/expoGo"
import type { ReactNode } from "react"
import type * as Impl from "./MapLibreLayers"

export { vehiclesGeoJSON, type RouteStyle } from "./geojson"

type Layers = { [K in keyof typeof Impl]: (props: Parameters<(typeof Impl)[K]>[0]) => ReactNode }

const Nothing = () => null

const impl: Layers = IS_EXPO_GO
	? { VehiclesLayer: Nothing, RouteLineLayer: Nothing, StopsLayer: Nothing }
	: // eslint-disable-next-line @typescript-eslint/no-require-imports
		(require("./MapLibreLayers") as typeof Impl)

export const { VehiclesLayer, RouteLineLayer, StopsLayer } = impl
