import { View } from "react-native"
import { useTheme } from "@/theme/theme"
import type { GroupColor } from "@/theme/tokens"

export function GroupDot({ colour, size = 12 }: { colour: GroupColor; size?: number }) {
	const t = useTheme()
	return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: t.groupColor(colour) }} />
}
