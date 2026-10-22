import { useT } from "@/i18n/useT"
import { Screen } from "@/ui/Screen"
import { EmptyState } from "@/ui/States"

export default function Placeholder() {
	const { t } = useT()
	return (
		<Screen scroll={false}>
			<EmptyState title={t("common:state.loading")} />
		</Screen>
	)
}
