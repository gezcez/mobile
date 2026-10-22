// Force update (plan 5.16): shown when /v1/app/config min_supported_version is above this build.
// The root layout guards every other route while it applies, so there is no way past.

import { CircleArrowUp } from "lucide-react-native"
import { View } from "react-native"
import { useT } from "@/i18n/useT"
import { env } from "@/lib/env"
import { openStore } from "@/lib/updates"
import { useTheme } from "@/theme/theme"
import { Button } from "@/ui/Button"
import { Screen } from "@/ui/Screen"
import { Heading, Text } from "@/ui/Text"

export default function UpdateRequired() {
	const { t } = useT()
	const theme = useTheme()
	return (
		<Screen scroll={false} edges={["top", "bottom"]}>
			<View style={{ flex: 1, justifyContent: "center", padding: 24, gap: 16 }}>
				<CircleArrowUp size={40} color={theme.colors.accent} accessibilityElementsHidden importantForAccessibility="no" />
				<Heading level={1}>{t("update.title")}</Heading>
				<Text color="inkMuted">{t("update.body")}</Text>
				<Text variant="caption" color="inkSubtle">
					{t("update.current", { version: env.appVersion })}
				</Text>
				<Button testID="update-store" label={t("update.store")} onPress={() => void openStore()} fullWidth />
			</View>
		</Screen>
	)
}
