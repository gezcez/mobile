// BrandMark.tsx
// The www wordmark treatment: yellow-400 to amber-500 gradient tile with the navy "gezcez" word.

import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg"
import { StyleSheet, View } from "react-native"
import { brandGradient, palette } from "@/theme/tokens"
import { Text } from "./Text"

export function BrandMark({ size = 56, withWord = true }: { size?: number; withWord?: boolean }) {
	return (
		<View style={styles.row} accessible accessibilityRole="image" accessibilityLabel="gezcez">
			<View style={{ width: size, height: size }}>
				<Svg width={size} height={size}>
					<Defs>
						<LinearGradient id="gz" x1="0" y1="0" x2="1" y2="1">
							<Stop offset="0" stopColor={brandGradient[0]} />
							<Stop offset="1" stopColor={brandGradient[1]} />
						</LinearGradient>
					</Defs>
					<Rect x={0} y={0} width={size} height={size} rx={size * 0.28} fill="url(#gz)" />
				</Svg>
				<View style={[StyleSheet.absoluteFill, styles.center]}>
					<Text style={{ fontFamily: "Inter-ExtraBold", fontSize: size * 0.5, lineHeight: size * 0.6, color: palette.navy }}>g</Text>
				</View>
			</View>
			{withWord ? (
				<Text variant="display" style={styles.word}>
					gezcez
				</Text>
			) : null}
		</View>
	)
}

const styles = StyleSheet.create({
	row: { flexDirection: "row", alignItems: "center", gap: 12 },
	center: { alignItems: "center", justifyContent: "center" },
	word: { letterSpacing: -0.5 },
})
