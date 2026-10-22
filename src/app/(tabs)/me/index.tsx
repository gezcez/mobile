import { router } from "expo-router"
import { CreditCard, Info, Settings, Shield, Trash2, TrainFront } from "lucide-react-native"
import { View } from "react-native"
import { useAuthStatus } from "@/auth/hooks"
import { AccountSection } from "@/features/account/AccountSection"
import { capabilityOn, useAppConfig, useCurrentNetworks } from "@/features/network/hooks"
import { useT } from "@/i18n/useT"
import { oauthLinks, openInApp } from "@/lib/links"
import { useTheme } from "@/theme/theme"
import { Card } from "@/ui/Card"
import { Divider, ListRow } from "@/ui/ListRow"
import { Screen } from "@/ui/Screen"
import { SectionHeader } from "@/ui/SectionHeader"

const CARDS_BUILT = false

export default function MeScreen() {
	const { t } = useT()
	const theme = useTheme()
	const status = useAuthStatus()
	const { networks } = useCurrentNetworks()
	const config = useAppConfig()
	// Cards (plan M5) are not built yet: the row stays hidden until src/app/me/cards exists.
	const cardsOn = CARDS_BUILT && config.data?.killSwitches.cards !== false && networks.some((n) => capabilityOn(n, "card"))
	const icon = (I: typeof Settings) => <I size={20} color={theme.colors.accent} />
	return (
		<Screen title={t("tabs.me")}>
			<View style={{ height: 8 }} />
			<AccountSection />
			<SectionHeader eyebrow={t("me.app")} />
			<Card padded={false} style={{ marginHorizontal: 16 }}>
				{cardsOn ? (
					<>
						<ListRow title={t("me.cards")} leading={icon(CreditCard)} chevron onPress={() => router.push("/me/cards")} />
						<Divider inset={56} />
					</>
				) : null}
				<ListRow title={t("me.settings")} leading={icon(Settings)} chevron onPress={() => router.push("/me/settings")} />
				<Divider inset={56} />
				<ListRow title={t("me.privacy")} leading={icon(Shield)} chevron onPress={() => router.push("/me/privacy")} />
				{networks.map((n) => (
					<View key={n.id}>
						<Divider inset={56} />
						<ListRow
							title={t("me.networkInfo", { network: n.name })}
							leading={icon(TrainFront)}
							chevron
							onPress={() => router.push({ pathname: "/network/[networkId]", params: { networkId: n.id } })}
						/>
					</View>
				))}
				<Divider inset={56} />
				<ListRow title={t("me.about")} leading={icon(Info)} chevron onPress={() => router.push("/me/about")} />
			</Card>
			{status === "signed_in" ? (
				<>
					<SectionHeader eyebrow={t("me.account")} />
					<Card padded={false} style={{ marginHorizontal: 16 }}>
						<ListRow
							title={t("me.deleteAccount")}
							destructive
							leading={<Trash2 size={20} color={theme.colors.danger} />}
							onPress={() => openInApp(oauthLinks.deleteAccount())}
						/>
					</Card>
				</>
			) : null}
		</Screen>
	)
}
