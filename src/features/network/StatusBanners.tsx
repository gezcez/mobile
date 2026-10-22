// StatusBanners.tsx
// The common banners every data screen shows under its header (plan 5, common rules):
// offline ("Offline. Showing data from 14:32."), network paused (navy, links to Network info) and
// degraded (amber, with the network's own message).

import { router } from "expo-router"
import { StyleSheet, View } from "react-native"
import type { Network } from "@/api/types"
import { useT } from "@/i18n/useT"
import { clockIn } from "@/lib/time"
import { useOnline } from "@/lib/useOnline"
import { Banner } from "@/ui/Banner"

export function OfflineBanner({ dataAt, timeZone }: { dataAt?: number | null; timeZone?: string }) {
	const { t } = useT()
	const online = useOnline()
	if (online) return null
	return (
		<View style={styles.wrap}>
			<Banner
				tone="offline"
				title={dataAt && timeZone ? t("common:state.offline", { time: clockIn(dataAt, timeZone) }) : t("common:state.offlineNoData")}
			/>
		</View>
	)
}

export function NetworkStatusBanner({ network }: { network: Network | null | undefined }) {
	const { t } = useT()
	if (!network || network.status === "active") return null
	const open = () => router.push({ pathname: "/network/[networkId]", params: { networkId: network.id } })
	return (
		<View style={styles.wrap}>
			{network.status === "disabled" ? (
				<Banner tone="navy" title={t("common:state.networkPaused", { network: network.name })} body={network.statusMessage} onPress={open} />
			) : (
				<Banner tone="warning" title={t("network.status.degraded")} body={network.statusMessage} onPress={open} />
			)}
		</View>
	)
}

const styles = StyleSheet.create({ wrap: { paddingHorizontal: 16, paddingTop: 8 } })
