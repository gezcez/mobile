// SyncStatusLine.tsx
// "Synced 2 min ago" / "Syncing" / "Will sync when online" under the Saved list (signed in only).

import { useAuthStatus } from "@/auth/hooks"
import { useT } from "@/i18n/useT"
import { useAgoText } from "@/lib/useAgoText"
import { useNow } from "@/lib/useNow"
import { Text } from "@/ui/Text"
import { useFavouritesStore } from "./useFavouritesStore"

export function SyncStatusLine() {
	const { t } = useT()
	const status = useAuthStatus()
	const sync = useFavouritesStore((s) => s.syncStatus)
	const last = useFavouritesStore((s) => s.lastSyncedAt)
	const now = useNow()
	const agoText = useAgoText()
	if (status !== "signed_in") return null
	const text =
		sync === "syncing"
			? t("saved.syncing")
			: sync === "offline"
				? t("saved.willSync")
				: sync === "error"
					? t("saved.syncFailed")
					: last
						? t("saved.synced", { ago: agoText(last, now) })
						: t("saved.syncing")
	return (
		<Text variant="caption" color={sync === "error" ? "danger" : "inkSubtle"} style={{ textAlign: "center", paddingVertical: 12 }} accessibilityLiveRegion="polite">
			{text}
		</Text>
	)
}
