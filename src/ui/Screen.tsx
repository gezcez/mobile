import { ArrowLeft } from "lucide-react-native"
import { router } from "expo-router"
import type { ReactNode } from "react"
import { ScrollView, StyleSheet, View, type ScrollViewProps } from "react-native"
import { SafeAreaView, type Edge } from "react-native-safe-area-context"
import { useT } from "@/i18n/useT"
import { useTheme } from "@/theme/theme"
import { IconButton } from "./Button"
import { Eyebrow, Heading } from "./Text"

/** Page chrome: safe area, cream/navy background, optional back button and www-style header. */
export function Screen({
	children,
	title,
	eyebrow,
	back,
	right,
	scroll = true,
	edges = ["top"],
	refreshControl,
	contentStyle,
}: {
	children: ReactNode
	title?: string
	eyebrow?: string
	back?: boolean
	right?: ReactNode
	scroll?: boolean
	edges?: Edge[]
	refreshControl?: ScrollViewProps["refreshControl"]
	contentStyle?: ScrollViewProps["contentContainerStyle"]
}) {
	const t = useTheme()
	const { t: tr } = useT()
	const header =
		title || back || right ? (
			<View style={styles.header}>
				{back ? (
					<IconButton
						label={tr("common:actions.back")}
						icon={<ArrowLeft size={22} color={t.colors.ink} />}
						onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
					/>
				) : null}
				<View style={styles.titles}>
					{eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
					{title ? (
						<Heading level={back ? 3 : 2} numberOfLines={2}>
							{title}
						</Heading>
					) : null}
				</View>
				{right}
			</View>
		) : null
	return (
		<SafeAreaView edges={edges} style={[styles.root, { backgroundColor: t.colors.bg }]}>
			{header}
			{scroll ? (
				<ScrollView
					contentContainerStyle={[styles.content, contentStyle]}
					refreshControl={refreshControl}
					keyboardShouldPersistTaps="handled"
				>
					{children}
				</ScrollView>
			) : (
				<View style={styles.fill}>{children}</View>
			)}
		</SafeAreaView>
	)
}

const styles = StyleSheet.create({
	root: { flex: 1 },
	fill: { flex: 1 },
	header: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4, minHeight: 56 },
	titles: { flex: 1, paddingHorizontal: 4 },
	content: { paddingBottom: 32 },
})
