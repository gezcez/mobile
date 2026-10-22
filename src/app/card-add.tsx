// Add card (modal, plan 5.11): network (card-capable ones only), number checked against the
// manifest's numberFormat, nickname and a local card type. The number goes to encrypted storage.

import { router } from "expo-router"
import { useState } from "react"
import { StyleSheet, View } from "react-native"
import { cardSupport, CARD_TYPES, validateCardNumber, type CardType } from "@/features/cards/model"
import { useCardsAvailability } from "@/features/cards/useCardsAvailability"
import { useCardsStore } from "@/features/cards/useCardsStore"
import { useT } from "@/i18n/useT"
import { groupCardNumber } from "@/lib/format"
import { Banner } from "@/ui/Banner"
import { Button } from "@/ui/Button"
import { Chip } from "@/ui/Chip"
import { Screen } from "@/ui/Screen"
import { Text } from "@/ui/Text"
import { TextField } from "@/ui/TextField"
import { toast } from "@/ui/Toast"

export default function CardAddScreen() {
	const { t, i18n } = useT()
	const { capable, killed } = useCardsAvailability()
	const [networkId, setNetworkId] = useState<string | null>(capable[0]?.id ?? null)
	const [number, setNumber] = useState("")
	const [nickname, setNickname] = useState("")
	const [type, setType] = useState<CardType>("full")
	const [touched, setTouched] = useState(false)
	const [saving, setSaving] = useState(false)

	const network = capable.find((n) => n.id === (networkId ?? capable[0]?.id)) ?? null
	const support = cardSupport(network?.capabilities.card)
	const check = validateCardNumber(number, network?.capabilities.card?.numberFormat)
	const lang = i18n.language === "tr" ? "tr" : "en"
	const canSave = !!network && support === "ok" && check.ok && !killed && !saving

	const save = async () => {
		setTouched(true)
		if (!canSave || !network) return
		setSaving(true)
		try {
			const id = await useCardsStore.getState().add({ networkId: network.id, number: check.number, nickname, type })
			toast(t("cards.added"))
			router.replace({ pathname: "/card/[cardId]", params: { cardId: id } })
		} finally {
			setSaving(false)
		}
	}

	return (
		<Screen back title={t("cards.add")} edges={["top", "bottom"]}>
			<View style={styles.body}>
				{killed ? <Banner tone="navy" title={t("cards.unavailable")} /> : null}
				{capable.length > 1 ? (
					<View style={styles.field}>
						<Text variant="caption" color="inkMuted">
							{t("cards.network")}
						</Text>
						<View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel={t("cards.network")}>
							{capable.map((n) => (
								<Chip key={n.id} label={n.name} selected={n.id === network?.id} role="radio" onPress={() => setNetworkId(n.id)} />
							))}
						</View>
					</View>
				) : null}
				{support === "requires_account" ? <Banner tone="info" title={t("cards.requiresAccount")} /> : null}
				{support === "unsupported" && network ? <Banner tone="info" title={t("cards.notSupported")} /> : null}
				<TextField
					testID="card-number"
					label={network?.capabilities.card ? `${t("cards.number")} · ${network.capabilities.card.label[lang]}` : t("cards.number")}
					hint={t("cards.numberHint")}
					value={groupCardNumber(number)}
					onChangeText={setNumber}
					onBlur={() => setTouched(true)}
					keyboardType="number-pad"
					autoComplete="off"
					autoCorrect={false}
					importantForAutofill="no"
					maxLength={29}
					error={touched && number.length > 0 && !check.ok ? t("cards.invalidNumber", { network: network?.name ?? "" }) : null}
				/>
				<TextField
					testID="card-nickname"
					label={t("cards.nickname")}
					placeholder={t("cards.nicknamePlaceholder")}
					value={nickname}
					onChangeText={setNickname}
					maxLength={30}
					returnKeyType="done"
				/>
				<View style={styles.field}>
					<Text variant="caption" color="inkMuted">
						{t("cards.type")}
					</Text>
					<View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel={t("cards.type")}>
						{CARD_TYPES.map((k) => (
							<Chip key={k} label={t(`cards.types.${k}`)} selected={type === k} role="radio" onPress={() => setType(k)} />
						))}
					</View>
				</View>
				<Text variant="caption" color="inkMuted">
					{t("cards.deviceOnly")}
				</Text>
				<Button testID="card-save" label={t("cards.save")} onPress={() => void save()} disabled={!canSave} loading={saving} fullWidth />
			</View>
		</Screen>
	)
}

const styles = StyleSheet.create({
	body: { padding: 16, gap: 16 },
	field: { gap: 8 },
	chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
})
