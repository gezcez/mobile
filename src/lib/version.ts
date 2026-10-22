/** Compare dotted versions numerically ("26.10.0" > "26.9.3"). */
export function compareVersions(a: string, b: string): number {
	const pa = a.split(/[.+-]/).map((x) => parseInt(x, 10) || 0)
	const pb = b.split(/[.+-]/).map((x) => parseInt(x, 10) || 0)
	for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
		const d = (pa[i] ?? 0) - (pb[i] ?? 0)
		if (d !== 0) return d < 0 ? -1 : 1
	}
	return 0
}

export function isBelow(version: string, minimum: string | null | undefined): boolean {
	return !!minimum && compareVersions(version, minimum) < 0
}
