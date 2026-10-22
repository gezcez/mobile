import { useRef } from "react"
import { Pressable, View } from "react-native"
import { usePrefsStore } from "@/features/settings/usePrefsStore"
import { useT } from "@/i18n/useT"
import { env } from "@/lib/env"
import { openInApp, siteLinks } from "@/lib/links"
import { Card } from "@/ui/Card"
import { Divider, ListRow } from "@/ui/ListRow"
import { Screen } from "@/ui/Screen"
import { Text } from "@/ui/Text"
import { toast } from "@/ui/Toast"

export default function AboutScreen() {
	const { t } = useT()
	const taps = useRef(0)
	const setDevMode = usePrefsStore((s) => s.setDevMode)
	return (
		<Screen title={t("about.title")} back>
			<View style={{ padding: 16, gap: 12 }}>
				<Pressable
					accessibilityRole="text"
					onPress={() => {
						taps.current += 1
						if (taps.current === 7) {
							setDevMode(true)
							toast(t("settings.devUnlocked"))
						}
					}}
				>
					<Text variant="heading">{t("about.version", { version: `${env.appVersion} (${env.variant})` })}</Text>
				</Pressable>
				<Text color="inkMuted">{t("about.attribution")}</Text>
			</View>
			<Card padded={false} style={{ marginHorizontal: 16 }}>
				<ListRow title={t("about.website")} chevron onPress={() => openInApp(siteLinks.home)} />
				<Divider inset={16} />
				<ListRow title={t("about.source")} chevron onPress={() => openInApp(siteLinks.source)} />
				<Divider inset={16} />
				<ListRow title={t("about.feedback")} chevron onPress={() => openInApp(siteLinks.feedback)} />
			</Card>
		</Screen>
	)
}
