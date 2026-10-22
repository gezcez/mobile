import { View } from "react-native"
import { useT } from "@/i18n/useT"
import { Button } from "@/ui/Button"
import { Card } from "@/ui/Card"
import { Eyebrow, Heading } from "@/ui/Text"

export default function Index() {
	const { t } = useT()
	return (
		<View style={{ flex: 1, padding: 16, gap: 16, justifyContent: "center" }}>
			<Card>
				<Eyebrow>{t("common:appName")}</Eyebrow>
				<Heading>{t("tabs.home")}</Heading>
			</Card>
			<Button label={t("common:actions.start")} />
		</View>
	)
}
