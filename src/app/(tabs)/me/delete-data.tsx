// Delete your data (privacy centre, deep link gezcez://privacy/delete): the account part opens the
// OAuth account page at /account/privacy/delete (store requirement: in-app, one tap, no email);
// the device part wipes everything gezcez keeps on this phone.

import { useQueryClient } from "@tanstack/react-query"
import { router } from "expo-router"
import { Smartphone, UserX } from "lucide-react-native"
import { useState } from "react"
import { Alert, StyleSheet, View } from "react-native"
import { useAuthStatus } from "@/auth/hooks"
import { deleteDeviceData } from "@/features/settings/deviceData"
import { useT } from "@/i18n/useT"
import { oauthLinks, openInApp } from "@/lib/links"
import { useTheme } from "@/theme/theme"
import { Button } from "@/ui/Button"
import { Card } from "@/ui/Card"
import { Screen } from "@/ui/Screen"
import { Heading, Text } from "@/ui/Text"
import { toast } from "@/ui/Toast"

export default function DeleteDataScreen() {
	const { t } = useT()
	const theme = useTheme()
	const status = useAuthStatus()
	const qc = useQueryClient()
	const [busy, setBusy] = useState(false)

	const wipe = () =>
		Alert.alert(t("deleteData.deviceConfirmTitle"), t("deleteData.deviceConfirmBody"), [
			{ text: t("common:actions.cancel"), style: "cancel" },
			{
				text: t("common:actions.delete"),
				style: "destructive",
				onPress: async () => {
					setBusy(true)
					try {
						await deleteDeviceData(qc)
						toast(t("deleteData.deviceDone"))
						router.replace("/")
					} finally {
						setBusy(false)
					}
				},
			},
		])

	return (
		<Screen back title={t("deleteData.title")}>
			<View style={styles.body}>
				<Text color="inkMuted">{t("deleteData.intro")}</Text>
				<Card style={styles.card}>
					<View style={styles.head}>
						<UserX size={22} color={theme.colors.danger} />
						<Heading level={3} style={styles.flex}>
							{t("deleteData.accountTitle")}
						</Heading>
					</View>
					<Text color="inkMuted">{status === "signed_in" ? t("deleteData.accountBody") : t("deleteData.accountSignedOutBody")}</Text>
					<Button
						testID="delete-account"
						label={t("deleteData.accountButton")}
						variant="danger"
						onPress={() => void openInApp(oauthLinks.deleteAccount())}
					/>
				</Card>
				<Card style={styles.card}>
					<View style={styles.head}>
						<Smartphone size={22} color={theme.colors.danger} />
						<Heading level={3} style={styles.flex}>
							{t("deleteData.deviceTitle")}
						</Heading>
					</View>
					<Text color="inkMuted">{t("deleteData.deviceBody")}</Text>
					<Button testID="delete-device-data" label={t("deleteData.deviceButton")} variant="danger" loading={busy} onPress={wipe} />
				</Card>
			</View>
		</Screen>
	)
}

const styles = StyleSheet.create({
	body: { padding: 16, gap: 12 },
	card: { gap: 10 },
	head: { flexDirection: "row", gap: 10, alignItems: "center" },
	flex: { flex: 1 },
})
