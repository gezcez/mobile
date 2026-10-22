import { cardProblem } from "./useCardLookup"
import { cardCapableNetworks, cardSupport, validateCardNumber } from "./model"
import { readCardNumber } from "./secrets"
import { useCardsStore } from "./useCardsStore"
import { GezcezApiError } from "@/api/errors"
import { kv } from "@/lib/storage"
import { cardBalanceQuery } from "@/api/queries/cards"
import type { CardBalance, CardCapability, Network } from "@/api/types"

const cap = (over: Partial<CardCapability> = {}): CardCapability => ({
	balance: true,
	history: true,
	requiresProviderAccount: false,
	numberFormat: "^[0-9]{10,16}$",
	label: { tr: "Kent kartı", en: "City card" },
	...over,
})

describe("validateCardNumber", () => {
	it("strips spaces and dashes and checks the manifest format", () => {
		expect(validateCardNumber("1234 5678-9012", "^[0-9]{10,16}$")).toEqual({ ok: true, number: "123456789012" })
		expect(validateCardNumber("12345", "^[0-9]{10,16}$").ok).toBe(false)
		expect(validateCardNumber("", null).ok).toBe(false)
	})
	it("falls back to 10 to 20 digits when the format is missing or broken", () => {
		expect(validateCardNumber("1234567890", null).ok).toBe(true)
		expect(validateCardNumber("1234567890", "([").ok).toBe(true)
		expect(validateCardNumber("123", "([").ok).toBe(false)
	})
})

describe("cardSupport", () => {
	it("needs a balance capability and no provider account", () => {
		expect(cardSupport(null)).toBe("unsupported")
		expect(cardSupport(cap({ balance: false }))).toBe("unsupported")
		expect(cardSupport(cap({ requiresProviderAccount: true }))).toBe("requires_account")
		expect(cardSupport(cap())).toBe("ok")
	})
	it("lists only networks with the capability that are not paused", () => {
		const n = (id: string, card: CardCapability | null, status: Network["status"] = "active") =>
			({ id, status, capabilities: { card } }) as unknown as Network
		expect(cardCapableNetworks([n("a", cap()), n("b", null), n("c", cap(), "disabled")]).map((x) => x.id)).toEqual(["a"])
	})
})

describe("cardProblem", () => {
	const e = (code: ConstructorParameters<typeof GezcezApiError>[0]["code"]) => new GezcezApiError({ code, status: 503 })
	it("maps provider outages gracefully", () => {
		expect(cardProblem(e("PROVIDER_UNAVAILABLE"))).toBe("provider_unavailable")
		expect(cardProblem(e("PROVIDER_DISABLED"))).toBe("provider_disabled")
		expect(cardProblem(e("CARD_NOT_FOUND"))).toBe("not_found")
		expect(cardProblem(e("NETWORK"))).toBe("offline")
		expect(cardProblem(new Error("x"))).toBe("other")
	})
})

describe("useCardsStore", () => {
	beforeEach(async () => {
		await useCardsStore.getState().clearAll()
	})

	it("keeps the number in the encrypted store and only last4 in the persisted store", async () => {
		const id = await useCardsStore.getState().add({ networkId: "kocaeli-bus", number: "123456789012", nickname: " My card ", type: "student" })
		const card = useCardsStore.getState().cards[0]!
		expect(card).toMatchObject({ id, last4: "9012", nickname: "My card", type: "student", lastBalance: null })
		expect(await readCardNumber(id)).toBe("123456789012")
		expect(kv.getString("gz.cards") ?? "").not.toContain("123456789012")
	})

	it("removes the number with the card and on clearAll", async () => {
		const a = await useCardsStore.getState().add({ networkId: "n", number: "1111222233", nickname: "", type: "full" })
		const b = await useCardsStore.getState().add({ networkId: "n", number: "4444555566", nickname: "", type: "full" })
		await useCardsStore.getState().remove(a)
		expect(await readCardNumber(a)).toBeNull()
		expect(await readCardNumber(b)).toBe("4444555566")
		await useCardsStore.getState().clearAll()
		expect(await readCardNumber(b)).toBeNull()
		expect(useCardsStore.getState().cards).toEqual([])
	})

	it("stores the last known balance", async () => {
		const id = await useCardsStore.getState().add({ networkId: "n", number: "1111222233", nickname: "", type: "full" })
		useCardsStore.getState().setBalance(id, { amount: 42.5, currency: "TRY", asOf: "2026-10-22T10:00:00Z", providerCardType: null })
		expect(useCardsStore.getState().cards[0]!.lastBalance?.amount).toBe(42.5)
	})
})

describe("card lookup against the mock backend", () => {
	const NET = "kocaeli-bus"
	const run = (o: ReturnType<typeof cardBalanceQuery>) => (o.queryFn as (ctx: unknown) => Promise<CardBalance>)({})

	it("returns a balance from the body-only POST", async () => {
		const b = await run(cardBalanceQuery(NET, "c1", async () => "123456789012"))
		expect(b.currency).toBe("TRY")
		expect(typeof b.balance).toBe("number")
	})

	it("surfaces PROVIDER_UNAVAILABLE as a typed error", async () => {
		await expect(run(cardBalanceQuery(NET, "c2", async () => "9999000011112222"))).rejects.toMatchObject({
			code: "PROVIDER_UNAVAILABLE",
		})
	})

	it("fails with CARD_NOT_FOUND when the number is gone from the device", async () => {
		await expect(run(cardBalanceQuery(NET, "c3", async () => null))).rejects.toMatchObject({ code: "CARD_NOT_FOUND" })
	})

	it("never puts the number in the query key", () => {
		expect(JSON.stringify(cardBalanceQuery(NET, "c4", async () => "123456789012").queryKey)).not.toContain("123456789012")
	})
})
