import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client"
import { useFonts } from "expo-font"
import { Stack } from "expo-router"
import * as SplashScreen from "expo-splash-screen"
import { StatusBar } from "expo-status-bar"
import * as SystemUI from "expo-system-ui"
import { useEffect } from "react"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { persistOptions, queryClient, wireQueryManagers } from "@/api/queryClient"
import { auth } from "@/auth"
import { wireFavouritesSync } from "@/features/favourites/syncWiring"
import { usePrefsStore } from "@/features/settings/usePrefsStore"
import { useTelemetry } from "@/features/settings/useTelemetry"
import { useAppConfig } from "@/features/network/hooks"
import { i18n } from "@/i18n"
import { env } from "@/lib/env"
import { initSentry, wrapRoot } from "@/lib/sentry"
import { isBelow } from "@/lib/version"
import { useTheme } from "@/theme/theme"
import { ToastHost, toast } from "@/ui/Toast"

void SplashScreen.preventAutoHideAsync()
initSentry()
wireQueryManagers()

function RootLayout() {
	const t = useTheme()
	const [loaded, error] = useFonts({
		"Inter-Regular": require("../../assets/fonts/Inter-Regular.ttf"),
		"Inter-Medium": require("../../assets/fonts/Inter-Medium.ttf"),
		"Inter-SemiBold": require("../../assets/fonts/Inter-SemiBold.ttf"),
		"Inter-Bold": require("../../assets/fonts/Inter-Bold.ttf"),
		"Inter-ExtraBold": require("../../assets/fonts/Inter-ExtraBold.ttf"),
	})

	useEffect(() => {
		void SystemUI.setBackgroundColorAsync(t.colors.bg)
	}, [t.colors.bg])

	useEffect(() => {
		// Lazy: reads SecureStore only; the first authenticated call refreshes (plan 8.1.7).
		void auth.tryRestore()
		return auth.onEvent((e) => {
			if (e.type === "signed_out" && e.reason !== "user") toast(i18n.t("me.signedOut"))
			if (e.type === "signed_out") queryClient.removeQueries({ queryKey: ["me"] })
		})
	}, [])

	useEffect(() => wireFavouritesSync(), [])

	useEffect(() => {
		if (loaded || error) void SplashScreen.hideAsync()
	}, [loaded, error])

	if (!loaded && !error) return null

	return (
		<GestureHandlerRootView style={{ flex: 1, backgroundColor: t.colors.bg }}>
			<SafeAreaProvider>
				<PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
					<StatusBar style={t.scheme === "dark" ? "light" : "dark"} />
					<RootStack />
					<ToastHost />
				</PersistQueryClientProvider>
			</SafeAreaProvider>
		</GestureHandlerRootView>
	)
}

function RootStack() {
	const t = useTheme()
	useTelemetry()
	const onboarded = usePrefsStore((s) => s.onboarded)
	const config = useAppConfig()
	const mustUpdate = isBelow(env.appVersion, config.data?.minSupportedVersion)
	const sheet = {
		presentation: "formSheet" as const,
		sheetAllowedDetents: [0.6, 1],
		sheetGrabberVisible: true,
		sheetCornerRadius: 16,
		contentStyle: { backgroundColor: t.colors.bg },
	}
	return (
		<Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.colors.bg } }}>
			<Stack.Protected guard={mustUpdate}>
				<Stack.Screen name="update-required" options={{ gestureEnabled: false }} />
			</Stack.Protected>
			<Stack.Protected guard={!mustUpdate && !onboarded}>
				<Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
			</Stack.Protected>
			<Stack.Protected guard={!mustUpdate && onboarded}>
				<Stack.Screen name="(tabs)" />
				<Stack.Screen name="city" options={sheet} />
				<Stack.Screen name="save-to-group" options={sheet} />
				<Stack.Screen name="vehicle/[networkId]/[vehicleId]" options={sheet} />
				<Stack.Screen name="group-edit" options={{ presentation: "modal" }} />
				<Stack.Screen name="group-map/[groupId]" />
				<Stack.Screen name="card-add" options={{ presentation: "modal" }} />
			</Stack.Protected>
			<Stack.Screen name="oauth/callback" />
		</Stack>
	)
}

export default wrapRoot(RootLayout)
