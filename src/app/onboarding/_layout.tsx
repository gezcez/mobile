import { Stack } from "expo-router"
import { useTheme } from "@/theme/theme"

export default function OnboardingLayout() {
	const t = useTheme()
	return (
		<Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.colors.bg } }}>
			<Stack.Screen name="index" options={{ gestureEnabled: false }} />
			<Stack.Screen name="location" />
			<Stack.Screen name="city" />
		</Stack>
	)
}
