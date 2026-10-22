// TransitMap.tsx
// MapLibre map on the brand style (light or dark from remote config `tiles_style_url`), with the
// user location dot. Screens put sources and layers inside. Needs the dev client: Expo Go has no
// MapLibre native module.

import { Camera, Images, Map as MLMap, UserLocation, type CameraRef, type MapProps, type ViewStateChangeEvent } from "@maplibre/maplibre-react-native"
import type { ReactNode, Ref } from "react"
import { StyleSheet, type NativeSyntheticEvent } from "react-native"
import { useAppConfig } from "@/features/network/hooks"
import { useLocationStore } from "@/lib/location"
import { useTheme } from "@/theme/theme"

/** Used until remote config arrives (and in mock mode): a public OSM-based style. */
export const FALLBACK_STYLE_URL = "https://tiles.openfreemap.org/styles/positron"
/** Glyphs for labels; the brand styles and the fallback both serve Noto Sans. */
export const MAP_FONT = ["Noto Sans Bold"]

export const MAP_IMAGES = {
	vehicle: { source: require("../../../assets/map/vehicle.png"), sdf: true },
}

export function useMapStyleUrl(): string {
	const config = useAppConfig().data
	const t = useTheme()
	return config?.tilesStyleUrl[t.scheme] ?? FALLBACK_STYLE_URL
}

export function TransitMap({
	children,
	initial,
	cameraRef,
	onRegionDidChange,
	onPress,
	accessibilityLabel,
	contentInset,
}: {
	children?: ReactNode
	initial: { center: [number, number]; zoom: number } | { bounds: [number, number, number, number] }
	cameraRef?: Ref<CameraRef>
	onRegionDidChange?: (e: NativeSyntheticEvent<ViewStateChangeEvent>) => void
	onPress?: MapProps["onPress"]
	accessibilityLabel?: string
	contentInset?: MapProps["contentInset"]
}) {
	const style = useMapStyleUrl()
	const t = useTheme()
	const located = useLocationStore((s) => s.permission === "granted")
	return (
		<MLMap
			style={StyleSheet.absoluteFill}
			mapStyle={style}
			logo={false}
			attribution
			compass={false}
			tintColor={t.colors.accent}
			onRegionDidChange={onRegionDidChange}
			onPress={onPress}
			contentInset={contentInset}
			accessibilityLabel={accessibilityLabel}
		>
			<Camera ref={cameraRef} initialViewState={"bounds" in initial ? { bounds: initial.bounds } : { center: initial.center, zoom: initial.zoom }} />
			<Images images={MAP_IMAGES} />
			{located ? <UserLocation accuracy animated /> : null}
			{children}
		</MLMap>
	)
}
