import { fold } from "./normalise"

describe("fold", () => {
	it("handles Turkish dotted and dotless i", () => {
		expect(fold("İzmit")).toBe("izmit")
		expect(fold("IŞIK")).toBe("isik")
		expect(fold("ıslak")).toBe("islak")
	})
	it("folds diacritics so plain ASCII queries match", () => {
		expect(fold("Gölcük Çarşı")).toBe("golcuk carsi")
		expect(fold("Değirmendere  Üniversite")).toBe("degirmendere universite")
	})
})
