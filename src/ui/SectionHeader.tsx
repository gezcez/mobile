import type { ReactNode } from "react"
import { StyleSheet, View } from "react-native"
import { Eyebrow, Heading } from "./Text"

/** www pattern: amber eyebrow over a navy title. */
export function SectionHeader({ eyebrow, title, action }: { eyebrow?: string; title?: string; action?: ReactNode }) {
	return (
		<View style={styles.wrap}>
			<View style={styles.text}>
				{eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
				{title ? <Heading level={3}>{title}</Heading> : null}
			</View>
			{action}
		</View>
	)
}

const styles = StyleSheet.create({
	wrap: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 },
	text: { gap: 2, flex: 1 },
})
