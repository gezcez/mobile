import * as Clipboard from "expo-clipboard"
import { CircleAlert } from "lucide-react-native"
import type { ReactNode } from "react"
import { StyleSheet, View } from "react-native"
import { errorKey, isApiError } from "@/api/errors"
import { useT } from "@/i18n/useT"
import { env } from "@/lib/env"
import { useTheme } from "@/theme/theme"
import { Button } from "./Button"
import { Text } from "./Text"
import { toast } from "./Toast"

/** Icon, one sentence, one action. No illustrations. */
export function EmptyState({
	icon,
	title,
	body,
	action,
}: {
	icon?: ReactNode
	title: string
	body?: string
	action?: ReactNode
}) {
	return (
		<View style={styles.wrap}>
			{icon}
			<Text variant="heading" align="center">
				{title}
			</Text>
			{body ? (
				<Text color="inkMuted" align="center">
					{body}
				</Text>
			) : null}
			{action}
		</View>
	)
}

/** Translated error from the code, Retry, and Report (copies request id + app version). */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
	const { t } = useT()
	const theme = useTheme()
	const requestId = isApiError(error) ? error.requestId : null
	return (
		<View style={styles.wrap} accessibilityRole="alert">
			<CircleAlert size={28} color={theme.colors.danger} />
			<Text variant="heading" align="center">
				{t(errorKey(error))}
			</Text>
			<View style={styles.actions}>
				{onRetry ? <Button label={t("common:actions.retry")} onPress={onRetry} size="sm" /> : null}
				<Button
					label={t("common:actions.report")}
					variant="secondary"
					size="sm"
					onPress={async () => {
						const id = `${requestId ?? "no-request-id"} · ${env.appVersion} · ${env.variant}`
						await Clipboard.setStringAsync(id)
						toast(t("common:state.debugId", { id }))
					}}
				/>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	wrap: { alignItems: "center", justifyContent: "center", gap: 10, padding: 24 },
	actions: { flexDirection: "row", gap: 8, marginTop: 6 },
})
