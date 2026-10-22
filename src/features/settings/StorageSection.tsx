import { useQueryClient } from "@tanstack/react-query"
import { Trash2 } from "lucide-react-native"
import { useState } from "react"
import { useT } from "@/i18n/useT"
import { formatBytes } from "@/lib/format"
import { packFiles } from "@/pack/packStore"
import { useTheme } from "@/theme/theme"
import { Card } from "@/ui/Card"
import { IconButton } from "@/ui/Button"
import { Divider, ListRow } from "@/ui/ListRow"
import { Text } from "@/ui/Text"

/** Offline packs per network with sizes and delete buttons. */
export function StorageSection() {
	const { t } = useT()
	const theme = useTheme()
	const qc = useQueryClient()
	const [packs, setPacks] = useState(() => safeList())
	return (
		<Card padded={false} style={{ marginHorizontal: 16 }}>
			<ListRow title={t("settings.packs")} />
			{packs.length === 0 ? (
				<Text color="inkMuted" style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
					{"—"}
				</Text>
			) : null}
			{packs.map((p) => (
				<ListRowWithDivider key={`${p.networkId}@${p.version}`}>
					<ListRow
						title={t("settings.packSize", { network: p.networkId, size: formatBytes(p.bytes) })}
						subtitle={p.version}
						trailing={
							<IconButton
								label={t("settings.deletePack", { network: p.networkId })}
								icon={<Trash2 size={18} color={theme.colors.danger} />}
								onPress={() => {
									packFiles().remove(p.networkId)
									qc.removeQueries({ queryKey: ["pack", p.networkId] })
									setPacks(safeList())
								}}
							/>
						}
					/>
				</ListRowWithDivider>
			))}
		</Card>
	)
}

function ListRowWithDivider({ children }: { children: React.ReactNode }) {
	return (
		<>
			<Divider inset={16} />
			{children}
		</>
	)
}

function safeList() {
	try {
		return packFiles().list()
	} catch {
		return []
	}
}
