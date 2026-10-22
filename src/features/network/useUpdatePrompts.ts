// useUpdatePrompts.ts
// Remote-config and OTA prompts that are not blocking: a soft update toast (once per store
// version) and a "Restart to update" toast for a downloaded update marked critical. The blocking
// force update is the `update-required` route guarded in the root layout.

import * as Updates from "expo-updates"
import { useEffect } from "react"
import { useT } from "@/i18n/useT"
import { env } from "@/lib/env"
import { kv } from "@/lib/storage"
import { hasSoftUpdate, isCriticalManifest, openStore, restartIntoUpdate } from "@/lib/updates"
import { toast } from "@/ui/Toast"
import { useAppConfig } from "./hooks"

const SOFT_SHOWN = "gz.softUpdateShown"

export function useUpdatePrompts() {
	const { t } = useT()
	const soft = useAppConfig().data?.softUpdateVersion ?? null
	const { isUpdatePending, downloadedUpdate } = Updates.useUpdates()
	const critical = isUpdatePending && isCriticalManifest(downloadedUpdate?.manifest)

	useEffect(() => {
		if (!critical) return
		toast(t("update.criticalTitle"), { action: { label: t("update.restart"), onPress: () => void restartIntoUpdate() }, durationMs: 15_000 })
	}, [critical, t])

	useEffect(() => {
		if (!soft || !hasSoftUpdate(env.appVersion, soft) || kv.getString(SOFT_SHOWN) === soft) return
		kv.set(SOFT_SHOWN, soft)
		toast(t("update.softTitle"), { action: { label: t("update.store"), onPress: () => void openStore() }, durationMs: 8000 })
	}, [soft, t])
}
