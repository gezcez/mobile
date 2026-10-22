// Welcome (plan 5.1): wordmark, headline, three bullets, tr/en toggle, "Get started".

import { router } from "expo-router"
import { Globe, Radio, UserRoundX } from "lucide-react-native"
import { StyleSheet, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { usePrefsStore } from "@/features/settings/usePrefsStore"
import { resolveLanguage } from "@/i18n"
import { useT } from "@/i18n/useT"
import { useTheme } from "@/theme/theme"
import { BrandMark } from "@/ui/BrandMark"
import { Button } from "@/ui/Button"
import { SegmentedControl } from "@/ui/SegmentedControl"
import { Heading, Text } from "@/ui/Text"

export default function Welcome() {
	const { t } = useT()
	const theme = useTheme()
	const locale = usePrefsStore((s) => s.locale)
	const setLocale = usePrefsStore((s) => s.setLocale)
	const bullets = [
		{ Icon: Radio, text: t("onboarding.welcome.live") },
		{ Icon: Globe, text: t("onboarding.welcome.cities") },
		{ Icon: UserRoundX, text: t("onboarding.welcome.account") },
	]
	return (
		<SafeAreaView style={[styles.root, { backgroundColor: theme.colors.bg }]} edges={["top", "bottom"]}>
			<View style={styles.top}>
				<BrandMark />
				<Heading level={1} style={styles.headline}>
					{t("onboarding.welcome.headline")}
				</Heading>
				<View style={styles.bullets}>
					{bullets.map(({ Icon, text }) => (
						<View key={text} style={styles.bullet}>
							<View style={[styles.icon, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
								<Icon size={20} color={theme.colors.accent} />
							</View>
							<Text variant="bodyStrong" style={styles.bulletText}>
								{text}
							</Text>
						</View>
					))}
				</View>
			</View>
			<View style={styles.bottom}>
				<SegmentedControl
					accessibilityLabel={t("onboarding.welcome.language")}
					options={[
						{ value: "tr", label: t("common:language.tr") },
						{ value: "en", label: t("common:language.en") },
					]}
					value={resolveLanguage(locale)}
					onChange={setLocale}
				/>
				<Button testID="onboarding-start" label={t("onboarding.welcome.getStarted")} variant="accent" fullWidth onPress={() => router.push("/onboarding/location")} />
			</View>
		</SafeAreaView>
	)
}

const styles = StyleSheet.create({
	root: { flex: 1, paddingHorizontal: 24, justifyContent: "space-between" },
	top: { paddingTop: 48, gap: 24 },
	headline: { fontSize: 32, lineHeight: 38 },
	bullets: { gap: 16, paddingTop: 8 },
	bullet: { flexDirection: "row", alignItems: "center", gap: 14 },
	icon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: StyleSheet.hairlineWidth },
	bulletText: { flex: 1 },
	bottom: { gap: 16, paddingBottom: 16 },
})
