// Card detail (plan 5.11): balance with "as of", refresh, history by month. When the operator's
// system is down (PROVIDER_UNAVAILABLE) the last known balance stays on screen with a notice.

import { router, useLocalSearchParams } from "expo-router"
import { ChevronLeft, ChevronRight, RefreshCw, Trash2 } from "lucide-react-native"
import { useState } from "react"
import { Alert, RefreshControl, StyleSheet, View } from "react-native"
import { CardTile } from "@/features/cards/CardTile"
import { cardSupport } from "@/features/cards/model"
import { TransactionList } from "@/features/cards/TransactionList"
import { cardProblem, useCardBalance, useCardHistory, type CardProblem } from "@/features/cards/useCardLookup"
import { useCardsAvailability } from "@/features/cards/useCardsAvailability"
import { useCardsStore } from "@/features/cards/useCardsStore"
import { useNetwork } from "@/features/network/hooks"
import { useT } from "@/i18n/useT"
import { monthIn, shiftMonth } from "@/lib/time"
import { useNow } from "@/lib/useNow"
import { useTheme } from "@/theme/theme"
import { Banner } from "@/ui/Banner"
import { Button, IconButton } from "@/ui/Button"
import { Screen } from "@/ui/Screen"
import { SectionHeader } from "@/ui/SectionHeader"
import { SkeletonRows } from "@/ui/Skeleton"
import { EmptyState, ErrorState } from "@/ui/States"
import { Text } from "@/ui/Text"

export default function CardDetailScreen() {
	const { cardId } = useLocalSearchParams<{ cardId: string }>()
	const { t, i18n } = useT()
	const theme = useTheme()
	const card = useCardsStore((s) => s.cards.find((c) => c.id === cardId))
	const network = useNetwork(card?.networkId).data
	const { killed } = useCardsAvailability()
	const cap = network?.capabilities.card ?? null
	const support = cardSupport(cap)
	const paused = network?.status === "disabled"
	const canLookup = !!card && !killed && !paused && support === "ok"
	const tz = network?.timezone ?? "Europe/Istanbul"
	const nowMs = useNow(60_000)
	const thisMonth = monthIn(nowMs, tz)
	const [month, setMonth] = useState(thisMonth)
	const balance = useCardBalance(card, canLookup)
	const history = useCardHistory(card, month, canLookup && !!cap?.history)

	if (!card)
		return (
			<Screen back title={t("cards.title")}>
				<EmptyState title={t("errors:CARD_NOT_FOUND")} action={<Button label={t("common:actions.back")} onPress={() => router.back()} />} />
			</Screen>
		)

	const remove = () =>
		Alert.alert(t("cards.remove"), t("cards.removeConfirm", { name: card.nickname || t("cards.masked", { last4: card.last4 }) }), [
			{ text: t("common:actions.cancel"), style: "cancel" },
			{
				text: t("common:actions.remove"),
				style: "destructive",
				onPress: () => {
					void useCardsStore.getState().remove(card.id)
					router.back()
				},
			},
		])

	const problem: CardProblem | null = balance.error ? cardProblem(balance.error) : null
	const monthLabel = new Intl.DateTimeFormat(i18n.language === "tr" ? "tr-TR" : "en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(
		new Date(`${month}-01T00:00:00Z`),
	)

	return (
		<Screen
			back
			title={card.nickname || t("cards.masked", { last4: card.last4 })}
			eyebrow={network?.name}
			right={<IconButton label={t("cards.remove")} icon={<Trash2 size={20} color={theme.colors.danger} />} onPress={remove} />}
			refreshControl={
				canLookup ? (
					<RefreshControl
						refreshing={balance.isRefetching}
						onRefresh={() => {
							void balance.refetch()
							void history.refetch()
						}}
						tintColor={theme.colors.accent}
					/>
				) : undefined
			}
		>
			<View style={styles.top}>
				<CardTile card={card} networkName={network?.name ?? t("cards.unknownNetwork")} networkColor={network?.color ?? null} timeZone={tz} />
				<View style={styles.pad}>
					{killed ? (
						<Banner tone="navy" title={t("cards.unavailable")} />
					) : paused ? (
						<Banner tone="navy" title={t("cards.providerDisabled", { network: network?.name ?? "" })} />
					) : support === "requires_account" ? (
						<Banner tone="info" title={t("cards.requiresAccount")} />
					) : support === "unsupported" && network ? (
						<Banner tone="info" title={t("cards.notSupported")} />
					) : problem ? (
						<ProblemBanner problem={problem} hasLast={!!card.lastBalance} network={network?.name ?? ""} />
					) : null}
				</View>
				{canLookup ? (
					<View style={styles.pad}>
						<Button
							testID="card-refresh"
							label={t("cards.refresh")}
							variant="secondary"
							loading={balance.isFetching}
							icon={<RefreshCw size={16} color={theme.colors.ink} />}
							onPress={() => void balance.refetch()}
						/>
					</View>
				) : null}
			</View>

			{canLookup && cap?.history ? (
				<>
					<SectionHeader
						eyebrow={t("cards.history")}
						title={monthLabel}
						action={
							<View style={styles.months}>
								<IconButton label={t("cards.prevMonth")} icon={<ChevronLeft size={20} color={theme.colors.ink} />} onPress={() => setMonth((m) => shiftMonth(m, -1))} />
								<IconButton
									label={t("cards.nextMonth")}
									icon={<ChevronRight size={20} color={month >= thisMonth ? theme.colors.inkSubtle : theme.colors.ink} />}
									disabled={month >= thisMonth}
									accessibilityState={{ disabled: month >= thisMonth }}
									onPress={() => setMonth((m) => shiftMonth(m, 1))}
								/>
							</View>
						}
					/>
					{history.isLoading ? (
						<SkeletonRows count={4} />
					) : history.error ? (
						cardProblem(history.error) === "provider_unavailable" ? (
							<Text color="inkMuted" style={styles.pad}>
								{t("cards.providerUnavailableNoBalance")}
							</Text>
						) : (
							<ErrorState error={history.error} onRetry={() => void history.refetch()} />
						)
					) : history.data && history.data.items.length > 0 ? (
						<TransactionList items={history.data.items} currency={history.data.currency} timeZone={tz} />
					) : (
						<EmptyState title={t("cards.noHistory")} />
					)}
				</>
			) : null}
		</Screen>
	)
}

function ProblemBanner({ problem, hasLast, network }: { problem: CardProblem; hasLast: boolean; network: string }) {
	const { t } = useT()
	switch (problem) {
		case "provider_unavailable":
			return <Banner tone="warning" title={hasLast ? t("cards.providerUnavailable") : t("cards.providerUnavailableNoBalance")} />
		case "provider_disabled":
			return <Banner tone="navy" title={t("cards.providerDisabled", { network })} />
		case "offline":
			return <Banner tone="offline" title={hasLast ? t("cards.offline") : t("errors:NETWORK")} />
		case "not_found":
			return <Banner tone="warning" title={t("errors:CARD_NOT_FOUND")} />
		case "unsupported":
			return <Banner tone="info" title={t("cards.notSupported")} />
		default:
			return <Banner tone="warning" title={t("errors:UNKNOWN")} />
	}
}

const styles = StyleSheet.create({
	top: { gap: 12, paddingTop: 8 },
	pad: { paddingHorizontal: 16 },
	months: { flexDirection: "row", gap: 4 },
})
