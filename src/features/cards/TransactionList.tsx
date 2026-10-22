// TransactionList.tsx
// Card history grouped by day (boarding, top-up, transfer), times in the network's timezone.

import { ArrowDownLeft, ArrowLeftRight, Bus, Circle } from "lucide-react-native"
import { StyleSheet, View } from "react-native"
import type { CardTransaction } from "@/api/types"
import { useT } from "@/i18n/useT"
import { formatMoney, groupBy } from "@/lib/format"
import { clockIn, dateIn, toMs } from "@/lib/time"
import { useTheme } from "@/theme/theme"
import { Card } from "@/ui/Card"
import { Divider } from "@/ui/ListRow"
import { SectionHeader } from "@/ui/SectionHeader"
import { Text } from "@/ui/Text"

const ICONS = { boarding: Bus, topup: ArrowDownLeft, transfer: ArrowLeftRight, other: Circle } as const

export function TransactionList({ items, currency, timeZone }: { items: CardTransaction[]; currency: string; timeZone: string }) {
	const { t, i18n } = useT()
	const theme = useTheme()
	const days = groupBy(items, (i) => dateIn(toMs(i.at), timeZone))
	return (
		<View>
			{[...days.entries()].map(([day, rows]) => (
				<View key={day}>
					<SectionHeader eyebrow={day} />
					<Card padded={false} style={styles.card}>
						{rows.map((r, i) => {
							const Icon = ICONS[r.kind]
							const kind = t(`cards.kinds.${r.kind}`)
							const amount = formatMoney(r.amount, currency, i18n.language)
							const time = clockIn(r.at, timeZone)
							const route = r.routeShortName ? t("cards.line", { line: r.routeShortName }) : null
							return (
								<View key={`${r.at}-${i}`}>
									{i > 0 ? <Divider inset={52} /> : null}
									<View
										style={styles.row}
										accessible
										accessibilityLabel={[kind, route, amount, time].filter(Boolean).join(", ")}
									>
										<Icon size={20} color={r.amount > 0 ? theme.colors.success : theme.colors.accent} />
										<View style={styles.text}>
											<Text variant="bodyStrong">{route ? `${kind} · ${route}` : kind}</Text>
											<Text variant="caption" color="inkMuted">
												{time}
											</Text>
										</View>
										<Text variant="bodyStrong" color={r.amount > 0 ? "success" : "ink"} tabular>
											{amount}
										</Text>
									</View>
								</View>
							)
						})}
					</Card>
				</View>
			))}
		</View>
	)
}

const styles = StyleSheet.create({
	card: { marginHorizontal: 16 },
	row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, minHeight: 56 },
	text: { flex: 1, gap: 2 },
})
