// dragTarget.ts
// Where a dragged row lands: the number of other rows whose middle is above the dragged row's
// middle. Pure and a worklet, so the UI thread and the tests share it.

export function dragTarget(heights: readonly number[], from: number, dy: number): number {
	"worklet"
	let top = 0
	for (let i = 0; i < from; i++) top += heights[i] ?? 0
	const centre = top + (heights[from] ?? 0) / 2 + dy
	let y = 0
	let to = 0
	for (let i = 0; i < heights.length; i++) {
		const h = heights[i] ?? 0
		if (i !== from && y + h / 2 < centre) to++
		y += h
	}
	return to
}

/** How far row `i` moves aside while row `from` hovers at `to`. */
export function shiftFor(i: number, from: number, to: number, draggedHeight: number): number {
	"worklet"
	if (i === from) return 0
	if (from < to && i > from && i <= to) return -draggedHeight
	if (to < from && i >= to && i < from) return draggedHeight
	return 0
}
