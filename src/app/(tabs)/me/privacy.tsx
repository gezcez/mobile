import { View } from "react-native"
import { useAuthStatus } from "@/auth/hooks"
import { useT } from "@/i18n/useT"
import { oauthLinks, openInApp, siteLinks } from "@/lib/links"
import { Card } from "@/ui/Card"
import { Divider, ListRow } from "@/ui/ListRow"
import { Screen } from "@/ui/Screen"
import { Heading, Text } from "@/ui/Text"

export default function PrivacyScreen() {
	const { t } = useT()
	const status = useAuthStatus()
	const sections = [
		["privacy.locationTitle", "privacy.locationBody"],
		["privacy.analyticsTitle", "privacy.analyticsBody"],
		["privacy.accountTitle", "privacy.accountBody"],
		["privacy.cardsTitle", "privacy.cardsBody"],
	] as const
	return (
		<Screen title={t("privacy.title")} back>
			<View style={{ padding: 16, gap: 12 }}>
				<Text color="inkMuted">{t("privacy.intro")}</Text>
				{sections.map(([title, body]) => (
					<Card key={title} style={{ gap: 6 }}>
						<Heading level={3}>{t(title)}</Heading>
						<Text color="inkMuted">{t(body)}</Text>
					</Card>
				))}
			</View>
			<Card padded={false} style={{ marginHorizontal: 16 }}>
				{status === "signed_in" ? (
					<>
						<ListRow title={t("privacy.exportData")} chevron onPress={() => openInApp(oauthLinks.exportData())} />
						<Divider inset={16} />
						<ListRow title={t("privacy.deleteAccount")} chevron destructive onPress={() => openInApp(oauthLinks.deleteAccount())} />
						<Divider inset={16} />
					</>
				) : null}
				<ListRow title={t("privacy.policy")} chevron onPress={() => openInApp(siteLinks.privacy)} />
				<Divider inset={16} />
				<ListRow title={t("privacy.kvkk")} chevron onPress={() => openInApp(siteLinks.kvkk)} />
			</Card>
		</Screen>
	)
}
