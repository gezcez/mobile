// gezcez://oauth/callback (exp://<host>/--/oauth/callback in Expo Go). Normally the auth session
// returns the URL to the pending promise; this route catches the redirect when the OS delivers it as a deep link instead (Android task restarts).
// It only ever completes a login this app started (state check in src/auth) and then leaves.

import { router, useLocalSearchParams } from "expo-router"
import { useEffect } from "react"
import { ActivityIndicator, View } from "react-native"
import { auth, AUTH_TARGET } from "@/auth"
import { useT } from "@/i18n/useT"
import { useTheme } from "@/theme/theme"
import { Text } from "@/ui/Text"

export default function OAuthCallback() {
	const { t } = useT()
	const theme = useTheme()
	const params = useLocalSearchParams<{ code?: string; state?: string; error?: string }>()
	useEffect(() => {
		let done = false
		async function run() {
			if (auth.hasPendingLogin()) {
				const q = new URLSearchParams()
				for (const k of ["code", "state", "error"] as const) if (params[k]) q.set(k, String(params[k]))
				await auth.completeFromUrl(`${AUTH_TARGET.redirectUri}?${q.toString()}`)
			}
			if (!done) router.replace("/me")
		}
		void run()
		return () => {
			done = true
		}
	}, [params])
	return (
		<View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: theme.colors.bg }}>
			<ActivityIndicator color={theme.colors.accent} accessibilityLabel={t("oauth.completing")} />
			<Text color="inkMuted">{t("oauth.completing")}</Text>
		</View>
	)
}
