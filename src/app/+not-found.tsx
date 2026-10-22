import { router } from "expo-router"
import { useT } from "@/i18n/useT"
import { Button } from "@/ui/Button"
import { Screen } from "@/ui/Screen"
import { EmptyState } from "@/ui/States"

export default function NotFound() {
	const { t } = useT()
	return (
		<Screen scroll={false} back>
			<EmptyState
				title={t("notFound.title")}
				action={<Button label={t("notFound.home")} onPress={() => router.replace("/")} />}
			/>
		</Screen>
	)
}
