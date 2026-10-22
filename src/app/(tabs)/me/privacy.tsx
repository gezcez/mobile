// Privacy centre (plan 5.12, 13): what gezcez and the operators collect, export and deletion.

import { router } from "expo-router"
import { View } from "react-native"
import { useAuthStatus } from "@/auth/hooks"
import { useCurrentNetworks } from "@/features/network/hooks"
import { useT } from "@/i18n/useT"
import { oauthLinks, openInApp, siteLinks } from "@/lib/links"
import { Card } from "@/ui/Card"
import { Divider, ListRow } from "@/ui/ListRow"
import { Screen } from "@/ui/Screen"
import { SectionHeader } from "@/ui/SectionHeader"
import { Heading, Text } from "@/ui/Text"

export default function PrivacyScreen() {
	const { t } = useT()
	const status = useAuthStatus()
	const { networks } = useCurrentNetworks()
	const sections = [
		["privacy.locationTitle", "privacy.locationBody"],
		["privacy.analyticsTitle", "privacy.analyticsBody"],
		["privacy.accountTitle", "privacy.accountBody"],
		["privacy.cardsTitle", "privacy.cardsBody"],
		["privacy.crashTitle", "privacy.crashBody"],
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
			{networks.length > 0 ? (
				<>
					<SectionHeader eyebrow={t("privacy.operators")} />
					<Card padded={false} style={{ marginHorizontal: 16 }}>
						{networks.map((n, i) => (
							<View key={n.id}>
								{i > 0 ? <Divider inset={16} /> : null}
								<ListRow
									title={n.operatorName ?? n.name}
									subtitle={t("privacy.operatorsBody")}
									chevron
									onPress={() => router.push({ pathname: "/network/[networkId]", params: { networkId: n.id } })}
								/>
							</View>
						))}
					</Card>
				</>
			) : null}
			<SectionHeader eyebrow={t("privacy.yourData")} />
			<Card padded={false} style={{ marginHorizontal: 16 }}>
				{status === "signed_in" ? (
					<>
						<ListRow title={t("privacy.exportData")} chevron onPress={() => openInApp(oauthLinks.exportData())} />
						<Divider inset={16} />
					</>
				) : null}
				<ListRow title={t("privacy.deleteData")} chevron destructive onPress={() => router.push("/me/delete-data")} />
				<Divider inset={16} />
				<ListRow title={t("privacy.policy")} chevron onPress={() => openInApp(siteLinks.privacy)} />
				<Divider inset={16} />
				<ListRow title={t("privacy.kvkk")} chevron onPress={() => openInApp(siteLinks.kvkk)} />
			</Card>
		</Screen>
	)
}
