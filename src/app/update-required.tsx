import { Platform, Linking, View } from "react-native"
import { useT } from "@/i18n/useT"
import { Button } from "@/ui/Button"
import { Screen } from "@/ui/Screen"
import { Heading, Text } from "@/ui/Text"

const STORE =
	Platform.OS === "ios" ? "https://apps.apple.com/app/gezcez" : "https://play.google.com/store/apps/details?id=com.gezcez.app"

export default function UpdateRequired() {
	const { t } = useT()
	return (
		<Screen scroll={false} edges={["top", "bottom"]}>
			<View style={{ flex: 1, justifyContent: "center", padding: 24, gap: 16 }}>
				<Heading level={1}>{t("update.title")}</Heading>
				<Text color="inkMuted">{t("update.body")}</Text>
				<Button label={t("update.store")} onPress={() => Linking.openURL(STORE)} />
			</View>
		</Screen>
	)
}
