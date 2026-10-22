// CardTile.tsx
// One saved card as a rounded navy card: nickname, masked number, last known balance and "as of".

import { useState } from "react"
import { StyleSheet, View, type LayoutChangeEvent } from "react-native"
import { useT } from "@/i18n/useT"
import { formatMoney } from "@/lib/format"
import { clockIn, dateIn, isSameDayIn, toMs } from "@/lib/time"
import { useNow } from "@/lib/useNow"
import { palette } from "@/theme/tokens"
import { Card } from "@/ui/Card"
import { Eyebrow, Text } from "@/ui/Text"
import { CardArt } from "./CardArt"
import type { SavedCard } from "./model"

export function useBalanceText() {
	const { t, i18n } = useT()
	const nowMs = useNow(60_000)
	return (card: SavedCard, timeZone: string) => {
		const b = card.lastBalance
		if (!b) return { amount: null, asOf: null }
		const at = toMs(b.asOf)
		const time = isSameDayIn(at, nowMs, timeZone) ? clockIn(b.asOf, timeZone) : `${dateIn(at, timeZone)} ${clockIn(b.asOf, timeZone)}`
		return { amount: formatMoney(b.amount, b.currency, i18n.language), asOf: t("cards.asOf", { time }) }
	}
}

export function CardTile({
	card,
	networkName,
	networkColor,
	timeZone,
	onPress,
	compact,
}: {
	card: SavedCard
	networkName: string
	networkColor: string | null
	timeZone: string
	onPress?: () => void
	compact?: boolean
}) {
	const { t } = useT()
	const balanceText = useBalanceText()
	const [size, setSize] = useState({ width: 0, height: 0 })
	const onLayout = (e: LayoutChangeEvent) => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })
	const masked = t("cards.masked", { last4: card.last4 })
	const name = card.nickname || masked
	const { amount, asOf } = balanceText(card, timeZone)
	const label = amount
		? t("cards.tileLabel", { name, last4: card.last4, balance: `${amount}, ${asOf}` })
		: t("cards.tileLabelNoBalance", { name, last4: card.last4 })
	return (
		<Card tone="inverse" padded={false} onPress={onPress} accessibilityLabel={label} style={compact ? styles.compact : styles.full}>
			<View onLayout={onLayout} style={[styles.inner, compact && styles.innerCompact]}>
				{size.width > 0 ? <CardArt networkId={card.networkId} color={networkColor} width={size.width} height={size.height} /> : null}
				<Eyebrow style={{ color: palette.amber300 }} numberOfLines={1}>
					{networkName}
				</Eyebrow>
				<Text variant="heading" style={styles.light} numberOfLines={1}>
					{name}
				</Text>
				{card.nickname ? (
					<Text variant="caption" style={styles.muted} tabular>
						{masked}
					</Text>
				) : null}
				<View style={styles.flex} />
				{amount ? (
					<>
						<Text variant={compact ? "title" : "display"} style={styles.light} tabular>
							{amount}
						</Text>
						<Text variant="caption" style={styles.muted}>
							{asOf}
						</Text>
					</>
				) : (
					<Text variant="caption" style={styles.muted}>
						{t("cards.noBalance")}
					</Text>
				)}
			</View>
		</Card>
	)
}

const styles = StyleSheet.create({
	full: { marginHorizontal: 16 },
	compact: { width: 240 },
	inner: { padding: 16, gap: 2, minHeight: 180 },
	innerCompact: { minHeight: 136 },
	flex: { flex: 1, minHeight: 12 },
	light: { color: palette.cream },
	muted: { color: palette.cream, opacity: 0.75 },
})
