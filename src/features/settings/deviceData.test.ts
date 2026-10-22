import { createQueryClient } from "@/api/queryClient"
import { readCardNumber } from "@/features/cards/secrets"
import { useCardsStore } from "@/features/cards/useCardsStore"
import { useCityStore } from "@/features/city/useCityStore"
import { useRecentSearches } from "@/features/search/recentSearches"
import { count, pendingTelemetry, startTelemetry } from "@/lib/telemetry"
import { deleteDeviceData } from "./deviceData"
import { usePrefsStore } from "./usePrefsStore"

jest.mock("@/auth", () => ({ auth: { logout: jest.fn(async () => {}) } }))
jest.mock("@/pack/packStore", () => ({ packFiles: () => ({ list: () => [{ networkId: "n" }], remove: jest.fn() }) }))

it("removes cards, numbers, city, prefs, counters and caches from the device", async () => {
	const stop = startTelemetry({ enabled: () => true, city: () => "kocaeli", appVersion: "1", send: async () => Promise.reject(new Error("x")) })
	const id = await useCardsStore.getState().add({ networkId: "n", number: "1234567890", nickname: "", type: "full" })
	useCityStore.getState().setCity("kocaeli")
	usePrefsStore.getState().setOnboarded(true)
	count("screen_view:home")
	const qc = createQueryClient()
	qc.setQueryData(["cities"], [1])

	await deleteDeviceData(qc)

	expect(useCardsStore.getState().cards).toEqual([])
	expect(await readCardNumber(id)).toBeNull()
	expect(useCityStore.getState().cityId).toBeNull()
	expect(usePrefsStore.getState().onboarded).toBe(false)
	expect(useRecentSearches.getState().items).toEqual([])
	expect(pendingTelemetry()).toEqual([])
	expect(qc.getQueryData(["cities"])).toBeUndefined()
	stop()
})
