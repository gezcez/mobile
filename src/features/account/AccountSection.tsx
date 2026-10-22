import { useQuery } from "@tanstack/react-query"
import { CircleUser, LogOut } from "lucide-react-native"
import { Alert, StyleSheet, View } from "react-native"
import { meQuery } from "@/api/queries/me"
import { useAuthStatus, useSignIn, useSignOut } from "@/auth/hooks"
import { useT } from "@/i18n/useT"
import { oauthLinks, openInApp } from "@/lib/links"
import { useTheme } from "@/theme/theme"
import { Button } from "@/ui/Button"
import { Card } from "@/ui/Card"
import { Skeleton } from "@/ui/Skeleton"
import { Eyebrow, Heading, Text } from "@/ui/Text"
import { toast } from "@/ui/Toast"

/** Signed out: the one sign-in prompt in Me (no nags elsewhere). Signed in: who, manage, sign out. */
export function AccountSection() {
	const status = useAuthStatus()
	return status === "signed_in" ? <AccountCard /> : <SignInCard />
}

export function SignInCard() {
	const { t } = useT()
	const theme = useTheme()
	const { signIn, pending } = useSignIn()
	return (
		<Card tone="inverse" style={styles.card}>
			<Heading level={3} style={{ color: theme.colors.inkInverse }}>
				{t("me.signInTitle")}
			</Heading>
			<View style={styles.benefits}>
				{(["benefitSync", "benefitAlerts", "benefitOne"] as const).map((k) => (
					<View key={k} style={styles.benefit}>
						<Text style={{ color: theme.colors.cta }}>›</Text>
						<Text style={{ color: theme.colors.inkInverse, opacity: 0.85, flex: 1 }}>{t(`me.${k}`)}</Text>
					</View>
				))}
			</View>
			<Button
				label={t("common:actions.signIn")}
				variant="accent"
				loading={pending}
				onPress={async () => {
					const r = await signIn()
					if (r.type === "error") toast(t("me.signInFailed"))
				}}
			/>
		</Card>
	)
}

function AccountCard() {
	const { t } = useT()
	const theme = useTheme()
	const me = useQuery(meQuery())
	const { signOut, pending } = useSignOut()
	return (
		<Card style={styles.card}>
			<View style={styles.who}>
				<CircleUser size={36} color={theme.colors.accent} />
				<View style={{ flex: 1, gap: 4 }}>
					<Eyebrow>{t("me.signedInAs")}</Eyebrow>
					{me.data ? (
						<>
							{me.data.displayName ? <Text variant="heading">{me.data.displayName}</Text> : null}
							<Text color="inkMuted">{me.data.emailMasked}</Text>
						</>
					) : (
						<Skeleton width="60%" />
					)}
				</View>
			</View>
			<View style={styles.actions}>
				<Button label={t("me.manageAccount")} variant="secondary" size="sm" onPress={() => openInApp(oauthLinks.account())} />
				<Button
					label={t("common:actions.signOut")}
					variant="ghost"
					size="sm"
					loading={pending}
					icon={<LogOut size={16} color={theme.colors.ink} />}
					onPress={() =>
						Alert.alert(t("me.signOutTitle"), t("me.signOutBody"), [
							{ text: t("common:actions.cancel"), style: "cancel" },
							{ text: t("common:actions.signOut"), style: "destructive", onPress: () => void signOut() },
						])
					}
				/>
			</View>
		</Card>
	)
}

const styles = StyleSheet.create({
	card: { marginHorizontal: 16, gap: 14 },
	benefits: { gap: 6 },
	benefit: { flexDirection: "row", gap: 8 },
	who: { flexDirection: "row", gap: 12, alignItems: "center" },
	actions: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
})
