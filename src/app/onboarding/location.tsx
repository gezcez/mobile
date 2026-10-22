// Location explainer (plan 5.1): why, then the system prompt (while in use only), or skip to the
// city picker.

import { router } from "expo-router"
import { MapPin } from "lucide-react-native"
import { useState } from "react"
import { StyleSheet, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useT } from "@/i18n/useT"
import { getFix, requestPermission } from "@/lib/location"
import { useTheme } from "@/theme/theme"
import { Button } from "@/ui/Button"
import { Heading, Text } from "@/ui/Text"

export default function LocationStep() {
	const { t } = useT()
	const theme = useTheme()
	const [busy, setBusy] = useState(false)
	const allow = async () => {
		setBusy(true)
		const p = await requestPermission()
		if (p === "granted") void getFix()
		setBusy(false)
		router.push({ pathname: "/onboarding/city", params: p === "granted" ? {} : { pick: "1" } })
	}
	return (
		<SafeAreaView style={[styles.root, { backgroundColor: theme.colors.bg }]} edges={["top", "bottom"]}>
			<View style={styles.top}>
				<View style={[styles.badge, { backgroundColor: theme.colors.surfaceInverse }]}>
					<MapPin size={32} color={theme.colors.cta} />
				</View>
				<Heading level={1}>{t("onboarding.location.title")}</Heading>
				<Text color="inkMuted">{t("onboarding.location.body")}</Text>
			</View>
			<View style={styles.bottom}>
				<Button testID="onboarding-allow-location" label={t("onboarding.location.allow")} variant="accent" fullWidth loading={busy} onPress={allow} />
				<Button
					testID="onboarding-choose-city"
					label={t("onboarding.location.choose")}
					variant="secondary"
					fullWidth
					onPress={() => router.push({ pathname: "/onboarding/city", params: { pick: "1" } })}
				/>
			</View>
		</SafeAreaView>
	)
}

const styles = StyleSheet.create({
	root: { flex: 1, paddingHorizontal: 24, justifyContent: "space-between" },
	top: { paddingTop: 48, gap: 16 },
	badge: { width: 72, height: 72, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 8 },
	bottom: { gap: 12, paddingBottom: 16 },
})
