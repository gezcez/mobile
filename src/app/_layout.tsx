import { useFonts } from "expo-font"
import { Stack } from "expo-router"
import * as SplashScreen from "expo-splash-screen"
import { useEffect } from "react"
import "@/i18n"
import { useTheme } from "@/theme/theme"

void SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
	const t = useTheme()
	const [loaded, error] = useFonts({
		"Inter-Regular": require("../../assets/fonts/Inter-Regular.ttf"),
		"Inter-Medium": require("../../assets/fonts/Inter-Medium.ttf"),
		"Inter-SemiBold": require("../../assets/fonts/Inter-SemiBold.ttf"),
		"Inter-Bold": require("../../assets/fonts/Inter-Bold.ttf"),
		"Inter-ExtraBold": require("../../assets/fonts/Inter-ExtraBold.ttf"),
	})
	useEffect(() => {
		if (loaded || error) void SplashScreen.hideAsync()
	}, [loaded, error])
	if (!loaded && !error) return null
	return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.colors.bg } }} />
}
