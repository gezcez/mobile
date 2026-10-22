import { useQueryClient } from "@tanstack/react-query"
import * as Application from "expo-application"
import * as Clipboard from "expo-clipboard"
import Constants from "expo-constants"
import * as Updates from "expo-updates"
import { Platform, View } from "react-native"
import { useCityStore } from "@/features/city/useCityStore"
import { StorageSection } from "@/features/settings/StorageSection"
import { usePrefsStore, type LocalePref, type ThemePref } from "@/features/settings/usePrefsStore"
import { useT } from "@/i18n/useT"
import { env } from "@/lib/env"
import { queryKv } from "@/lib/storage"
import { Button } from "@/ui/Button"
import { Card } from "@/ui/Card"
import { Divider, ListRow } from "@/ui/ListRow"
import { Screen } from "@/ui/Screen"
import { SectionHeader } from "@/ui/SectionHeader"
import { SegmentedControl } from "@/ui/SegmentedControl"
import { ToggleRow } from "@/ui/Toggle"
import { toast } from "@/ui/Toast"

export default function SettingsScreen() {
	const { t } = useT()
	const prefs = usePrefsStore()
	const autoSwitch = useCityStore((s) => s.autoSwitch)
	const setAutoSwitch = useCityStore((s) => s.setAutoSwitch)
	const qc = useQueryClient()

	return (
		<Screen title={t("settings.title")} back>
			<SectionHeader eyebrow={t("settings.language")} />
			<View style={{ paddingHorizontal: 16 }}>
				<SegmentedControl<LocalePref>
					accessibilityLabel={t("settings.language")}
					value={prefs.locale}
					onChange={prefs.setLocale}
					options={[
						{ value: "system", label: t("common:language.system") },
						{ value: "tr", label: t("common:language.tr") },
						{ value: "en", label: t("common:language.en") },
					]}
				/>
			</View>
			<SectionHeader eyebrow={t("settings.appearance")} />
			<View style={{ paddingHorizontal: 16 }}>
				<SegmentedControl<ThemePref>
					accessibilityLabel={t("settings.appearance")}
					value={prefs.theme}
					onChange={prefs.setTheme}
					options={[
						{ value: "system", label: t("common:theme.system") },
						{ value: "light", label: t("common:theme.light") },
						{ value: "dark", label: t("common:theme.dark") },
					]}
				/>
			</View>
			<View style={{ height: 16 }} />
			<Card padded={false} style={{ marginHorizontal: 16 }}>
				<ToggleRow label={t("settings.analytics")} description={t("settings.analyticsBody")} value={prefs.analytics} onChange={prefs.setAnalytics} />
				<Divider inset={16} />
				<ToggleRow label={t("settings.autoSwitch")} description={t("settings.autoSwitchBody")} value={autoSwitch} onChange={setAutoSwitch} />
			</Card>

			<SectionHeader eyebrow={t("settings.data")} />
			<StorageSection />
			<View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
				<Button
					label={t("settings.clearCache")}
					variant="secondary"
					onPress={() => {
						qc.clear()
						queryKv.clearAll()
						toast(t("settings.clearCacheDone"))
					}}
				/>
			</View>

			{prefs.devMode ? <DevSection /> : null}
		</Screen>
	)
}

function DevSection() {
	const { t } = useT()
	const info = {
		variant: env.variant,
		version: env.appVersion,
		build: Application.nativeBuildVersion,
		platform: `${Platform.OS} ${Platform.Version}`,
		channel: Updates.channel ?? "none",
		runtime: Updates.runtimeVersion ?? String(Constants.expoConfig?.runtimeVersion ?? "dev"),
		updateId: Updates.updateId ?? "embedded",
		api: env.apiUrl,
		mock: env.mock,
	}
	return (
		<>
			<SectionHeader eyebrow={t("settings.developer")} />
			<Card padded={false} style={{ marginHorizontal: 16 }}>
				<ListRow title={t("settings.environment")} subtitle={`${info.variant} · ${info.platform}`} />
				<Divider inset={16} />
				<ListRow title={t("settings.channel")} subtitle={info.channel} />
				<Divider inset={16} />
				<ListRow title={t("settings.runtime")} subtitle={`${info.runtime} · ${info.updateId}`} />
				<Divider inset={16} />
				<ListRow title={t("settings.apiUrl")} subtitle={info.api} />
				<Divider inset={16} />
				<ListRow title={t("settings.mock")} subtitle={String(info.mock)} />
			</Card>
			<View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
				<Button
					label={t("settings.copyDebug")}
					variant="secondary"
					onPress={async () => {
						await Clipboard.setStringAsync(JSON.stringify(info, null, 2))
						toast(t("common:actions.copied"))
					}}
				/>
			</View>
		</>
	)
}
