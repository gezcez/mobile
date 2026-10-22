// CardArt.tsx
// Generated card art (plan 5.11): navy card, a pattern seeded by the network id and tinted with the
// network colour, amber stripe. Never operator artwork or logos.

import { StyleSheet, View } from "react-native"
import Svg, { Circle, Rect } from "react-native-svg"
import { palette } from "@/theme/tokens"

function seed(s: string): number {
	let h = 2166136261
	for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
	return h >>> 0
}

export function CardArt({ networkId, color, width, height }: { networkId: string; color: string | null; width: number; height: number }) {
	const h = seed(networkId)
	const tint = color ?? palette.amber400
	const r1 = height * (0.55 + ((h & 0xff) / 255) * 0.3)
	const r2 = height * (0.3 + (((h >> 8) & 0xff) / 255) * 0.25)
	return (
		<View style={StyleSheet.absoluteFill} pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants">
			<Svg width={width} height={height}>
				<Rect x={0} y={0} width={width} height={height} fill={palette.navy} />
				<Circle cx={width * (0.75 + ((h >> 16) & 0x3f) / 400)} cy={height * 0.1} r={r1} fill={tint} opacity={0.35} />
				<Circle cx={width * 0.95} cy={height * 0.95} r={r2} fill={tint} opacity={0.25} />
				<Rect x={0} y={height - 6} width={width} height={6} fill={palette.amber400} />
			</Svg>
		</View>
	)
}
