// recentSearches.ts
// The last 10 search results the rider opened. Local only, clearable (plan 5.4).

import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import type { Mode } from "@/api/types"
import { zustandStorage } from "@/lib/storage"

export type Recent =
	| { kind: "route"; networkId: string; id: string; shortName: string; longName: string; mode: Mode; color: string | null; textColor: string | null }
	| { kind: "stop"; networkId: string; id: string; name: string; code: string | null }

export const MAX_RECENTS = 10

interface RecentState {
	items: Recent[]
	push: (r: Recent) => void
	clear: () => void
}

export const recentKey = (r: Pick<Recent, "kind" | "networkId" | "id">) => `${r.kind}:${r.networkId}:${r.id}`

export const useRecentSearches = create<RecentState>()(
	persist(
		(set) => ({
			items: [],
			push: (r) => set((s) => ({ items: [r, ...s.items.filter((x) => recentKey(x) !== recentKey(r))].slice(0, MAX_RECENTS) })),
			clear: () => set({ items: [] }),
		}),
		{ name: "gz.recentSearches", version: 1, storage: createJSONStorage(() => zustandStorage()) },
	),
)
