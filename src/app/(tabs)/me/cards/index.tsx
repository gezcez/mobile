// Cards list (plan 5.11): saved cards with their last known balance, behind the `cards` kill switch
// and the network `card` capability. Numbers stay on this phone.

import { router } from "expo-router"
import { CreditCard, Plus } from "lucide-react-native"
import { StyleSheet, View } from "react-native"
import { CardTile } from "@/features/cards/CardTile"
import type { SavedCard } from "@/features/cards/model"
import { useCardsAvailability } from "@/features/cards/useCardsAvailability"
import { useCardsStore } from "@/features/cards/useCardsStore"
import { useNetwork } from "@/features/network/hooks"
import { useT } from "@/i18n/useT"
import { useTheme } from "@/theme/theme"
import { Banner } from "@/ui/Banner"
import { Button } from "@/ui/Button"
import { Screen } from "@/ui/Screen"
import { EmptyState } from "@/ui/States"
import { Text } from "@/ui/Text"

export default function CardsScreen() {
	const { t } = useT()
	const theme = useTheme()
	const cards = useCardsStore((s) => s.cards)
	const { killed, visible } = useCardsAvailability()
	const add = () => router.push("/card-add")
	return (
		<Screen back title={t("cards.title")} eyebrow={t("cards.eyebrow")}>
			{killed ? (
				<View style={styles.pad}>
					<Banner tone="navy" title={t("cards.unavailable")} />
				</View>
			) : !visible ? (
				<View style={styles.pad}>
					<Banner tone="info" title={t("cards.noCapableNetwork")} />
				</View>
			) : null}
			{cards.length === 0 ? (
				<EmptyState
					icon={<CreditCard size={28} color={theme.colors.accent} />}
					title={t("cards.empty")}
					body={t("cards.emptyBody")}
					action={visible ? <Button label={t("cards.add")} onPress={add} testID="cards-add" /> : undefined}
				/>
			) : (
				<View style={styles.list}>
					{cards.map((c) => (
						<CardRow key={c.id} card={c} disabled={killed} />
					))}
					{visible ? (
						<View style={styles.pad}>
							<Button
								label={t("cards.add")}
								variant="secondary"
								icon={<Plus size={18} color={theme.colors.ink} />}
								onPress={add}
								testID="cards-add"
							/>
						</View>
					) : null}
					<Text variant="caption" color="inkMuted" style={styles.note}>
						{t("cards.deviceOnly")}
					</Text>
				</View>
			)}
		</Screen>
	)
}

function CardRow({ card, disabled }: { card: SavedCard; disabled: boolean }) {
	const { t } = useT()
	const network = useNetwork(card.networkId).data
	return (
		<CardTile
			card={card}
			networkName={network?.name ?? t("cards.unknownNetwork")}
			networkColor={network?.color ?? null}
			timeZone={network?.timezone ?? "Europe/Istanbul"}
			onPress={disabled ? undefined : () => router.push({ pathname: "/card/[cardId]", params: { cardId: card.id } })}
		/>
	)
}

const styles = StyleSheet.create({
	list: { gap: 12, paddingTop: 8 },
	pad: { paddingHorizontal: 16, paddingTop: 8 },
	note: { paddingHorizontal: 16 },
})
