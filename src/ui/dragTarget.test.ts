import { dragTarget, shiftFor } from "./dragTarget"

const h = [50, 60, 40, 50]

describe("dragTarget", () => {
	it("stays put for small moves", () => {
		expect(dragTarget(h, 1, 10)).toBe(1)
		expect(dragTarget(h, 1, -10)).toBe(1)
	})
	it("passes a row once the middle crosses its middle", () => {
		expect(dragTarget(h, 0, 60)).toBe(1)
		expect(dragTarget(h, 0, 200)).toBe(3)
		expect(dragTarget(h, 3, -200)).toBe(0)
		expect(dragTarget(h, 2, -40)).toBe(2)
		expect(dragTarget(h, 2, -60)).toBe(1)
	})
	it("shifts the rows in between by the dragged height", () => {
		expect([0, 1, 2, 3].map((i) => shiftFor(i, 0, 2, 50))).toEqual([0, -50, -50, 0])
		expect([0, 1, 2, 3].map((i) => shiftFor(i, 3, 1, 50))).toEqual([0, 50, 50, 0])
	})
})
