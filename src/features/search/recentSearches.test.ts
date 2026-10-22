import { useRecentSearches } from "./recentSearches"

const stop = (id: string) => ({ kind: "stop" as const, networkId: "n", id, name: id, code: null })

it("keeps the last ten, newest first, without duplicates", () => {
	const s = useRecentSearches.getState()
	for (let i = 0; i < 12; i++) s.push(stop(String(i)))
	s.push(stop("5"))
	const ids = useRecentSearches.getState().items.map((r) => r.id)
	expect(ids).toHaveLength(10)
	expect(ids[0]).toBe("5")
	expect(ids.filter((x) => x === "5")).toHaveLength(1)
	s.clear()
	expect(useRecentSearches.getState().items).toEqual([])
})
