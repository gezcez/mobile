import type { Catalog } from "../types"
import type { mobile as en } from "../en/mobile"

export const mobile: Catalog<typeof en> = {
	tabs: { home: "Ana sayfa", map: "Harita", search: "Ara", saved: "Kayıtlı", me: "Ben" },
}
