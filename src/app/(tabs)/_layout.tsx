import { Tabs } from "expo-router/js-tabs"
import { useT } from "@/i18n/useT"
import { TabBar } from "@/ui/TabBar"

export default function TabsLayout() {
	const { t } = useT()
	return (
		<Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
			<Tabs.Screen name="index" options={{ title: t("tabs.home") }} />
			<Tabs.Screen name="map" options={{ title: t("tabs.map") }} />
			<Tabs.Screen name="search" options={{ title: t("tabs.search") }} />
			<Tabs.Screen name="saved" options={{ title: t("tabs.saved") }} />
			<Tabs.Screen name="me" options={{ title: t("tabs.me") }} />
		</Tabs>
	)
}
