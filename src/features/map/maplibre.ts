// maplibre.ts
// MapLibre components, or inert stand-ins under Expo Go (no native module there). TransitMap
// shows a placeholder instead of the map in Expo Go, so the stand-ins only need to render nothing.

import type * as ML from "@maplibre/maplibre-react-native"
import { isExpoGo } from "@/lib/expoGo"

const Inert = () => null

const lib: Pick<typeof ML, "Camera" | "Images" | "Map" | "UserLocation" | "GeoJSONSource" | "Layer"> = isExpoGo
	? ({ Camera: Inert, Images: Inert, Map: Inert, UserLocation: Inert, GeoJSONSource: Inert, Layer: Inert } as never)
	: // eslint-disable-next-line @typescript-eslint/no-require-imports
		require("@maplibre/maplibre-react-native")

export const { Camera, Images, Map, UserLocation, GeoJSONSource, Layer } = lib
